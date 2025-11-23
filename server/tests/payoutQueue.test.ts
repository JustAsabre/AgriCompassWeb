import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Payout queue processing', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('admin enqueues a payout and worker processes it', async () => {
    // Register farmer & admin
    await request(app).post('/api/auth/register').send({ email: 'queue_farmer@test.com', password: 'password', fullName: 'Queue Farmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'queue_farmer@test.com', password: 'password' });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    await request(app).post('/api/auth/register').send({ email: 'queue_admin@test.com', password: 'password', fullName: 'Queue Admin', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'queue_admin@test.com', password: 'password' });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Create a payout for the farmer directly
    const payout = await storage.createPayout({ farmerId: (await storage.getUserByEmail('queue_farmer@test.com'))!.id, amount: '10.00', status: 'pending', bankAccount: "123" } as any);

    // Admin enqueues the payout
    const res = await request(app).post('/api/payouts/process').set('Cookie', adminCookie).send({ payoutId: payout.id });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);

    // Poll for up to 6 seconds for payout to be processed
    const start = Date.now();
    let processed = false;
    while (Date.now() - start < 6000) {
      const p = await storage.getPayout(payout.id);
      if (p && (p.status === 'completed' || p.status === 'processing')) { processed = true; break; }
      await new Promise(r => setTimeout(r, 500));
    }

    expect(processed).toBe(true);
  }, 10000);
});
