import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, sanitizeUser, SessionUser } from "./auth";
import { insertUserSchema, insertListingSchema, insertOrderSchema, insertCartItemSchema } from "@shared/schema";
import { sendPasswordResetEmail, sendWelcomeEmail } from "./email";
import { upload, getFileUrl, deleteUploadedFile } from "./upload";
import { io, sendNotificationToUser, broadcastNewListing } from "./socket";
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

export async function registerRoutes(app: Express, httpServer: Server): Promise<void> {
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

      // Compare password
      const isValid = await comparePassword(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
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

  app.get("/api/auth/me", (req, res) => {
    if (req.session.user) {
      res.json({ user: req.session.user });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // Password reset routes
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Don't reveal if email exists for security
        return res.json({ message: "If an account exists with this email, a password reset link has been sent." });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

      // Save token to user
      await storage.updateUser(user.id, {
        resetToken,
        resetTokenExpiry,
      });

      // Send email
      const emailResult = await sendPasswordResetEmail(email, resetToken, user.fullName);
      
      if (!emailResult.success) {
        console.error('Failed to send reset email:', emailResult.error);
        return res.status(500).json({ message: "Failed to send reset email. Please try again." });
      }

      res.json({ message: "If an account exists with this email, a password reset link has been sent." });
    } catch (error: any) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

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
      await deleteUploadedFile(req.params.filename);
      res.json({ message: "File deleted successfully" });
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

      // Create orders (one per cart item)
      const orders = [];
      for (const item of cartItems) {
        const totalPrice = (Number(item.listing.price) * item.quantity).toFixed(2);
        
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

  // ====================
  // VERIFICATION ROUTES
  // ====================

  // Get all verifications for field officers
  app.get("/api/verifications", requireRole("field_officer"), async (req: Request, res: Response) => {
    try {
      const officerId = req.session.user!.id;
      const verifications = await storage.getVerificationsByOfficer(officerId);
      
      // Fetch farmer details for each verification
      const verificationsWithFarmers = await Promise.all(
        verifications.map(async (v) => {
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
          await sendNotificationToUser(io, verification.farmerId, {
            userId: verification.farmerId,
            type: "verification_update",
            title: "Verification Status Update",
            message: statusMessages[status],
            relatedId: verification.id,
            relatedType: "verification",
          });
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
}
