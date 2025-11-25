import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { storage } from '../storage.js';

describe('Analytics API', () => {
  let app: Express;
  let server: any;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false }
    }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
    // Don't actually listen - supertest handles it
  });

  afterEach(() => {
    // Close server if listening
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('GET /api/analytics/farmer', () => {
    it('should return farmer analytics for authenticated farmer', async () => {
      // Create and login farmer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Farmer Analytics',
          role: 'farmer',
          region: 'Ashanti',
          phone: '+233501234567',
          businessName: 'Test Farm',
          farmSize: '5',
          mobileNumber: '+233501234567',
          mobileNetwork: 'MTN',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      // Create buyer for order
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Buyer Analytics',
          role: 'buyer',
          region: 'Greater Accra',
          phone: '+233507654321',
        });

      // Get farmer ID
      const meResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      const farmerId = meResponse.body.user.id;

      // Create some test data for the farmer
      const listing = await storage.createListing({
        farmerId: farmerId,
        productName: 'Test Product',
        category: 'vegetables',
        description: 'Test description',
        price: 10,
        quantity: 100,
        unit: 'kg',
        location: 'Test Location',
        images: ['test.jpg'],
        status: 'active',
      });

      // Create buyer user for order
      const buyerUser = await storage.createUser({
        email: 'buyer-test@test.com',
        password: 'password123',
        fullName: 'Test Buyer',
        role: 'buyer',
        region: 'Greater Accra',
        phone: '+233507654321',
      });

      // Create an order for the listing
      const order = await storage.createOrder({
        buyerId: buyerUser.id,
        farmerId: farmerId,
        listingId: listing.id,
        quantity: 5,
        totalPrice: 50,
        status: 'completed',
        deliveryAddress: 'Test Address',
      } as any);

      // Update order status to completed (since createOrder hardcodes to pending)
      await storage.updateOrderStatus(order.id, 'completed');

      const response = await request(app)
        .get('/api/analytics/farmer')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body).toHaveProperty('totalListings');
      expect(response.body).toHaveProperty('activeListings');
      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('completedOrders');
      expect(response.body).toHaveProperty('pendingOrders');
      expect(response.body).toHaveProperty('totalRevenue');
      expect(response.body).toHaveProperty('salesByMonth');
      expect(response.body).toHaveProperty('topProducts');

      expect(response.body.totalListings).toBe(1);
      expect(response.body.activeListings).toBe(1);
      expect(response.body.totalOrders).toBe(1);
      expect(response.body.completedOrders).toBe(1);
      expect(response.body.pendingOrders).toBe(0);
      expect(response.body.totalRevenue).toBe(50);
    });

    it('should reject access from buyer', async () => {
      // Create and login buyer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Buyer Analytics',
          role: 'buyer',
          region: 'Greater Accra',
          phone: '+233507654321',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/analytics/farmer')
        .set('Cookie', cookie)
        .expect(403);

      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should reject access from unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/analytics/farmer')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized - Please log in');
    });
  });

  describe('GET /api/analytics/buyer', () => {
    it('should return buyer analytics for authenticated buyer', async () => {
      // Create and login buyer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Buyer Analytics',
          role: 'buyer',
          region: 'Greater Accra',
          phone: '+233507654321',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      // Create farmer for listing
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Farmer Analytics',
          role: 'farmer',
          region: 'Ashanti',
          phone: '+233501234567',
          businessName: 'Test Farm',
          farmSize: '5',
          mobileNumber: '+233501234567',
          mobileNetwork: 'MTN',
        });

      // Get farmer ID
      const farmerLoginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
        });

      const farmerCookie = farmerLoginResponse.headers['set-cookie'];

      const farmerMeResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', farmerCookie);

      const farmerId = farmerMeResponse.body.user.id;

      // Create a listing and order for the buyer
      const listing = await storage.createListing({
        farmerId: farmerId,
        productName: 'Test Product',
        category: 'vegetables',
        description: 'Test description',
        price: 10,
        quantity: 100,
        unit: 'kg',
        location: 'Test Location',
        images: ['test.jpg'],
        status: 'active',
      });

      // Get buyer ID
      const buyerMeResponse = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      const buyerId = buyerMeResponse.body.user.id;

      // Create an order for the buyer
      const order = await storage.createOrder({
        buyerId: buyerId,
        farmerId: farmerId,
        listingId: listing.id,
        quantity: 5,
        totalPrice: 50,
        status: 'completed',
        deliveryAddress: 'Test Address',
      } as any);

      // Update order status to completed (since createOrder hardcodes to pending)
      await storage.updateOrderStatus(order.id, 'completed');

      const response = await request(app)
        .get('/api/analytics/buyer')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body).toHaveProperty('totalOrders');
      expect(response.body).toHaveProperty('completedOrders');
      expect(response.body).toHaveProperty('pendingOrders');
      expect(response.body).toHaveProperty('cancelledOrders');
      expect(response.body).toHaveProperty('totalSpending');
      expect(response.body).toHaveProperty('spendingByMonth');
      expect(response.body).toHaveProperty('topPurchases');

      expect(response.body.totalOrders).toBe(1);
      expect(response.body.completedOrders).toBe(1);
      expect(response.body.pendingOrders).toBe(0);
      expect(response.body.cancelledOrders).toBe(0);
      expect(response.body.totalSpending).toBe(50);
    });

    it('should reject access from farmer', async () => {
      // Create and login farmer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Farmer Analytics',
          role: 'farmer',
          region: 'Ashanti',
          phone: '+233501234567',
          businessName: 'Test Farm',
          farmSize: '5',
          mobileNumber: '+233501234567',
          mobileNetwork: 'MTN',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/analytics/buyer')
        .set('Cookie', cookie)
        .expect(403);

      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should reject access from unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/analytics/buyer')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized - Please log in');
    });
  });

  describe('GET /api/analytics/officer', () => {
    it('should return officer analytics for authenticated field officer', async () => {
      // Create and login officer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'officer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Officer Analytics',
          role: 'field_officer',
          region: 'Central',
          phone: '+233509876543',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'officer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      // Create some farmers and verifications
      const farmer1 = await storage.createUser({
        email: 'farmer1@test.com',
        password: 'password123',
        fullName: 'Farmer One',
        role: 'farmer',
        region: 'Ashanti',
        verified: true,
      });

      const farmer2 = await storage.createUser({
        email: 'farmer2@test.com',
        password: 'password123',
        fullName: 'Farmer Two',
        role: 'farmer',
        region: 'Ashanti',
        verified: false,
      });

      // Create a verification request
      const verification = await storage.createVerification({
        farmerId: farmer1.id,
        status: 'approved',
        notes: 'Approved farm verification',
      });

      const response = await request(app)
        .get('/api/analytics/officer')
        .set('Cookie', cookie)
        .expect(200);

      expect(response.body).toHaveProperty('totalFarmers');
      expect(response.body).toHaveProperty('verifiedFarmers');
      expect(response.body).toHaveProperty('pendingVerifications');
      expect(response.body).toHaveProperty('approvedVerifications');
      expect(response.body).toHaveProperty('rejectedVerifications');
      expect(response.body).toHaveProperty('verificationsByMonth');
      expect(response.body).toHaveProperty('farmersByRegion');

      expect(response.body.totalFarmers).toBeGreaterThanOrEqual(2);
      expect(response.body.verifiedFarmers).toBeGreaterThanOrEqual(1);
    });

    it('should reject access from farmer', async () => {
      // Create and login farmer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Farmer Analytics',
          role: 'farmer',
          region: 'Ashanti',
          phone: '+233501234567',
          businessName: 'Test Farm',
          farmSize: '5',
          mobileNumber: '+233501234567',
          mobileNetwork: 'MTN',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'farmer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/analytics/officer')
        .set('Cookie', cookie)
        .expect(403);

      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should reject access from buyer', async () => {
      // Create and login buyer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
          fullName: 'Test Buyer Analytics',
          role: 'buyer',
          region: 'Greater Accra',
          phone: '+233507654321',
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'buyer-analytics@test.com',
          password: 'password123',
        });

      const cookie = loginResponse.headers['set-cookie'];

      const response = await request(app)
        .get('/api/analytics/officer')
        .set('Cookie', cookie)
        .expect(403);

      expect(response.body.message).toBe('Forbidden - Insufficient permissions');
    });

    it('should reject access from unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/analytics/officer')
        .expect(401);

      expect(response.body.message).toBe('Unauthorized - Please log in');
    });
  });
});