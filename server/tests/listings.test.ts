import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { initializeSocket } from '../socket';
import { storage } from '../storage';

// Mock email functions to avoid external dependencies
vi.mock('../email', () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendNewOrderNotificationToFarmer: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationStatusEmail: vi.fn().mockResolvedValue({ success: true }),
  getSmtpStatus: vi.fn().mockReturnValue({ status: 'ok' }),
}));

// Database cleanup function
async function cleanupDatabase() {
  await storage.cleanup();
}

describe('Listings API', () => {
  let app: Express;
  let httpServer: any;
  let farmerAgent: any;
  let buyerAgent: any;

  beforeEach(async () => {
    await cleanupDatabase();
    
    app = express();
    app.use(express.json());
    app.use(
      session({
        secret: 'test-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { secure: false },
      })
    );
    httpServer = createServer(app);
    const io = initializeSocket(httpServer);
    await registerRoutes(app, httpServer, io);

    // Create test users and get authenticated agents
    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'farmer@test.com',
        password: 'password123',
        fullName: 'Test Farmer',
        role: 'farmer',
      });

    await request(app)
      .post('/api/auth/register')
      .send({
        email: 'buyer@test.com',
        password: 'password123',
        fullName: 'Test Buyer',
        role: 'buyer',
      });

    // Create agents and login
    farmerAgent = request.agent(app);
    await farmerAgent
      .post('/api/auth/login')
      .send({ email: 'farmer@test.com', password: 'password123' })
      .expect(200);

    buyerAgent = request.agent(app);
    await buyerAgent
      .post('/api/auth/login')
      .send({ email: 'buyer@test.com', password: 'password123' })
      .expect(200);
  });

  afterEach(async () => {
    await cleanupDatabase();
    
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('GET /api/listings', () => {
    it('returns all listings', async () => {
      const response = await request(app).get('/api/listings');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/listings/:id', () => {
    it('returns listing details', async () => {
      // First create a listing
      const createRes = await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Test Product',
          category: 'Vegetables',
          description: 'Test description',
          price: '10.50',
          quantityAvailable: 100,
          unit: 'kg',
          minOrderQuantity: 5,
          location: 'Test Location',
        });

      expect(createRes.status).toBe(200);
      const listingId = createRes.body.id;

      // Now get the listing
      const response = await request(app).get(`/api/listings/${listingId}`);
      expect(response.status).toBe(200);
      expect(response.body.productName).toBe('Test Product');
      expect(response.body.price).toBe('10.50');
    });

    it('returns 404 for non-existent listing', async () => {
      const response = await request(app).get('/api/listings/non-existent-id');
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/listings', () => {
    it('creates listing for authenticated farmer', async () => {
      const response = await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Fresh Tomatoes',
          category: 'Vegetables',
          description: 'Organic tomatoes from local farm',
          price: '25.00',
          quantityAvailable: 50,
          unit: 'kg',
          minOrderQuantity: 1,
          location: 'Accra Region',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id');
      expect(response.body.productName).toBe('Fresh Tomatoes');
      expect(response.body.price).toBe('25.00');
    });

    it('rejects creation from buyer', async () => {
      const response = await buyerAgent
        .post('/api/listings')
        .send({
          productName: 'Test Product',
          category: 'Fruits',
          description: 'Test description',
          price: '10.00',
          quantityAvailable: 10,
          unit: 'kg',
          minOrderQuantity: 1,
          location: 'Test Location',
        });

      expect(response.status).toBe(403);
    });

    it('rejects creation from unauthenticated user', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send({
          productName: 'Test Product',
          category: 'Fruits',
          description: 'Test description',
          price: '10.00',
          quantityAvailable: 10,
          unit: 'kg',
          minOrderQuantity: 1,
          location: 'Test Location',
        });

      expect(response.status).toBe(401);
    });

    it('validates required fields', async () => {
      const response = await farmerAgent
        .post('/api/listings')
        .send({
          // Missing required fields
          description: 'Test description',
        });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/listings/:id', () => {
    let listingId: string;

    beforeEach(async () => {
      const createRes = await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Original Product',
          category: 'Vegetables',
          description: 'Original description',
          price: '20.00',
          quantityAvailable: 100,
          unit: 'kg',
          minOrderQuantity: 5,
          location: 'Test Location',
        });

      listingId = createRes.body.id;
    });

    it('updates listing for owner farmer', async () => {
      const response = await farmerAgent
        .patch(`/api/listings/${listingId}`)
        .send({
          price: '25.00',
          quantityAvailable: 80,
        });

      expect(response.status).toBe(200);
      expect(response.body.price).toBe('25.00');
      expect(response.body.quantityAvailable).toBe(80);
    });

    it('rejects update from non-owner farmer', async () => {
      // Create another farmer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'other-farmer@test.com',
          password: 'password123',
          fullName: 'Other Farmer',
          role: 'farmer',
        });

      const otherAgent = request.agent(app);
      await otherAgent
        .post('/api/auth/login')
        .send({ email: 'other-farmer@test.com', password: 'password123' })
        .expect(200);

      const response = await otherAgent
        .patch(`/api/listings/${listingId}`)
        .send({ price: '30.00' });

      expect(response.status).toBe(403);
    });

    it('rejects update from buyer', async () => {
      const response = await buyerAgent
        .patch(`/api/listings/${listingId}`)
        .send({ price: '30.00' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/listings/:id', () => {
    let listingId: string;

    beforeEach(async () => {
      const createRes = await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Product to Delete',
          category: 'Fruits',
          description: 'Will be deleted',
          price: '15.00',
          quantityAvailable: 50,
          unit: 'kg',
          minOrderQuantity: 1,
          location: 'Test Location',
        });

      listingId = createRes.body.id;
    });

    it('deletes listing for owner farmer', async () => {
      const response = await farmerAgent
        .delete(`/api/listings/${listingId}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify listing is gone
      const getResponse = await request(app).get(`/api/listings/${listingId}`);
      expect(getResponse.status).toBe(404);
    });

    it('rejects deletion from non-owner farmer', async () => {
      // Create another farmer
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'delete-farmer@test.com',
          password: 'password123',
          fullName: 'Delete Farmer',
          role: 'farmer',
        });

      const otherAgent = request.agent(app);
      await otherAgent
        .post('/api/auth/login')
        .send({ email: 'delete-farmer@test.com', password: 'password123' })
        .expect(200);

      const response = await otherAgent
        .delete(`/api/listings/${listingId}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/farmer/listings', () => {
    beforeEach(async () => {
      // Create some listings for the farmer
      await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Farmer Product 1',
          category: 'Vegetables',
          description: 'First product',
          price: '10.00',
          quantityAvailable: 100,
          unit: 'kg',
          minOrderQuantity: 1,
          location: 'Farm Location',
        });

      await farmerAgent
        .post('/api/listings')
        .send({
          productName: 'Farmer Product 2',
          category: 'Fruits',
          description: 'Second product',
          price: '15.00',
          quantityAvailable: 50,
          unit: 'kg',
          minOrderQuantity: 5,
          location: 'Farm Location',
        });
    });

    it('returns farmer\'s own listings', async () => {
      const response = await farmerAgent
        .get('/api/farmer/listings');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0].productName).toBe('Farmer Product 1');
      expect(response.body[1].productName).toBe('Farmer Product 2');
    });

    it('rejects access from buyer', async () => {
      const response = await buyerAgent
        .get('/api/farmer/listings');

      expect(response.status).toBe(403);
    });
  });
});