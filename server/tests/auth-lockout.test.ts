import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';

describe('Authentication Lockout', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
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
