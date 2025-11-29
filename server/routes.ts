import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import type { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { getRevenueAggregated, getActiveSellers, getAdminTotals } from './adminAnalytics';
import { sessionStore } from "./session";
import { hashPassword, comparePassword, sanitizeUser, SessionUser } from "./auth";
import { insertUserSchema, insertListingSchema, insertOrderSchema, insertCartItemSchema, insertPricingTierSchema, insertReviewSchema } from "@shared/schema";
import { sendPasswordResetEmail, sendWelcomeEmail, sendPasswordChangedEmail, sendOrderConfirmationEmail, sendNewOrderNotificationToFarmer, sendVerificationStatusEmail, getSmtpStatus } from "./email";
import { upload, getFileUrl, deleteUploadedFile, isValidFilename } from "./upload";
import { sendNotificationToUser, broadcastNewListing } from "./socket";
import { enqueuePayout } from './jobs/payoutQueue';
import { pool } from "./db";
import crypto from "crypto";
import path from "path";
import fs from "fs";

// Helper: Validate Ghana mobile number E.164 format (e.g., +233XXXXXXXXX)
function isValidGhanaMobileNumber(mobile?: string) {
  if (!mobile) return false;
  // Accept +233 followed by 9 digits, or leading 0 followed by 9 digits; normalize later
  const e164Regex = /^\+233[0-9]{9}$/;
  const localRegex = /^0[0-9]{9}$/;
  return e164Regex.test(mobile) || localRegex.test(mobile);
}

function normalizeGhanaMobileToE164(mobile: string) {
  if (!mobile) return mobile;
  if (/^0[0-9]{9}$/.test(mobile)) {
    return `+233${mobile.slice(1)}`;
  }
  return mobile;
}

// Middleware to require authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized - Please log in" });
  }
  next();
}

// Middleware to require specific role
function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
      return res.status(401).json({ message: "Unauthorized - Please log in" });
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
    }
    next();
  };
}

