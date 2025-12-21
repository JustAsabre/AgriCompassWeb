import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import sessionMiddleware from '../session';
import './setup';

describe('Message Routes', () => {
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

  const registerAndLogin = async (email: string, role: string, fullName: string) => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password123', fullName, role });
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

  describe('GET /api/messages/conversations', () => {
    it('should return user\'s conversations', async () => {
      await registerAndLogin('user2@example.com', 'buyer', 'User Two');
      const cookie = await registerAndLogin('user1@example.com', 'farmer', 'User One');

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when no conversations exist', async () => {
      const cookie = await registerAndLogin('user1@example.com', 'farmer', 'User One');

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/messages/:otherUserId', () => {
    it('should return messages between two users', async () => {
      await registerAndLogin('user2@example.com', 'buyer', 'User Two');
      const cookie = await registerAndLogin('user1@example.com', 'farmer', 'User One');

      // Get the other user's id from storage (since /api/auth/me returns the logged-in user)
      const other = await storage.getUserByEmail('user2@example.com');
      expect(other).toBeDefined();
      if (!other) throw new Error('Test setup: missing other user');

      // Get messages (should be empty initially)
      const response = await request(app)
        .get(`/api/messages/${other.id}`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/messages/unread/count', () => {
    it('should return unread message count', async () => {
      const cookie = await registerAndLogin('user1@example.com', 'farmer', 'User One');

      const response = await request(app)
        .get('/api/messages/unread/count')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });
});