import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import type { Server as SocketServer } from "socket.io";
import { storage } from "./storage";
import { hashPassword, comparePassword, sanitizeUser, SessionUser } from "./auth";
import { insertUserSchema, insertListingSchema, insertOrderSchema, insertCartItemSchema, insertPricingTierSchema, insertReviewSchema } from "@shared/schema";
import { sendPasswordResetEmail, sendWelcomeEmail, sendPasswordChangedEmail, sendOrderConfirmationEmail, sendNewOrderNotificationToFarmer, sendVerificationStatusEmail, getSmtpStatus } from "./email";
import { upload, getFileUrl, deleteUploadedFile, isValidFilename } from "./upload";
import { sendNotificationToUser, broadcastNewListing } from "./socket";
import { enqueuePayout } from './jobs/payoutQueue';
import crypto from "crypto";

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

  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
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

  // File upload endpoint
  app.post("/api/upload", requireAuth, upload.array('images', 5), async (req, res) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const fileUrls = req.files.map(file => getFileUrl(file.filename, req));
      
      res.json({ 
        message: "Files uploaded successfully",
        files: req.files.map((file, index) => ({
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          url: fileUrls[index]
        }))
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
        broadcastNewListing(io, listingWithFarmer);
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
      // After marking as completed, create a payout record for the farmer
      await maybeCreatePayoutForOrder(req.params.id);
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
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if user is buyer or farmer of this order
      const userId = req.session.user.id;
      if (order.buyerId !== userId && order.farmerId !== userId) {
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
        return res.status(404).json({ message: "Order not found" });
      }

      // Buyers can only cancel their own pending orders
      if (order.buyerId === userId && status === "cancelled" && order.status === "pending") {
        const updated = await storage.updateOrderStatus(req.params.id, "cancelled");
        
        // Notify farmer
        await sendNotificationToUser(io, order.farmerId, {
          userId: order.farmerId,
          type: "order_update",
          title: "Order Cancelled",
          message: `A buyer has cancelled their order`,
          relatedId: order.id,
          relatedType: "order",
        });

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
      const { deliveryAddress, notes } = req.body;

      // Get cart items
      const cartItems = await storage.getCartItemsByBuyer(buyerId);
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

      // Create orders (one per cart item)
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
        await sendNotificationToUser(io, item.listing.farmerId, {
          userId: item.listing.farmerId,
          type: "order_update",
          title: "New Order Received",
          message: `You have a new order for ${item.listing.productName} (${item.quantity} ${item.listing.unit})`,
          relatedId: order.id,
          relatedType: "order",
        });
      }

      // Clear cart
      await storage.clearCart(buyerId);

      res.json({ orders });
    } catch (error: any) {
      console.error("Checkout error:", error);
      res.status(400).json({ message: error.message || "Checkout failed" });
    }
  });

  app.patch("/api/orders/:id/status", requireRole("farmer"), async (req, res) => {
    try {
      const { status } = req.body;
      const farmerId = req.session.user!.id;

      // Verify ownership
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.farmerId !== farmerId) {
        return res.status(403).json({ message: "Forbidden - Not your order" });
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
          await sendNotificationToUser(io, order.buyerId, {
            userId: order.buyerId,
            type: "order_update",
            title: "Order Status Update",
            message: `${statusMessages[status]}: ${orderDetails.listing.productName}`,
            relatedId: order.id,
            relatedType: "order",
          });
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
        return res.status(404).json({ message: "Order not found" });
      }
      if (order.buyerId !== buyerId) {
        return res.status(403).json({ message: "Forbidden - Not your order" });
      }
      if (order.status !== "delivered") {
        return res.status(400).json({ message: "Order must be delivered before completion" });
      }

      const updated = await storage.updateOrderStatus(req.params.id, "completed");

      // Notify farmer about completion
      const orderDetails = await storage.getOrderWithDetails(req.params.id);
      if (orderDetails) {
        await sendNotificationToUser(io, order.farmerId, {
          userId: order.farmerId,
          type: "order_update",
          title: "Order Completed",
          message: `Order for ${orderDetails.listing.productName} has been confirmed as received`,
          relatedId: order.id,
          relatedType: "order",
        });
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
      // Create a payout record for farmer; admin or automatic process will transfer later
      const payoutRecord = await storage.createPayout({ farmerId: order.farmerId, amount: String(payoutAmount), status: 'pending', bankAccount: null } as any);
      // Auto payouts are enabled either via global setting OR if we detect a recipient for the farmer
      const farmer = await storage.getUser(order.farmerId);
      const recipient = (farmer as any)?.paystackRecipientCode;
      const autoEnabled = process.env.PAYSTACK_AUTO_PAYOUTS === 'true' || Boolean(recipient);
      if (autoEnabled) {
        if (!recipient) {
          // mark payout as waiting for a recipient
          await storage.updatePayout(payoutRecord.id, { status: 'needs_recipient' } as any);
          try {
            await sendNotificationToUser(io, order.farmerId, {
              userId: order.farmerId,
              type: 'payout_update',
              title: 'Payout Pending - Recipient Required',
              message: `A new payout of ${payoutAmount} was created but requires a paystack recipient. Please add your bank details to receive payouts.`,
              relatedId: payoutRecord.id,
              relatedType: 'payout'
            });
          } catch (err) { console.error('Failed to notify farmer about recipient requirement', err); }
          console.log(`Auto payout skipped: farmer ${order.farmerId} has no recipient. Marked payout ${payoutRecord.id} as needs_recipient.`);
        } else {
          try { enqueuePayout(payoutRecord.id); } catch (err) { console.error('Failed to enqueue payout', err); }
        }
      }
    } catch (err) {
      console.error('Failed to auto-create payout for order', orderId, err);
    }
  }

  // ====================
  // VERIFICATION ROUTES
  // ====================

  // Get all verifications for field officers
  app.get("/api/verifications", requireRole("field_officer"), async (req: Request, res: Response) => {
    try {
      // Get ALL verifications, not just ones assigned to this officer
      const allVerifications = Array.from((storage as any).verifications.values());
      
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
      res.json(verification);
    } catch (error: any) {
      console.error("Get verification error:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  // Submit verification request (farmer)
  app.post("/api/verifications/request", requireRole("farmer"), async (req: Request, res: Response) => {
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
        await sendNotificationToUser(io, officers[0].id, {
          userId: officers[0].id,
          type: "verification_update",
          title: "New Verification Request",
          message: `${farmer.fullName} has submitted a verification request`,
          relatedId: verification.id,
          relatedType: "verification",
        });
      }

      res.json(verification);
    } catch (error: any) {
      console.error("Create verification request error:", error);
      res.status(400).json({ message: error.message || "Failed to create verification request" });
    }
  });

  // Review verification (field officer)
  app.patch("/api/verifications/:id/review", requireRole("field_officer"), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      const verification = await storage.updateVerificationStatus(id, status, notes);
      if (!verification) {
        return res.status(404).json({ message: "Verification not found" });
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
          await sendNotificationToUser(io, verification.farmerId, {
            userId: verification.farmerId,
            type: "verification_update",
            title: "Verification Status Update",
            message: statusMessages[status],
            relatedId: verification.id,
            relatedType: "verification",
          });

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

  // Field Officer routes
  app.get("/api/officer/farmers", requireRole("field_officer"), async (req, res) => {
    try {
      const farmers = await storage.getUsersByRole("farmer");
      // Remove passwords before sending
      const safeFarmers = farmers.map(({ password, ...rest }) => rest);
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
      const activeListings = listings.filter(l => l.status === "active").length;
      const totalOrders = orders.length;
      const completedOrders = orders.filter(o => o.status === "completed").length;
      const pendingOrders = orders.filter(o => o.status === "pending").length;
      
      // Calculate total revenue (completed orders only)
      const totalRevenue = completedOrders > 0 
        ? orders
            .filter(o => o.status === "completed")
            .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
        : 0;

      // Sales by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const salesByMonth = orders
        .filter(o => o.createdAt && new Date(o.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], order) => {
          const month = new Date(order.createdAt!).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
          const existing = acc.find(item => item.month === month);
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
      const productSales = orders.reduce((acc: any, order) => {
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
      const completedOrders = orders.filter(o => o.status === "completed").length;
      const pendingOrders = orders.filter(o => o.status === "pending").length;
      const cancelledOrders = orders.filter(o => o.status === "cancelled").length;
      
      // Calculate total spending (completed orders only)
      const totalSpending = orders
        .filter(o => o.status === "completed")
        .reduce((sum, order) => sum + Number(order.totalPrice || 0), 0);

      // Spending by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const spendingByMonth = orders
        .filter(o => o.createdAt && new Date(o.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], order) => {
          const month = new Date(order.createdAt!).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
          const existing = acc.find(item => item.month === month);
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
      const productPurchases = orders.reduce((acc: any, order) => {
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
      const verifiedFarmers = farmers.filter(f => f.verified).length;
      const pendingVerifications = allVerifications.filter(v => v.status === "pending").length;
      const approvedVerifications = allVerifications.filter(v => v.status === "approved").length;
      const rejectedVerifications = allVerifications.filter(v => v.status === "rejected").length;
      
      // Verifications by month (last 6 months)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const verificationsByMonth = allVerifications
        .filter(v => v.createdAt && new Date(v.createdAt) >= sixMonthsAgo)
        .reduce((acc: any[], verification) => {
          const month = new Date(verification.createdAt!).toLocaleDateString('en-US', { 
            month: 'short', 
            year: 'numeric' 
          });
          const existing = acc.find(item => item.month === month);
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
      const farmersByRegion = farmers.reduce((acc: any[], farmer) => {
        const region = farmer.region || 'Unknown';
        const existing = acc.find(item => item.region === region);
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

  // ==================== PRICING TIERS ROUTES ====================

  // Get pricing tiers for a listing
  app.get("/api/listings/:id/pricing-tiers", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const tiers = await storage.getPricingTiersByListing(id);
      res.json(tiers);
    } catch (error: any) {
      console.error("Get pricing tiers error:", error);
      res.status(500).json({ message: "Failed to fetch pricing tiers" });
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
      if (existingTiers.some(t => t.minQuantity === data.minQuantity)) {
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
      const rating = await storage.getAverageRating(userId);
      
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
      const userReview = reviews.find(r => r.reviewerId === userId);

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
      if (existingReviews.some(r => r.reviewerId === reviewerId)) {
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
      await sendNotificationToUser(io, revieweeId, {
        userId: revieweeId,
        type: "order_update",
        title: "New Review Received",
        message: `You received a ${data.rating}-star review`,
        relatedId: review.id,
        relatedType: "review",
      });

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
      const review = reviews.find(r => r.id === id);
      
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

    // ==================== PAYMENTS ROUTES - MVP STUBS ====================

    // Initiate a payment
    app.post('/api/payments/initiate', requireRole('buyer'), async (req, res) => {
      try {
        const buyerId = req.session.user!.id;
        const { orderId, paymentMethod } = req.body;
        if (!orderId) return res.status(400).json({ message: 'orderId is required' });

        const order = await storage.getOrder(orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });
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

          const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${paystackSecret}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: buyer?.email, amount: amountInKobo, metadata: { orderId } }),
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

          return res.json({ payment, authorization_url, reference });
        }

        // fallback to manual
        const payment = await storage.createPayment({ orderId, payerId: buyerId, amount: String(order.totalPrice), paymentMethod: paymentMethod || 'manual', transactionId: null, status: 'pending' } as any);
        res.json({ payment });
      } catch (err: any) {
        console.error('Initiate payment error:', err);
        res.status(500).json({ message: 'Failed to initiate payment' });
      }
    });

    // Verify a payment (admin or provider webhook) - for MVP it's an admin-only endpoint for simulating verification
    app.post('/api/payments/verify', requireRole('admin'), async (req, res) => {
      try {
        const { paymentId } = req.body;
        if (!paymentId) return res.status(400).json({ message: 'paymentId required' });

        const payment = await storage.getPayment(paymentId);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const updated = await storage.updatePaymentStatus(paymentId, 'completed');
        if (updated) {
          await storage.updateOrderStatus(updated.orderId, 'accepted');
        }

        res.json({ payment: updated });
      } catch (err: any) {
        console.error('Verify payment error:', err);
        res.status(500).json({ message: 'Failed to verify payment' });
      }
    });

    // Paystack webhook handler
    app.post('/api/payments/paystack/webhook', async (req, res) => {
      try {
        const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
        const signature = req.headers['x-paystack-signature'] as string | undefined;

        // If webhook secret provided, verify signature
        if (secret) {
          const computed = require('crypto').createHmac('sha512', secret).update(req.rawBody || '').digest('hex');
          if (!signature || computed !== signature) {
            console.warn('Invalid Paystack webhook signature');
            return res.status(400).send('Invalid signature');
          }
        }

        const body = req.body as any;
        const event = body.event;
        const data = body.data;

        if (event === 'charge.success' || event === 'transaction.success') {
          const reference = data.reference;
          const payment = await storage.getPaymentByTransactionId(reference);
          if (payment && payment.status !== 'completed') {
            await storage.updatePaymentStatus(payment.id, 'completed');
            // Also update order to accepted
            await storage.updateOrderStatus(payment.orderId, 'accepted');
          }
        }

        // return 200 to acknowledge receipt
        res.json({ status: 'ok' });
      } catch (err: any) {
        console.error('Paystack webhook error:', err);
        res.status(500).json({ message: 'Webhook handling failed' });
      }
    });

    // Get payment status
    app.get('/api/payments/:id', requireAuth, async (req, res) => {
      try {
        const payment = await storage.getPayment(req.params.id);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        const order = await storage.getOrder(payment.orderId);
        if (!order) return res.status(404).json({ message: 'Order not found' });
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

    // ==================== PAYOUTS (MVP) ====================

    // Farmer requests a payout
    app.post('/api/payouts/request', requireRole('farmer'), async (req, res) => {
      try {
        const farmerId = req.session.user!.id;
        const { amount, bankAccount } = req.body;
        if (!amount) return res.status(400).json({ message: 'Amount required' });

        // In a real implementation validate farmer balance and bank details
        const payout = await storage.createPayout({ farmerId, amount: String(amount), status: 'pending', bankAccount, scheduledDate: null } as any);
        // If auto payouts enabled via env or recipient exists, enqueue if recipient exists
        const farmer = await storage.getUser(farmerId);
        const recipient = (farmer as any)?.paystackRecipientCode;
        const autoEnabled = process.env.PAYSTACK_AUTO_PAYOUTS === 'true' || Boolean(recipient);
        if (autoEnabled) {
          if (!recipient) {
            await storage.updatePayout(payout.id, { status: 'needs_recipient' } as any);
            try {
              await sendNotificationToUser(io, farmerId, {
                userId: farmerId,
                type: 'payout_update',
                title: 'Payout Pending - Recipient Required',
                message: `Your payout request for ${amount} is pending because no payment recipient has been set. Please add bank details to receive payouts.`,
                relatedId: payout.id,
                relatedType: 'payout'
              });
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
        const { accountNumber, bankCode, name, currency } = req.body;
        if (!accountNumber || !bankCode) return res.status(400).json({ message: 'accountNumber and bankCode are required' });
        const paystackKey = process.env.PAYSTACK_SECRET_KEY;
        if (!paystackKey) return res.status(400).json({ message: 'Paystack not configured' });

        const farmer = await storage.getUser(farmerId);
        if (!farmer) return res.status(404).json({ message: 'Farmer not found' });

        // Create recipient
        const recipientRes = await fetch('https://api.paystack.co/transferrecipient', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${paystackKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'nuban', name: name || farmer.fullName, account_number: accountNumber, bank_code: bankCode, currency: currency || 'NGN' }),
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

        await storage.updateUser(farmerId, { paystackRecipientCode: recipientCode, bankAccount: accountNumber } as any);
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
        res.json({ paystackRecipientCode: (farmer as any)?.paystackRecipientCode, bankAccount: (farmer as any)?.bankAccount });
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

        const payment = await storage.getPaymentByTransactionId(transactionRef);
        if (!payment) return res.status(404).json({ message: 'Payment not found' });

        if (status === 'success' || status === 'completed') {
          await storage.updatePaymentStatus(payment.id, 'completed');
          await storage.updateOrderStatus(payment.orderId, 'accepted');
        }

        res.json({ status, data });
      } catch (err: any) {
        console.error('Paystack verify admin error:', err);
        res.status(500).json({ message: 'Verification failed' });
      }
    });
}
