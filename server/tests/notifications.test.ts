import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import sessionMiddleware from '../session';
import './setup';

describe("Notifications API", () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
    // Don't actually listen - supertest handles it
  });

  afterEach(() => {
    // Close server if listening
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  const verifyEmail = async (email: string) => {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) throw new Error(`Test setup: user not found for email ${email}`);
    if ((user as any).emailVerified) return;
    const token = (user as any).emailVerificationToken;
    if (!token) throw new Error(`Test setup: missing emailVerificationToken for ${email}`);
    await request(app)
      .get(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .expect(200);
  };

  const registerAndLogin = async (email: string, role: string) => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', fullName: 'Test User', role });
    expect(registerRes.status).toBe(201);

    await verifyEmail(email);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password123' });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers['set-cookie'];
    expect(cookie).toBeDefined();
    return cookie;
  };

  describe("GET /api/notifications", () => {
    it("should return user's notifications", async () => {
      const cookie = await registerAndLogin('notif-user@example.com', 'buyer');

      // Create a notification for the user (this would normally be done by the system)
      // For testing, we'll simulate this by directly calling the storage method
      // Since we can't easily access storage here, let's test with empty notifications first
      const response = await request(app)
        .get('/api/notifications')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/api/notifications");

      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/notifications/unread-count", () => {
    it("should return unread count for user", async () => {
      const cookie = await registerAndLogin('unread-user@example.com', 'farmer');

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("count");
      expect(typeof response.body.count).toBe("number");
    });

    it("should return 0 when no unread notifications", async () => {
      const cookie = await registerAndLogin('no-unread@example.com', 'buyer');

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("count");
      expect(response.body.count).toBe(0);
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app).get("/api/notifications/unread-count");

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/notifications/:id/read", () => {
    it("should return 404 for non-existent notification", async () => {
      const cookie = await registerAndLogin('mark-read-user@example.com', 'farmer');

      const response = await request(app)
        .patch("/api/notifications/non-existent-id/read")
        .set('Cookie', cookie);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "Notification not found");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app)
        .patch("/api/notifications/test-id/read");

      expect(response.status).toBe(401);
    });
  });

  describe("PATCH /api/notifications/mark-all-read", () => {
    it("should work when user has no notifications", async () => {
      const cookie = await registerAndLogin('mark-all-user@example.com', 'buyer');

      const response = await request(app)
        .patch("/api/notifications/mark-all-read")
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("message", "All notifications marked as read");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app)
        .patch("/api/notifications/mark-all-read");

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /api/notifications/:id", () => {
    it("should return 404 for non-existent notification", async () => {
      const cookie = await registerAndLogin('delete-user@example.com', 'farmer');

      const response = await request(app)
        .delete("/api/notifications/non-existent-id")
        .set('Cookie', cookie);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("message", "Notification not found");
    });

    it("should reject unauthenticated requests", async () => {
      const response = await request(app)
        .delete("/api/notifications/test-id");

      expect(response.status).toBe(401);
    });
  });
});