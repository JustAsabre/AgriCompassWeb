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

  // Update payout settings (create Paystack recipient)
  app.post("/api/users/payout-settings", requireRole("farmer"), async (req, res) => {
    try {
      const userId = req.session.user!.id;
      const { mobileNumber, mobileNetwork, bankCode } = req.body;

      if (!mobileNumber || !mobileNetwork || !bankCode) {
        return res.status(400).json({ message: "Mobile number, network, and bank code are required" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      // Create Paystack Transfer Recipient
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        return res.status(500).json({ message: "Payment service unavailable" });
      }

      const response = await fetch("https://api.paystack.co/transferrecipient", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "mobile_money",
          name: user.fullName,
          account_number: mobileNumber,
          bank_code: bankCode,
          currency: "GHS",
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Paystack recipient creation failed:", error);
        return res.status(400).json({ message: "Failed to verify payout details" });
      }

      const data = await response.json();
      const recipientCode = data.data.recipient_code;

      // Update user with payout details
      await storage.updateUser(userId, {
        mobileNumber,
        mobileNetwork,
        paystackRecipientCode: recipientCode,
      });

      res.json({ message: "Payout settings updated successfully", recipientCode });
    } catch (error: any) {
      console.error("Payout settings error:", error);
      res.status(500).json({ message: "Failed to update payout settings" });
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


  // ==================== ORDER ROUTES ====================

  // Create new order
  app.post("/api/orders", requireAuth, async (req: Request, res: Response) => {
    try {
      const { listingId, quantity, deliveryAddress, notes } = req.body;
      const buyerId = req.session.user!.id;

      const listing = await storage.getListing(listingId);
      if (!listing) {
        return res.status(404).json({ message: "Listing not found" });
      }

      if (listing.quantityAvailable < quantity) {
        return res.status(400).json({ message: "Insufficient quantity available" });
      }

      // Calculate total price based on pricing tiers
      const tiers = await storage.getPricingTiersByListing(listingId);
      let unitPrice = Number(listing.price);

      // Sort tiers by minQuantity desc
      tiers.sort((a, b) => b.minQuantity - a.minQuantity);
      for (const tier of tiers) {
        if (quantity >= tier.minQuantity) {
          unitPrice = Number(tier.price);
          break;
        }
      }

      const totalPrice = (unitPrice * quantity).toFixed(2);

      const order = await storage.createOrder({
        buyerId,
        farmerId: listing.farmerId,
        listingId,
        quantity,
        totalPrice,
        deliveryAddress,
        notes,
        status: "pending"
      });

      // Create notification for farmer
      await sendNotificationToUser(listing.farmerId, {
        userId: listing.farmerId,
        type: "new_order",
        title: "New Order Received",
        message: `You have a new order for ${quantity} ${listing.unit} of ${listing.productName}`,
        relatedId: order.id,
        relatedType: "order"
      }, io);

      res.status(201).json(order);
    } catch (err: any) {
      console.error("Create order error:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Get buyer orders
  app.get("/api/buyer/orders", requireRole("buyer"), async (req: Request, res: Response) => {
    try {
      const buyerId = req.session.user!.id;
      const orders = await storage.getOrdersByBuyer(buyerId);
      res.json(orders);
    } catch (err: any) {
      console.error("Get buyer orders error:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get farmer orders
  app.get("/api/farmer/orders", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const farmerId = req.session.user!.id;
      const orders = await storage.getOrdersByFarmer(farmerId);
      res.json(orders);
    } catch (err: any) {
      console.error("Get farmer orders error:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // Get order details
  app.get("/api/orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.session.user!.id;
      const userRole = req.session.user!.role;

      const order = await storage.getOrderWithDetails(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Authorization check
      if (userRole !== "admin" && order.buyerId !== userId && order.farmerId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this order" });
      }

      res.json(order);
    } catch (err: any) {
      console.error("Get order details error:", err);
      res.status(500).json({ message: "Failed to fetch order details" });
    }
  });

  // Update order status (Farmer: Mark as Delivered)
  app.patch("/api/orders/:id/status", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const farmerId = req.session.user!.id;

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.farmerId !== farmerId) {
        return res.status(403).json({ message: "Not authorized to update this order" });
      }

      // Only allow marking as delivered if currently accepted
      if (status === "delivered" && order.status !== "accepted") {
        return res.status(400).json({ message: "Order must be accepted before delivery" });
      }

      const updatedOrder = await storage.updateOrderStatus(id, status);

      // Notify buyer
      await sendNotificationToUser(order.buyerId, {
        userId: order.buyerId,
        type: "order_update",
        title: "Order Delivered",
        message: `Your order for ${order.quantity} items has been marked as delivered. Please confirm receipt.`,
        relatedId: order.id,
        relatedType: "order"
      }, io);

      res.json(updatedOrder);
    } catch (err: any) {
      console.error("Update order status error:", err);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // Complete order (Buyer: Confirm Receipt)
  app.patch("/api/orders/:id/complete", requireRole("buyer"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const buyerId = req.session.user!.id;

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.buyerId !== buyerId) {
        return res.status(403).json({ message: "Not authorized to complete this order" });
      }

      if (order.status !== "delivered") {
        return res.status(400).json({ message: "Order must be delivered before completion" });
      }

      // 1. Update order status
      const updatedOrder = await storage.updateOrderStatus(id, "completed");

      // 2. Release Escrow
      const escrow = await storage.getEscrowByOrder(id);
      if (escrow && (escrow.status === 'held' || escrow.status === 'upfront_held')) {
        await storage.updateEscrowStatus(escrow.id, 'released');

        // 3. Credit Farmer Wallet
        await storage.createWalletTransaction({
          userId: order.farmerId,
          amount: escrow.amount,
          type: 'credit',
          description: `Payment for order #${order.id}`,
          referenceId: order.id,
          referenceType: 'order',
          status: 'completed'
        });

        // Update farmer wallet balance
        const farmer = await storage.getUser(order.farmerId);
        if (farmer) {
          const currentBalance = Number(farmer.walletBalance || 0);
          const newBalance = currentBalance + Number(escrow.amount);
          await storage.updateUser(farmer.id, { walletBalance: newBalance.toFixed(2) });
        }
      }

      // Notify farmer
      await sendNotificationToUser(order.farmerId, {
        userId: order.farmerId,
        type: "order_completed",
        title: "Order Completed",
        message: `Order #${order.id} has been completed and funds released to your wallet.`,
        relatedId: order.id,
        relatedType: "order"
      }, io);

      res.json(updatedOrder);
    } catch (err: any) {
      console.error("Complete order error:", err);
      res.status(500).json({ message: "Failed to complete order" });
    }
  });

  // Cancel order
  app.patch("/api/orders/:id", requireAuth, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.session.user!.id;

      if (status !== "cancelled") {
        return res.status(400).json({ message: "Invalid status update" });
      }

      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (order.buyerId !== userId && order.farmerId !== userId) {
        return res.status(403).json({ message: "Not authorized to cancel this order" });
      }

      if (order.status !== "pending") {
        return res.status(400).json({ message: "Only pending orders can be cancelled" });
      }

      const updatedOrder = await storage.updateOrderStatus(id, "cancelled");

      // Notify other party
      const otherPartyId = order.buyerId === userId ? order.farmerId : order.buyerId;
      await sendNotificationToUser(otherPartyId, {
        userId: otherPartyId,
        type: "order_cancelled",
        title: "Order Cancelled",
        message: `Order #${order.id} has been cancelled.`,
        relatedId: order.id,
        relatedType: "order"
      }, io);

      res.json(updatedOrder);
    } catch (err: any) {
      console.error("Cancel order error:", err);
      res.status(500).json({ message: "Failed to cancel order" });
    }
  });

  // Verify Paystack payment (Client initiated)
  app.post('/api/payments/paystack/verify-client', requireAuth, async (req, res) => {
    try {
      const { reference, orderId } = req.body;
      const userId = req.session.user!.id;

      if (!reference) {
        return res.status(400).json({ message: 'Reference is required' });
      }

      const paystackKey = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackKey) {
        return res.status(500).json({ message: 'Server configuration error' });
      }

      // 1. Verify with Paystack first to ensure it's valid
      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${paystackKey}` },
      });

      if (!verifyRes.ok) {
        return res.status(404).json({ message: 'Transaction not found on Paystack' });
      }

      const data = await verifyRes.json();
      if (data.data?.status !== 'success' && data.data?.status !== 'completed') {
        return res.status(400).json({ message: 'Payment not successful' });
      }

      // 2. Find transaction locally
      let transaction = await storage.getTransactionByPaystackReference(reference);

      if (transaction) {
        // Update transaction status
        if (transaction.status !== 'completed') {
          await storage.updateTransactionStatus(transaction.id, 'completed');
        }

        // Find associated payments
        const payments = await storage.getPaymentsByTransactionId(transaction.id);

        for (const payment of payments) {
          if (payment.status !== 'completed') {
            await storage.updatePaymentStatus(payment.id, 'completed');
            await storage.updateOrderStatus(payment.orderId, 'accepted');

            // Create Escrow
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
              }
            }
          }
        }
        return res.json({ message: "Payment verified and updated" });
      }

      // If transaction not found via reference, try to find by orderId if provided
      if (orderId) {
        const payments = await storage.getPaymentsByOrder(orderId);
        const pendingPayment = payments.find(p => p.status === 'pending' && p.paymentMethod === 'paystack');

        if (pendingPayment) {
          await storage.updatePaymentStatus(pendingPayment.id, 'completed');
          if (pendingPayment.transactionId) {
            await storage.updateTransactionStatus(pendingPayment.transactionId, 'completed');
          }

          await storage.updateOrderStatus(orderId, 'accepted');

          // Create Escrow
          const order = await storage.getOrder(orderId);
          if (order) {
            const existingEscrow = await storage.getEscrowByOrder(order.id);
            if (!existingEscrow) {
              await storage.createEscrow({
                orderId: order.id,
                buyerId: order.buyerId,
                farmerId: order.farmerId,
                amount: String(order.totalPrice),
                status: 'upfront_held',
                upfrontPaymentId: pendingPayment.id,
              });
            }
          }
          return res.json({ message: "Payment verified and updated via order lookup" });
        }
      }

      res.json({ message: "Payment verified on Paystack but no local record updated" });

    } catch (err: any) {
      console.error("Verification error:", err);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Manual payment verification for an order
  app.post('/api/orders/:id/verify-payment', requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const orderId = id;

      // Find pending payments for this order
      const payments = await storage.getPaymentsByOrder(orderId);
      const pendingPayment = payments.find(p => p.status === 'pending' && p.paymentMethod === 'paystack');

      if (!pendingPayment) {
        return res.status(400).json({ message: "No pending Paystack payment found for this order" });
      }

      // If we have a transaction ID, check that
      if (pendingPayment.transactionId) {
        const transaction = await storage.getTransaction(pendingPayment.transactionId);
        let paystackRef = '';
        if (transaction && transaction.metadata) {
          try {
            const meta = JSON.parse(transaction.metadata);
            paystackRef = meta.paystackReference || meta.reference;
          } catch (e) { }
        }

        if (paystackRef) {
          // Verify with Paystack
          const paystackKey = process.env.PAYSTACK_SECRET_KEY;
          const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(paystackRef)}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${paystackKey}` },
          });

          if (verifyRes.ok) {
            const data = await verifyRes.json();
            if (data.data.status === 'success') {
              // Update everything
              await storage.updateTransactionStatus(transaction!.id, 'completed');
              await storage.updatePaymentStatus(pendingPayment.id, 'completed');
              await storage.updateOrderStatus(orderId, 'accepted');

              // Create Escrow
              const order = await storage.getOrder(orderId);
              if (order) {
                const existingEscrow = await storage.getEscrowByOrder(order.id);
                if (!existingEscrow) {
                  await storage.createEscrow({
                    orderId: order.id,
                    buyerId: order.buyerId,
                    farmerId: order.farmerId,
                    amount: String(order.totalPrice),
                    status: 'upfront_held',
                    upfrontPaymentId: pendingPayment.id,
                  });
                }
              }
              return res.json({ message: "Payment verified successfully" });
            }
          }
        }
      }

      res.status(400).json({ message: "Could not verify payment with Paystack" });

    } catch (err: any) {
      console.error("Order payment verification error:", err);
      res.status(500).json({ message: "Verification failed" });
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
        return res.json(null);
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
      console.error('Get admin escrows error:', err);
      res.status(500).json({ message: 'Failed to fetch escrows' });
    }
  });

  // Admin: Resolve escrow dispute
  app.post('/api/admin/escrow/:id/resolve', requireRole('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { resolution } = req.body;

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
      // With full payment, maybe dispute is allowed when 'held' or 'released'?
      // Assuming dispute is allowed when 'held' (before delivery confirmation) or 'released' (after delivery but before withdrawal?)
      // Actually, 'released' means funds are in farmer wallet.
      // Dispute should probably happen before 'released' (i.e. when 'held').
      // Or if buyer disputes delivery.
      // I'll allow dispute if status is 'held'.
      if (escrow.status !== 'held') {
        return res.status(400).json({ message: 'Can only dispute active escrow' });
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

  // Old payout request route removed



  // Old payout routes removed


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

  // Request withdrawal
  app.post("/api/wallet/withdraw", requireRole("farmer"), async (req: Request, res: Response) => {
    try {
      const userId = req.session.user!.id;
      const { amount } = req.body;
      const withdrawAmount = Number(amount);

      if (isNaN(withdrawAmount) || withdrawAmount < 10) { // Min withdrawal 10 GHS
        return res.status(400).json({ message: "Invalid amount. Minimum withdrawal is 10 GHS" });
      }

      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.paystackRecipientCode) {
        return res.status(400).json({ message: "Payout settings not configured. Please set up mobile money details first." });
      }

      const currentBalance = Number(user.walletBalance || 0);
      if (currentBalance < withdrawAmount) {
        return res.status(400).json({ message: "Insufficient funds" });
      }

      // 1. Deduct from wallet (Pending State)
      // We use a unique reference for idempotency
      const reference = `wd-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      await storage.createWalletTransaction({
        userId,
        amount: withdrawAmount.toFixed(2),
        type: 'debit',
        description: 'Withdrawal Request',
        referenceId: reference,
        referenceType: 'withdrawal',
        status: 'pending'
      });

      // 2. Initiate Paystack Transfer
      const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
      if (!paystackSecret) {
        // Reverse if config missing (shouldn't happen in prod)
        await storage.createWalletTransaction({
          userId,
          amount: withdrawAmount.toFixed(2),
          type: 'credit',
          description: 'Withdrawal Reversal - System Error',
          referenceId: reference,
          referenceType: 'reversal',
          status: 'completed'
        });
        return res.status(500).json({ message: "Payment service unavailable" });
      }

      try {
        const response = await fetch("https://api.paystack.co/transfer", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${paystackSecret}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            source: "balance",
            amount: Math.round(withdrawAmount * 100), // In kobo
            recipient: user.paystackRecipientCode,
            reason: "AgriCompass Withdrawal",
            reference: reference, // Use same reference
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Transfer failed");
        }

        // 3. Success - Transaction is already recorded as debit.
        // We might want to update a separate Withdrawal record status if we had one, 
        // but the wallet transaction serves as the record.

        res.json({ message: "Withdrawal initiated successfully", reference });

      } catch (transferError: any) {
        console.error("Paystack transfer failed:", transferError);

        // 4. Reversal on Failure
        await storage.createWalletTransaction({
          userId,
          amount: withdrawAmount.toFixed(2),
          type: 'credit',
          description: 'Withdrawal Reversal - Transfer Failed',
          referenceId: reference,
          referenceType: 'reversal',
          status: 'completed'
        });

        return res.status(400).json({ message: "Withdrawal failed: " + transferError.message });
      }

    } catch (error: any) {
      console.error("Withdrawal error:", error);
      res.status(500).json({ message: "Failed to process withdrawal" });
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
