import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';

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
});
