import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';
import sessionMiddleware from '../session';
import { hashPassword } from '../auth';

describe('Payouts and Admin API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    // Reset storage to avoid conflicts between tests
    storage.users.clear();
    storage.listings.clear();
    storage.orders.clear();
    storage.cartItems.clear();
    storage.payments.clear();
    storage.transactions.clear();
    storage.notifications.clear();
    storage.verifications.clear();
    storage.reviews.clear();
    storage.payouts.clear();
    storage.pricingTiers.clear();
    storage.messages.clear();

    app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('allows farmers to create payout recipients', async () => {
    // Mock PAYSTACK secret
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes('/transferrecipient')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { recipient_code: 'RCP_test123' } }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    // Register farmer
    const farmerRes = await request(app).post('/api/auth/register').send({
      email: 'recipientfarmer@test.com',
      password: 'password123',
      fullName: 'Recipient Farmer',
      role: 'farmer'
    });
    expect(farmerRes.status).toBe(201);

    // Login farmer
    const farmerLogin = await request(app).post('/api/auth/login').send({
      email: 'recipientfarmer@test.com',
      password: 'password123'
    });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    // Create payout recipient
    const recipientRes = await request(app).post('/api/payouts/recipient').set('Cookie', farmerCookie).send({
      mobileNumber: '0241234567',
      mobileNetwork: 'mtn'
    });
    expect(recipientRes.status).toBe(200);
    expect(recipientRes.body).toHaveProperty('recipientCode');
    expect(typeof recipientRes.body.recipientCode).toBe('string');

    // @ts-ignore
    global.fetch = origFetch;
  });

  it('allows farmers to view their payout recipients', async () => {
    // Register farmer
    const farmerRes = await request(app).post('/api/auth/register').send({
      email: 'viewrecipient@test.com',
      password: 'password123',
      fullName: 'View Recipient Farmer',
      role: 'farmer'
    });
    expect(farmerRes.status).toBe(201);

    // Login farmer
    const farmerLogin = await request(app).post('/api/auth/login').send({
      email: 'viewrecipient@test.com',
      password: 'password123'
    });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    // Create payout recipient first
    await request(app).post('/api/payouts/recipient').set('Cookie', farmerCookie).send({
      type: 'mobile_money',
      name: 'Jane Doe',
      account_number: '256711111111',
      bank_code: 'AIRTEL'
    });

    // View recipient
    const viewRes = await request(app).get('/api/payouts/recipient/me').set('Cookie', farmerCookie);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body).toHaveProperty('paystackRecipientCode');
    expect(viewRes.body).toHaveProperty('mobileNumber');
    expect(viewRes.body).toHaveProperty('mobileNetwork');
  });

  it('allows farmers to request payouts after order completion', async () => {
    // Mock PAYSTACK secret
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes('/transferrecipient')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { recipient_code: 'RCP_test123' } }),
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

    // Register farmer and create recipient
    const farmerRes = await request(app).post('/api/auth/register').send({
      email: 'payoutfarmer@test.com',
      password: 'password123',
      fullName: 'Payout Farmer',
      role: 'farmer'
    });
    const farmerLogin = await request(app).post('/api/auth/login').send({
      email: 'payoutfarmer@test.com',
      password: 'password123'
    });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    await request(app).post('/api/payouts/recipient').set('Cookie', farmerCookie).send({
      type: 'mobile_money',
      name: 'Payout Farmer',
      account_number: '256722222222',
      bank_code: 'MTN'
    });

    // Create listing
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({
      productName: 'Payout Product',
      category: 'Fruits',
      description: 'Test',
      price: '10.00',
      unit: 'kg',
      quantityAvailable: 100,
      minOrderQuantity: 1,
      location: 'Test'
    });
    const listing = listingRes.body;

    // Register buyer and complete order
    const buyerRes = await request(app).post('/api/auth/register').send({
      email: 'payoutbuyer@test.com',
      password: 'password123',
      fullName: 'Payout Buyer',
      role: 'buyer'
    });
    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: 'payoutbuyer@test.com',
      password: 'password123'
    });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({
      listingId: listing.id,
      quantity: 2
    });

    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({
      deliveryAddress: '123 Test St',
      notes: 'Test payout'
    });

    const orderId = checkoutRes.body.orders[0].id;

    // Complete the order
    await storage.updateOrderStatus(orderId, 'completed');

    // Request payout
    const payoutRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({
      amount: 10
    });
    expect(payoutRes.status).toBe(200);
    expect(payoutRes.body.payout).toBeDefined();
    expect(payoutRes.body.payout.status).toBe('pending');

    // @ts-ignore
    global.fetch = origFetch;
  });

  it('allows admins to process payouts', async () => {
    // Mock PAYSTACK secret
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      if (url.includes('/transferrecipient')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { recipient_code: 'RCP_admin123' } }),
        } as any;
      }
      if (url.includes('/transfer')) {
        return {
          ok: true,
          json: async () => ({ status: true, data: { reference: 'transfer_admin_123' } }),
        } as any;
      }
      return { ok: true, json: async () => ({}) } as any;
    });

    // Create admin user directly in storage
    const adminUser = await storage.createUser({
      email: 'admin@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Test Admin',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'admin@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Create farmer and payout request
    const farmerRes = await request(app).post('/api/auth/register').send({
      email: 'processfarmer@test.com',
      password: 'password123',
      fullName: 'Process Farmer',
      role: 'farmer'
    });
    const farmerLogin = await request(app).post('/api/auth/login').send({
      email: 'processfarmer@test.com',
      password: 'password123'
    });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    await request(app).post('/api/payouts/recipient').set('Cookie', farmerCookie).send({
      type: 'mobile_money',
      name: 'Process Farmer',
      account_number: '256733333333',
      bank_code: 'MTN'
    });

    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({
      productName: 'Process Product',
      category: 'Fruits',
      description: 'Test',
      price: '15.00',
      unit: 'kg',
      quantityAvailable: 100,
      minOrderQuantity: 1,
      location: 'Test'
    });
    const listing = listingRes.body;

    const buyerRes = await request(app).post('/api/auth/register').send({
      email: 'processbuyer@test.com',
      password: 'password123',
      fullName: 'Process Buyer',
      role: 'buyer'
    });
    const buyerLogin = await request(app).post('/api/auth/login').send({
      email: 'processbuyer@test.com',
      password: 'password123'
    });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({
      listingId: listing.id,
      quantity: 1
    });

    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({
      deliveryAddress: '123 Process St',
      notes: 'Test process'
    });

    const orderId = checkoutRes.body.orders[0].id;
    await storage.updateOrderStatus(orderId, 'completed');

    const payoutRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({
      amount: 15
    });
    const payoutId = payoutRes.body.payout.id;

    // Admin processes payout
    const processRes = await request(app).post('/api/payouts/process').set('Cookie', adminCookie).send({
      payoutId
    });
    expect(processRes.status).toBe(200);
    expect(processRes.body).toBeDefined();
    expect(processRes.body.queued).toBe(false);
    expect(processRes.body.payoutId).toBe(payoutId);
    expect(processRes.body.message).toBe('Farmer has no paystack recipient. Marked as needs_recipient');

    // @ts-ignore
    global.fetch = origFetch;
  });

  it('allows admins to view all payouts', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminview@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin View',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminview@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // View payouts (should be empty initially)
    const payoutsRes = await request(app).get('/api/admin/payouts').set('Cookie', adminCookie);
    expect(payoutsRes.status).toBe(200);
    expect(Array.isArray(payoutsRes.body)).toBe(true);
  });

  it('provides admin stats', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminstats@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Stats',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminstats@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Get stats
    const statsRes = await request(app).get('/api/admin/stats').set('Cookie', adminCookie);
    expect(statsRes.status).toBe(200);
    expect(typeof statsRes.body.totalUsers).toBe('number');
    expect(typeof statsRes.body.totalListings).toBe('number');
    expect(typeof statsRes.body.totalOrders).toBe('number');
  });

  it('provides admin revenue data', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminrevenue@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Revenue',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminrevenue@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Get revenue
    const revenueRes = await request(app).get('/api/admin/revenue').set('Cookie', adminCookie);
    expect(revenueRes.status).toBe(200);
    expect(revenueRes.body).toBeDefined();
    expect(typeof revenueRes.body.totalRevenue).toBe('number');
    expect(Array.isArray(revenueRes.body.revenueByMonth)).toBe(true);
  });

  it('provides admin active sellers list', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminsellers@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Sellers',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminsellers@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Get active sellers
    const sellersRes = await request(app).get('/api/admin/active-sellers').set('Cookie', adminCookie);
    expect(sellersRes.status).toBe(200);
    expect(Array.isArray(sellersRes.body.sellers)).toBe(true);
  });

  it('allows admins to view all users', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminusers@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Users',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminusers@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Get users
    const usersRes = await request(app).get('/api/admin/users').set('Cookie', adminCookie);
    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body.users)).toBe(true);
  });

  it('allows admins to view specific user details', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminuserdetail@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin User Detail',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Create regular user
    const regularUser = await storage.createUser({
      email: 'regular@test.com',
      password: await hashPassword('regular123'),
      fullName: 'Regular User',
      role: 'buyer',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminuserdetail@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Get user details
    const userRes = await request(app).get(`/api/admin/users/${regularUser.id}`).set('Cookie', adminCookie);
    expect(userRes.status).toBe(200);
    expect(userRes.body).toBeDefined();
    expect(userRes.body.user.email).toBe('regular@test.com');
  });

  it('allows admins to update user status', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminupdate@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Update',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Create regular user
    const regularUser = await storage.createUser({
      email: 'update@test.com',
      password: await hashPassword('update123'),
      fullName: 'Update User',
      role: 'buyer',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminupdate@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Update user status
    const updateRes = await request(app).patch(`/api/admin/users/${regularUser.id}/status`).set('Cookie', adminCookie).send({
      isActive: false
    });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toBeDefined();
    expect(updateRes.body.user.isActive).toBe(false);
  });

  it('allows admins to perform bulk user operations', async () => {
    // Create admin user
    const adminUser = await storage.createUser({
      email: 'adminbulk@test.com',
      password: await hashPassword('admin123'),
      fullName: 'Admin Bulk',
      role: 'admin',
      verified: true,
      isActive: true,
    });

    // Create regular users
    const user1 = await storage.createUser({
      email: 'bulk1@test.com',
      password: await hashPassword('bulk123'),
      fullName: 'Bulk User 1',
      role: 'buyer',
      verified: true,
      isActive: true,
    });
    const user2 = await storage.createUser({
      email: 'bulk2@test.com',
      password: await hashPassword('bulk123'),
      fullName: 'Bulk User 2',
      role: 'buyer',
      verified: true,
      isActive: true,
    });

    // Login admin
    const adminLogin = await request(app).post('/api/auth/login').send({
      email: 'adminbulk@test.com',
      password: 'admin123'
    });
    const adminCookie = adminLogin.headers['set-cookie'];

    // Bulk update users
    const bulkRes = await request(app).post('/api/admin/users/bulk').set('Cookie', adminCookie).send({
      operation: 'deactivate',
      userIds: [user1.id, user2.id]
    });
    expect(bulkRes.status).toBe(200);
    expect(bulkRes.body).toBeDefined();
    expect(bulkRes.body.results.length).toBe(2);
  });
});