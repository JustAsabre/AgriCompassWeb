import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage';
import './setup';

describe('Authentication Lockout', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('locks account after repeated failed logins', async () => {
    const email = 'locktest@example.com';
    const password = 'correcthorsebatterystaple';

    // Register user
    await request(app).post('/api/auth/register').send({ email, password, fullName: 'Lock Test', role: 'buyer' });

    // Email verification is required before login attempts are evaluated.
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user?.emailVerificationToken) throw new Error('Missing email verification token in test setup');
    const verifyRes = await request(app).get('/api/auth/verify-email').query({ token: user.emailVerificationToken });
    expect(verifyRes.status).toBe(200);

    // Attempt to login with incorrect password repeatedly
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
      expect(res.status).toBe(401);
    }

    // Next attempt should produce lock (403)
    const locked = await request(app).post('/api/auth/login').send({ email, password: 'wrongpass' });
    expect(locked.status).toBe(403);
  }, 20000);
});
