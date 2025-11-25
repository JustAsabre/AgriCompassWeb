import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

describe('Message Routes', () => {
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

  describe('GET /api/messages/conversations', () => {
    it('should return user\'s conversations', async () => {
      // First create and login users
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          fullName: 'User One',
          role: 'farmer',
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password123',
          fullName: 'User Two',
          role: 'buyer',
        });

      // Login user1
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/messages/conversations')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array when no conversations exist', async () => {
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          fullName: 'User One',
          role: 'farmer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

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
      // Create users
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          fullName: 'User One',
          role: 'farmer',
        });

      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password123',
          fullName: 'User Two',
          role: 'buyer',
        });

      // Login user1
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      // Get user2's ID by checking auth/me endpoint
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      const user1Id = meResponse.body.user.id;

      // Get messages (should be empty initially)
      const response = await request(app)
        .get(`/api/messages/${user1Id}`)
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/messages/unread/count', () => {
    it('should return unread message count', async () => {
      // Create and login user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password123',
          fullName: 'User One',
          role: 'farmer',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/messages/unread/count')
        .set('Cookie', cookie);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('count');
      expect(typeof response.body.count).toBe('number');
    });
  });
});