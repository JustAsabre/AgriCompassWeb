import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';

describe('Authentication API', () => {
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

  describe('POST /api/auth/register', () => {
    it('creates a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password1234',
          fullName: 'Test User',
          role: 'farmer',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('requiresVerification', true);
      expect(response.body).toHaveProperty('message');

      // Ensure user exists in storage
      const user = await storage.getUserByEmail('test@example.com');
      expect(user).toBeDefined();
      expect(user!.email).toBe('test@example.com');
    });

    it('rejects duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password1234',
          fullName: 'User One',
          role: 'buyer',
        });

      // Duplicate registration
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'different123',
          fullName: 'User Two',
          role: 'farmer',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already registered');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'login@example.com',
          password: 'password1234',
          fullName: 'Login User',
          role: 'buyer',
        });

      // Verify email so login flow is allowed
      const user = await storage.getUserByEmail('login@example.com');
      if (!user?.emailVerificationToken) throw new Error('Missing verification token in test setup');
      const verify = await request(app).get('/api/auth/verify-email').query({ token: user.emailVerificationToken });
      expect(verify.status).toBe(200);
    });

    it('authenticates user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password1234',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe('login@example.com');
    });

    it('rejects incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('does not create duplicate sessions when already logged in', async () => {
      const first = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@example.com', password: 'password1234' });
      expect(first.status).toBe(200);
      const cookie = first.headers['set-cookie'];

      // Call login again using the same session cookie - the server should return the existing user
      const second = await request(app).post('/api/auth/login').set('Cookie', cookie).send({ email: 'login@example.com', password: 'password1234' });
      expect(second.status).toBe(200);
      expect(second.body.user.email).toBe('login@example.com');
    });
  });
});
