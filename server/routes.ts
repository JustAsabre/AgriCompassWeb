import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { hashPassword, comparePassword, sanitizeUser, SessionUser } from "./auth";
import { insertUserSchema, insertListingSchema, insertOrderSchema, insertCartItemSchema } from "@shared/schema";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      // Create session
      req.session.user = sanitizeUser(user);

      res.json({ user: req.session.user });
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(400).json({ message: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await storage.getUserByEmail(email);
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

      res.json({ user: req.session.user });
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

  app.post("/api/listings", requireRole("farmer"), async (req, res) => {
    try {
      // Get farmer ID from authenticated session
      const farmerId = req.session.user!.id;
      
      const data = insertListingSchema.parse({
        ...req.body,
        farmerId,
      });

      const listing = await storage.createListing(data);
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
      res.json(updated);
    } catch (error: any) {
      console.error("Update order status error:", error);
      res.status(400).json({ message: "Failed to update order status" });
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

  const httpServer = createServer(app);
  return httpServer;
}
