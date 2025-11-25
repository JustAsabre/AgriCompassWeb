import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Admin stats API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('returns aggregated stats for admin', async () => {
    // Register an admin user
    const adminEmail = 'admin_stats@test.com';
    await request(app).post('/api/auth/register').send({ email: adminEmail, password: 'password123', fullName: 'Admin Stat', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: adminEmail, password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Register farmer and buyer
    await request(app).post('/api/auth/register').send({ email: 'stat_farmer@test.com', password: 'password123', fullName: 'Stat Farmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'stat_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    // Create a listing
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Stat Product', category: 'Fruits', description: 'T', price: '4.00', unit: 'kg', quantityAvailable: 20, minOrderQuantity: 1, location: 'Test' });
    expect(listingRes.status).toBe(200);

    // Create a buyer and an order (via checkout) so we can create a payment and payout
    await request(app).post('/api/auth/register').send({ email: 'stat_buyer@test.com', password: 'password123', fullName: 'Stat Buyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'stat_buyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];
    // Add to cart and checkout
    const addCart = await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listingRes.body.id, quantity: 1 });
    expect(addCart.status).toBe(200);
    const checkout = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Test', notes: 'none' });
    expect(checkout.status).toBe(200);
    const orders = checkout.body.orders;
    const orderId = orders && orders[0] && orders[0].id;

    // Create payment and payout directly using storage API to keep the test fast
    if (orderId) {
      await storage.createPayment({ orderId, payerId: orders[0].buyerId, amount: '4.00', paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
      await storage.createPayout({ farmerId: orders[0].farmerId, amount: '3.80', status: 'pending', mobileNumber: null, mobileNetwork: null } as any);
    }

    // Create a review via storage
    const review = await storage.createReview({ orderId: orderId || 'none', rating: 5, reviewerId: orders ? orders[0].buyerId : 'none', revieweeId: orders ? orders[0].farmerId : 'none', comment: 'Great!' } as any);
    expect(review).toBeDefined();

    // Now compute expected values directly from storage
    const farmerUsers = await storage.getUsersByRole('farmer');
    const buyerUsers = await storage.getUsersByRole('buyer');
    const officerUsers = await storage.getUsersByRole('field_officer');
    const adminUsers = await storage.getUsersByRole('admin');
    const expectedUsersByRole: Record<string, number> = {
      farmer: farmerUsers.length,
      buyer: buyerUsers.length,
      field_officer: officerUsers.length,
      admin: adminUsers.length,
    };
    const expectedTotalUsers = Object.values(expectedUsersByRole).reduce((a, b) => a + b, 0);
    const expectedListings = (await storage.getAllListings()).length;
    const expectedRegisteredFarmers = farmerUsers.length;
    const expectedVerifiedFarmers = farmerUsers.filter(f => f.verified).length;
    // Pending verifications
    let expectedPendingVerifications = 0;
    for (const f of farmerUsers) {
      const v = await storage.getVerificationByFarmer(f.id);
      if (v && v.status === 'pending') expectedPendingVerifications++;
    }
    const expectedReviews = (await storage.getAllReviews()).length;
    const expectedPayouts = (await storage.getAllPayouts()).length;
    const expectedPayments = (await storage.getAllPayments()).length;

    const res = await request(app).get('/api/admin/stats').set('Cookie', adminCookie);
    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(expectedTotalUsers);
    expect(res.body.usersByRole).toEqual(expectedUsersByRole);
    expect(res.body.totalListings).toBe(expectedListings);
    expect(res.body.registeredFarmers).toBe(expectedRegisteredFarmers);
    expect(res.body.verifiedFarmers).toBe(expectedVerifiedFarmers);
    expect(res.body.pendingVerifications).toBe(expectedPendingVerifications);
    expect(res.body.totalReviews).toBe(expectedReviews);
    expect(res.body.totalPayouts).toBe(expectedPayouts);
    expect(res.body.totalPayments).toBe(expectedPayments);
  }, 20000);

  it('rejects request from non-admin user', async () => {
    // Create a buyer user
    await request(app).post('/api/auth/register').send({ email: 'notadmin@test.com', password: 'password123', fullName: 'Not Admin', role: 'buyer' });
    const login = await request(app).post('/api/auth/login').send({ email: 'notadmin@test.com', password: 'password123' });
    const cookie = login.headers['set-cookie'];

    const res = await request(app).get('/api/admin/stats').set('Cookie', cookie);
    expect(res.status).toBe(403);
  });
});
