import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Payments API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('initiates a payment (manual fallback)', async () => {
    // Register farmer
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'pfarmer@test.com', password: 'password123', fullName: 'PFarmer', role: 'farmer' });
    expect(farmerRes.status).toBe(201);

    // Login farmer and create listing
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'pfarmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Test Product', category: 'Fruits', description: 'T', price: '10.00', unit: 'kg', quantityAvailable: 100, minOrderQuantity: 1, location: 'Test' });
    expect(listingRes.status).toBe(200);
    const listing = listingRes.body;

    // Register buyer and add to cart
    const buyerRes = await request(app).post('/api/auth/register').send({ email: 'pbuyer@test.com', password: 'password123', fullName: 'PBuyer', role: 'buyer' });
    expect(buyerRes.status).toBe(201);
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'pbuyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    const addCartRes = await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 2 });
    expect(addCartRes.status).toBe(200);

    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'NA' });
    expect(checkoutRes.status).toBe(200);
    const orders = checkoutRes.body.orders;
    expect(orders && orders.length > 0).toBe(true);
    const orderId = orders[0].id;

    // Initiate payment (fallback manual)
    const initRes = await request(app).post('/api/payments/initiate').set('Cookie', buyerCookie).send({ orderId });
    expect(initRes.status).toBe(200);
    expect(initRes.body.payment).toBeDefined();
    expect(initRes.body.payment.orderId).toBe(orderId);
  }, 20000);

  it('handles paystack webhook event and marks payment completed', async () => {
    // Create farmer / listing / buyer / order like above
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'wfarmer@test.com', password: 'password123', fullName: 'WFarmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'wfarmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Webhook Product', category: 'Grains', description: 'T', price: '5.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    const buyerRes = await request(app).post('/api/auth/register').send({ email: 'wbuyer@test.com', password: 'password123', fullName: 'WBuyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'wbuyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123', notes: '' });
    const orders = checkoutRes.body.orders;
    const orderId = orders[0].id;

    // Create a payment record with a provider transaction reference
    const createdPayment = await storage.createPayment({ orderId, payerId: orders[0].buyerId, amount: '5.00', paymentMethod: 'paystack', transactionId: 'ref-wh-123', status: 'pending' } as any);

    // Simulate webhook payload
    const payload = { event: 'charge.success', data: { reference: 'ref-wh-123' } };
    const res = await request(app).post('/api/payments/paystack/webhook').send(payload);
    expect(res.status).toBe(200);

    const updatedPayment = await storage.getPayment(createdPayment.id);
    expect(updatedPayment?.status).toBe('completed');

    const order = await storage.getOrder(orderId);
    expect(order?.status).toBe('accepted');
  }, 20000);

  it('creates a payout after order completion', async () => {
    // Setup farmer and listing
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'ppfarmer@test.com', password: 'password123', fullName: 'PPFarmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'ppfarmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Payout Product', category: 'Grains', description: 'T', price: '8.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    // Create buyer & checkout
    const buyerRes = await request(app).post('/api/auth/register').send({ email: 'ppbuyer@test.com', password: 'password123', fullName: 'PPBuyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'ppbuyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];
    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 2 });
    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: 'Address', notes: '' });
    const orders = checkoutRes.body.orders;
    const orderId = orders[0].id;

    // Simulate farmer accepting the order
    await request(app).patch(`/api/orders/${orderId}/status`).set('Cookie', farmerCookie).send({ status: 'accepted' });
    // Mark as delivered
    await request(app).patch(`/api/orders/${orderId}/status`).set('Cookie', farmerCookie).send({ status: 'delivered' });
    // Buyer confirms receipt
    await request(app).patch(`/api/orders/${orderId}/complete`).set('Cookie', buyerCookie).send({});

    // Payout should now exist for farmer
    const finalOrder = await storage.getOrder(orderId);
    expect(finalOrder?.status).toBe('completed');
    const payouts = await storage.getPayoutsByFarmer(orders[0].farmerId);
    expect(payouts.length).toBeGreaterThanOrEqual(1);
    const payout = payouts.find(p => p.amount);
    expect(payout).toBeDefined();
    expect(Number(payout!.amount)).toBeGreaterThan(0);
  });
});
