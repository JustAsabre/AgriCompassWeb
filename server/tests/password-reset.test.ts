import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import { initializeSocket } from '../socket';

// Mock email sending functions to avoid external side effects
vi.mock('../email', () => ({
  sendEmailVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue({ success: true }),
  // Registration flow also calls sendWelcomeEmail; include it in the mock
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderAcceptedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderDeliveredEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderCompletedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEscrowReleasedEmail: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Password Reset API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );
    httpServer = createServer(app);
    const io = initializeSocket(httpServer);
    await registerRoutes(app, httpServer, io);
  });

  afterEach(() => {
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('POST /api/auth/forgot-password', () => {
    it('returns success even if email does not exist', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(res.status).toBe(200);
    });

    it('generates reset token for existing user', async () => {
      // Register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'reset-user@example.com',
          password: 'password1234',
          fullName: 'Reset User',
          role: 'buyer',
        });

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'reset-user@example.com' });

      expect(res.status).toBe(200);

      // Verify token saved on user
      const user = await storage.getUserByEmail('reset-user@example.com');
      expect(user).toBeDefined();
      expect(user!.resetToken).toBeTruthy();
      expect(user!.resetTokenExpiry).toBeInstanceOf(Date);
      expect(user!.resetTokenExpiry!.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('POST /api/auth/reset-password', () => {
    it('rejects invalid token', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'invalid-token', newPassword: 'newpassword1234' });

      expect(res.status).toBe(400);
    });

    it('rejects short passwords', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'any-token', newPassword: 'short' });

      expect(res.status).toBe(400);
    });

    it('rejects expired token', async () => {
      // Register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'expired-token@example.com',
          password: 'password1234',
          fullName: 'Expired Token User',
          role: 'buyer',
        });

      // Manually set expired token
      const user = await storage.getUserByEmail('expired-token@example.com');
      expect(user).toBeDefined();
      const token = 'expired-token-value';
      await storage.updateUser(user!.id, {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() - 1000),
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpassword1234' });

      expect(res.status).toBe(400);
    });

    it('resets password and clears token with valid token', async () => {
      // Register a user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'valid-reset@example.com',
          password: 'password1234',
          fullName: 'Valid Reset User',
          role: 'buyer',
        });

      // Verify email (required before login).
      const registered = await storage.getUserByEmail('valid-reset@example.com');
      if (!registered) throw new Error('User not found after registration');
      if (!registered.emailVerified) {
        if (!registered.emailVerificationToken) throw new Error('Missing emailVerificationToken in test setup');
        const verifyRes = await request(app)
          .get('/api/auth/verify-email')
          .query({ token: registered.emailVerificationToken });
        expect(verifyRes.status).toBe(200);
      }

      // Generate a valid token
      const user = await storage.getUserByEmail('valid-reset@example.com');
      expect(user).toBeDefined();
      const token = 'valid-token-value';
      await storage.updateUser(user!.id, {
        resetToken: token,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      });

      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token, newPassword: 'newpassword1234' });

      expect(res.status).toBe(200);

      // Verify token cleared and password changed by logging in
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'valid-reset@example.com', password: 'newpassword1234' });

      expect(loginRes.status).toBe(200);

      const updatedUser = await storage.getUserByEmail('valid-reset@example.com');
      expect(updatedUser!.resetToken).toBeNull();
      expect(updatedUser!.resetTokenExpiry).toBeNull();
    });
  });
});
