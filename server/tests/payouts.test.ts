import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Payouts API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('allows a farmer to request a payout and admin to process it', async () => {
    // Register farmer
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'payout_farmer@test.com', password: 'password123', fullName: 'Pay Farmer', role: 'farmer' });
    expect(farmerRes.status).toBe(201);

    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payout_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    const requestRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({ amount: '10.00', bankAccount: '12345678' });
    expect(requestRes.status).toBe(200);
    expect(requestRes.body.payout).toBeDefined();
    const payoutId = requestRes.body.payout.id;

    // Register admin
    // Give the farmer a recipient so processing will be enqueued
    const farmer = await storage.getUserByEmail('payout_farmer@test.com');
    if (farmer) await storage.updateUser(farmer.id, { paystackRecipientCode: 'RCP_test_abc' } as any);
    await request(app).post('/api/auth/register').send({ email: 'admin_payout@test.com', password: 'password123', fullName: 'Admin', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin_payout@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    const processRes = await request(app).post('/api/payouts/process').set('Cookie', adminCookie).send({ payoutId });
    expect(processRes.status).toBe(200);
    expect(processRes.body.queued).toBe(true);

    // wait for worker to process
    let processed = false;
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const p = await storage.getPayout(payoutId);
      if (p && p.status === 'completed') { processed = true; break; }
      await new Promise(r => setTimeout(r, 500));
    }
    expect(processed).toBe(true);
  });

  it('returns an error when creating a recipient without Paystack configured', async () => {
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payout_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    const res = await request(app).post('/api/payouts/recipient').set('Cookie', farmerCookie).send({ accountNumber: '12345678', bankCode: '058' });
    expect(res.status).toBe(400);
  });

  it('marks payout as needs_recipient if auto payouts enabled but farmer has no recipient', async () => {
    process.env.PAYSTACK_AUTO_PAYOUTS = 'true';

    // create a new farmer for this test
    await request(app).post('/api/auth/register').send({ email: 'payout_need_recipient_farmer@test.com', password: 'password123', fullName: 'Need Recipient', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payout_need_recipient_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    const requestRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({ amount: '20.00', bankAccount: '12345678' });
    expect(requestRes.status).toBe(200);
    expect(requestRes.body.payout).toBeDefined();
    const payoutId = requestRes.body.payout.id;

    const p = await storage.getPayout(payoutId);
    expect(p?.status).toBe('needs_recipient');
    // cleanup
    delete process.env.PAYSTACK_AUTO_PAYOUTS;
  });

  it('admin can retry/queue a payout once recipient exists', async () => {
    process.env.PAYSTACK_AUTO_PAYOUTS = 'true';
    // create a farmer and payout
    await request(app).post('/api/auth/register').send({ email: 'payout_retry_farmer@test.com', password: 'password123', fullName: 'Retry Farmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payout_retry_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const requestRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({ amount: '20.00' });
    expect(requestRes.status).toBe(200);
    const payoutId = requestRes.body.payout.id;
    // Confirm it's needs_recipient
    const payout = await storage.getPayout(payoutId);
    expect(payout?.status).toBe('needs_recipient');

    // Create admin and set recipient manually on user (simulate farm adding recipient)
    await request(app).post('/api/auth/register').send({ email: 'admin_retry@test.com', password: 'password123', fullName: 'Admin Retry', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin_retry@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    const farmer = await storage.getUserByEmail('payout_retry_farmer@test.com');
    expect(farmer).toBeDefined();
    if (farmer) {
      await storage.updateUser(farmer.id, { paystackRecipientCode: 'RCP_test_123' } as any);
    }

    // Admin can now process
    const res = await request(app).post('/api/payouts/process').set('Cookie', adminCookie).send({ payoutId, reason: 'Retry after adding recipient' });
    expect(res.status).toBe(200);
    expect(res.body.queued).toBe(true);

    // Wait for worker to process (fallback behavior marks as completed if Paystack not configured in test env)
    let processed = false;
    const start = Date.now();
    while (Date.now() - start < 6000) {
      const p = await storage.getPayout(payoutId);
      if (p && (p.status === 'completed' || p.status === 'processing')) { processed = true; break; }
      await new Promise(r => setTimeout(r, 500));
    }
    expect(processed).toBe(true);
    delete process.env.PAYSTACK_AUTO_PAYOUTS;
  });
});
