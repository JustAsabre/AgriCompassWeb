import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

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
          password: 'password123',
          fullName: 'Test User',
          role: 'farmer',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('test@example.com');
    });

    it('rejects duplicate email', async () => {
      // First registration
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'duplicate@example.com',
          password: 'password123',
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
          password: 'password123',
          fullName: 'Login User',
          role: 'buyer',
        });
    });

    it('authenticates user with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@example.com',
          password: 'password123',
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
        .send({ email: 'login@example.com', password: 'password123' });
      expect(first.status).toBe(200);
      const cookie = first.headers['set-cookie'];

      // Call login again using the same session cookie - the server should return the existing user
      const second = await request(app).post('/api/auth/login').set('Cookie', cookie).send({ email: 'login@example.com', password: 'password123' });
      expect(second.status).toBe(200);
      expect(second.body.user.email).toBe('login@example.com');
    });
  });
});
