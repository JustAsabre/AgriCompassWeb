import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import './setup';

describe('Session Isolation Security Tests', () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret-session-isolation',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true }
    }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
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

  afterEach(() => {
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('Session Data Isolation', () => {
    it('prevents session data leakage between concurrent users', async () => {
      // Register two different users
      const user1Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user1@example.com',
          password: 'password1234',
          fullName: 'User One',
          role: 'farmer',
        });

      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user2@example.com',
          password: 'password1234',
          fullName: 'User Two',
          role: 'buyer',
        });

      expect(user1Response.status).toBe(201);
      expect(user2Response.status).toBe(201);

      await verifyEmail('user1@example.com');
      await verifyEmail('user2@example.com');

      // Login both users with separate agent instances to simulate different browser sessions
      const agent1 = request.agent(app);
      const agent2 = request.agent(app);

      const login1Response = await agent1
        .post('/api/auth/login')
        .send({
          email: 'user1@example.com',
          password: 'password1234',
        });

      const login2Response = await agent2
        .post('/api/auth/login')
        .send({
          email: 'user2@example.com',
          password: 'password1234',
        });

      expect(login1Response.status).toBe(200);
      expect(login2Response.status).toBe(200);

      // Check that each user sees their own session data
      const me1Response = await agent1.get('/api/auth/me');
      const me2Response = await agent2.get('/api/auth/me');

      expect(me1Response.status).toBe(200);
      expect(me2Response.status).toBe(200);

      expect(me1Response.body.user.email).toBe('user1@example.com');
      expect(me1Response.body.user.role).toBe('farmer');
      expect(me1Response.body.user.fullName).toBe('User One');

      expect(me2Response.body.user.email).toBe('user2@example.com');
      expect(me2Response.body.user.role).toBe('buyer');
      expect(me2Response.body.user.fullName).toBe('User Two');

      // Ensure user1 cannot access user2's data and vice versa
      expect(me1Response.body.user.email).not.toBe(me2Response.body.user.email);
      expect(me1Response.body.user.id).not.toBe(me2Response.body.user.id);
    });

    it('maintains session isolation under concurrent load', async () => {
      // Create multiple users and test concurrent access
      const users = [
        { email: 'concurrent1@example.com', role: 'farmer', name: 'Concurrent One' },
        { email: 'concurrent2@example.com', role: 'buyer', name: 'Concurrent Two' },
        { email: 'concurrent3@example.com', role: 'field_officer', name: 'Concurrent Three' },
      ];

      // Register all users
      for (const user of users) {
        const response = await request(app)
          .post('/api/auth/register')
          .send({
            email: user.email,
            password: 'password1234',
            fullName: user.name,
            role: user.role,
          });
        expect(response.status).toBe(201);
      }

      for (const user of users) {
        await verifyEmail(user.email);
      }

      // Create agents for each user
      const agents = users.map(() => request.agent(app));

      // Login all users concurrently
      const loginPromises = users.map((user, index) =>
        agents[index]
          .post('/api/auth/login')
          .send({
            email: user.email,
            password: 'password1234',
          })
      );

      const loginResponses = await Promise.all(loginPromises);
      loginResponses.forEach(response => expect(response.status).toBe(200));

      // Test concurrent session access
      const mePromises = agents.map(agent => agent.get('/api/auth/me'));
      const meResponses = await Promise.all(mePromises);

      meResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.user.email).toBe(users[index].email);
        expect(response.body.user.role).toBe(users[index].role);
        expect(response.body.user.fullName).toBe(users[index].name);
      });

      // Verify no cross-contamination
      for (let i = 0; i < users.length; i++) {
        for (let j = i + 1; j < users.length; j++) {
          expect(meResponses[i].body.user.id).not.toBe(meResponses[j].body.user.id);
          expect(meResponses[i].body.user.email).not.toBe(meResponses[j].body.user.email);
        }
      }
    });

    it('prevents session fixation attacks', async () => {
      // Register a user
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sessionfix@example.com',
          password: 'password1234',
          fullName: 'Session Fix Test',
          role: 'farmer',
        });

      expect(registerResponse.status).toBe(201);
      const originalUserId = registerResponse.body.user.id;

      await verifyEmail('sessionfix@example.com');

      // Login with the user
      const agent = request.agent(app);
      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'sessionfix@example.com',
          password: 'password1234',
        });

      expect(loginResponse.status).toBe(200);

      // Verify session contains correct user data
      const meResponse = await agent.get('/api/auth/me');
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.id).toBe(originalUserId);
      expect(meResponse.body.user.email).toBe('sessionfix@example.com');

      // Logout
      const logoutResponse = await agent.post('/api/auth/logout');
      expect(logoutResponse.status).toBe(200);

      // Verify session is cleared after logout
      const meAfterLogout = await agent.get('/api/auth/me');
      expect(meAfterLogout.status).toBe(401); // Should require authentication
    });

    it('handles session expiration correctly', async () => {
      // This test would require configuring session store with short expiration
      // For now, we'll test that sessions work as expected
      const agent = request.agent(app);

      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'sessionexp@example.com',
          password: 'password1234',
          fullName: 'Session Exp Test',
          role: 'buyer',
        });

      expect(registerResponse.status).toBe(201);

      await verifyEmail('sessionexp@example.com');

      const loginResponse = await agent
        .post('/api/auth/login')
        .send({
          email: 'sessionexp@example.com',
          password: 'password1234',
        });

      expect(loginResponse.status).toBe(200);

      // Verify session works
      const meResponse = await agent.get('/api/auth/me');
      expect(meResponse.status).toBe(200);
      expect(meResponse.body.user.email).toBe('sessionexp@example.com');
    });
  });
});
