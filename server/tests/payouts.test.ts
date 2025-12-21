import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { storage } from '../storage';
import './setup';

describe('Wallet withdrawals API', () => {
  let app: Express;
  let httpServer: any;
  // @ts-ignore
  const originalFetch = global.fetch;

  afterEach(() => {
    // Ensure we don't leak mocked fetch or env state across suites.
    // @ts-ignore
    global.fetch = originalFetch;
    delete process.env.PAYSTACK_SECRET_KEY;
  });

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
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

  it('allows a farmer to configure payout settings and withdraw funds', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';

    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/transferrecipient')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { recipient_code: 'RCP_test_123' } }),
        } as any;
      }
      if (url.includes('/transfer')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { reference: 'transfer_ref_123' } }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    const farmerEmail = 'withdraw_farmer@test.com';
    const farmerRes = await request(app)
      .post('/api/auth/register')
      .send({ email: farmerEmail, password: 'password123', fullName: 'Withdraw Farmer', role: 'farmer' });
    expect(farmerRes.status).toBe(201);
    await verifyEmail(farmerEmail);

    const loginRes = await request(app).post('/api/auth/login').send({ email: farmerEmail, password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    expect(loginRes.status).toBe(200);
    expect(cookie).toBeDefined();

    // Configure payout settings (creates Paystack recipient)
    const settingsRes = await request(app)
      .post('/api/users/payout-settings')
      .set('Cookie', cookie)
      .send({ mobileNumber: '0241234567', mobileNetwork: 'mtn', bankCode: 'MTN' });
    expect(settingsRes.status).toBe(200);
    expect(settingsRes.body).toHaveProperty('recipientCode');

    const farmer = await storage.getUserByEmail(farmerEmail);
    expect(farmer).toBeDefined();
    if (!farmer) throw new Error('Test setup: farmer missing after registration');

    // Fund wallet
    await storage.createWalletTransaction({
      userId: farmer.id,
      amount: '50.00',
      type: 'credit',
      description: 'Test funding',
      referenceId: 'test-funding',
      referenceType: 'test',
      status: 'completed',
    } as any);

    const withdrawRes = await request(app)
      .post('/api/wallet/withdraw')
      .set('Cookie', cookie)
      .send({ amount: '10.00' });
    expect(withdrawRes.status).toBe(200);
    expect(withdrawRes.body).toHaveProperty('reference');

    const balance = await storage.getWalletBalance(farmer.id);
    expect(Number(balance)).toBeCloseTo(40.0, 2);
  });

  it('rejects withdrawal when payout settings are not configured', async () => {
    const email = 'withdraw_no_settings@test.com';
    const registerRes = await request(app).post('/api/auth/register').send({ email, password: 'password123', fullName: 'No Settings', role: 'farmer' });
    expect(registerRes.status).toBe(201);
    await verifyEmail(email);
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    expect(loginRes.status).toBe(200);
    expect(cookie).toBeDefined();

    const farmer = await storage.getUserByEmail(email);
    expect(farmer).toBeDefined();
    if (!farmer) throw new Error('Test setup: farmer missing after registration');

    // Fund wallet so we hit the "settings not configured" guard first.
    await storage.createWalletTransaction({
      userId: farmer.id,
      amount: '50.00',
      type: 'credit',
      description: 'Test funding',
      referenceId: 'test-funding',
      referenceType: 'test',
      status: 'completed',
    } as any);

    const withdrawRes = await request(app)
      .post('/api/wallet/withdraw')
      .set('Cookie', cookie)
      .send({ amount: '10.00' });

    expect(withdrawRes.status).toBe(400);
    expect(withdrawRes.body?.message || '').toMatch(/payout settings/i);
  });

  it('rejects withdrawal when funds are insufficient', async () => {
    const email = 'withdraw_insufficient@test.com';
    const registerRes = await request(app).post('/api/auth/register').send({ email, password: 'password123', fullName: 'Insufficient', role: 'farmer' });
    expect(registerRes.status).toBe(201);
    await verifyEmail(email);
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    expect(loginRes.status).toBe(200);
    expect(cookie).toBeDefined();

    const farmer = await storage.getUserByEmail(email);
    expect(farmer).toBeDefined();
    if (!farmer) throw new Error('Test setup: farmer missing after registration');

    // Simulate payout settings already configured
    await storage.updateUser(farmer.id, { paystackRecipientCode: 'RCP_fake' } as any);

    // Fund wallet with less than withdrawal amount
    await storage.createWalletTransaction({
      userId: farmer.id,
      amount: '5.00',
      type: 'credit',
      description: 'Test funding',
      referenceId: 'test-funding',
      referenceType: 'test',
      status: 'completed',
    } as any);

    const withdrawRes = await request(app)
      .post('/api/wallet/withdraw')
      .set('Cookie', cookie)
      .send({ amount: '10.00' });

    expect(withdrawRes.status).toBe(400);
    expect(withdrawRes.body?.message || '').toMatch(/insufficient/i);
  });

  it('reverses withdrawal if Paystack transfer fails', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';

    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/transfer')) {
        return {
          ok: false,
          json: async () => ({ message: 'Transfer failed' }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    const email = 'withdraw_transfer_fail@test.com';
    const registerRes = await request(app).post('/api/auth/register').send({ email, password: 'password123', fullName: 'Transfer Fail', role: 'farmer' });
    expect(registerRes.status).toBe(201);
    await verifyEmail(email);
    const loginRes = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    const cookie = loginRes.headers['set-cookie'];
    expect(loginRes.status).toBe(200);
    expect(cookie).toBeDefined();

    const farmer = await storage.getUserByEmail(email);
    expect(farmer).toBeDefined();
    if (!farmer) throw new Error('Test setup: farmer missing after registration');

    await storage.updateUser(farmer.id, { paystackRecipientCode: 'RCP_fake' } as any);

    await storage.createWalletTransaction({
      userId: farmer.id,
      amount: '50.00',
      type: 'credit',
      description: 'Test funding',
      referenceId: 'test-funding',
      referenceType: 'test',
      status: 'completed',
    } as any);

    const beforeBalance = await storage.getWalletBalance(farmer.id);

    const withdrawRes = await request(app)
      .post('/api/wallet/withdraw')
      .set('Cookie', cookie)
      .send({ amount: '10.00' });

    expect(withdrawRes.status).toBe(400);
    expect(withdrawRes.body?.message || '').toMatch(/withdrawal failed/i);

    const afterBalance = await storage.getWalletBalance(farmer.id);
    expect(Number(afterBalance)).toBeCloseTo(Number(beforeBalance), 2);
  });
});