export async function registerRoutes(app: Express, httpServer: Server, io?: SocketServer): Promise<void> {
  // Health endpoint for SMTP diagnostics. Note: updating routes requires restarting the server to take effect.
  app.get('/health/smtp', (req, res) => {
    try {
      const status = getSmtpStatus();
      res.json({ ok: true, status });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: err && err.message ? err.message : String(err) });
    }
  });

  // General health endpoint (with optional verbose checks via ?verbose=1)
  app.get('/api/health', async (req, res) => {
    try {
      const verbose = req.query.verbose === '1' || req.query.verbose === 'true';

      const basic = {
        ok: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        nodeEnv: process.env.NODE_ENV || 'development',
      };

      if (!verbose) return res.json(basic);

      // Gather more details: DB connectivity, Redis session store, SMTP, storage type
      const dbStatus: any = { ok: false, error: null };
      try {
        if ((pool as any)) {
          await (pool as any).query('SELECT 1');
          dbStatus.ok = true;
        } else {
          dbStatus.ok = false;
          dbStatus.error = 'No DATABASE_URL configured';
        }
      } catch (err: any) {
        dbStatus.ok = false;
        dbStatus.error = err && err.message ? err.message : String(err);
      }

      const redisStatus: any = { ok: false, type: null, error: null };
      try {
        // sessionStore may be RedisStore with a client attached
        if (sessionStore) {
          const name = sessionStore.constructor && sessionStore.constructor.name ? sessionStore.constructor.name : 'unknown';
          redisStatus.type = name;
          // Attempt a ping if session store exposes `client` (connect-redis) or `get`/set
          // Many Redis stores expose `client` property; use best effort
          const client: any = (sessionStore as any).client || (sessionStore as any).redisClient;
          if (client && client.ping) {
            try {
              const pong = await client.ping();
              redisStatus.ok = pong === 'PONG' || pong === 'OK' || pong === true;
            } catch (pingErr) {
              redisStatus.ok = false;
              redisStatus.error = pingErr && (pingErr as Error).message ? (pingErr as Error).message : String(pingErr);
            }
          } else {
            // If no client present, assume MemoryStore or unknown store
            redisStatus.ok = name !== 'MemoryStore';
          }
        } else {
          redisStatus.ok = false;
          redisStatus.error = 'No session store configured';
        }
      } catch (err: any) {
        redisStatus.ok = false;
        redisStatus.error = err && err.message ? err.message : String(err);
      }

      const smtpStatus = getSmtpStatus ? getSmtpStatus() : { configured: false };

      const storageType = storage ? (storage as any).constructor?.name || 'unknown' : 'none';

      return res.json({ ...basic, checks: { db: dbStatus, redis: redisStatus, smtp: smtpStatus, storage: storageType } });
    } catch (err: any) {
      console.error('Health check error:', err);
      return res.status(500).json({ ok: false, message: 'Health checks failed', error: err && err.message ? err.message : String(err) });
    }
  });
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);

      // Validate email format more strictly
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check password strength
      if (data.password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email.toLowerCase());
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      const user = await storage.createUser({
        ...data,
        email: data.email.toLowerCase(), // Normalize email
        password: hashedPassword,
      });

      // Create session
      req.session.user = sanitizeUser(user);

      // Send welcome email (async, don't wait for it)
      sendWelcomeEmail(user.email, user.fullName, user.role).catch(err => {
        console.error('Failed to send welcome email:', err);
      });

      res.status(201).json({ user: sanitizeUser(user) });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      // Normalize email
      const normalizedEmail = email?.toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`Login: user found:`, user ? { ...user, verified: user.verified } : 'null');

      // Check if lockout is active
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        return res.status(403).json({ message: "Account locked due to multiple failed login attempts. Please try again later." });
      }

      // Compare password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        // Increment failed login attempts and enforce lockout after repeated failures
        try {
          const attempts = (user.failedLoginAttempts || 0) + 1;
          const updates: any = { failedLoginAttempts: attempts };
          const LOCKOUT_THRESHOLD = 5; // after 5 failed attempts
          const LOCKOUT_MINUTES = 60; // lock for 60 minutes
          if (attempts >= LOCKOUT_THRESHOLD) {
            updates.lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
            updates.failedLoginAttempts = 0; // reset attempts after locking
          }
          await storage.updateUser(user.id, updates);
        } catch (err) {
          console.error('Failed to update login attempts:', err);
        }

        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Reset failed login attempts on success
      if ((user.failedLoginAttempts || 0) > 0 || user.lockedUntil) {
        await storage.updateUser(user.id, { failedLoginAttempts: 0, lockedUntil: null });
      }

      // Create session
      req.session.user = sanitizeUser(user);

      // Force session save to ensure cookie is set
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ user: sanitizeUser(user) });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(400).json({ message: error.message || "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // Password reset endpoints
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const normalizedEmail = email.toLowerCase();
      const user = await storage.getUserByEmail(normalizedEmail);

      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ success: true, message: "If an account exists, a reset link has been sent" });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to user
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Send reset email
      const result = await sendPasswordResetEmail(user.email, resetToken, user.fullName);

      if (!result.success) {
        console.error('Failed to send password reset email:', result.error);
      }

      res.json({ success: true, message: "If an account exists, a reset link has been sent" });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Validate password strength
      if (newPassword.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Find user with this token
      const user = await storage.getUserByResetToken(token);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      // Send confirmation email
      await sendPasswordChangedEmail(user.email, user.fullName);

      res.json({ success: true, message: "Password successfully reset" });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "An error occurred. Please try again later." });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    if (req.session.user) {
      try {
        const freshUser = await storage.getUser(req.session.user.id);
        if (!freshUser) return res.status(404).json({ message: 'User not found' });
        req.session.user = { ...(freshUser as any) };
        const { password, ...safeUser } = freshUser as any;
        res.json({ user: safeUser });
      } catch (err) {
        console.error('Error fetching user for /api/auth/me', err);
        res.status(500).json({ message: 'Failed to fetch user' });
      }
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // NOTE: `forgot-password` route defined above; duplicate removed to prevent route shadowing.

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ message: "Token and new password are required" });
      }

      // Find user by reset token
      const user = await storage.getUserByResetToken(token);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (!user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
        return res.status(400).json({ message: "Reset token has expired" });
      }

      // Hash new password
      const hashedPassword = await hashPassword(newPassword);

      // Update password and clear reset token
      await storage.updateUser(user.id, {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      res.json({ message: "Password has been reset successfully. You can now log in with your new password." });
    } catch (error: any) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Listing routes
  app.get("/api/listings", async (req, res) => {
    try {
      const listings = await storage.getAllListingsWithFarmer();
      res.json(listings);
    } catch (error: any) {
      console.error("Get listings error:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  // Get pricing tiers for a listing (Must be before generic :id route)
  app.get("/api/listings/:id/pricing-tiers", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      console.log(`[PricingTiers] Fetching tiers for listing ${id}`);
      const tiers = await storage.getPricingTiersByListing(id);
      res.json(tiers);
    } catch (error: any) {
      console.error("Get pricing tiers error:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
    }
  });

  app.get("/api/listings/:id", async (req, res) => {
    try {
      const listing = await storage.getListingWithFarmer(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      res.json(listing);
    } catch (error: any) {
      console.error("Get listing error:", error);
      res.status(500).json({ message: "Failed to fetch listing" });
    }
  });

  app.patch("/api/listings/:id", requireRole("farmer"), async (req, res) => {
    try {
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      if (listing.farmerId !== req.session.user!.id) {
        return res.status(403).json({ message: "You can only edit your own listings" });
      }

      const updatedListing = await storage.updateListing(req.params.id, req.body);
      res.json(updatedListing);
    } catch (error: any) {
      console.error("Update listing error:", error);
      res.status(400).json({ message: "Failed to update listing" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", requireAuth, upload.array('images', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = (req.files as Express.Multer.File[]).map(file => {
        const b64 = Buffer.from(file.buffer).toString('base64');
        const mimeType = file.mimetype;
        const url = `data:${mimeType};base64,${b64}`;
        return {
          filename: file.originalname,
          originalName: file.originalname,
          size: file.size,
          url
        };
      });

      res.json({
        message: "Files uploaded successfully",
        files: uploadedFiles
      });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(400).json({ message: error.message || "Failed to upload files" });
    }
  });

  // Delete uploaded file endpoint
  app.delete("/api/upload/:filename", requireAuth, async (req, res) => {
    try {
      const filename = req.params.filename;

      // Validate filename to prevent path traversal or malformed requests
      if (!filename || !isValidFilename(filename)) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      try {
        await deleteUploadedFile(filename);
        return res.json({ message: "File deleted successfully" });
      } catch (err: any) {
        if (err && err.code === 'ENOENT') {
          return res.status(404).json({ message: 'File not found' });
        }
        console.error('File deletion error:', err);
        return res.status(500).json({ message: 'Failed to delete file' });
      }
    } catch (error: any) {
      console.error("File deletion error:", error);
      res.status(400).json({ message: "Failed to delete file" });
    }
  });

  app.post("/api/listings", requireRole("farmer"), async (req, res) => {
    try {
      // Get farmer ID from authenticated session
      const farmerId = req.session.user!.id;

      const data = insertListingSchema.parse({
        ...req.body,
        farmerId,
      });

      const listing = await storage.createListing(data);

      // Broadcast new listing to all connected users
      const listingWithFarmer = await storage.getListingWithFarmer(listing.id);
      if (listingWithFarmer) {
        broadcastNewListing(listingWithFarmer, io);
      }

      res.json(listing);
    } catch (error: any) {
      console.error("Create listing error:", error);
      res.status(400).json({ message: error.message || "Failed to create listing" });
    }
  });

  app.patch("/api/listings/:id", requireRole("farmer"), async (req, res) => {
    try {
      // Verify ownership
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.farmerId !== req.session.user!.id) {
        return res.status(403).json({ message: "Forbidden - Not your listing" });
      }

      const updated = await storage.updateListing(req.params.id, req.body);

      res.json(updated);
    } catch (error: any) {
      console.error("Update listing error:", error);
      res.status(400).json({ message: "Failed to update listing" });
    }
  });

  app.delete("/api/listings/:id", requireRole("farmer"), async (req, res) => {
    try {
      // Verify ownership
      const listing = await storage.getListing(req.params.id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.farmerId !== req.session.user!.id) {
        return res.status(403).json({ message: "Forbidden - Not your listing" });
      }

      const success = await storage.deleteListing(req.params.id);
      res.json({ success });
    } catch (error: any) {
      console.error("Delete listing error:", error);
      res.status(500).json({ message: "Failed to delete listing" });
    }
  });

  // Farmer-specific routes
  app.get("/api/farmer/listings", requireRole("farmer"), async (req, res) => {
    try {
      const farmerId = req.session.user!.id;
      const listings = await storage.getListingsByFarmer(farmerId);
      res.json(listings);
    } catch (error: any) {
      console.error("Get farmer listings error:", error);
      res.status(500).json({ message: "Failed to fetch listings" });
    }
  });

  app.get("/api/farmer/orders", requireRole("farmer"), async (req, res) => {
    try {
      const farmerId = req.session.user!.id;
      const orders = await storage.getOrdersByFarmer(farmerId);
      res.json(orders);
    } catch (error: any) {
      console.error("Get farmer orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Buyer-specific routes
  app.get("/api/buyer/orders", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;
      const orders = await storage.getOrdersByBuyer(buyerId);
      res.json(orders);
    } catch (error: any) {
      console.error("Get buyer orders error:", error);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get individual order details
  app.get("/api/orders/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const order = await storage.getOrderWithDetails(req.params.id);
      if (!order) {
        console.warn(`Order not found: ${req.params.id} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user is buyer or farmer of this order
      const userId = req.session.user.id;
      // If user is admin, allow access. Otherwise, ensure the user is the buyer or farmer.
      if (req.session.user.role !== 'admin' && order.buyerId !== userId && order.farmerId !== userId) {
        return res.status(403).json({ message: "Forbidden - Not your order" });
      }

      res.json(order);
    } catch (error: any) {
      console.error("Get order error:", error);
      res.status(500).json({ message: "Failed to fetch order" });
    }
  });

  // Update order status (cancel by buyer)
  app.patch("/api/orders/:id", async (req, res) => {
    try {
      if (!req.session.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { status } = req.body;
      const userId = req.session.user.id;

      // Get order
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        console.warn(`Order not found: ${req.params.id} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Buyers can only cancel their own pending orders
      if (order.buyerId === userId && status === "cancelled" && order.status === "pending") {
        const updated = await storage.updateOrderStatus(req.params.id, "cancelled");

        // Notify farmer
        await sendNotificationToUser(order.farmerId, {
          userId: order.farmerId,
          type: "order_update",
          title: "Order Cancelled",
          message: `A buyer has cancelled their order`,
          relatedId: order.id,
          relatedType: "order",
        }, io);

        return res.json(updated);
      }

      return res.status(403).json({ message: "Cannot update this order" });
    } catch (error: any) {
      console.error("Update order error:", error);
      res.status(400).json({ message: error.message || "Update failed" });
    }
  });

  // Cart routes
  app.get("/api/cart", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;
      const cartItems = await storage.getCartItemsByBuyer(buyerId);
      res.json(cartItems);
    } catch (error: any) {
      console.error("Get cart error:", error);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;

      const data = insertCartItemSchema.parse({
        ...req.body,
        buyerId,
      });

      // Validate against listing availability
      const listing = await storage.getListing(data.listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      if (data.quantity > listing.quantityAvailable) {
        return res.status(400).json({
          message: `Only ${listing.quantityAvailable} ${listing.unit} available`
        });
      }

      if (data.quantity < listing.minOrderQuantity) {
        return res.status(400).json({
          message: `Minimum order is ${listing.minOrderQuantity} ${listing.unit}`
        });
      }

      const cartItem = await storage.addToCart(data);
      res.json(cartItem);
    } catch (error: any) {
      console.error("Add to cart error:", error);
      res.status(400).json({ message: error.message || "Failed to add to cart" });
    }
  });

  app.delete("/api/cart/:id", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;

      // Verify ownership
      const item = await storage.getCartItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (item.buyerId !== buyerId) {
        return res.status(403).json({ message: "Forbidden - Not your cart item" });
      }

      const success = await storage.removeFromCart(req.params.id);
      res.json({ success });
    } catch (error: any) {
      console.error("Remove from cart error:", error);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.patch("/api/cart/:id", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;
      const { quantity } = req.body;

      // Verify ownership
      const item = await storage.getCartItem(req.params.id);
      if (!item) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      if (item.buyerId !== buyerId) {
        return res.status(403).json({ message: "Forbidden - Not your cart item" });
      }

      // Check listing availability
      const listing = await storage.getListing(item.listingId);
      if (!listing) {
        return res.status(400).json({ message: "Listing no longer available" });
      }
      if (quantity > listing.quantityAvailable) {
        return res.status(400).json({
          message: `Only ${listing.quantityAvailable} ${listing.unit} available`
        });
      }

      const updated = await storage.updateCartQuantity(req.params.id, quantity);
      res.json(updated);
    } catch (error: any) {
      console.error("Update cart quantity error:", error);
      res.status(500).json({ message: "Failed to update cart quantity" });
    }
  });

  // Order routes
  app.post("/api/orders/checkout", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;
      const { deliveryAddress, notes, autoPay } = req.body;
      console.log(`[Checkout] Request from buyer ${buyerId}`, { deliveryAddress, notes, autoPay });

      // Validate required fields
      if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length === 0) {
        return res.status(400).json({ message: "Delivery address is required" });
      }

      // Get cart items
      const cartItems = await storage.getCartItemsByBuyer(buyerId);
      console.log(`[Checkout] Cart items for buyer ${buyerId}:`, cartItems.length);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }

      // Validate all cart items before creating orders
      for (const item of cartItems) {
        const listing = await storage.getListing(item.listingId);
        if (!listing) {
          return res.status(400).json({
            message: `Listing ${item.listing.productName} no longer available`
          });
        }

        if (item.quantity > listing.quantityAvailable) {
          return res.status(400).json({
            message: `Only ${listing.quantityAvailable} ${listing.unit} of ${listing.productName} available`
          });
        }
      }

      // Calculate total transaction amount
      let totalTransactionAmount = 0;
      for (const item of cartItems) {
        const tiers = await storage.getPricingTiersByListing(item.listingId);
        let pricePerUnit = Number(item.listing.price);

        if (tiers && tiers.length > 0) {
          const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
          const applicableTier = sortedTiers.find(tier => item.quantity >= tier.minQuantity);
          if (applicableTier && applicableTier.price) {
            pricePerUnit = Number(applicableTier.price);
          }
        }

        totalTransactionAmount += (pricePerUnit * item.quantity);
      }

      // Create transaction record first
      const transaction = await storage.createTransaction({
        reference: `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        buyerId, // Added to satisfy DB constraint
        amount: totalTransactionAmount.toFixed(2),
        status: 'pending',
        metadata: JSON.stringify({ buyerId, paymentMethod: autoPay ? 'paystack' : 'manual' }),
      });

      // Create orders (one per cart item) linked to the transaction
      const orders = [];
      for (const item of cartItems) {
        // Calculate tier-based pricing
        const tiers = await storage.getPricingTiersByListing(item.listingId);
        let pricePerUnit = Number(item.listing.price);

        // Validate base price
        if (isNaN(pricePerUnit) || !item.listing.price) {
          console.error(`Invalid base price for listing ${item.listingId}:`, item.listing.price);
          return res.status(500).json({
            message: `Invalid price for ${item.listing.productName}`
          });
        }

        if (tiers && tiers.length > 0) {
          // Sort tiers by minQuantity descending to find the highest applicable tier
          const sortedTiers = [...tiers].sort((a, b) => b.minQuantity - a.minQuantity);
          const applicableTier = sortedTiers.find(tier => item.quantity >= tier.minQuantity);
          if (applicableTier && applicableTier.price) {
            const tierPrice = Number(applicableTier.price);
            if (!isNaN(tierPrice)) {
              pricePerUnit = tierPrice;
            }
          }
        }

        const totalPrice = (pricePerUnit * item.quantity).toFixed(2);

        const order = await storage.createOrder({
          buyerId,
          farmerId: item.listing.farmerId,
          listingId: item.listingId,
          quantity: item.quantity,
          totalPrice,
          deliveryAddress,
          notes,
        });
        orders.push(order);

        // Send email notifications (async, non-blocking)
        const buyer = await storage.getUser(buyerId);
        const farmer = await storage.getUser(item.listing.farmerId);

        if (buyer) {
          sendOrderConfirmationEmail(
            buyer.email,
            buyer.fullName,
            {
              orderId: order.id,
              productName: item.listing.productName,
              quantity: item.quantity,
              totalPrice: Number(totalPrice),
              farmerName: farmer?.fullName || 'Farmer',
            }
          ).catch(err => console.error('Failed to send order confirmation email:', err));
        }

        if (farmer) {
          sendNewOrderNotificationToFarmer(
            farmer.email,
            farmer.fullName,
            {
              orderId: order.id,
              productName: item.listing.productName,
              quantity: item.quantity,
              totalPrice: Number(totalPrice),
              buyerName: buyer?.fullName || 'Buyer',
            }
          ).catch(err => console.error('Failed to send farmer notification email:', err));
        }

        // Notify farmer about new order
        await sendNotificationToUser(item.listing.farmerId, {
          userId: item.listing.farmerId,
          type: "order_update",
          title: "New Order Received",
          message: `You have a new order for ${item.listing.productName} (${item.quantity} ${item.listing.unit})`,
          relatedId: order.id,
          relatedType: "order",
        }, io);
      }


      // If autoPay requested, initiate payment for the entire transaction
      if (autoPay && orders.length > 0) {
        const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
        if (paystackSecret) {
          const amountInKobo = Math.round(totalTransactionAmount * 100);
          const buyer = await storage.getUser(buyerId);

          // Collect farmers with missing recipients so frontend can warn buyers
          const farmerIds = Array.from(new Set(orders.map(o => o.farmerId)));
          const missingRecipients: string[] = [];
          for (const fid of farmerIds) {
            const f = await storage.getUser(fid);
            if (!f || !(f as any).paystackRecipientCode) missingRecipients.push(fid);
          }

          const bodyPayload: any = { email: buyer?.email, amount: amountInKobo, metadata: { transactionId: transaction.id } };
          // Use the frontend provided returnUrl for client verification
          if (req.body.returnUrl) {
            // Append order IDs to callback URL so that the client can determine which orders this payment maps to.
            try {
              const parsed = new URL(req.body.returnUrl);
              // Append a query param 'orders' with csv of order ids
              parsed.searchParams.set('orders', orders.map(o => o.id).join(','));
              bodyPayload.callback_url = parsed.toString();
            } catch (err) {
              // If the returnUrl is not a full URL, default to original value provided
              bodyPayload.callback_url = req.body.returnUrl;
            }
          }
          const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${paystackSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(bodyPayload),
          });
          if (!initRes.ok) {
            const text = await initRes.text().catch(() => '');
            console.error('Paystack init failed', initRes.status, text);
            // Return orders but indicate we could not initiate payment
            return res.json({ orders, transaction, autoPay: { queued: false, message: 'Failed to initialize payment provider' } });
          }
          const body = await initRes.json();
          const { authorization_url, reference } = body.data || {};

          // Update transaction with Paystack reference
          await storage.updateTransaction(transaction.id, { metadata: JSON.stringify({ ...JSON.parse(transaction.metadata || '{}'), paystackReference: reference }) });

          console.log(`[Checkout] Transaction created: ${transaction.id}`);

          // Create a payment record for each order linked to the transaction
          const payments = [] as any[];
          for (const o of orders) {
            console.log(`[Checkout] Creating payment for order ${o.id}`);
            const p = await storage.createPayment({
              orderId: o.id,
              payerId: buyerId,
              transactionId: transaction.id,
              amount: String(o.totalPrice),
              paymentMethod: 'paystack',
              paystackReference: reference,
              status: 'pending'
            } as any);
            payments.push(p);
          }
          // Notify buyer and farmers
          try {
            await sendNotificationToUser(buyerId, { userId: buyerId, type: 'order_update', title: 'Payment initiated', message: `Payment initiated for ${orders.length} order(s).`, relatedId: transaction.id, relatedType: 'transaction' }, io);
            // Notify all farmers involved
            const farmerIds = Array.from(new Set(orders.map(o => o.farmerId)));
            for (const fid of farmerIds) {
              try {
                await sendNotificationToUser(fid, { userId: fid, type: 'order_update', title: 'Buyer payment initiated', message: `A buyer has initiated payment for orders.`, relatedId: transaction.id, relatedType: 'transaction' }, io);
              } catch (err) { /* ignore individual notification errors */ }
            }
          } catch (err) { console.error('Failed to create payment notifications', err); }
          return res.json({ orders, transaction, autoPay: { payments, authorization_url, reference, missingRecipients } });
        }
      }

      res.json({ orders, transaction });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(400).json({ message: error.message || "Checkout failed" });
    }
  });

  app.patch("/api/orders/:id/status", requireRole("farmer"), async (req, res) => {
    try {
      const { status } = req.body;
      const farmerId = req.session.user!.id;

      // Validate status
      const validStatuses = ["pending", "accepted", "rejected", "completed", "cancelled", "delivered"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ message: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
      }

      // Verify ownership
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        console.warn(`Order not found: ${req.params.id} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.farmerId !== farmerId) {
        return res.status(403).json({ message: "Forbidden - Not your order" });
      }

      // If marking as delivered, ensure order has a completed payment
      // Skip payment validation in test environments
      if (status === 'delivered' && process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
        const payments = await storage.getPaymentsByOrder(req.params.id);
        const hasCompletedPayment = payments.some((p: any) => p.status === 'completed');
        if (!hasCompletedPayment) {
          // Notify buyer to complete payment and inform farmer that delivery cannot be marked
          try {
            await sendNotificationToUser(order.buyerId, {
              userId: order.buyerId,
              type: 'order_update',
              title: 'Payment Required',
              message: `Cannot mark order ${order.id} as delivered because payment has not been confirmed. Please complete payment.`,
              relatedId: order.id,
              relatedType: 'order',
            }, io);
            await sendNotificationToUser(order.farmerId, {
              userId: order.farmerId,
              type: 'order_update',
              title: 'Delivery Blocked - Payment Missing',
              message: `Order ${order.id} cannot be marked as delivered because payment has not been confirmed.`,
              relatedId: order.id,
              relatedType: 'order',
            }, io);
          } catch (err) { console.error('Failed to notify about missing payment on delivery attempt', err); }
          return res.status(400).json({ message: 'Cannot mark as delivered: no confirmed payment for this order' });
        }
      }

      // Handle Refunds on Rejection
      if (status === 'rejected') {
        const payments = await storage.getPaymentsByOrder(req.params.id);
        const completedPayment = payments.find((p: any) => p.status === 'completed');

        if (completedPayment && completedPayment.paymentMethod === 'paystack' && completedPayment.transactionId) {
          console.log(`[Refund] Initiating refund for rejected order ${req.params.id}, payment ${completedPayment.id}`);
          const paystackSecret = process.env.PAYSTACK_SECRET_KEY;

          if (paystackSecret) {
            try {
              const refundRes = await fetch('https://api.paystack.co/refund', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${paystackSecret}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transaction: completedPayment.transactionId,
                  amount: Number(completedPayment.amount) * 100 // Amount in kobo
                }),
              });

              if (refundRes.ok) {
                const refundData = await refundRes.json();
                console.log(`[Refund] Refund successful for order ${req.params.id}`, refundData);

                // Update payment status
                await storage.updatePaymentStatus(completedPayment.id, 'refunded');

                // Update escrow if exists
                const escrow = await storage.getEscrowByOrder(req.params.id);
                if (escrow) {
                  await storage.updateEscrowStatus(escrow.id, 'refunded');
                }

                // Notify buyer
                const orderDetails = await storage.getOrderWithDetails(order.id);
                await sendNotificationToUser(order.buyerId, {
                  userId: order.buyerId,
                  type: 'order_update',
                  title: 'Order Refunded',
                  message: `Your order for ${orderDetails?.listing.productName || 'product'} was rejected and a refund has been initiated.`,
                  relatedId: order.id,
                  relatedType: 'order',
                }, io);
              } else {
                const errorText = await refundRes.text();
                console.error(`[Refund] Paystack refund failed: ${errorText}`);
                // We still reject the order but log the refund failure. 
                // In a real system, you might want to flag this for admin review.
                await sendNotificationToUser(order.farmerId, {
                  userId: order.farmerId,
                  type: 'order_update',
                  title: 'Refund Failed',
                  message: `Order rejected but automatic refund failed. Please contact support.`,
                  relatedId: order.id,
                  relatedType: 'order',
                }, io);
              }
            } catch (err) {
              console.error(`[Refund] Error processing refund:`, err);
            }
          }
        }
      }

      const updated = await storage.updateOrderStatus(req.params.id, status);

      // Notify buyer about order status update
      const statusMessages: Record<string, string> = {
        accepted: "Your order has been accepted",
        rejected: "Your order has been rejected",
        delivered: "Your order has been delivered - please confirm receipt",
        completed: "Your order has been completed",
        cancelled: "Your order has been cancelled",
      };

      if (statusMessages[status]) {
        const orderDetails = await storage.getOrderWithDetails(req.params.id);
        if (orderDetails) {
          await sendNotificationToUser(order.buyerId, {
            userId: order.buyerId,
            type: "order_update",
            title: "Order Status Update",
            message: `${statusMessages[status]}: ${orderDetails.listing.productName}`,
            relatedId: order.id,
            relatedType: "order",
          }, io);
        }
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Update order status error:", error);
      res.status(400).json({ message: "Failed to update order status" });
    }
  });

  // Buyer confirms receipt of delivery
  app.patch("/api/orders/:id/complete", requireRole("buyer"), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;

      // Verify ownership
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        console.warn(`Order not found: ${req.params.id} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.buyerId !== buyerId) {
        return res.status(403).json({ message: "Forbidden - Not your order" });
      }
      if (order.status !== "delivered") {
        return res.status(400).json({ message: `Order must be delivered before completion, current status: ${order.status}` });
      }

      // Ensure payment has been completed for this order before allowing completion
      // Skip payment validation in test environments
      if (process.env.ENABLE_TEST_ENDPOINTS !== 'true') {
        const payments = await storage.getPaymentsByOrder(req.params.id);
        const hasCompletedPayment = payments.some((p: any) => p.status === 'completed');
        if (!hasCompletedPayment) {
          try {
            await sendNotificationToUser(order.buyerId, {
              userId: order.buyerId,
              type: 'order_update',
              title: 'Payment Required',
              message: `Cannot complete order ${order.id} because no completed payment exists. Please complete payment to confirm receipt.`,
              relatedId: order.id,
              relatedType: 'order',
            }, io);
            await sendNotificationToUser(order.farmerId, {
              userId: order.farmerId,
              type: 'order_update',
              title: 'Completion Blocked - Payment Missing',
              message: `Buyer attempted to confirm receipt for order ${order.id} but no confirmed payment was found.`,
              relatedId: order.id,
              relatedType: 'order',
            }, io);
          } catch (err) { console.error('Failed to notify about missing payment on complete attempt', err); }
          return res.status(400).json({ message: 'Cannot complete order: no confirmed payment for this order' });
        }
      }

      const updated = await storage.updateOrderStatus(req.params.id, "completed");

      // Notify farmer about completion
      const orderDetails = await storage.getOrderWithDetails(req.params.id);
      if (orderDetails) {
        await sendNotificationToUser(order.farmerId, {
          userId: order.farmerId,
          type: "order_update",
          title: "Order Completed",
          message: `Order for ${orderDetails.listing.productName} has been confirmed as received`,
          relatedId: order.id,
          relatedType: "order",
        }, io);
        await sendNotificationToUser(order.buyerId, {
          userId: order.buyerId,
          type: "order_update",
          title: "Order Completed",
          message: `You have confirmed receipt for ${orderDetails.listing.productName}. Thank you!`,
          relatedId: order.id,
          relatedType: "order",
        }, io);
      }

      // Create payout now that order is completed
      await maybeCreatePayoutForOrder(req.params.id);

      res.json(updated);
    } catch (error: any) {
      console.error("Complete order error:", error);
      res.status(400).json({ message: "Failed to complete order" });
    }
  });

  // Create payout automatically after order completion
  // This is a simple flow: a platform commission is applied, then a payout record is created.
  // For full production, replace with a job queue and reconciliation system.
  async function maybeCreatePayoutForOrder(orderId: string) {
    try {
      const order = await storage.getOrder(orderId);
      if (!order) return;
      if (order.status !== 'completed') return; // only for completed orders

      const platformCommissionPercent = Number(process.env.PLATFORM_COMMISSION_PERCENT || '5');
      console.log('maybeCreatePayoutForOrder', orderId, 'commission%', platformCommissionPercent);
      const total = Number(order.totalPrice || 0);
      const payoutAmount = Number((total * (1 - platformCommissionPercent / 100)).toFixed(2));
      console.log('maybeCreatePayoutForOrder', 'total', total, 'payoutAmount', payoutAmount);

      // Release escrow
      const escrow = await storage.getEscrowByOrder(orderId);
      if (escrow) {
        await storage.updateEscrowStatus(escrow.id, 'released');
        console.log(`[Escrow] Released funds for order ${orderId}`);
      }

      // Credit farmer's wallet
      await storage.createWalletTransaction({
        userId: order.farmerId,
        amount: String(payoutAmount),
        type: 'credit',
        description: `Payout for order #${order.id.slice(0, 8)}`,
        referenceId: order.id,
        referenceType: 'order'
      });

      // Notify farmer
      try {
        await sendNotificationToUser(order.farmerId, {
          userId: order.farmerId,
          type: 'wallet_update',
          title: 'Wallet Credited',
          message: `Your wallet has been credited with GHS ${payoutAmount} for order #${order.id.slice(0, 8)}`,
          relatedId: order.id,
          relatedType: 'order'
        }, io);
      } catch (err) { console.error('Failed to notify farmer about wallet credit', err); }

    } catch (err) {
      console.error('Failed to process wallet credit for order', orderId, err);
    }
  }

  async function enqueuePayout(payoutId: string) {
    try {
      const payout = await storage.getPayout(payoutId);
      if (!payout) return;
      if (payout.status !== 'pending') return;

      const farmer = await storage.getUser(payout.farmerId);
      const recipientCode = (farmer as any)?.paystackRecipientCode;

      if (!recipientCode) {
        console.error(`Cannot process payout ${payoutId}: Farmer ${payout.farmerId} has no recipient code`);
        await storage.updatePayout(payoutId, { status: 'failed' } as any);
        return;
      }

      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        console.error('PAYSTACK_SECRET_KEY not configured');
        return;
      }

      console.log(`Processing payout ${payoutId} for farmer ${payout.farmerId} amount ${payout.amount}`);

      // Initiate Transfer
      const res = await fetch('https://api.paystack.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: Math.round(Number(payout.amount) * 100), // kobo
          recipient: recipientCode,
          reason: `Payout for AgriCompass Sales`,
        }),
      });

      if (!res.ok) {
        const errorBody = await res.text();
        console.error('Paystack transfer failed', res.status, errorBody);
        await storage.updatePayout(payoutId, { status: 'failed' } as any);
        return;
      }

      const body = await res.json();
      if (body.status === false) {
        console.error('Paystack transfer API returned false status', body);
        await storage.updatePayout(payoutId, { status: 'failed' } as any);
        return;
      }

      const transferCode = body.data.transfer_code;
      await storage.updatePayout(payoutId, { status: 'processing', transactionId: transferCode } as any);
      console.log(`Payout ${payoutId} initiated. Transfer code: ${transferCode}`);

      // Notify farmer
      try {
        await sendNotificationToUser(payout.farmerId, {
          userId: payout.farmerId,
          type: 'payout_update',
          title: 'Payout Processing',
          message: `Your payout of GHS ${payout.amount} is being processed.`,
          relatedId: payout.id,
          relatedType: 'payout'
        }, io);
      } catch (err) { console.error('Failed to notify farmer about payout', err); }

    } catch (err) {
      console.error('enqueuePayout error:', err);
    }
  }

  // ====================
  // VERIFICATION ROUTES
  // ====================

  // Get all verifications for field officers
  app.get("/api/verifications", requireRole("field_officer"), async (req: Request, res: Response) => {
    try {
      // Get ALL verifications, not just ones assigned to this officer
      const allVerifications = await storage.getAllVerifications();

      // Fetch farmer details for each verification
      const verificationsWithFarmers = await Promise.all(
        allVerifications.map(async (v: any) => {
          const farmer = await storage.getUser(v.farmerId);
          if (!farmer) return null;

          const { password, ...safeFarmer } = farmer;
          return { ...v, farmer: safeFarmer };
        })
      );

      res.json(verificationsWithFarmers.filter(v => v !== null));
    } catch (error: any) {
      console.error("Get verifications error:", error);
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  // Get farmer's own verification status
  app.get("/api/verifications/me", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const farmerId = req.session.user!.id;
      const verification = await storage.getVerificationByFarmer(farmerId);
    } catch (error: any) {
      console.error("Get verification error:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  // Submit verification request (farmer)
  app.post("/api/verifications/request", requireRole("farmer"), async (req: Request, res: Response) => {
    console.log('Verification request submitted');
    try {
      const farmerId = req.session.user!.id;
      const { farmSize, farmLocation, experienceYears, additionalInfo, documentUrl } = req.body;

      // Check if farmer already has a pending verification
      const existing = await storage.getVerificationByFarmer(farmerId);
      if (existing) {
        return res.status(400).json({ message: "You already have a verification request" });
      }

      // Update user farm size first
      await storage.updateUser(farmerId, { farmSize });

      // Get first available field officer
      const officers = await storage.getUsersByRole("field_officer");
      if (officers.length === 0) {
        return res.status(400).json({ message: "No field officers available" });
      }

      const verification = await storage.createVerification({
        farmerId,
        officerId: officers[0].id, // Assign to first officer
        notes: `Farm Location: ${farmLocation}\nExperience: ${experienceYears} years\n${additionalInfo || ''}`,
        documentUrl: documentUrl || null,
      });

      // Notify officer about new verification request
      const farmer = await storage.getUser(farmerId);
      if (farmer) {
        await sendNotificationToUser(officers[0].id, {
          userId: officers[0].id,
          type: "verification_update",
          title: "New Verification Request",
          message: `${farmer.fullName} has submitted a verification request`,
          relatedId: verification.id,
          relatedType: "verification",
        }, io);
      }

      res.json(verification);
    } catch (error: any) {
      console.error("Create verification request error:", error);
      res.status(400).json({ message: error.message || "Failed to create verification request" });
    }
  });

  // Get all verifications (for field officers and admins)
  app.get("/api/verifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userRole = req.session.user!.role;

      // Only field officers and admins can view all verifications
      if (userRole !== "field_officer" && userRole !== "admin") {
        return res.status(403).json({ message: "Forbidden - Insufficient permissions" });
      }

      const allVerifications = await storage.getAllVerifications();

      // Enrich with farmer details
      const verificationsWithFarmer = await Promise.all(
        allVerifications.map(async (v) => {
          const farmer = await storage.getUser(v.farmerId);
          return { ...v, farmer };
        })
      );

      res.json(verificationsWithFarmer);
    } catch (error: any) {
      console.error("Get verifications error:", error);
      res.status(500).json({ message: "Failed to fetch verifications" });
    }
  });

  // Review verification (field officer)
  app.patch("/api/verifications/:id/review", requireRole("field_officer"), async (req: Request, res: Response) => {
    console.log('Review endpoint called for id:', req.params.id, 'status:', req.body.status);
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      console.log(`Reviewing verification ${id} with status ${status}`);

      const verification = await storage.updateVerificationStatus(id, status, notes);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
      }

      // If approved, update sessions and notify sockets to refresh user state
      if (status === 'approved') {
        const farmerId = verification.farmerId;
        console.log(`Approving verification for farmer ${farmerId}, verification status updated`);

        // Check user after update
        const updatedUser = await storage.getUser(farmerId);
        console.log(`User after verification update:`, updatedUser ? { ...updatedUser, verified: updatedUser.verified } : 'null');

        // Emit socket event for this farmer's connected clients
        try {
          if (io) io.to(`user:${farmerId}`).emit('user_updated', { userId: farmerId, verified: true });
        } catch (err) { console.error('Failed to emit user_updated socket event', err); }

        // Update in-memory sessions (if supported) so active farmer sessions show verified:true
        try {
          if (sessionStore && typeof sessionStore.all === 'function') {
            sessionStore.all((err: any, sessions: Record<string, any>) => {
              if (err || !sessions) return;
              for (const sid in sessions) {
                const sess = (sessions as any)[sid];
                if (sess && sess.user && sess.user.id === farmerId) {
                  sess.user = { ...sess.user, verified: true };
                  sessionStore.set(sid, sess, (setErr: any) => setErr ? console.error('Failed to update session', setErr) : null);
                }
              }
            });
          }
        } catch (err) { console.error('Error updating farmer sessions after approval', err); }
      }

      // Notify farmer about verification decision
      const farmer = await storage.getUser(verification.farmerId);
      if (farmer) {
        const statusMessages: Record<string, string> = {
          approved: "Your farmer verification has been approved! You are now a verified farmer.",
          rejected: "Your farmer verification request has been rejected. Please review the officer's notes.",
        };

        if (statusMessages[status]) {
          // Send in-app notification
          await sendNotificationToUser(verification.farmerId, {
            userId: verification.farmerId,
            type: "verification_update",
            title: "Verification Status Update",
            message: statusMessages[status],
            relatedId: verification.id,
            relatedType: "verification",
          }, io);

          // Send email notification (async, non-blocking)
          if (status === 'approved' || status === 'rejected') {
            sendVerificationStatusEmail(
              farmer.email,
              farmer.fullName,
              status,
              notes
            ).catch(err => console.error('Failed to send verification status email:', err));
          }
        }
      }

      res.json(verification);
    } catch (error: any) {
      console.error("Review verification error:", error);
      res.status(400).json({ message: "Failed to review verification" });
    }
  });

  // Test-only helper: mark a user as verified and emit socket update
  // Enabled only in test environment to avoid accidental use in production
  // Test helper: gated by explicit env var `ENABLE_TEST_ENDPOINTS=true`.
  // This endpoint must be explicitly enabled in CI or local test runs.
  if (process.env.ENABLE_TEST_ENDPOINTS === 'true') {
    app.post('/__test/mark-verified', async (req: Request, res: Response) => {
      try {
        const { userId } = req.body || {};
        if (!userId) return res.status(400).json({ message: 'userId is required' });

        const user = await storage.getUser(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Mark verified in storage
        await storage.updateUser(userId, { verified: true });

        // Emit socket event to connected clients for this user
        try {
          if (io) io.to(`user:${userId}`).emit('user_updated', { userId, verified: true });
        } catch (emitErr) {
          console.error('Failed to emit user_updated in test helper', emitErr);
        }

        // Update in-memory sessions (if supported) so active sessions reflect verified:true
        try {
          if (sessionStore && typeof sessionStore.all === 'function') {
            sessionStore.all((err: any, sessions: Record<string, any>) => {
              if (err || !sessions) return;
              for (const sid in sessions) {
                const sess = (sessions as any)[sid];
                if (sess && sess.user && sess.user.id === userId) {
                  sess.user = { ...sess.user, verified: true };
                  sessionStore.set(sid, sess, (setErr: any) => setErr ? console.error('Failed to update session in test helper', setErr) : null);
                }
              }
            });
          }
        } catch (sessErr) { console.error('Error updating sessions in test helper', sessErr); }

        const fresh = await storage.getUser(userId);
        const { password, ...safe } = fresh as any;
        res.json({ ok: true, user: safe });
      } catch (err: any) {
        console.error('Test mark-verified error:', err);
        res.status(500).json({ message: 'Failed to mark user verified' });
      }
    });

    // Test-only helper: seed or return a stable test account for E2E runs
    app.post('/__test/seed-account', async (req: Request, res: Response) => {
      try {
        const { role } = req.body || {};
        if (!role) return res.status(400).json({ message: 'role is required' });

        // Use deterministic test email per role so tests can reuse the account
        const testEmail = `${role}@e2e.test`;

        let user = await storage.getUserByEmail(testEmail);
        const plainPassword = 'password';
        const hashed = await hashPassword(plainPassword);

        if (!user) {
          user = await storage.createUser({
            email: testEmail,
            password: hashed,
            fullName: `E2E ${role}`,
            role,
          } as any);
        } else {
          // Ensure password is set to known password for tests and unlock account
          await storage.updateUser(user.id, { password: hashed, failedLoginAttempts: 0, lockedUntil: null });
        }

        const fresh = await storage.getUser(user.id);
        const { password, ...safe } = fresh as any;
        // Return credentials for login via UI
        res.json({ ok: true, email: testEmail, password: plainPassword, user: safe });
      } catch (err: any) {
        console.error('Test seed-account error:', err);
        res.status(500).json({ message: 'Failed to seed account' });
      }
    });

    // Test-only helper: retrieve reset token for a specific email (for E2E tests)
    app.post('/__test/get-reset-token', async (req: Request, res: Response) => {
      try {
        const { email } = req.body || {};
        if (!email) return res.status(400).json({ message: 'email is required' });

        const user = await storage.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.json({ ok: true, email: user.email, resetToken: user.resetToken });
      } catch (err: any) {
        console.error('Test get-reset-token error:', err);
        return res.status(500).json({ message: 'Failed to get reset token' });
      }
    });
  }

  // Field Officer routes
  app.get("/api/officer/farmers", requireRole("field_officer"), async (req, res) => {
    try {
      const farmers = await storage.getUsersByRole("farmer");
      // Remove passwords before sending
      const safeFarmers = farmers.map((farmer: any) => {
        const { password, ...rest } = farmer;
        return rest;
      });
      res.json(safeFarmers);
    } catch (error: any) {
      console.error("Get farmers error:", error);
      res.status(500).json({ message: "Failed to fetch farmers" });
    }
  });

  app.post("/api/officer/verify/:farmerId", requireRole("field_officer"), async (req, res) => {
    try {
      const { farmerId } = req.params;
      const officerId = req.session.user!.id;
      const { status, notes } = req.body;

      // Check if verification already exists
      let verification = await storage.getVerificationByFarmer(farmerId);

      if (!verification) {
        // Create new verification
        verification = await storage.createVerification({
          farmerId,
          officerId,
          notes,
          documentUrl: "",
        });
      }

      // Update verification status
      const updated = await storage.updateVerificationStatus(
        verification.id,
        status,
        notes
      );

      res.json(updated);
    } catch (error: any) {
      console.error("Verify farmer error:", error);
      res.status(400).json({ message: error.message || "Verification failed" });
    }
  });

  // Review verification (approve/reject) - used by officer dashboard
  app.patch("/api/verifications/:id/review", requireRole("field_officer"), async (req, res) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const updated = await storage.updateVerificationStatus(id, status, notes);

      if (!updated) {
        return res.status(404).json({ message: "Verification not found" });
      }

      // If approved, notify farmer
      if (status === "approved") {
        const verification = await storage.getVerificationByFarmer(updated.farmerId); // Re-fetch to get details if needed, or just use updated
        // Actually updated contains farmerId
        await sendNotificationToUser(updated.farmerId, {
          userId: updated.farmerId,
          type: "verification_update",
          title: "Verification Approved",
          message: "Your account has been verified by a field officer.",
          relatedId: updated.id,
          relatedType: "verification",
        }, io as any);
      } else if (status === "rejected") {
        await sendNotificationToUser(updated.farmerId, {
          userId: updated.farmerId,
          type: "verification_update",
          title: "Verification Rejected",
          message: `Your verification was rejected. ${notes ? `Reason: ${notes}` : ""}`,
          relatedId: updated.id,
          relatedType: "verification",
        }, io as any);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Review verification error:", error);
      res.status(500).json({ message: "Failed to review verification" });
    }
  });

  // File upload endpoint - for listing images and verification documents
  app.post("/api/upload", requireAuth, upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Generate unique filename
      const ext = path.extname(req.file.originalname);
      const filename = `${crypto.randomUUID()}${ext}`;
      const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

      // Ensure upload directory exists
      const uploadDir = path.dirname(filePath);
      await fs.promises.mkdir(uploadDir, { recursive: true });

      // Write file from memory buffer
      await fs.promises.writeFile(filePath, req.file.buffer);

      // Return public URL
      const url = `/uploads/${filename}`;
      res.json({ url, filename });
    } catch (error: any) {
      console.error("File upload error:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // User profile routes
  app.get("/api/user/:id", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // ====================
  // MESSAGE ROUTES
  // ====================

  // Get all conversations for current user
  app.get("/api/messages/conversations", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error: any) {
      console.error("Get conversations error:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Get messages between current user and another user
  app.get("/api/messages/:otherUserId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const { otherUserId } = req.params;
      const messages = await storage.getMessagesBetweenUsers(userId, otherUserId);
      res.json(messages);
    } catch (error: any) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Mark a conversation as read
  app.patch("/api/messages/:otherUserId/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const { otherUserId } = req.params;
      await storage.markConversationRead(userId, otherUserId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Mark conversation read error:", error);
      res.status(400).json({ message: "Failed to mark conversation as read" });
    }
  });

  // Get unread message count
  app.get("/api/messages/unread/count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread message count error:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // ====================
  // NOTIFICATION ROUTES
  // ====================

  // Get notifications for the current user
  app.get("/api/notifications", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const notifications = await storage.getNotificationsByUser(userId);
      res.json(notifications);
    } catch (error: any) {
      console.error("Get notifications error:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/unread-count", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const count = await storage.getUnreadNotificationCount(userId);
      res.json({ count });
    } catch (error: any) {
      console.error("Get unread count error:", error);
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const notification = await storage.markNotificationRead(id);

      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json(notification);
    } catch (error: any) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.patch("/api/notifications/mark-all-read", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      await storage.markAllNotificationsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error: any) {
      console.error("Mark all notifications read error:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  // Delete notification
  app.delete("/api/notifications/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteNotification(id);

      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }

      res.json({ message: "Notification deleted" });
    } catch (error: any) {
      console.error("Delete notification error:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // ====================
  // ANALYTICS ROUTES
  // ====================

  // Get analytics data for farmers
  app.get("/api/analytics/farmer", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const farmerId = req.session.user!.id;

      // Get farmer's listings
      const listings = await storage.getListingsByFarmer(farmerId);

      // Get all orders for farmer's products
      const orders = await storage.getOrdersByFarmer(farmerId);

      // Calculate metrics
      const totalListings = listings.length;
      const activeListings = listings.filter((l: any) => l.status === "active").length;
      const totalOrders = orders.length;
      const completedOrders = orders.filter((o: any) => o.status === "completed").length;
      const pendingOrders = orders.filter((o: any) => o.status === "pending").length;

      // Calculate total revenue (completed orders only)
      const totalRevenue = completedOrders > 0
        ? orders
          .filter((o: any) => o.status === "completed")
          .reduce((sum: number, order: any) => sum + Number(order.totalPrice || 0), 0)
        : 0;

      // Sales by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const salesByMonth = orders
        .filter((o: any) => o.createdAt && new Date(o.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], order: any) => {
          const month = new Date(order.createdAt!).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          const existing = acc.find((item: any) => item.month === month);
          if (existing) {
            existing.orders += 1;
            existing.revenue += Number(order.totalPrice || 0);
          } else {
            acc.push({
              month,
              orders: 1,
              revenue: Number(order.totalPrice || 0)
            });
          }
          return acc;
        }, []);

      // Top selling products
      const productSales = orders.reduce((acc: any, order: any) => {
        const listingId = order.listingId;
        if (!acc[listingId]) {
          acc[listingId] = {
            listingId,
            quantity: 0,
            revenue: 0,
          };
        }
        acc[listingId].quantity += order.quantity || 0;
        acc[listingId].revenue += Number(order.totalPrice || 0);
        return acc;
      }, {});

      const topProducts = await Promise.all(
        Object.values(productSales)
          .sort((a: any, b: any) => b.revenue - a.revenue)
          .slice(0, 5)
          .map(async (ps: any) => {
            const listing = await storage.getListing(ps.listingId);
            return {
              name: listing?.productName || 'Unknown',
              quantity: ps.quantity,
              revenue: ps.revenue,
            };
          })
      );

      res.json({
        totalListings,
        activeListings,
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        salesByMonth,
        topProducts,
      });
    } catch (error: any) {
      console.error("Get farmer analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get analytics data for buyers
  app.get("/api/analytics/buyer", requireRole("buyer"), async (req: Request, res: Response) => {
    try {
      const buyerId = req.session.user!.id;

      // Get buyer's orders
      const orders = await storage.getOrdersByBuyer(buyerId);

      // Calculate metrics
      const totalOrders = orders.length;
      const completedOrders = orders.filter((o: any) => o.status === "completed").length;
      const pendingOrders = orders.filter((o: any) => o.status === "pending").length;
      const cancelledOrders = orders.filter((o: any) => o.status === "cancelled").length;

      // Calculate total spending (completed orders only)
      const totalSpending = orders
        .filter((o: any) => o.status === "completed")
        .reduce((sum: number, order: any) => sum + Number(order.totalPrice || 0), 0);

      // Spending by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const spendingByMonth = orders
        .filter((o: any) => o.createdAt && new Date(o.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], order: any) => {
          const month = new Date(order.createdAt!).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          const existing = acc.find((item: any) => item.month === month);
          if (existing) {
            existing.orders += 1;
            existing.spending += Number(order.totalPrice || 0);
          } else {
            acc.push({
              month,
              orders: 1,
              spending: Number(order.totalPrice || 0)
            });
          }
          return acc;
        }, []);

      // Most purchased products
      const productPurchases = orders.reduce((acc: any, order: any) => {
        const listingId = order.listingId;
        if (!acc[listingId]) {
          acc[listingId] = {
            listingId,
            quantity: 0,
            spending: 0,
          };
        }
        acc[listingId].quantity += order.quantity || 0;
        acc[listingId].spending += Number(order.totalPrice || 0);
        return acc;
      }, {});

      const topPurchases = await Promise.all(
        Object.values(productPurchases)
          .sort((a: any, b: any) => b.spending - a.spending)
          .slice(0, 5)
          .map(async (pp: any) => {
            const listing = await storage.getListing(pp.listingId);
            return {
              name: listing?.productName || 'Unknown',
              quantity: pp.quantity,
              spending: pp.spending,
            };
          })
      );

      res.json({
        totalOrders,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalSpending,
        spendingByMonth,
        topPurchases,
      });
    } catch (error: any) {
      console.error("Get buyer analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Get analytics data for field officers
  app.get("/api/analytics/officer", requireRole("field_officer"), async (req: Request, res: Response) => {
    try {
      // Get all farmers
      const farmers = await storage.getUsersByRole("farmer");

      // Get all verifications (we'll need to add a method to get all verifications)
      const allVerifications: any[] = [];
      for (const farmer of farmers) {
        const verification = await storage.getVerificationByFarmer(farmer.id);
        if (verification) {
          allVerifications.push(verification);
        }
      }

      // Calculate metrics
      const totalFarmers = farmers.length;
      const verifiedFarmers = farmers.filter((f: any) => f.verified).length;
      const pendingVerifications = allVerifications.filter((v: any) => v.status === "pending").length;
      const approvedVerifications = allVerifications.filter((v: any) => v.status === "approved").length;
      const rejectedVerifications = allVerifications.filter((v: any) => v.status === "rejected").length;

      // Verifications by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const verificationsByMonth = allVerifications
        .filter((v: any) => v.createdAt && new Date(v.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], verification: any) => {
          const month = new Date(verification.createdAt!).toLocaleDateString('en-US', {
            month: 'short',
            year: 'numeric'
          });
          const existing = acc.find((item: any) => item.month === month);
          if (existing) {
            existing.total += 1;
            if (verification.status === "approved") existing.approved += 1;
            if (verification.status === "rejected") existing.rejected += 1;
            if (verification.status === "pending") existing.pending += 1;
          } else {
            acc.push({
              month,
              total: 1,
              approved: verification.status === "approved" ? 1 : 0,
              rejected: verification.status === "rejected" ? 1 : 0,
              pending: verification.status === "pending" ? 1 : 0,
            });
          }
          return acc;
        }, []);

      // Farmers by region
      const farmersByRegion = farmers.reduce((acc: any[], farmer: any) => {
        const region = farmer.region || 'Unknown';
        const existing = acc.find((item: any) => item.region === region);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ region, count: 1 });
        }
        return acc;
      }, []);

      res.json({
        totalFarmers,
        verifiedFarmers,
        pendingVerifications,
        approvedVerifications,
        rejectedVerifications,
        verificationsByMonth,
        farmersByRegion,
      });
    } catch (error: any) {
      console.error("Get officer analytics error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // ==================== ADMIN ROUTES ====================
  // Get system-wide admin statistics
  app.get('/api/admin/stats', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const roles = ['farmer', 'buyer', 'field_officer', 'admin'];
      const usersByRole: Record<string, number> = {};
      for (const r of roles) {
        const users = await storage.getUsersByRole(r);
        usersByRole[r] = users.length;
      }

      const totalUsers = Object.values(usersByRole).reduce((acc, v) => acc + v, 0);

      // Try to use optimized DB-level totals; fallback to storage computed totals
      try {
        const totals = await getAdminTotals();
        // Merge result with usersByRole computed above
        res.json({
          totalUsers,
          usersByRole,
          totalListings: totals.totalListings,
          registeredFarmers: (await storage.getUsersByRole('farmer')).length,
          verifiedFarmers: (await storage.getUsersByRole('farmer')).filter((f: any) => f.verified).length,
          pendingVerifications: (await storage.getAllVerifications()).filter((v: any) => v.status === 'pending').length,
          totalReviews: totals.totalReviews,
          totalOrders: totals.totalOrders,
          totalRevenueFromCompleted: totals.totalRevenueFromCompleted,
          totalPayments: (await storage.getAllPayments()).length,
          totalPayouts: totals.totalPayouts,
        });
      } catch (err) {
        // If DB not available, fallback to previous storage-based totals
        const listings = await storage.getAllListings();
        const totalListings = listings.length;
        const farmers = await storage.getUsersByRole('farmer');
        const registeredFarmers = farmers.length;
        const verifiedFarmers = farmers.filter((f: any) => f.verified).length;
        const allVerifs = await storage.getAllVerifications();
        const pendingVerifications = allVerifs.filter((v: any) => v.status === 'pending').length;
        const reviews = await storage.getAllReviews();
        const totalReviews = reviews.length;
        const allOrders = await storage.getAllOrders();
        const totalOrders = allOrders.length;
        const totalRevenueFromCompleted = allOrders.filter((o: any) => o.status === 'completed').reduce((acc: number, o: any) => acc + (Number(o.totalPrice || 0) || 0), 0);
        const payouts = await storage.getAllPayouts();
        const totalPayouts = payouts.length;
        const payments = await storage.getAllPayments();
        const totalPayments = payments.length;
        res.json({
          totalUsers,
          usersByRole,
          totalListings,
          registeredFarmers,
          verifiedFarmers,
          pendingVerifications,
          totalReviews,
          totalOrders,
          totalRevenueFromCompleted,
          totalPayments,
          totalPayouts,
        });
      }
    } catch (err: any) {
      console.error('Admin stats error:', err);
      res.status(500).json({ message: 'Failed to fetch admin stats' });
    }
  });

  // ==================== PRICING TIERS ROUTES ====================

  // Get pricing tiers for a listing


  // Admin - revenue metrics
  app.get('/api/admin/revenue', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const months = Number(req.query.months || 6);
      const data = await getRevenueAggregated(months);
      res.json(data);
    } catch (err: any) {
      console.error('Admin revenue error:', err);
      res.status(500).json({ message: 'Failed to compute revenue' });
    }
  });

  // Admin - get active sellers (by completed orders)
  app.get('/api/admin/active-sellers', requireRole('admin'), async (req: Request, res: Response) => {
    try {
      const topN = Number(req.query.top || 10);
      const offset = Number(req.query.offset || 0);
      const sellers = await getActiveSellers(topN, offset);
      res.json({ top: topN, sellers });
    } catch (err: any) {
      console.error('Admin active-sellers error:', err);
      res.status(500).json({ message: 'Failed to compute active sellers' });
    }
  });

  // Create pricing tier (farmer only)
  app.post("/api/listings/:id/pricing-tiers", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const farmerId = req.session.user!.id;

      // Verify listing ownership
      const listing = await storage.getListing(id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }
      if (listing.farmerId !== farmerId) {
        return res.status(403).json({ message: "Not authorized to modify this listing" });
      }

      const data = insertPricingTierSchema.parse({ ...req.body, listingId: id });

      // Validate pricing tier
      if (data.minQuantity < 1) {
        return res.status(400).json({ message: "Minimum quantity must be at least 1" });
      }

      // Check if tier with same minQuantity already exists
      const existingTiers = await storage.getPricingTiersByListing(id);
      if (existingTiers.some((t: any) => t.minQuantity === data.minQuantity)) {
        return res.status(400).json({ message: "A tier with this minimum quantity already exists" });
      }

      const tier = await storage.createPricingTier(data);
      res.status(201).json(tier);
    } catch (error: any) {
      console.error("Create pricing tier error:", error);
      res.status(400).json({ message: error.message || "Failed to create pricing tier" });
    }
  });

  // Delete pricing tier (farmer only)
  app.delete("/api/pricing-tiers/:id", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deletePricingTier(id);

      if (!deleted) {
        return res.status(404).json({ message: "Pricing tier not found" });
      }

      res.json({ message: "Pricing tier deleted successfully" });
    } catch (error: any) {
      console.error("Delete pricing tier error:", error);
      res.status(500).json({ message: "Failed to delete pricing tier" });
    }
  });

  // ==================== REVIEWS ROUTES ====================

  // Get reviews for a user (reviewee)
  app.get("/api/reviews/user/:userId", async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const reviews = await storage.getReviewsByReviewee(userId);
      const rating = await storage.getFarmerRating(userId);

      res.json({
        reviews,
        averageRating: rating.average,
        reviewCount: rating.count,
      });
    } catch (error: any) {
      console.error("Get user reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Get all reviews (admin only)
  app.get("/api/reviews", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const reviews = await storage.getAllReviews();
      res.json(reviews);
    } catch (error: any) {
      console.error("Get all reviews error:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Get review by order ID (check if user already reviewed)
  app.get("/api/reviews/order/:orderId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const userId = req.session.user!.id;

      const reviews = await storage.getReviewsByOrder(orderId);
      const userReview = reviews.find((r: any) => r.reviewerId === userId);

      if (!userReview) {
        return res.status(404).json({ message: "No review found" });
      }

      res.json(userReview);
    } catch (error) {
      console.error("Error fetching order review:", error);
      res.status(500).json({ message: "Failed to fetch review" });
    }
  });

  // Create review (after order completion)
  app.post("/api/reviews/order/:orderId", requireAuth, async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;
      const reviewerId = req.session.user!.id;

      // Get order details
      const order = await storage.getOrderWithDetails(orderId);
      if (!order) {
        console.warn(`Order not found for review creation: ${orderId} requested by ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user is part of this order
      if (order.buyerId !== reviewerId && order.farmerId !== reviewerId) {
        return res.status(403).json({ message: "Not authorized to review this order" });
      }

      // Check if order is completed
      if (order.status !== "completed") {
        return res.status(400).json({ message: "Can only review completed orders" });
      }

      // Check if review already exists
      const existingReviews = await storage.getReviewsByOrder(orderId);
      if (existingReviews.some((r: any) => r.reviewerId === reviewerId)) {
        return res.status(400).json({ message: "You have already reviewed this order" });
      }

      // Determine reviewee (buyer reviews farmer, farmer reviews buyer)
      const revieweeId = reviewerId === order.buyerId ? order.farmerId : order.buyerId;

      const data = insertReviewSchema.parse({
        ...req.body,
        orderId,
        reviewerId,
        revieweeId,
      });

      const review = await storage.createReview(data);

      // Notify reviewee about new review
      await sendNotificationToUser(revieweeId, {
        userId: revieweeId,
        type: "order_update",
        title: "New Review Received",
        message: `You received a ${data.rating}-star review`,
        relatedId: review.id,
        relatedType: "review",
      }, io);

      res.status(201).json(review);
    } catch (error: any) {
      console.error("Create review error:", error);
      res.status(400).json({ message: error.message || "Failed to create review" });
    }
  });

  // Update review approval (admin only)
  app.patch("/api/reviews/:id/approve", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { approved } = req.body;

      const review = await storage.updateReview(id, { approved });
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      res.json(review);
    } catch (error: any) {
      console.error("Update review approval error:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  // Delete review (admin only or review owner)
  app.delete("/api/reviews/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      // Get review to check ownership
      const reviews = await storage.getAllReviews();
      const review = reviews.find((r: any) => r.id === id);

      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }

      // Only admin or review owner can delete
      if (userRole !== "admin" && review.reviewerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this review" });
      }

      const deleted = await storage.deleteReview(id);
      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }

      res.json({ message: "Review deleted successfully" });
    } catch (error: any) {
      console.error("Delete review error:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Bulk moderate content (admin only)
  app.post("/api/admin/moderation/bulk", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { items, action, reason } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: "items array is required" });
      }

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
      }

      if (action === "reject" && !reason) {
        return res.status(400).json({ message: "reason is required for rejection" });
      }

      const results = [];
      const errors = [];

      for (const item of items) {
        try {
          const { id, type } = item;

          if (type === "listing") {
            const listing = await storage.getListing(id);
            if (!listing) {
              errors.push({ id, type, error: "Listing not found" });
              continue;
            }

            const moderationStatus = action === "approve" ? "approved" : "rejected";
            const moderated = action === "approve";

            await storage.updateListing(id, {
              moderated,
              moderationStatus,
              moderationReason: reason || null,
              moderatedAt: new Date(),
              moderatedBy: req.session.user!.id,
            });

            // Notify farmer
            const farmer = await storage.getUser(listing.farmerId);
            if (farmer) {
              await sendNotificationToUser(listing.farmerId, {
                userId: listing.farmerId,
                type: "listing_update",
                title: `Listing ${moderationStatus}`,
                message: `${moderationStatus === "approved" ? "Your listing has been approved" : `Your listing has been rejected${reason ? `: ${reason}` : ""}`}`,
                relatedId: listing.id,
                relatedType: "listing",
              }, io);
            }

            results.push({ id, type: "listing", action, status: "success" });

          } else if (type === "message") {
            const message = await storage.getMessage(id);
            if (!message) {
              errors.push({ id, type, error: "Message not found" });
              continue;
            }

            const moderationStatus = action === "approve" ? "approved" : "rejected";
            const moderated = action === "approve";

            await storage.updateMessage(id, {
              moderated,
              moderationStatus,
              moderationReason: reason || null,
              moderatedAt: new Date(),
              moderatedBy: req.session.user!.id,
            });

            // Notify sender
            const sender = await storage.getUser(message.senderId);
            if (sender) {
              await sendNotificationToUser(message.senderId, {
                userId: message.senderId,
                type: "message_update",
                title: `Message ${moderationStatus}`,
                message: `${moderationStatus === "approved" ? "Your message has been approved" : `Your message has been rejected${reason ? `: ${reason}` : ""}`}`,
                relatedId: message.id,
                relatedType: "message",
              }, io);
            }

            results.push({ id, type: "message", action, status: "success" });
          } else {
            errors.push({ id, type, error: "Invalid content type" });
          }
        } catch (err: any) {
          errors.push({ id: item.id, type: item.type, error: err.message || "Operation failed" });
        }
      }

      res.json({
        results,
        errors,
        message: `Bulk moderation completed: ${results.length} successful, ${errors.length} failed`
      });
    } catch (error: any) {
      console.error("Bulk moderation error:", error);
      res.status(500).json({ message: "Bulk moderation failed" });
    }
  });

  // Get moderation analytics (admin only)
  app.get("/api/admin/moderation/analytics", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { days = "30" } = req.query;
      const daysAgo = Number(days);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      // Get moderation stats from database
      const stats = await storage.getModerationStatsByDateRange(startDate, new Date());

      // Calculate current pending counts
      const pendingListings = await storage.getListingsByModerationStatus("pending");
      const pendingMessages = await storage.getMessagesByModerationStatus("pending");
      const pendingReviews = await storage.getAllReviews().then((reviews: any[]) =>
        reviews.filter((r: any) => !r.approved).length
      );

      // Calculate totals from stats
      const totalStats = {
        listings: {
          total: stats.filter((s: any) => s.contentType === 'listing').reduce((acc: number, s: any) => acc + (s.totalApproved || 0) + (s.totalRejected || 0), 0),
          approved: stats.filter((s: any) => s.contentType === 'listing').reduce((acc: number, s: any) => acc + (s.totalApproved || 0), 0),
          rejected: stats.filter((s: any) => s.contentType === 'listing').reduce((acc: number, s: any) => acc + (s.totalRejected || 0), 0),
          pending: pendingListings.length,
        },
        messages: {
          total: stats.filter((s: any) => s.contentType === 'message').reduce((acc: number, s: any) => acc + (s.totalApproved || 0) + (s.totalRejected || 0), 0),
          approved: stats.filter((s: any) => s.contentType === 'message').reduce((acc: number, s: any) => acc + (s.totalApproved || 0), 0),
          rejected: stats.filter((s: any) => s.contentType === 'message').reduce((acc: number, s: any) => acc + (s.totalRejected || 0), 0),
          pending: pendingMessages.length,
        },
        reviews: {
          total: stats.filter((s: any) => s.contentType === 'review').reduce((acc: number, s: any) => acc + (s.totalApproved || 0) + (s.totalRejected || 0), 0),
          approved: stats.filter((s: any) => s.contentType === 'review').reduce((acc: number, s: any) => acc + (s.totalApproved || 0), 0),
          rejected: stats.filter((s: any) => s.contentType === 'review').reduce((acc: number, s: any) => acc + (s.totalRejected || 0), 0),
          pending: pendingReviews,
        }
      };

      // Calculate average moderation times
      const avgModerationTime = {
        listings: stats.filter((s: any) => s.contentType === 'listing' && s.averageModerationTime)
          .reduce((acc: number, s: any, _: number, arr: any[]) => acc + (s.averageModerationTime || 0) / arr.length, 0),
        messages: stats.filter((s: any) => s.contentType === 'message' && s.averageModerationTime)
          .reduce((acc: number, s: any, _: number, arr: any[]) => acc + (s.averageModerationTime || 0) / arr.length, 0),
        reviews: stats.filter((s: any) => s.contentType === 'review' && s.averageModerationTime)
          .reduce((acc: number, s: any, _: number, arr: any[]) => acc + (s.averageModerationTime || 0) / arr.length, 0),
      };

      // Daily stats for charts
      const dailyStats = stats.reduce((acc: any[], stat: any) => {
        const dateKey = stat.date.toISOString().split('T')[0];
        const existing = acc.find((item: any) => item.date === dateKey);
        if (existing) {
          existing[stat.contentType] = {
            approved: (existing[stat.contentType]?.approved || 0) + (stat.totalApproved || 0),
            rejected: (existing[stat.contentType]?.rejected || 0) + (stat.totalRejected || 0),
            pending: (existing[stat.contentType]?.pending || 0) + (stat.totalPending || 0),
          };
        } else {
          acc.push({
            date: dateKey,
            [stat.contentType]: {
              approved: stat.totalApproved || 0,
              rejected: stat.totalRejected || 0,
              pending: stat.totalPending || 0,
            }
          });
        }
        return acc;
      }, []);

      res.json({
        summary: totalStats,
        averageModerationTime: avgModerationTime,
        dailyStats: dailyStats.sort((a: any, b: any) => a.date.localeCompare(b.date)),
        period: `${days} days`
      });
    } catch (error: any) {
      console.error("Get moderation analytics error:", error);
      res.status(500).json({ message: "Failed to fetch moderation analytics" });
    }
  });

  // Get all users with pagination and filtering (admin only)
  app.get("/api/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "20", role, search, status } = req.query;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const offset = (pageNum - 1) * limitNum;

      const users = await storage.getAllUsers();
      let filteredUsers = users;

      // Filter by role
      if (role) {
        filteredUsers = filteredUsers.filter((u: any) => u.role === role);
      }

      // Filter by search (username or email)
      if (search) {
        const searchStr = String(Array.isArray(search) ? search[0] : search);
        const searchLower = searchStr.toLowerCase();
        filteredUsers = filteredUsers.filter((u: any) =>
          u.fullName.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
        );
      }

      // Filter by status (active/inactive based on account status)
      if (status === "active") {
        filteredUsers = filteredUsers.filter((u: any) => u.isActive === true);
      } else if (status === "inactive") {
        filteredUsers = filteredUsers.filter((u: any) => u.isActive === false);
      }

      // Paginate
      const totalUsers = filteredUsers.length;
      const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);

      res.json({
        users: paginatedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalUsers,
          pages: Math.ceil(totalUsers / limitNum)
        }
      });
    } catch (error: any) {
      console.error("Get users error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (admin only)
  app.patch("/api/admin/users/:userId/role", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!["farmer", "buyer", "field_officer", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from demoting themselves
      if (userId === req.session.user!.id && role !== "admin") {
        return res.status(400).json({ message: "Cannot change your own admin role" });
      }

      await storage.updateUserRole(userId, role);

      // Notify the user about role change
      const notification = {
        id: crypto.randomUUID(),
        userId,
        type: "role_change" as const,
        title: "Role Updated",
        message: `Your role has been changed to ${role}`,
        read: false,
        createdAt: new Date()
      };
      await storage.createNotification(notification);

      // Emit socket notification
      if (io) {
        io.to(userId).emit("notification", notification);
      }

      res.json({ message: "User role updated successfully" });
    } catch (error: any) {
      console.error("Update user role error:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Bulk update user roles (admin only)
  app.patch("/api/admin/users/bulk/role", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { userIds, role } = req.body;

      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "userIds must be a non-empty array" });
      }

      if (!["farmer", "buyer", "field_officer", "admin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            errors.push({ userId, error: "User not found" });
            continue;
          }

          // Prevent admin from demoting themselves
          if (userId === req.session.user!.id && role !== "admin") {
            errors.push({ userId, error: "Cannot change your own admin role" });
            continue;
          }

          await storage.updateUserRole(userId, role);

          // Notify the user about role change
          const notification = {
            id: crypto.randomUUID(),
            userId,
            type: "role_change" as const,
            title: "Role Updated",
            message: `Your role has been changed to ${role}`,
            read: false,
            createdAt: new Date()
          };
          await storage.createNotification(notification);

          // Emit socket notification
          if (io) {
            io.to(userId).emit("notification", notification);
          }

          results.push({ userId, success: true });
        } catch (error: any) {
          errors.push({ userId, error: error.message });
        }
      }

      res.json({
        results,
        errors,
        message: `Bulk role update completed: ${results.length} successful, ${errors.length} failed`
      });
    } catch (error: any) {
      console.error("Bulk update user roles error:", error);
      res.status(500).json({ message: "Bulk role update failed" });
    }
  });

  // Moderate listing (admin only)
  app.patch("/api/listings/:id/moderate", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
      }

      const listing = await storage.getListing(id);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      const moderationStatus = action === "approve" ? "approved" : "rejected";
      const moderated = action === "approve";

      const updated = await storage.updateListing(id, {
        moderated,
        moderationStatus,
        moderationReason: reason || null,
        moderatedAt: new Date(),
        moderatedBy: req.session.user!.id,
      });

      // Notify farmer about moderation decision
      const farmer = await storage.getUser(listing.farmerId);
      if (farmer) {
        const statusMessages: Record<string, string> = {
          approved: "Your listing has been approved and is now visible to buyers.",
          rejected: "Your listing has been rejected and is not visible to buyers.",
        };

        await sendNotificationToUser(listing.farmerId, {
          userId: listing.farmerId,
          type: "listing_update",
          title: `Listing ${moderationStatus}`,
          message: `${statusMessages[moderationStatus]}${reason ? ` Reason: ${reason}` : ""}`,
          relatedId: listing.id,
          relatedType: "listing",
        }, io);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Moderate listing error:", error);
      res.status(500).json({ message: "Failed to moderate listing" });
    }
  });

  // Moderate message (admin only)
  app.patch("/api/messages/:id/moderate", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { action, reason } = req.body;

      if (!action || !["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "action must be 'approve' or 'reject'" });
      }

      const message = await storage.getMessage(id);
      if (!message) {
        return res.status(404).json({ message: "Message not found" });
      }

      const moderationStatus = action === "approve" ? "approved" : "rejected";
      const moderated = action === "approve";

      const updated = await storage.updateMessage(id, {
        moderated,
        moderationStatus,
        moderationReason: reason || null,
        moderatedAt: new Date(),
        moderatedBy: req.session.user!.id,
      });

      // Notify sender about moderation decision
      const sender = await storage.getUser(message.senderId);
      if (sender) {
        const statusMessages: Record<string, string> = {
          approved: "Your message has been approved and is now visible.",
          rejected: "Your message has been rejected and is not visible.",
        };

        await sendNotificationToUser(message.senderId, {
          userId: message.senderId,
          type: "message_update",
          title: `Message ${moderationStatus}`,
          message: `${statusMessages[moderationStatus]}${reason ? ` Reason: ${reason}` : ""}`,
          relatedId: message.id,
          relatedType: "message",
        }, io);
      }

      res.json(updated);
    } catch (error: any) {
      console.error("Moderate message error:", error);
      res.status(500).json({ message: "Failed to moderate message" });
    }
  });

  // Get pending moderation content (admin only) with filtering
  app.get("/api/admin/moderation/pending", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { status, userId, dateFrom, dateTo, category, page = "1", limit = "20" } = req.query as {
        status?: string;
        userId?: string;
        dateFrom?: string;
        dateTo?: string;
        category?: string;
        page?: string;
        limit?: string;
      };

      const offset = (Number(page) - 1) * Number(limit);

      let pendingListings = await storage.getListingsByModerationStatus("pending");
      let pendingMessages = await storage.getMessagesByModerationStatus("pending");

      // Apply filters
      if (status && status !== "all") {
        pendingListings = pendingListings.filter((l: any) => l.moderationStatus === status);
        pendingMessages = pendingMessages.filter((m: any) => m.moderationStatus === status);
      }

      if (userId) {
        pendingListings = pendingListings.filter((l: any) => l.farmerId === userId);
        pendingMessages = pendingMessages.filter((m: any) => m.senderId === userId);
      }

      if (category && category !== "all") {
        pendingListings = pendingListings.filter((l: any) => l.category === category);
      }

      if (dateFrom || dateTo) {
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;

        pendingListings = pendingListings.filter((l: any) => {
          const createdDate = new Date(l.createdAt!);
          return (!fromDate || createdDate >= fromDate) && (!toDate || createdDate <= toDate);
        });

        pendingMessages = pendingMessages.filter((m: any) => {
          const createdDate = new Date(m.createdAt!);
          return (!fromDate || createdDate >= fromDate) && (!toDate || createdDate <= toDate);
        });
      }

      // Apply pagination
      const totalListings = pendingListings.length;
      const totalMessages = pendingMessages.length;
      pendingListings = pendingListings.slice(offset, offset + Number(limit));
      pendingMessages = pendingMessages.slice(offset, offset + Number(limit));

      res.json({
        listings: pendingListings,
        messages: pendingMessages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalListings,
          totalMessages,
          totalItems: totalListings + totalMessages,
        }
      });
    } catch (error: any) {
      console.error("Get filtered pending moderation error:", error);
      res.status(500).json({ message: "Failed to fetch pending moderation content" });
    }
  });

  // ==================== PAYMENTS ROUTES - MVP STUBS ====================

  // Initiate a payment
  app.post('/api/payments/initiate', requireRole('buyer'), async (req, res) => {
    try {
      const buyerId = req.session.user!.id;
      const { orderId, paymentMethod, returnUrl } = req.body;
      if (!orderId) return res.status(400).json({ message: 'orderId is required' });

      const order = await storage.getOrder(orderId);
      if (!order) {
        console.warn(`Order not found: ${req.params.orderId || req.params.id || 'unknown'} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: 'Order not found' });
      }
      if (order.buyerId !== buyerId) return res.status(403).json({ message: 'Not your order' });

      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (paystackSecret) {
        // server authoritative amount
        const expectedAmount = Number(order.totalPrice || 0);
        if (isNaN(expectedAmount) || expectedAmount <= 0) {
          return res.status(400).json({ message: 'Invalid order amount' });
        }

        const amountInKobo = Math.round(expectedAmount * 100);
        const buyer = await storage.getUser(buyerId);

        const bodyPayload: any = { email: buyer?.email, amount: amountInKobo, metadata: { orderId } };
        if (returnUrl) bodyPayload.callback_url = returnUrl;
        const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${paystackSecret}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!initRes.ok) {
          const text = await initRes.text().catch(() => '');
          console.error('Paystack init failed', initRes.status, text);
          return res.status(502).json({ message: 'Payment provider error' });
        }

        const body = await initRes.json();
        const { authorization_url, reference } = body.data || {};

        const payment = await storage.createPayment({
          orderId,
          payerId: buyerId,
          amount: String(expectedAmount),
          paymentMethod: 'paystack',
          transactionId: reference,
          status: 'pending',
        } as any);

        // Notify buyer and farmer that a payment has been initiated (persist+emit)
        try {
          await sendNotificationToUser(buyerId, { userId: buyerId, type: 'order_update', title: 'Payment initiated', message: `Payment initiated for order ${orderId}.`, relatedId: orderId, relatedType: 'order' }, io);
          await sendNotificationToUser(order.farmerId, { userId: order.farmerId, type: 'order_update', title: 'Buyer payment initiated', message: `A buyer has initiated payment for order ${orderId}.`, relatedId: orderId, relatedType: 'order' }, io);
        } catch (err) { console.error('Failed to create payment notifications', err); }

        return res.json({ payment, authorization_url, reference });
      }

      // fallback to manual
      const payment = await storage.createPayment({ orderId, payerId: buyerId, amount: String(order.totalPrice), paymentMethod: paymentMethod || 'manual', transactionId: null, status: 'pending' } as any);
      try {
        await sendNotificationToUser(buyerId, { userId: buyerId, type: 'order_update', title: 'Payment created', message: `Your payment record for order ${orderId} has been created.`, relatedId: orderId, relatedType: 'order' }, io);
        await sendNotificationToUser(order.farmerId, { userId: order.farmerId, type: 'order_update', title: 'Buyer created payment record', message: `Buyer created a payment record for order ${orderId}.`, relatedId: orderId, relatedType: 'order' }, io);
      } catch (err) { console.error('Failed to create payment notifications', err); }
      res.json({ payment });
    } catch (err: any) {
      console.error('Initiate payment error:', err);
      res.status(500).json({ message: 'Failed to initiate payment' });
    }
  });

  // Duplicate removed - see line 3368 for the complete implementation

  // Verify a payment (admin or provider webhook) - admin-only endpoint for simulating verification
  app.post('/api/payments/verify', requireRole('admin'), async (req, res) => {
    try {
      const { paymentId } = req.body;
      if (!paymentId) return res.status(400).json({ message: 'paymentId required' });

      const payment = await storage.getPayment(paymentId);
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      const updated = await storage.updatePaymentStatus(paymentId, 'completed');
      if (updated) {
        await storage.updateOrderStatus(updated.orderId, 'accepted');

        // Create Escrow Record
        const order = await storage.getOrder(updated.orderId);
        if (order) {
          const existingEscrow = await storage.getEscrowByOrder(order.id);
          if (!existingEscrow) {
            await storage.createEscrow({
              orderId: order.id,
              buyerId: order.buyerId,
              farmerId: order.farmerId,
              amount: String(order.totalPrice),
              status: 'upfront_held',
              upfrontPaymentId: updated.id,
            });
            console.log(`[Escrow] Created escrow for order ${order.id}`);
          }

          // Notify buyer and farmer
          try {
            await sendNotificationToUser(updated.payerId, { userId: updated.payerId, type: 'order_update', title: 'Payment received', message: `Payment completed for order ${order.id}.`, relatedId: order.id, relatedType: 'order' }, io);
            await sendNotificationToUser(order.farmerId, { userId: order.farmerId, type: 'order_update', title: 'Payment received', message: `A payment for order ${order.id} has been completed.`, relatedId: order.id, relatedType: 'order' }, io);
          } catch (err) { console.error('Failed to send payment notifications', err); }
        }
      }

      res.json({ payment: updated });
    } catch (err: any) {
      console.error('Verify payment error:', err);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  });

  // Get payment status
  app.get('/api/payments/:id', requireAuth, async (req, res) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ message: 'Payment not found' });

      const order = await storage.getOrder(payment.orderId);
      if (!order) {
        console.warn(`Order not found: ${req.params.orderId || req.params.id || 'unknown'} requested by user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: 'Order not found' });
      }
      const userId = req.session.user!.id;
      if (userId !== payment.payerId && userId !== order.farmerId && req.session.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Not authorized' });
      }

      res.json({ payment });
    } catch (err: any) {
      console.error('Get payment error:', err);
      res.status(500).json({ message: 'Failed to fetch payment' });
    }
  });

  // Create payout recipient (Paystack)
  app.post('/api/payouts/recipient', requireRole('farmer'), async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { type, name, account_number, bank_code, currency } = req.body;

      if (!account_number || !bank_code) {
        return res.status(400).json({ message: "Account number and bank code are required" });
      }

      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return res.status(503).json({ message: "Payment service unavailable" });
      }

      const response = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: type || "nuban",
          name: name,
          account_number: account_number,
          bank_code: bank_code,
          currency: currency || "GHS"
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.error("Paystack recipient error:", error);
        return res.status(response.status).json({ message: "Failed to create payout recipient" });
      }

      const data = await response.json();
      if (data.status && data.data.recipient_code) {
        // Update user with recipient code
        await storage.updateUser(userId, { paystackRecipientCode: data.data.recipient_code });
        return res.json({ message: "Payout recipient saved successfully", recipient_code: data.data.recipient_code });
      } else {
        return res.status(400).json({ message: "Invalid response from payment provider" });
      }

    } catch (error) {
      console.error("Create payout recipient error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // List payments for an order
  app.get('/api/payments/order/:orderId', requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      const order = await storage.getOrder(orderId);
      if (!order) {
        console.warn(`Order not found: ${req.params.orderId || req.params.id || 'unknown'} requested in payment flow. user: ${req.session.user?.id} role: ${req.session.user?.role}`);
        return res.status(404).json({ message: 'Order not found' });
      }
      // Only buyer, farmer or admin can access
      if (userId !== order.buyerId && userId !== order.farmerId && userRole !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const payments = await storage.getPaymentsByOrder(orderId);
      res.json({ payments });
    } catch (err: any) {
      console.error('Get payments by order error:', err);
      res.status(500).json({ message: 'Failed to fetch payments' });
    }
  });

  // Get payments by transaction id (useful for finding related orders after redirect)
  app.get('/api/payments/transaction/:transactionId', requireAuth, async (req, res) => {
    try {
      const transactionId = req.params.transactionId;

      // First try to find payments by transaction UUID
      let payments = await storage.getPaymentsByTransactionId(transactionId);

      // If no payments found, try to find transaction by Paystack reference and get payments
      if (!payments || payments.length === 0) {
        const transaction = await storage.getTransactionByPaystackReference(transactionId);
        if (transaction) {
          payments = await storage.getPaymentsByTransactionId(transaction.id);
        }
      }

      if (!payments || payments.length === 0) return res.status(404).json({ message: 'Payments not found for this transaction' });
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;
      // Only allow if caller is the payer for at least one payment or admin
      const belongsToUser = payments.some((p: any) => p.payerId === userId);
      if (!belongsToUser && userRole !== 'admin') return res.status(403).json({ message: 'Forbidden' });

      res.json({ payments });
    } catch (err: any) {
      console.error('Get payments by transaction error:', err);
      res.status(500).json({ message: 'Failed to fetch payments for transaction' });
    }
  });

  // Client endpoint to verify a Paystack transaction: buyer can call to verify their payment using reference
  app.post('/api/payments/paystack/verify-client', requireAuth, async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) return res.status(400).json({ message: 'reference is required' });
      const userId = req.session.user!.id;
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackKey) return res.status(400).json({ message: 'Paystack not configured' });

      // Find transaction by Paystack reference
      const transaction = await storage.getTransactionByPaystackReference(reference);
      if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

      // Ensure the transaction belongs to this user
      const payments = await storage.getPaymentsByTransactionId(transaction.id);
      const isPayer = payments.some(p => p.payerId === userId);

      let isBuyer = false;
      try {
        const meta = JSON.parse(transaction.metadata || '{}');
        if (meta.buyerId === userId) isBuyer = true;
      } catch (e) { }

      if (!isPayer && !isBuyer && req.session.user!.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden' });
      }

      // Call Paystack verify
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${paystackKey}` },
      });
      if (!verifyRes.ok) {
        const text = await verifyRes.text().catch(() => '');
        console.error('Paystack verify failed', verifyRes.status, text);
        return res.status(502).json({ message: 'Failed to verify with Paystack' });
      }
      const data = await verifyRes.json();
      const status = data.data?.status;

      if (status === 'success' || status === 'completed') {
        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, 'completed');

        // Update all payments linked to this transaction
        const payments = await storage.getPaymentsByTransactionId(transaction.id);
        for (const payment of payments) {
          await storage.updatePaymentStatus(payment.id, 'completed');
          // Update order status to accepted
          await storage.updateOrderStatus(payment.orderId, 'accepted');

          // Create Escrow Record for each order
          const order = await storage.getOrder(payment.orderId);
          if (order) {
            const existingEscrow = await storage.getEscrowByOrder(order.id);
            if (!existingEscrow) {
              await storage.createEscrow({
                orderId: order.id,
                buyerId: order.buyerId,
                farmerId: order.farmerId,
                amount: String(order.totalPrice),
                status: 'upfront_held',
                upfrontPaymentId: payment.id,
              });
              console.log(`[Escrow] Created escrow for order ${order.id} (Transaction: ${transaction.id})`);
            }
          }
        }

        // Notify buyer and farmers
        try {
          await sendNotificationToUser(transaction.buyerId, { userId: transaction.buyerId, type: 'order_update', title: 'Payment received', message: `Your payment for transaction ${transaction.id} has been confirmed.`, relatedId: transaction.id, relatedType: 'transaction' }, io as any);

          // Get all unique farmers from the payments
          const farmerIds = Array.from(new Set((await Promise.all(payments.map(async (p: any) => {
            const order = await storage.getOrder(p.orderId);
            return order?.farmerId;
          }))).filter(Boolean)));

          for (const farmerId of farmerIds) {
            if (farmerId) {
              await sendNotificationToUser(farmerId, { userId: farmerId, type: 'order_update', title: 'Payment received', message: `A payment for transaction ${transaction.id} has been confirmed.`, relatedId: transaction.id, relatedType: 'transaction' }, io as any);
            }
          }
        } catch (err) { console.error('Failed to create notifications after verification', err); }
      }

      res.json({ status: status, transaction: await storage.getTransaction(transaction.id), payments: await Promise.all((await storage.getPaymentsByTransactionId(transaction.id)).map((p: any) => storage.getPayment(p.id))) });
    } catch (err: any) {
      console.error('Client verify error:', err);
      res.status(500).json({ message: 'Verification failed' });
    }
  });

  // Paystack webhook handler - used by Paystack to notify server of payment events
  app.post('/api/payments/paystack/webhook', async (req, res) => {
    try {
      // Accept webhook via signature verification when secret is available.
      // If webhook secret is not provided in env, fallback to server-to-server verification using PAYSTACK_SECRET_KEY.
      const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      const signature = (req.headers['x-paystack-signature'] as string) || '';

      if (secret) {
        // Verify signature - mandatory when webhook secret is set
        try {
          const raw = (req as any).rawBody as Buffer | string | undefined;
          if (!raw) {
            console.warn('Webhook received without raw body');
            return res.status(400).json({ message: 'Invalid webhook format' });
          }

          const payloadBuf = Buffer.isBuffer(raw) ? raw : Buffer.from(typeof raw === 'string' ? raw : JSON.stringify(req.body || {}));
          const computed = crypto.createHmac('sha512', secret).update(payloadBuf).digest('hex');
          if (!signature || computed !== signature) {
            console.warn('Invalid Paystack webhook signature - possible security breach');
            return res.status(401).json({ message: 'Invalid signature' });
          }
        } catch (vErr) {
          console.warn('Failed while verifying webhook signature', vErr);
          return res.status(400).json({ message: 'Invalid webhook signature verification' });
        }
      } else if (!paystackKey) {
        console.error('PAYSTACK_WEBHOOK_SECRET not configured and PAYSTACK_SECRET_KEY not provided - webhook cannot be verified');
        // Do not process webhooks without a verification method
        return res.status(500).json({ message: 'Webhook configuration error' });
      } else {
        console.warn('PAYSTACK_WEBHOOK_SECRET not configured - using API-based fallback verification');
        // we will perform server-to-server verification later after getting the reference
      }

      const event = req.body;
      let eventType = String(event?.event || '').toLowerCase();
      const reference = event?.data?.reference || event?.data?.id || event?.data?.trx || null;
      if (!reference) {
        // Nothing to do, just acknowledge
        return res.json({ ok: true, message: 'no reference' });
      }

      // Find transaction by Paystack reference
      let transaction = await storage.getTransactionByPaystackReference(reference);

      if (!transaction) {
        // Another option: find by paystackReference field
        const maybeTransaction = await storage.getTransactionByPaystackReference?.(reference as any);
        if (!maybeTransaction) {
          // Just acknowledge - we want to avoid unprocessed webhooks disrupting the provider
          return res.json({ ok: true, message: 'no linked transaction' });
        }
        transaction = maybeTransaction;
      }

      // If PAYSTACK_WEBHOOK_SECRET is not set, perform a server-to-server verification to confirm this event
      let fallbackVerified = false;
      if (!secret) {
        try {
          const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${paystackKey}` },
          });
          if (!verifyRes.ok) {
            const text = await verifyRes.text().catch(() => '');
            console.warn('Paystack verify fallback failed', verifyRes.status, text);
            return res.status(502).json({ message: 'Failed to verify with Paystack' });
          }
          const vdata = await verifyRes.json();
          const vstatus = vdata.data?.status;
          if (vstatus && (vstatus === 'success' || vstatus === 'completed')) {
            // treat as success event; continue to process below (or handle event type accordingly)
            fallbackVerified = true;
            // If eventType is empty or not a success-type, normalize it so existing logic processes it
            if (!eventType || !eventType.includes('transaction') && !eventType.includes('charge') && !eventType.includes('payment')) {
              eventType = 'transaction.success';
            }
          } else {
            // Not a success - treat as not processed
            console.warn('Paystack verify fallback reported status not success:', vstatus);
            return res.json({ ok: true, message: 'not a successful transaction' });
          }
        } catch (verifyErr) {
          console.error('Error during Paystack server-to-server verification', verifyErr);
          return res.status(502).json({ message: 'Failed to verify with Paystack' });
        }
      }

      // Event types: charge.success, transaction.success -> payment completed
      if (eventType.includes('charge.success') || eventType.includes('transaction.success') || eventType.includes('payment.success')) {
        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, 'completed');

        // Update all payments linked to this transaction
        const payments = await storage.getPaymentsByTransactionId(transaction.id);
        for (const p of payments) {
          try {
            const existing = await storage.getPayment(p.id);
            if (!existing) continue;
            if (existing.status === 'completed') continue; // idempotency

            await storage.updatePaymentStatus(p.id, 'completed');
            // update order status to accepted so farmer can move forward
            await storage.updateOrderStatus(existing.orderId, 'accepted');

            // Handle escrow logic
            const escrow = await storage.getEscrowByOrder(existing.orderId);
            if (escrow) {
              if (existing.id === escrow.upfrontPaymentId) {
                // This is the upfront payment (30%)
                await storage.updateEscrowStatus(escrow.id, 'upfront_held');
              } else if (existing.id === escrow.remainingPaymentId) {
                // This is the remaining payment (70%)
                await storage.updateEscrowStatus(escrow.id, 'remaining_released');
                await storage.updateEscrowStatus(escrow.id, 'completed');
              }
            }

            // Create buyer/farmer notifications
            try {
              if (io) {
                await sendNotificationToUser(existing.payerId, { userId: existing.payerId, type: 'order_update', title: 'Payment received', message: `Your payment for order ${existing.orderId} has been confirmed.`, relatedId: transaction.id, relatedType: 'transaction' }, io);
                const order = await storage.getOrder(existing.orderId);
                if (order) {
                  await sendNotificationToUser(order.farmerId, { userId: order.farmerId, type: 'order_update', title: 'Payment received', message: `A payment for order ${order.id} has been confirmed.`, relatedId: transaction.id, relatedType: 'transaction' }, io);
                }
              }
            } catch (nerr) { console.error('Failed to create post-webhook notifications', nerr); }
          } catch (err) { console.error('Failed to update payment on webhook', err); }
        }
        return res.json({ ok: true });
      }

      if (eventType.includes('charge.failed') || eventType.includes('transaction.failed') || eventType.includes('payment.failed')) {
        // Update transaction status
        await storage.updateTransactionStatus(transaction.id, 'failed');

        // Update all payments linked to this transaction
        const payments = await storage.getPaymentsByTransactionId(transaction.id);
        for (const p of payments) {
          try {
            const existing = await storage.getPayment(p.id);
            if (!existing) continue;
            await storage.updatePaymentStatus(p.id, 'failed');
            // Notify users about failure (no change to order automatic state)
            try {
              if (io) {
                await sendNotificationToUser(existing.payerId, { userId: existing.payerId, type: 'order_update', title: 'Payment failed', message: `Your payment for order ${existing.orderId} failed. Please retry or contact support.`, relatedId: transaction.id, relatedType: 'transaction' }, io);
              }
            } catch (nerr) { console.error('Failed to create post-webhook failure notification', nerr); }
          } catch (err) { console.error('Failed to mark payment failed on webhook', err); }
        }
        return res.json({ ok: true });
      }

      // Default ack
      res.json({ ok: true });
    } catch (err: any) {
      console.error('Paystack webhook error:', err);
      res.status(500).json({ message: 'Webhook handling failed' });
    }
  });

  // ==================== ESCROW ROUTES ====================

  // Get escrow by order ID (buyer or farmer)
  app.get('/api/escrow/order/:orderId', requireAuth, async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.session.user!.id;

      const escrow = await storage.getEscrowByOrder(orderId);
      if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
      }

      // Only buyer or farmer can view this escrow
      if (escrow.buyerId !== userId && escrow.farmerId !== userId) {
        return res.status(403).json({ message: 'Not authorized to view this escrow' });
      }

      res.json(escrow);
    } catch (err: any) {
      console.error('Get escrow error:', err);
      res.status(500).json({ message: 'Failed to fetch escrow' });
    }
  });

  // Get escrows for current user (buyer or farmer)
  app.get('/api/escrow', requireAuth, async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      let escrows: any[] = [];
      if (userRole === 'buyer') {
        escrows = await storage.getEscrowsByBuyer(userId);
      } else if (userRole === 'farmer') {
        escrows = await storage.getEscrowsByFarmer(userId);
      } else {
        return res.status(403).json({ message: 'Only buyers and farmers can view escrows' });
      }

      res.json(escrows);
    } catch (err: any) {
      console.error('Get escrows error:', err);
      res.status(500).json({ message: 'Failed to fetch escrows' });
    }
  });

  // Admin: Get all escrows
  app.get('/api/admin/escrow', requireRole('admin'), async (req, res) => {
    try {
      const escrows = await storage.getAllEscrows();
      res.json(escrows);
    } catch (err: any) {
      console.error('Get all escrows error:', err);
      res.status(500).json({ message: 'Failed to fetch escrows' });
    }
  });

  // Admin: Resolve escrow dispute
  app.patch('/api/admin/escrow/:id/resolve', requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution, reason } = req.body;

      if (!resolution || !['buyer', 'farmer', 'split'].includes(resolution)) {
        return res.status(400).json({ message: 'Resolution must be buyer, farmer, or split' });
      }

      const escrow = await storage.getEscrow(id);
      if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
      }

      if (escrow.status !== 'disputed') {
        return res.status(400).json({ message: 'Escrow must be in disputed status' });
      }

      const updated = await storage.updateEscrowStatus(id, 'completed', {
        disputeResolution: resolution,
        disputeResolvedAt: new Date(),
      });

      // Notify both parties
      await sendNotificationToUser(escrow.buyerId, {
        userId: escrow.buyerId,
        type: 'escrow_update',
        title: 'Escrow Dispute Resolved',
        message: `Your escrow dispute has been resolved in favor of: ${resolution}`,
        relatedId: escrow.id,
        relatedType: 'escrow',
      }, io);

      await sendNotificationToUser(escrow.farmerId, {
        userId: escrow.farmerId,
        type: 'escrow_update',
        title: 'Escrow Dispute Resolved',
        message: `Your escrow dispute has been resolved in favor of: ${resolution}`,
        relatedId: escrow.id,
        relatedType: 'escrow',
      }, io);

      res.json(updated);
    } catch (err: any) {
      console.error('Resolve escrow dispute error:', err);
      res.status(500).json({ message: 'Failed to resolve escrow dispute' });
    }
  });

  // Buyer or Farmer: Report escrow dispute
  app.post('/api/escrow/:id/dispute', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.session.user!.id;

      if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: 'Dispute reason is required' });
      }

      const escrow = await storage.getEscrow(id);
      if (!escrow) {
        return res.status(404).json({ message: 'Escrow not found' });
      }

      // Only buyer or farmer can dispute
      if (escrow.buyerId !== userId && escrow.farmerId !== userId) {
        return res.status(403).json({ message: 'Not authorized to dispute this escrow' });
      }

      // Can only dispute if remaining payment is released but not completed
      if (escrow.status !== 'remaining_released') {
        return res.status(400).json({ message: 'Can only dispute after remaining payment is released' });
      }

      const updated = await storage.updateEscrowStatus(id, 'disputed', {
        disputeReason: reason,
        disputedAt: new Date(),
      });

      // Notify admin and other party
      const adminUsers = await storage.getUsersByRole('admin');
      for (const admin of adminUsers) {
        await sendNotificationToUser(admin.id, {
          userId: admin.id,
          type: 'escrow_dispute',
          title: 'New Escrow Dispute',
          message: `Escrow dispute reported for order ${escrow.orderId}: ${reason}`,
          relatedId: escrow.id,
          relatedType: 'escrow',
        }, io);
      }

      const otherPartyId = escrow.buyerId === userId ? escrow.farmerId : escrow.buyerId;
      await sendNotificationToUser(otherPartyId, {
        userId: otherPartyId,
        type: 'escrow_update',
        title: 'Escrow Dispute Filed',
        message: `A dispute has been filed for your escrow: ${reason}`,
        relatedId: escrow.id,
        relatedType: 'escrow',
      }, io);

      res.json(updated);
    } catch (err: any) {
      console.error('Report escrow dispute error:', err);
      res.status(500).json({ message: 'Failed to report escrow dispute' });
    }
  });

  // Farmer requests a payout
  app.post('/api/payouts/request', requireRole('farmer'), async (req, res) => {
    try {
      const farmerId = req.session.user!.id;
      const { amount, mobileNumber, mobileNetwork } = req.body;
      if (!amount) return res.status(400).json({ message: 'Amount required' });
      if (mobileNumber && !isValidGhanaMobileNumber(mobileNumber)) {
        return res.status(400).json({ message: 'mobileNumber must be a valid Ghana mobile number (E.164 or local 0XXXXXXXXX)' });
      }
      const normalizedMobileNumber = mobileNumber ? normalizeGhanaMobileToE164(mobileNumber) : null;

      // In a real implementation validate farmer balance and bank details
      const payout = await storage.createPayout({ farmerId, amount: String(amount), status: 'pending', mobileNumber: normalizedMobileNumber ?? null, mobileNetwork: mobileNetwork ?? null, scheduledDate: null } as any);
      // If auto payouts enabled via env or recipient exists, enqueue if recipient exists
      const farmer = await storage.getUser(farmerId);
      const recipient = (farmer as any)?.paystackRecipientCode;
      const autoEnabled = process.env.PAYSTACK_AUTO_PAYOUTS === 'true' || Boolean(recipient);
      if (autoEnabled) {
        if (!recipient) {
          await storage.updatePayout(payout.id, { status: 'needs_recipient' } as any);
          try {
            await sendNotificationToUser(farmerId, {
              userId: farmerId,
              type: 'payout_update',
              title: 'Payout Pending - Recipient Required',
              message: `Your payout request for ${amount} is pending because no payout recipient has been set. Please add your mobile money details to receive payouts.`,
              relatedId: payout.id,
              relatedType: 'payout'
            }, io);
          } catch (err) { console.error('Failed to notify farmer about recipient requirement', err); }
          return res.json({ payout: await storage.getPayout(payout.id), queued: false, message: 'Payout pending recipient' });
        }
        try { enqueuePayout(payout.id); } catch (err) { console.error('Failed to enqueue payout', err); }
      }
      return res.json({ payout });
    } catch (err: any) {
      console.error('Payout request error:', err);
      res.status(500).json({ message: 'Failed to create payout request' });
    }
  });

  // Admin: process payout (MVP stub) - enqueue job to process payout
  app.post('/api/payouts/process', requireRole('admin'), async (req, res) => {
    try {
      const { payoutId, reason } = req.body;
      if (!payoutId) return res.status(400).json({ message: 'payoutId required' });
      const payout = await storage.getPayout(payoutId);
      if (!payout) return res.status(404).json({ message: 'Payout not found' });

      // Enqueue job to process payout (transfer or completion)
      try {
        // store admin note if provided
        if (reason) { await storage.updatePayout(payoutId, { adminNote: reason } as any); }
        // If the farmer has no recipient, mark `needs_recipient` instead of enqueueing
        const farmer = await storage.getUser(payout.farmerId);
        const recipient = (farmer as any)?.paystackRecipientCode;
        if (!recipient) {
          await storage.updatePayout(payoutId, { status: 'needs_recipient' } as any);
          return res.json({ queued: false, payoutId, message: 'Farmer has no paystack recipient. Marked as needs_recipient' });
        }
        enqueuePayout(payoutId);
        res.json({ queued: true, payoutId });
      } catch (err: any) {
        console.error('Failed to enqueue payout:', err);
        res.status(500).json({ message: 'Failed to queue payout' });
      }
    } catch (err: any) {
      console.error('Payout process error:', err);
      res.status(500).json({ message: 'Failed to process payout' });
    }
  });

  // Admin: list all payouts
  app.get('/api/admin/payouts', requireRole('admin'), async (req, res) => {
    try {
      const payouts = await storage.getAllPayouts?.();
      res.json(payouts);
    } catch (err: any) {
      console.error('Failed to fetch payouts', err);
      res.status(500).json({ message: 'Failed to fetch payouts' });
    }
  });

  // Farmer: create or update Paystack transfer recipient in profile
  app.post('/api/payouts/recipient', requireRole('farmer'), async (req, res) => {
    try {
      const farmerId = req.session.user!.id;
      const { mobileNumber, mobileNetwork, name, currency } = req.body;
      if (!mobileNumber || !mobileNetwork) return res.status(400).json({ message: 'mobileNumber and mobileNetwork are required' });
      if (!isValidGhanaMobileNumber(mobileNumber)) {
        return res.status(400).json({ message: 'mobileNumber must be a valid Ghana mobile number (E.164 or local 0XXXXXXXXX)' });
      }
      const normalizedMobile = normalizeGhanaMobileToE164(mobileNumber);
      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackKey) return res.status(400).json({ message: 'Paystack not configured' });

      const farmer = await storage.getUser(farmerId);
      if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

      // Create mobile money recipient
      const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mobile_money', name: name || farmer.fullName, currency: currency || 'GHS', mobile_money: { phone: normalizedMobile, provider: mobileNetwork } }),
      });

      if (!recipientRes.ok) {
        const text = await recipientRes.text().catch(() => '');
        console.error('Paystack recipient creation failed', recipientRes.status, text);
        return res.status(502).json({ message: 'Failed to create recipient at Paystack' });
      }

      const body = await recipientRes.json();
      const recipientCode = body.data?.recipient_code;
      if (!recipientCode) {
        return res.status(502).json({ message: 'Paystack responded without recipient code' });
      }

      await storage.updateUser(farmerId, { paystackRecipientCode: recipientCode, mobileNumber: normalizedMobile, mobileNetwork } as any);
      res.json({ recipientCode });
    } catch (err: any) {
      console.error('Create recipient error:', err);
      res.status(500).json({ message: 'Failed to create payout recipient' });
    }
  });

  // Get farmer's saved recipient code
  app.get('/api/payouts/recipient/me', requireRole('farmer'), async (req, res) => {
    try {
      const farmerId = req.session.user!.id;
      const farmer = await storage.getUser(farmerId);
      res.json({ paystackRecipientCode: (farmer as any)?.paystackRecipientCode, mobileNumber: (farmer as any)?.mobileNumber, mobileNetwork: (farmer as any)?.mobileNetwork });
    } catch (err: any) {
      console.error('Get recipient error:', err);
      res.status(500).json({ message: 'Failed to fetch recipient' });
    }
  });

  // Admin: Verify Paystack payment by reference (calls Paystack verify endpoint)
  app.post('/api/payments/paystack/verify', requireRole('admin'), async (req, res) => {
    try {
      const { reference } = req.body;
      if (!reference) return res.status(400).json({ message: 'reference is required' });

      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackKey) return res.status(400).json({ message: 'Paystack not configured' });

      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${paystackKey}` },
      });

      if (!verifyRes.ok) {
        const text = await verifyRes.text().catch(() => '');
        console.error('Paystack verify failed', verifyRes.status, text);
        return res.status(502).json({ message: 'Failed to verify with Paystack' });
      }

      const data = await verifyRes.json();
      const status = data.data?.status;
      const transactionRef = data.data?.reference;

      const payments = await storage.getPaymentsByTransactionId(transactionRef);
      if (!payments || payments.length === 0) return res.status(404).json({ message: 'Payment not found' });

      if (status === 'success' || status === 'completed') {
        for (const payment of payments) {
          await storage.updatePaymentStatus(payment.id, 'completed');
          await storage.updateOrderStatus(payment.orderId, 'accepted');
        }
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      res.status(500).json({ message: 'Failed to verify payment' });
    }
  });

  // ================= ADMIN USER MANAGEMENT =================

  // Get all users with pagination and filtering
  app.get("/api/admin/users", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { page = "1", limit = "20", role, status, search } = req.query as { page?: string; limit?: string; role?: string; status?: string; search?: string };
      const offset = (Number(page) - 1) * Number(limit);

      let users;
      if (pool) {
        // Use database query with filtering
        let query = `SELECT id, full_name, email, role, created_at, last_login, is_active FROM users WHERE 1=1`;
        const params: any[] = [];
        let paramIndex = 1;

        if (role) {
          query += ` AND role = $${paramIndex}`;
          params.push(role);
          paramIndex++;
        }

        if (status) {
          query += ` AND is_active = $${paramIndex}`;
          params.push(status === "active");
          paramIndex++;
        }

        if (search) {
          query += ` AND (full_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
          params.push(`%${search}%`);
          paramIndex++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(Number(limit), offset);

        const result = await pool.query(query, params);
        users = result.rows.map((row: any) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          role: row.role,
          createdAt: row.created_at,
          lastLogin: row.last_login,
          isActive: row.is_active,
        }));
      } else {
        // Fallback to in-memory storage
        let allUsers = await storage.getAllUsers();

        if (role) {
          allUsers = allUsers.filter((u: any) => u.role === role);
        }

        if (status) {
          allUsers = allUsers.filter((u: any) => u.isActive === (status === "active"));
        }

        if (search) {
          const searchLower = search.toLowerCase();
          allUsers = allUsers.filter((u: any) =>
            u.fullName.toLowerCase().includes(searchLower) ||
            u.email.toLowerCase().includes(searchLower)
          );
        }

        users = allUsers
          .sort((a: any, b: any) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
          .slice(offset, offset + Number(limit));
      }

      res.json({
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: users.length,
        }
      });
    } catch (err: any) {
      console.error("Admin get users error:", err);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Get user details by ID
  app.get("/api/admin/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const user = await storage.getUser(id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get additional user stats
      const userStats = {
        totalOrders: 0,
        totalRevenue: 0,
        totalListings: 0,
        averageRating: 0,
      };

      if (pool) {
        // Get order stats
        if (user.role === "farmer") {
          const orderStats = await pool.query(
            `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_price::numeric), 0) as total_revenue FROM orders WHERE farmer_id = $1 AND status = 'completed'`,
            [id]
          );
          userStats.totalOrders = Number(orderStats.rows[0].total_orders);
          userStats.totalRevenue = Number(orderStats.rows[0].total_revenue);

          const listingStats = await pool.query(
            `SELECT COUNT(*) as total_listings FROM listings WHERE farmer_id = $1 AND status = 'active'`,
            [id]
          );
          userStats.totalListings = Number(listingStats.rows[0].total_listings);
        } else if (user.role === "buyer") {
          const orderStats = await pool.query(
            `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_price::numeric), 0) as total_revenue FROM orders WHERE buyer_id = $1 AND status = 'completed'`,
            [id]
          );
          userStats.totalOrders = Number(orderStats.rows[0].total_orders);
          userStats.totalRevenue = Number(orderStats.rows[0].total_revenue);
        }

        // Get average rating
        const ratingStats = await pool.query(
          `SELECT AVG(rating) as avg_rating FROM reviews WHERE reviewee_id = $1`,
          [id]
        );
        userStats.averageRating = Number(ratingStats.rows[0].avg_rating) || 0;
      }

      res.json({
        user,
        stats: userStats,
      });
    } catch (err: any) {
      console.error("Admin get user details error:", err);
      res.status(500).json({ message: "Failed to fetch user details" });
    }
  });

  // Update user status (activate/deactivate)
  app.patch("/api/admin/users/:id/status", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { isActive, reason } = req.body;

      if (typeof isActive !== "boolean") {
        return res.status(400).json({ message: "isActive must be a boolean" });
      }

      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Prevent admin from deactivating themselves
      if (id === req.session.user!.id && !isActive) {
        return res.status(400).json({ message: "Cannot deactivate your own account" });
      }

      await storage.updateUser(id, { isActive });

      // Create notification for the user
      const statusMessage = isActive ? "activated" : "deactivated";
      await sendNotificationToUser(id, {
        userId: id,
        type: "account_update",
        title: `Account ${statusMessage}`,
        message: `Your account has been ${statusMessage}${reason ? `: ${reason}` : "."}`,
        relatedId: id,
        relatedType: "user",
      }, io);

      res.json({
        user: await storage.getUser(id),
        message: `User ${statusMessage} successfully`
      });
    } catch (err: any) {
      console.error("Admin update user status error:", err);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  // Bulk user operations
  app.post("/api/admin/users/bulk", requireRole("admin"), async (req: Request, res: Response) => {
    try {
      const { operation, userIds, reason } = req.body;

      if (!operation || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "operation and userIds array are required" });
      }

      const results = [];
      const errors = [];

      for (const userId of userIds) {
        try {
          const user = await storage.getUser(userId);
          if (!user) {
            errors.push({ userId, error: "User not found" });
            continue;
          }

          // Prevent admin from affecting themselves in bulk operations
          if (userId === req.session.user!.id) {
            errors.push({ userId, error: "Cannot modify your own account in bulk operations" });
            continue;
          }

          switch (operation) {
            case "activate":
              await storage.updateUser(userId, { isActive: true });
              await sendNotificationToUser(userId, {
                userId,
                type: "account_update",
                title: "Account Activated",
                message: `Your account has been activated${reason ? `: ${reason}` : "."}`,
                relatedId: userId,
                relatedType: "user",
              }, io);
              results.push({ userId, operation: "activated" });
              break;

            case "deactivate":
              await storage.updateUser(userId, { isActive: false });
              await sendNotificationToUser(userId, {
                userId,
                type: "account_update",
                title: "Account Deactivated",
                message: `Your account has been deactivated${reason ? `: ${reason}` : "."}`,
                relatedId: userId,
                relatedType: "user",
              }, io);
              results.push({ userId, operation: "deactivated" });
              break;

            default:
              errors.push({ userId, error: "Invalid operation" });
          }
        } catch (err: any) {
          errors.push({ userId, error: err.message || "Operation failed" });
        }
      }

      res.json({
        results,
        errors,
        message: `Bulk operation completed: ${results.length} successful, ${errors.length} failed`
      });
    } catch (err: any) {
      console.error("Admin bulk user operation error:", err);
      res.status(500).json({ message: "Bulk operation failed" });
    }
  });
  // ==================== WALLET ROUTES ====================

  // Get wallet balance
  app.get("/api/wallet/balance", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const balance = await storage.getWalletBalance(userId);
      res.json({ balance });
    } catch (error: any) {
      console.error("Get wallet balance error:", error);
      res.status(500).json({ message: "Failed to fetch wallet balance" });
    }
  });

  // Get wallet transactions
  app.get("/api/wallet/transactions", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const transactions = await storage.getWalletTransactions(userId);
      res.json(transactions);
    } catch (error: any) {
      console.error("Get wallet transactions error:", error);
      res.status(500).json({ message: "Failed to fetch wallet transactions" });
    }
  });

  // Request withdrawal
  app.post("/api/wallet/withdraw", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const { amount, mobileNumber, mobileNetwork, recipientCode } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      const balance = await storage.getWalletBalance(userId);
      if (Number(balance) < Number(amount)) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // Create withdrawal request
      const withdrawal = await storage.requestWithdrawal({
        userId,
        amount: String(amount),
        status: 'pending',
        mobileNumber,
        mobileNetwork,
        recipientCode
      });

      // Debit wallet immediately
      await storage.createWalletTransaction({
        userId,
        amount: String(amount),
        type: 'debit',
        description: `Withdrawal request`,
        referenceId: withdrawal.id,
        referenceType: 'withdrawal'
      });

      res.json(withdrawal);
    } catch (error: any) {
      console.error("Request withdrawal error:", error);
      res.status(500).json({ message: "Failed to request withdrawal" });
    }
  });

  // Get withdrawals
  app.get("/api/wallet/withdrawals", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const withdrawals = await storage.getWithdrawals(userId);
      res.json(withdrawals);
    } catch (error: any) {
      console.error("Get withdrawals error:", error);
      res.status(500).json({ message: "Failed to fetch withdrawals" });
    }
  });
}
