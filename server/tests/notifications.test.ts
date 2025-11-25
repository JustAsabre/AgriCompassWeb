import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

describe("Notifications API", () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
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

  describe("GET /api/notifications", () => {
    it("should return user's notifications", async () => {
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'notif-user@example.com',
          password: 'password123',
          fullName: 'Notification User',
          role: 'buyer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notif-user@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      // Get user ID
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);
      const userId = meResponse.body.user.id;

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
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'unread-user@example.com',
          password: 'password123',
          fullName: 'Unread User',
          role: 'farmer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unread-user@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/notifications/unread-count')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("count");
      expect(typeof response.body.count).toBe("number");
    });

    it("should return 0 when no unread notifications", async () => {
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'no-unread@example.com',
          password: 'password123',
          fullName: 'No Unread User',
          role: 'buyer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'no-unread@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

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
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'mark-read-user@example.com',
          password: 'password123',
          fullName: 'Mark Read User',
          role: 'farmer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mark-read-user@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

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
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'mark-all-user@example.com',
          password: 'password123',
          fullName: 'Mark All User',
          role: 'buyer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'mark-all-user@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

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
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'delete-user@example.com',
          password: 'password123',
          fullName: 'Delete User',
          role: 'farmer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'delete-user@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

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