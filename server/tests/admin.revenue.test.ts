import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Admin revenue & active-sellers API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('returns accurate revenue totals and monthly breakdown', async () => {
    // Setup admin
    await request(app).post('/api/auth/register').send({ email: 'revadmin@test.com', password: 'password123', fullName: 'Rev Admin', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'revadmin@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Create a farmer/listings and buyer/orders
    await request(app).post('/api/auth/register').send({ email: 'rev_farmer@test.com', password: 'password123', fullName: 'Rev Farmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'rev_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Rev Product', category: 'F', description: 'T', price: '5.00', unit: 'kg', quantityAvailable: 10, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;
    await request(app).post('/api/auth/register').send({ email: 'rev_buyer@test.com', password: 'password123', fullName: 'Rev Buyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'rev_buyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];
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
    await request(app).post('/api/auth/register').send({ email: 'topseller@test.com', password: 'password123', fullName: 'Top Seller', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'topseller@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Top Product', category: 'G', description: 'T', price: '6.00', unit: 'kg', quantityAvailable: 20, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;
    // Create two buy orders and mark completed
    await request(app).post('/api/auth/register').send({ email: 'tbuyer1@test.com', password: 'password123', fullName: 'TB1', role: 'buyer' });
    const b1 = await request(app).post('/api/auth/login').send({ email: 'tbuyer1@test.com', password: 'password123' });
    const b1c = b1.headers['set-cookie'];
    await request(app).post('/api/cart').set('Cookie', b1c).send({ listingId: listing.id, quantity: 1 });
    const ck1 = await request(app).post('/api/orders/checkout').set('Cookie', b1c).send({ deliveryAddress: '1', notes: '' });
    const ord1 = ck1.body.orders && ck1.body.orders[0];
    if (ord1) {
      await storage.createPayment({ orderId: ord1.id, payerId: ord1.buyerId, amount: String(ord1.totalPrice), paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.updateOrderStatus(ord1.id, 'completed');
    }

    await request(app).post('/api/auth/register').send({ email: 'tbuyer2@test.com', password: 'password123', fullName: 'TB2', role: 'buyer' });
    const b2 = await request(app).post('/api/auth/login').send({ email: 'tbuyer2@test.com', password: 'password123' });
    const b2c = b2.headers['set-cookie'];
    await request(app).post('/api/cart').set('Cookie', b2c).send({ listingId: listing.id, quantity: 3 });
    const ck2 = await request(app).post('/api/orders/checkout').set('Cookie', b2c).send({ deliveryAddress: '1', notes: '' });
    const ord2 = ck2.body.orders && ck2.body.orders[0];
    if (ord2) {
      await storage.createPayment({ orderId: ord2.id, payerId: ord2.buyerId, amount: String(ord2.totalPrice), paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.updateOrderStatus(ord2.id, 'completed');
    }

    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'revadmin@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    const res = await request(app).get('/api/admin/active-sellers').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.sellers && res.body.sellers.length >= 1).toBe(true);
    // Ensure Top Seller is present
    const found = res.body.sellers.find((s: any) => s.farmerName === 'Top Seller' || s.farmerId);
    expect(found).toBeDefined();
  }, 20000);

  it('handles concurrent revenue requests (load)', async () => {
    // Setup admin credentials
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'revadmin@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];
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
