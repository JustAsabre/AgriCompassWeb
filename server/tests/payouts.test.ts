import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';

describe('Payouts API', () => {
  let app: Express;
  let httpServer: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    app.use(session({ secret: 'test-secret', resave: false, saveUninitialized: false, cookie: { secure: false } }));
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('allows a farmer to request a payout and admin to process it', async () => {
    // Register farmer
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'payout_farmer@test.com', password: 'password123', fullName: 'Pay Farmer', role: 'farmer' });
    expect(farmerRes.status).toBe(201);

    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payout_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];

    const requestRes = await request(app).post('/api/payouts/request').set('Cookie', farmerCookie).send({ amount: '10.00', bankAccount: '12345678' });
    expect(requestRes.status).toBe(200);
    expect(requestRes.body.payout).toBeDefined();
    const payoutId = requestRes.body.payout.id;

    // Register admin
    await request(app).post('/api/auth/register').send({ email: 'admin_payout@test.com', password: 'password123', fullName: 'Admin', role: 'admin' });
    const adminLogin = await request(app).post('/api/auth/login').send({ email: 'admin_payout@test.com', password: 'password123' });
    const adminCookie = adminLogin.headers['set-cookie'];

    const processRes = await request(app).post('/api/payouts/process').set('Cookie', adminCookie).send({ payoutId });
    expect(processRes.status).toBe(200);
    expect(processRes.body.payout.status).toBe('completed');
  });
});
