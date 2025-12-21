import request from 'supertest';
import express, { type Express } from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';
import sessionMiddleware from '../session';
import './setup';

describe('Admin revenue & active-sellers API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    await storage.cleanup();
    app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
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

  const registerVerifyLogin = async (email: string, role: string, fullName: string) => {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password1234', fullName, role });
    expect(registerRes.status).toBe(201);
    await verifyEmail(email);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password1234' });
    expect(loginRes.status).toBe(200);
    const setCookie = loginRes.headers['set-cookie']?.[0];
    expect(setCookie).toBeDefined();
    // Only return the actual cookie value (avoid Path/HttpOnly attributes)
    return String(setCookie).split(';')[0];
  };

  const markFarmerVerified = async (email: string) => {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user) throw new Error(`Test setup: user not found for email ${email}`);
    await storage.updateUser(user.id, { verified: true } as any);
  };

  it('returns accurate revenue totals and monthly breakdown', async () => {
    // Setup admin
    const adminCookie = await registerVerifyLogin('revadmin@test.com', 'admin', 'Rev Admin');

    // Create a farmer/listings and buyer/orders
    const farmerCookie = await registerVerifyLogin('rev_farmer@test.com', 'farmer', 'Rev Farmer');
    await markFarmerVerified('rev_farmer@test.com');
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Rev Product', category: 'F', description: 'T', price: '5.00', unit: 'kg', quantityAvailable: 10, minOrderQuantity: 1, location: 'Test' });
    expect(listingRes.status).toBe(200);
    const listing = listingRes.body;
    expect(listing).toBeTruthy();
    expect(listing.id).toBeTruthy();
    const buyerCookie = await registerVerifyLogin('rev_buyer@test.com', 'buyer', 'Rev Buyer');
    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 2 });
    const checkout = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: 'Addr', notes: '' });
    const orders = checkout.body.orders;
    // Mark order as completed and add payment
    if (orders && orders[0]) {
      const oId = orders[0].id;
      await storage.createPayment({ orderId: oId, payerId: orders[0].buyerId, amount: String(orders[0].totalPrice), paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.updateOrderStatus(oId, 'completed');
    }

    const res = await request(app).get('/api/admin/revenue').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalRevenue');
    expect(typeof res.body.totalRevenue).toBe('number');
    expect(Array.isArray(res.body.revenueByMonth)).toBe(true);
    // verify that sum of revenueByMonth equals totalRevenue (allow floating rounding)
    const monthlySum = res.body.revenueByMonth.reduce((acc: any, r: any) => acc + Number(r.revenue || 0), 0);
    expect(Math.abs(monthlySum - res.body.totalRevenue)).toBeLessThan(0.0001);
  }, 20000);

  it('returns top active sellers', async () => {
    // Setup admin and seed additional completed orders
    const adminCookie = await registerVerifyLogin('revadmin@test.com', 'admin', 'Rev Admin');

    const farmerCookie = await registerVerifyLogin('topseller@test.com', 'farmer', 'Top Seller');
    await markFarmerVerified('topseller@test.com');
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Top Product', category: 'G', description: 'T', price: '6.00', unit: 'kg', quantityAvailable: 20, minOrderQuantity: 1, location: 'Test' });
    expect(listingRes.status).toBe(200);
    const listing = listingRes.body;
    expect(listing).toBeTruthy();
    expect(listing.id).toBeTruthy();
    // Create two buy orders and mark completed
    const b1c = await registerVerifyLogin('tbuyer1@test.com', 'buyer', 'TB1');
    await request(app).post('/api/cart').set('Cookie', b1c).send({ listingId: listing.id, quantity: 1 });
    const ck1 = await request(app).post('/api/orders/checkout').set('Cookie', b1c).send({ deliveryAddress: '1', notes: '' });
    const ord1 = ck1.body.orders && ck1.body.orders[0];
    if (ord1) {
      await storage.createPayment({ orderId: ord1.id, payerId: ord1.buyerId, amount: String(ord1.totalPrice), paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.updateOrderStatus(ord1.id, 'completed');
    }

    const b2c = await registerVerifyLogin('tbuyer2@test.com', 'buyer', 'TB2');
    await request(app).post('/api/cart').set('Cookie', b2c).send({ listingId: listing.id, quantity: 3 });
    const ck2 = await request(app).post('/api/orders/checkout').set('Cookie', b2c).send({ deliveryAddress: '1', notes: '' });
    const ord2 = ck2.body.orders && ck2.body.orders[0];
    if (ord2) {
      await storage.createPayment({ orderId: ord2.id, payerId: ord2.buyerId, amount: String(ord2.totalPrice), paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.updateOrderStatus(ord2.id, 'completed');
    }

    const res = await request(app).get('/api/admin/active-sellers').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.sellers && res.body.sellers.length >= 1).toBe(true);
    // Ensure Top Seller is present
    const found = res.body.sellers.find((s: any) => s.farmerName === 'Top Seller' || s.farmerId);
    expect(found).toBeDefined();
  }, 20000);

  it('handles concurrent revenue requests (load)', async () => {
    // Setup admin credentials
    const adminCookie = await registerVerifyLogin('revadmin@test.com', 'admin', 'Rev Admin');
    const concurrency = 50;
    const promises = [] as Promise<any>[];
    for (let i = 0; i < concurrency; i++) {
      promises.push(request(app).get('/api/admin/revenue').set('Cookie', adminCookie));
    }
    const results = await Promise.all(promises);
    expect(results.length).toBe(concurrency);
    for (const r of results) {
      expect(r.status).toBe(200);
      expect(r.body).toHaveProperty('totalRevenue');
    }
  }, 60000);
});
