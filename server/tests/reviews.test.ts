import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import session from "express-session";
import { createServer } from "http";
import { registerRoutes } from "../routes";
import { storage } from "../storage";
import { hashPassword } from "../auth";
import './setup';

describe("Reviews API", () => {
  let app: Express;
  let server: any;
  let httpServer: any;
  let farmerId: string;
  let buyerId: string;
  let adminId: string;
  let orderId: string;
  let listingId: string;
  let farmerCookie: string;
  let buyerCookie: string;
  let adminCookie: string;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);

    // Create test users
    const hashedPassword = await hashPassword("password123");
    const farmer = await storage.createUser({
      email: `farmer-review-${Date.now()}@test.com`,
      password: hashedPassword,
      fullName: "Test Farmer",
      role: "farmer",
    });
    farmerId = farmer.id;
    // Login is blocked until emailVerified=true; and farmer-only flows often require verified=true.
    await storage.updateUser(farmerId, { emailVerified: true, verified: true } as any);

    const buyer = await storage.createUser({
      email: `buyer-review-${Date.now()}@test.com`,
      password: hashedPassword,
      fullName: "Test Buyer",
      role: "buyer",
    });
    buyerId = buyer.id;
    await storage.updateUser(buyerId, { emailVerified: true } as any);

    const admin = await storage.createUser({
      email: `admin-review-${Date.now()}@test.com`,
      password: hashedPassword,
      fullName: "Test Admin",
      role: "admin",
    });
    adminId = admin.id;
    await storage.updateUser(adminId, { emailVerified: true } as any);

    // Login and get cookies
    const farmerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: farmer.email, password: "password123" });
    farmerCookie = farmerLogin.headers['set-cookie'];
    if (!farmerCookie) throw new Error("Farmer login failed - no cookie");

    const buyerLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: buyer.email, password: "password123" });
    buyerCookie = buyerLogin.headers['set-cookie'];
    if (!buyerCookie) throw new Error("Buyer login failed - no cookie");

    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: admin.email, password: "password123" });
    adminCookie = adminLogin.headers['set-cookie'];
    if (!adminCookie) throw new Error("Admin login failed - no cookie");

    // Create a listing
    const listing = await storage.createListing({
      farmerId,
      productName: 'Test Produce',
      category: 'Vegetables',
      description: 'Test description',
      price: '10.00',
      unit: 'kg',
      quantityAvailable: 100,
      minOrderQuantity: 1,
      location: "Test Location",
      imageUrl: null,
    });
    listingId = listing.id;

    // Create and complete an order
    const order = await storage.createOrder({
      buyerId,
      farmerId,
      listingId,
      quantity: 5,
      totalPrice: '50.00',
      status: "pending",
    });
    orderId = order.id;

    // Complete the order
    await storage.updateOrderStatus(orderId, "completed");
  });

  afterEach(() => {
    // Close server if listening
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe("GET /api/reviews/user/:userId", () => {
    it("returns reviews for a user with average rating", async () => {
      // Create a review
      await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 5,
        comment: "Great produce!",
      });

      const response = await request(app)
        .get(`/api/reviews/user/${farmerId}`)
        .expect(200);

      expect(response.body).toHaveProperty("reviews");
      expect(response.body).toHaveProperty("averageRating");
      expect(response.body).toHaveProperty("reviewCount");
      expect(Array.isArray(response.body.reviews)).toBe(true);
      expect(response.body.reviews.length).toBe(1);
      expect(response.body.averageRating).toBe(5);
      expect(response.body.reviewCount).toBe(1);
    });

    it("returns empty reviews for user with no reviews", async () => {
      const response = await request(app)
        .get(`/api/reviews/user/${farmerId}`)
        .expect(200);

      expect(response.body.reviews).toEqual([]);
      expect(response.body.averageRating).toBe(0);
      expect(response.body.reviewCount).toBe(0);
    });

    it("returns empty reviews for invalid user ID", async () => {
      const response = await request(app)
        .get("/api/reviews/user/invalid-id")
        .expect(200);

      expect(response.body.reviews).toEqual([]);
      expect(response.body.averageRating).toBe(0);
      expect(response.body.reviewCount).toBe(0);
    });
  });

  describe("GET /api/reviews", () => {
    it("returns all reviews for admin", async () => {
      // Create a review
      await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 4,
        comment: "Good quality",
      });

      const response = await request(app)
        .get("/api/reviews")
        .set("Cookie", adminCookie)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it("rejects access from non-admin", async () => {
      const response = await request(app)
        .get("/api/reviews")
        .set("Cookie", farmerCookie)
        .expect(403);

      expect(response.body.message).toBe("Forbidden - Insufficient permissions");
    });

    it("rejects access from unauthenticated user", async () => {
      const response = await request(app)
        .get("/api/reviews")
        .expect(401);

      expect(response.body.message).toBe("Unauthorized - Please log in");
    });
  });

  describe("GET /api/reviews/order/:orderId", () => {
    it("returns user's review for their order", async () => {
      // Create a review
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 5,
        comment: "Excellent service",
      });

      const response = await request(app)
        .get(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .expect(200);

      expect(response.body.id).toBe(review.id);
      expect(response.body.rating).toBe(5);
      expect(response.body.comment).toBe("Excellent service");
    });

    it("returns 404 when user has not reviewed the order", async () => {
      const response = await request(app)
        .get(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .expect(200);

      // API returns null (200) when no review exists for this user/order.
      expect(response.body).toBe(null);
    });

    it("rejects access from user not part of the order", async () => {
      // Create another user
      const otherUser = await storage.createUser({
        email: `other-${Date.now()}@test.com`,
        password: await hashPassword("password123"),
        fullName: "Other User",
        role: "buyer",
      });
      await storage.updateUser(otherUser.id, { emailVerified: true } as any);

      const otherLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: otherUser.email, password: "password123" });
      const otherCookie = otherLogin.headers['set-cookie'];
      if (!otherCookie) throw new Error("Other user login failed - no cookie");

      const response = await request(app)
       .get(`/api/reviews/order/${orderId}`)
         .set("Cookie", otherCookie)
         .expect(200);

      expect(response.body).toBe(null);
    });

    it("rejects access from unauthenticated user", async () => {
      const response = await request(app)
        .get(`/api/reviews/order/${orderId}`)
        .expect(401);

      expect(response.body.message).toBe("Unauthorized - Please log in");
    });
  });

  describe("POST /api/reviews/order/:orderId", () => {
    it("creates a review for completed order", async () => {
      const reviewData = {
        rating: 4,
        comment: "Good quality produce",
      };

      const response = await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .send(reviewData)
        .expect(201);

      expect(response.body).toHaveProperty("id");
      expect(response.body.rating).toBe(4);
      expect(response.body.comment).toBe("Good quality produce");
      expect(response.body.reviewerId).toBe(buyerId);
      expect(response.body.revieweeId).toBe(farmerId);
      expect(response.body.orderId).toBe(orderId);
    });

    it("rejects review creation for non-completed order", async () => {
      // Create a new order that's not completed
      const pendingOrder = await storage.createOrder({
        buyerId,
        farmerId,
        listingId,
        quantity: 2,
        totalPrice: '20.00',
        status: "pending",
      });

      const response = await request(app)
        .post(`/api/reviews/order/${pendingOrder.id}`)
        .set("Cookie", buyerCookie)
        .send({ rating: 5, comment: "Test" })
        .expect(400);

      expect(response.body.message).toBe("Can only review completed orders");
    });

    it("rejects duplicate review for same order", async () => {
      // Create first review
      await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .send({ rating: 5, comment: "First review" })
        .expect(201);

      // Try to create second review
      const response = await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .send({ rating: 4, comment: "Second review" })
        .expect(400);

      expect(response.body.message).toBe("You have already reviewed this order");
    });

    it("rejects review from user not part of order", async () => {
      // Create another user
      const otherUser = await storage.createUser({
        email: `other-review-${Date.now()}@test.com`,
        password: await hashPassword("password123"),
        fullName: "Other User",
        role: "buyer",
      });
      await storage.updateUser(otherUser.id, { emailVerified: true } as any);

      const otherLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: otherUser.email, password: "password123" });
      const otherCookie = otherLogin.headers['set-cookie'];
      if (!otherCookie) throw new Error("Other user login failed - no cookie");

      const response = await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .set("Cookie", otherCookie)
        .send({ rating: 3, comment: "Test" })
        .expect(403);

      expect(response.body.message).toBe("Not authorized to review this order");
    });

    it("rejects review for non-existent order", async () => {
      const response = await request(app)
        .post("/api/reviews/order/non-existent-id")
        .set("Cookie", buyerCookie)
        .send({ rating: 5, comment: "Test" })
        .expect(404);

      expect(response.body.message).toBe("Order not found");
    });

    it("validates required fields", async () => {
      const response = await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .set("Cookie", buyerCookie)
        .send({})
        .expect(400);

      expect(response.body.message).toContain("Required");
    });

    it("rejects access from unauthenticated user", async () => {
      const response = await request(app)
        .post(`/api/reviews/order/${orderId}`)
        .send({ rating: 5, comment: "Test" })
        .expect(401);

      expect(response.body.message).toBe("Unauthorized - Please log in");
    });
  });

  describe("PATCH /api/reviews/:id/approve", () => {
    it("approves review as admin", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 3,
        comment: "Average experience",
        approved: false,
      });

      const response = await request(app)
        .patch(`/api/reviews/${review.id}/approve`)
        .set("Cookie", adminCookie)
        .send({ approved: true })
        .expect(200);

      expect(response.body.approved).toBe(true);
    });

    it("rejects review as admin", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 3,
        comment: "Average experience",
        approved: true,
      });

      const response = await request(app)
        .patch(`/api/reviews/${review.id}/approve`)
        .set("Cookie", adminCookie)
        .send({ approved: false })
        .expect(200);

      expect(response.body.approved).toBe(false);
    });

    it("returns 404 for non-existent review", async () => {
      const response = await request(app)
        .patch("/api/reviews/non-existent-id/approve")
        .set("Cookie", adminCookie)
        .send({ approved: true })
        .expect(404);

      expect(response.body.message).toBe("Review not found");
    });

    it("rejects access from non-admin", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 3,
        comment: "Test",
      });

      const response = await request(app)
        .patch(`/api/reviews/${review.id}/approve`)
        .set("Cookie", farmerCookie)
        .send({ approved: true })
        .expect(403);

      expect(response.body.message).toBe("Forbidden - Insufficient permissions");
    });

    it("rejects access from unauthenticated user", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 3,
        comment: "Test",
      });

      const response = await request(app)
        .patch(`/api/reviews/${review.id}/approve`)
        .send({ approved: true })
        .expect(401);

      expect(response.body.message).toBe("Unauthorized - Please log in");
    });
  });

  describe("DELETE /api/reviews/:id", () => {
    it("allows review owner to delete their review", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 2,
        comment: "Poor experience",
      });

      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set("Cookie", buyerCookie)
        .expect(200);

      expect(response.body.message).toBe("Review deleted successfully");
    });

    it("allows admin to delete any review", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 2,
        comment: "Poor experience",
      });

      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set("Cookie", adminCookie)
        .expect(200);

      expect(response.body.message).toBe("Review deleted successfully");
    });

    it("rejects deletion from non-owner non-admin", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 2,
        comment: "Poor experience",
      });

      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .set("Cookie", farmerCookie)
        .expect(403);

      expect(response.body.message).toBe("Not authorized to delete this review");
    });

    it("returns 404 for non-existent review", async () => {
      const response = await request(app)
        .delete("/api/reviews/non-existent-id")
        .set("Cookie", buyerCookie)
        .expect(404);

      expect(response.body.message).toBe("Review not found");
    });

    it("rejects access from unauthenticated user", async () => {
      const review = await storage.createReview({
        orderId,
        reviewerId: buyerId,
        revieweeId: farmerId,
        rating: 2,
        comment: "Test",
      });

      const response = await request(app)
        .delete(`/api/reviews/${review.id}`)
        .expect(401);

      expect(response.body.message).toBe("Unauthorized - Please log in");
    });
  });
});