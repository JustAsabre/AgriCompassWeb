import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { initializeSocket } from '../socket';
import './setup';
import { registerAndLoginAgent } from './helpers/auth';

// Mock email functions to avoid external dependencies
vi.mock('../email', () => ({
  sendEmailVerificationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordResetEmail: vi.fn().mockResolvedValue({ success: true }),
  sendPasswordChangedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendWelcomeEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderAcceptedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderDeliveredEmail: vi.fn().mockResolvedValue({ success: true }),
  sendOrderCompletedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEscrowReleasedEmail: vi.fn().mockResolvedValue({ success: true }),
  sendNewOrderNotificationToFarmer: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationStatusEmail: vi.fn().mockResolvedValue({ success: true }),
  getSmtpStatus: vi.fn().mockReturnValue({ status: 'ok' }),
}));

describe('Orders and Cart API', () => {
  beforeAll(() => {
    process.env.ENABLE_TEST_ENDPOINTS = 'true';
  });

  let app: Express;
  let httpServer: any;
  let farmerAgent: any;
  let buyerAgent: any;
  let farmerId: string;
  let buyerId: string;
  let listingId: string;

  beforeEach(async () => {
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
    await initializeSocket(httpServer);
    await registerRoutes(app, httpServer, (await import('../socket')).io);

    // Create + verify + login users (email verification is required before login).
    const farmer = await registerAndLoginAgent(app, 'farmer', 'farmer@test.com');
    farmerAgent = farmer.agent;
    farmerId = farmer.userId;

    // Farmers must be "verified" (separate from emailVerified) to create listings.
    // Use the test-only helper endpoint to keep production behavior intact.
    const verifyFarmerResponse = await request(app)
      .post('/__test/mark-verified')
      .send({ userId: farmerId });
    expect(verifyFarmerResponse.status).toBe(200);

    const buyer = await registerAndLoginAgent(app, 'buyer', 'buyer@test.com');
    buyerAgent = buyer.agent;
    buyerId = buyer.userId;

    // Create a listing for testing
    const listingResponse = await farmerAgent
      .post('/api/listings')
      .send({
        productName: 'Test Product',
        category: 'vegetables',
        description: 'Test description',
        price: '100.00',
        quantityAvailable: 10,
        unit: 'kg',
        minOrderQuantity: 1,
        location: 'Test Location',
      });
    if (listingResponse.status !== 200) {
      // Make setup failures obvious (avoids cascading "listingId undefined" errors).
      // eslint-disable-next-line no-console
      console.log('Listing creation failed:', listingResponse.status, listingResponse.body);
    }
    expect(listingResponse.status).toBe(200);
    listingId = listingResponse.body.id;
  });

  afterEach(() => {
    if (httpServer && httpServer.listening) {
      httpServer.close();
    }
  });

  describe('Cart Operations', () => {
    describe('GET /api/cart', () => {
      it('returns empty cart initially', async () => {
        const response = await buyerAgent.get('/api/cart');
        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(0);
      });

      it('rejects access from farmer', async () => {
        const response = await farmerAgent.get('/api/cart');
        expect(response.status).toBe(403);
      });

      it('rejects access from unauthenticated user', async () => {
        const response = await request(app).get('/api/cart');
        expect(response.status).toBe(401);
      });
    });

    describe('POST /api/cart', () => {
      it('adds item to cart for authenticated buyer', async () => {
        const response = await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('buyerId', buyerId);
        expect(response.body).toHaveProperty('listingId', listingId);
        expect(response.body).toHaveProperty('quantity', 2);
      });

      it('rejects adding item from unauthenticated user', async () => {
        const response = await request(app)
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        expect(response.status).toBe(401);
      });

      it('rejects adding item from farmer', async () => {
        const response = await farmerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        expect(response.status).toBe(403);
      });

      it('validates required fields', async () => {
        const response = await buyerAgent
          .post('/api/cart')
          .send({});

        expect(response.status).toBe(400);
      });

      it('validates quantity against available stock', async () => {
        const response = await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 20, // More than available (10)
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('available');
      });

      it('validates minimum order quantity', async () => {
        const response = await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 0,
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('Minimum order');
      });
    });

    describe('PATCH /api/cart/:id', () => {
      let cartItemId: string;

      beforeEach(async () => {
        // Add item to cart first
        const addResponse = await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });
        cartItemId = addResponse.body.id;
      });

      it('updates cart item quantity', async () => {
        const response = await buyerAgent
          .patch(`/api/cart/${cartItemId}`)
          .send({ quantity: 5 });

        expect(response.status).toBe(200);
        expect(response.body.quantity).toBe(5);
      });

      it('rejects update from farmer', async () => {
        const response = await farmerAgent
          .patch(`/api/cart/${cartItemId}`)
          .send({ quantity: 3 });

        expect(response.status).toBe(403);
      });

      it('rejects update for non-owned cart item', async () => {
        const otherBuyer = await registerAndLoginAgent(app, 'buyer', 'otherbuyer@test.com');
        const otherBuyerAgent = otherBuyer.agent;

        const response = await otherBuyerAgent
          .patch(`/api/cart/${cartItemId}`)
          .send({ quantity: 3 });

        expect(response.status).toBe(403);
      });

      it('validates quantity against available stock', async () => {
        const response = await buyerAgent
          .patch(`/api/cart/${cartItemId}`)
          .send({ quantity: 15 });

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('available');
      });
    });

    describe('DELETE /api/cart/:id', () => {
      let cartItemId: string;

      beforeEach(async () => {
        // Add item to cart first
        const addResponse = await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });
        cartItemId = addResponse.body.id;
      });

      it('removes item from cart', async () => {
        const response = await buyerAgent
          .delete(`/api/cart/${cartItemId}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);

        // Verify removal
        const cartResponse = await buyerAgent.get('/api/cart');
        expect(cartResponse.body.length).toBe(0);
      });

      it('rejects removal from farmer', async () => {
        const response = await farmerAgent
          .delete(`/api/cart/${cartItemId}`);

        expect(response.status).toBe(403);
      });

      it('rejects removal for non-owned cart item', async () => {
        const otherBuyer = await registerAndLoginAgent(app, 'buyer', 'otherbuyer@test.com');
        const otherBuyerAgent = otherBuyer.agent;

        const response = await otherBuyerAgent
          .delete(`/api/cart/${cartItemId}`);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Order Operations', () => {
    describe('POST /api/orders/checkout', () => {
      it('creates orders from cart for authenticated buyer', async () => {
        // Add item to cart
        await buyerAgent.post('/api/cart').send({ listingId, quantity: 2 });

        const response = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
            notes: 'Test order',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('orders');
        expect(response.body).toHaveProperty('transaction');
        expect(Array.isArray(response.body.orders)).toBe(true);
        expect(response.body.orders.length).toBeGreaterThan(0);
        expect(response.body.orders[0]).toHaveProperty('buyerId', buyerId);
        expect(response.body.orders[0]).toHaveProperty('farmerId', farmerId);
        expect(response.body.orders[0]).toHaveProperty('status', 'pending');
      });

      it('rejects checkout from farmer', async () => {
        const response = await farmerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });

        expect(response.status).toBe(403);
      });

      it('rejects checkout from empty cart', async () => {
        const response = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });

        expect(response.status).toBe(400);
        expect(response.body.message).toBe('Cart is empty');
      });

      it('validates required fields', async () => {
        const response = await buyerAgent
          .post('/api/orders/checkout')
          .send({});

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/buyer/orders', () => {
      let orderId: string;

      beforeEach(async () => {
        // Add item to cart and create order
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        const orderResponse = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });
        orderId = orderResponse.body.orders[0].id;
      });

      it('returns buyer orders for authenticated buyer', async () => {
        const response = await buyerAgent.get('/api/buyer/orders');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('buyerId', buyerId);
      });

      it('rejects access from farmer', async () => {
        const response = await farmerAgent.get('/api/buyer/orders');
        expect(response.status).toBe(403);
      });

      it('rejects access from unauthenticated user', async () => {
        const response = await request(app).get('/api/buyer/orders');
        expect(response.status).toBe(401);
      });
    });

    describe('GET /api/farmer/orders', () => {
      beforeEach(async () => {
        // Add item to cart and create order
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });
      });

      it('returns farmer orders for authenticated farmer', async () => {
        const response = await farmerAgent.get('/api/farmer/orders');

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBeGreaterThan(0);
        expect(response.body[0]).toHaveProperty('farmerId', farmerId);
      });

      it('rejects access from buyer', async () => {
        const response = await buyerAgent.get('/api/farmer/orders');
        expect(response.status).toBe(403);
      });
    });

    describe('GET /api/orders/:id', () => {
      let orderId: string;

      beforeEach(async () => {
        // Add item to cart and create order
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        const orderResponse = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });
        orderId = orderResponse.body.orders[0].id;
      });

      it('returns order details for buyer who owns the order', async () => {
        const response = await buyerAgent.get(`/api/orders/${orderId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', orderId);
        expect(response.body).toHaveProperty('buyerId', buyerId);
      });

      it('returns order details for farmer who owns the listing', async () => {
        const response = await farmerAgent.get(`/api/orders/${orderId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', orderId);
        expect(response.body).toHaveProperty('farmerId', farmerId);
      });

      it('rejects access from other buyer', async () => {
        const otherBuyer = await registerAndLoginAgent(app, 'buyer', 'otherbuyer@test.com');
        const otherBuyerAgent = otherBuyer.agent;

        const response = await otherBuyerAgent.get(`/api/orders/${orderId}`);

        expect(response.status).toBe(403);
      });

      it('returns 404 for non-existent order', async () => {
        const response = await buyerAgent.get('/api/orders/non-existent-id');

        expect(response.status).toBe(404);
      });
    });

    describe('PATCH /api/orders/:id/status', () => {
      let orderId: string;

      beforeEach(async () => {
        // Add item to cart and create order
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        const orderResponse = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });
        orderId = orderResponse.body.orders[0].id;
      });

      it('allows farmer to update order status', async () => {
        const response = await farmerAgent
          .patch(`/api/orders/${orderId}/status`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('accepted');
      });

      it('rejects status update from buyer', async () => {
        const response = await buyerAgent
          .patch(`/api/orders/${orderId}/status`)
          .send({ status: 'accepted' });

        expect(response.status).toBe(403);
      });

      it('validates status values', async () => {
        const response = await farmerAgent
          .patch(`/api/orders/${orderId}/status`)
          .send({ status: 'invalid_status' });

        expect(response.status).toBe(400);
      });
    });

    describe('PATCH /api/orders/:id/complete', () => {
      let orderId: string;

      beforeEach(async () => {
        // Add item to cart and create order
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 2,
          });

        const orderResponse = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '123 Test Street',
          });
        orderId = orderResponse.body.orders[0].id;

        // Mark as delivered by farmer
        const statusResponse = await farmerAgent
          .patch(`/api/orders/${orderId}/status`)
          .send({ status: 'delivered' });
        expect(statusResponse.status).toBe(200);
        expect(statusResponse.body.status).toBe('delivered');
      });

      it('allows buyer to complete delivered order', async () => {
        const response = await buyerAgent
          .patch(`/api/orders/${orderId}/complete`);

        if (response.status !== 200) {
          console.log('Completion failed:', response.status, response.body);
        }
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('completed');
      });

      it('rejects completion from farmer', async () => {
        const response = await farmerAgent
          .patch(`/api/orders/${orderId}/complete`);

        expect(response.status).toBe(403);
      });

      it('rejects completion before delivery', async () => {
        // Create new order without marking as delivered
        await buyerAgent
          .post('/api/cart')
          .send({
            listingId,
            quantity: 1,
          });

        const newOrderResponse = await buyerAgent
          .post('/api/orders/checkout')
          .send({
            deliveryAddress: '456 Test Street',
          });
        const newOrderId = newOrderResponse.body.orders[0].id;

        const response = await buyerAgent
          .patch(`/api/orders/${newOrderId}/complete`);

        expect(response.status).toBe(400);
        expect(response.body.message).toContain('delivered before completion');
      });
    });
  });
});
