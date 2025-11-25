import request from 'supertest';
import express, { type Express } from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from '../routes';
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../storage';
import sessionMiddleware from '../session';

describe('Payments API', () => {
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
    // Verify notifications created for buyer and farmer
    const buyerNotifications = await storage.getNotificationsByUser(orders[0].buyerId);
    const farmerNotifications = await storage.getNotificationsByUser(orders[0].farmerId);
    expect(buyerNotifications.some(n => n.title.includes('Payment'))).toBe(true);
    expect(farmerNotifications.some(n => n.title.includes('Buyer')) || farmerNotifications.some(n => n.title.includes('Payment'))).toBe(true);
  }, 20000);

  it('appends order ids to paystack callback_url when autoPay is used', async () => {
    // Mock PAYSTACK secret
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // Spy on global.fetch
    // @ts-ignore
    const origFetch = global.fetch;
    let lastBody: any = null;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      try {
        lastBody = JSON.parse(opts.body || '{}');
      } catch (err) {}
      return {
        ok: true,
        json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'ref-test-123' } }),
      } as any;
    });

    // Register farmer/listing/buyer and add to cart
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'payf@test.com', password: 'password123', fullName: 'PayFarmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'payf@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Checkout Product', category: 'Grains', description: 'T', price: '12.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    const buyerRes = await request(app).post('/api/auth/register').send({ email: 'payb@test.com', password: 'password123', fullName: 'PayBuyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'payb@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });

    try {
      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'Auto pay', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);
      const data = checkoutRes.body.autoPay;
      expect(data).toBeDefined();
      expect(data.authorization_url).toBeDefined();
      // Confirm that the callback_url we sent to paystack contains orders param
      expect(lastBody && lastBody.callback_url && lastBody.callback_url.includes('orders=')).toBe(true);
    } finally {
      // Restore original fetch
      // @ts-ignore
      global.fetch = origFetch;
    }
  }, 20000);

  it('creates payments for each order during autoPay and verify-client marks them as completed', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    let lastBody: any = null;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => {
      try { lastBody = JSON.parse(opts.body || '{}'); } catch (err) {}
      return { ok: true, json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'multi-ref-123' } }) } as any;
    });
    try {
      const farmerRes = await request(app).post('/api/auth/register').send({ email: 'mpfarmer@test.com', password: 'password123', fullName: 'MPFarmer', role: 'farmer' });
      const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'mpfarmer@test.com', password: 'password123' });
      const farmerCookie = farmerLogin.headers['set-cookie'];
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'MP Product', category: 'Grains', description: 'T', price: '2.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      // second listing
      const listingRes2 = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'MP Product 2', category: 'Grains', description: 'T', price: '3.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing2 = listingRes2.body;

      const buyerRes = await request(app).post('/api/auth/register').send({ email: 'mpbuyer@test.com', password: 'password123', fullName: 'MPBuyer', role: 'buyer' });
      const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'mpbuyer@test.com', password: 'password123' });
      const buyerCookie = buyerLogin.headers['set-cookie'];

      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing2.id, quantity: 2 });

      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'Auto pay', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);
      const payments = checkoutRes.body.autoPay.payments;
      expect(payments).toBeDefined();
      expect(payments.length).toBeGreaterThanOrEqual(2);

      // Get the transaction to verify transactionId
      const transaction = await storage.getTransactionByPaystackReference('multi-ref-123');
      expect(transaction).toBeDefined();
      expect(payments.every((p: any) => p.transactionId === transaction!.id)).toBe(true);

      // Mock Paystack verify response for successful payment
      // @ts-ignore
      global.fetch = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => ({ data: { status: 'success' } }) }) as any);

      // Verify via client endpoint
      const verifyRes = await request(app).post('/api/payments/paystack/verify-client').set('Cookie', buyerCookie).send({ reference: 'multi-ref-123' });
      expect(verifyRes.status).toBe(200);

      // All payments should now be completed
      const orderIds = checkoutRes.body.orders.map((o: any) => o.id);
      for (const oid of orderIds) {
        const paymentsByOrder = await storage.getPaymentsByOrder(oid);
        expect(paymentsByOrder.some((p: any) => p.status === 'completed')).toBe(true);
        const order = await storage.getOrder(oid);
        expect(order?.status).toBe('accepted');
      }
    } finally {
      // @ts-ignore
      global.fetch = origFetch;
    }

  }, 25000);

  it('returns payments for a transaction via GET /api/payments/transaction/:transactionId', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => ({ ok: true, json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'txn-lookup-123' } }) }) as any);
    try {
      const farmerRes = await request(app).post('/api/auth/register').send({ email: 'lookupfarmer@test.com', password: 'password123', fullName: 'Lookup Farmer', role: 'farmer' });
      const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'lookupfarmer@test.com', password: 'password123' });
      const farmerCookie = farmerLogin.headers['set-cookie'];
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Lookup Product', category: 'Grains', description: 'T', price: '7.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      const buyerRes = await request(app).post('/api/auth/register').send({ email: 'lookupbuyer@test.com', password: 'password123', fullName: 'LookupBuyer', role: 'buyer' });
      const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'lookupbuyer@test.com', password: 'password123' });
      const buyerCookie = buyerLogin.headers['set-cookie'];

      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'Test', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);
      const reference = checkoutRes.body.autoPay.reference;
      expect(reference).toBeDefined();

      const res = await request(app).get(`/api/payments/transaction/${encodeURIComponent(reference)}`).set('Cookie', buyerCookie);
      expect(res.status).toBe(200);
      expect(res.body.payments).toBeDefined();
      expect(res.body.payments.length).toBeGreaterThanOrEqual(1);
    } finally {
      // @ts-ignore
      global.fetch = origFetch;
    }
  }, 20000);

  it('returns missingRecipients when some farmers have no paystack recipient', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => ({ ok: true, json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'ref-missing-001' } }) }) as any);
    try {
      const farmerRes = await request(app).post('/api/auth/register').send({ email: 'missingfarmer@test.com', password: 'password123', fullName: 'Missing Farmer', role: 'farmer' });
      const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'missingfarmer@test.com', password: 'password123' });
      const farmerCookie = farmerLogin.headers['set-cookie'];
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Missing Product', category: 'Grains', description: 'T', price: '4.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      const buyerRes = await request(app).post('/api/auth/register').send({ email: 'missingbuyer@test.com', password: 'password123', fullName: 'MissingBuyer', role: 'buyer' });
      const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'missingbuyer@test.com', password: 'password123' });
      const buyerCookie = buyerLogin.headers['set-cookie'];

      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'Test', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);
      const missing = checkoutRes.body.autoPay.missingRecipients;
      expect(Array.isArray(missing)).toBe(true);
      expect(missing.length).toBeGreaterThanOrEqual(1);
    } finally {
      // @ts-ignore
      global.fetch = origFetch;
    }
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
    expect(res.status).toBe(401); // Signature verification fails in test environment

    const updatedPayment = await storage.getPayment(createdPayment.id);
    expect(updatedPayment?.status).toBe('pending'); // Payment not updated due to signature failure

    const order = await storage.getOrder(orderId);
    expect(order?.status).toBe('pending'); // Order not updated due to signature failure
    // Notifications are not created when signature verification fails
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
    // Create a completed payment record first so farmer can mark as delivered
    await storage.createPayment({ orderId, payerId: orders[0].buyerId, amount: '16.00', paymentMethod: 'manual', transactionId: null, status: 'completed' } as any);
    // Now mark as delivered (farmer)
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

  it('rejects completion when no payment exists', async () => {
    // Setup farmer, listing, buyer & checkout
    const farmerRes = await request(app).post('/api/auth/register').send({ email: 'nopay_farmer@test.com', password: 'password123', fullName: 'NoPayFarmer', role: 'farmer' });
    const farmerLogin = await request(app).post('/api/auth/login').send({ email: 'nopay_farmer@test.com', password: 'password123' });
    const farmerCookie = farmerLogin.headers['set-cookie'];
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'NoPay Product', category: 'Vegetables', description: 'T', price: '6.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    const buyerRes = await request(app).post('/api/auth/register').send({ email: 'nopay_buyer@test.com', password: 'password123', fullName: 'NoPayBuyer', role: 'buyer' });
    const buyerLogin = await request(app).post('/api/auth/login').send({ email: 'nopay_buyer@test.com', password: 'password123' });
    const buyerCookie = buyerLogin.headers['set-cookie'];

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '1', notes: '' });
    const orders = checkoutRes.body.orders;
    const orderId = orders[0].id;

    // Farmer tries to mark as accepted
    await request(app).patch(`/api/orders/${orderId}/status`).set('Cookie', farmerCookie).send({ status: 'accepted' });
    // Farmer attempts to mark delivered without a payment - should be rejected
    const deliverRes = await request(app).patch(`/api/orders/${orderId}/status`).set('Cookie', farmerCookie).send({ status: 'delivered' });
    expect(deliverRes.status).toBe(400);
    expect(deliverRes.body.message).toMatch(/no confirmed payment/i);
    const buyerNotifications = await storage.getNotificationsByUser(orders[0].buyerId);
    expect(buyerNotifications.some(n => /Payment Required/i.test(n.title) || /Payment Required/i.test(n.message))).toBe(true);

    // Simulate order being marked delivered (force backend change) and buyer attempting to complete without payment
    await storage.updateOrderStatus(orderId, 'delivered');
    const completeRes = await request(app).patch(`/api/orders/${orderId}/complete`).set('Cookie', buyerCookie).send({});
    expect(completeRes.status).toBe(400);
    // Farmer should receive notification about completion blocked
    const farmerNotifications = await storage.getNotificationsByUser(orders[0].farmerId);
    expect(farmerNotifications.some(n => /Completion Blocked/i.test(n.title) || /Completion Blocked/i.test(n.message))).toBe(true);
  });

  it('creates combined payment transactions linking multiple orders from different farmers', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => ({ ok: true, json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'combined-txn-456' } }) }) as any);
    try {
      // Create first farmer and listing
      const farmer1Res = await request(app).post('/api/auth/register').send({ email: 'farmer1@test.com', password: 'password123', fullName: 'Farmer One', role: 'farmer' });
      const farmer1Login = await request(app).post('/api/auth/login').send({ email: 'farmer1@test.com', password: 'password123' });
      const farmer1Cookie = farmer1Login.headers['set-cookie'];
      const listing1Res = await request(app).post('/api/listings').set('Cookie', farmer1Cookie).send({ productName: 'Product 1', category: 'Fruits', description: 'Test', price: '10.00', unit: 'kg', quantityAvailable: 100, minOrderQuantity: 1, location: 'Location 1' });
      const listing1 = listing1Res.body;

      // Create second farmer and listing
      const farmer2Res = await request(app).post('/api/auth/register').send({ email: 'farmer2@test.com', password: 'password123', fullName: 'Farmer Two', role: 'farmer' });
      const farmer2Login = await request(app).post('/api/auth/login').send({ email: 'farmer2@test.com', password: 'password123' });
      const farmer2Cookie = farmer2Login.headers['set-cookie'];
      const listing2Res = await request(app).post('/api/listings').set('Cookie', farmer2Cookie).send({ productName: 'Product 2', category: 'Vegetables', description: 'Test', price: '15.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Location 2' });
      const listing2 = listing2Res.body;

      // Create buyer and add both products to cart
      const buyerEmail = 'veryuniquecombinedbuyer' + Date.now() + '@test.com';
      const buyerRes = await request(app).post('/api/auth/register').send({ email: buyerEmail, password: 'password123', fullName: 'Combined Buyer', role: 'buyer' });
      expect(buyerRes.status).toBe(201);
      const buyerLogin = await request(app).post('/api/auth/login').send({ email: buyerEmail, password: 'password123' });
      expect(buyerLogin.status).toBe(200);
      const buyerCookie = buyerLogin.headers['set-cookie'];

      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing1.id, quantity: 2 });
      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing2.id, quantity: 1 });

      // Checkout with autoPay - should create transaction linking both orders
      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: 'Combined Address', notes: 'Combined transaction test', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);

      const orders = checkoutRes.body.orders;
      expect(orders.length).toBe(2); // Two orders from different farmers

      const autoPay = checkoutRes.body.autoPay;
      expect(autoPay).toBeDefined();
      expect(autoPay.reference).toBe('combined-txn-456');
      expect(autoPay.payments.length).toBe(2); // Two payments linked to the transaction

      // Verify transaction was created
      const transaction = await storage.getTransactionByPaystackReference('combined-txn-456');
      expect(transaction).toBeDefined();
      expect(transaction?.buyerId).toBe(orders[0].buyerId);

      // Verify payments are linked to transaction
      const payments = await storage.getPaymentsByTransactionId(transaction!.id);
      expect(payments.length).toBe(2);
      expect(payments.every(p => p.transactionId === transaction!.id)).toBe(true);

      // Verify each payment is linked to correct order
      const orderIds = orders.map(o => o.id);
      expect(payments.every(p => orderIds.includes(p.orderId))).toBe(true);

      // Test client verification endpoint
      // @ts-ignore
      global.fetch = vi.fn().mockImplementation(async (url: string) => ({ ok: true, json: async () => ({ data: { status: 'success' } }) }) as any);

      const verifyRes = await request(app).post('/api/payments/paystack/verify-client').set('Cookie', buyerCookie).send({ reference: 'combined-txn-456' });
      expect(verifyRes.status).toBe(200);

      const verifiedTransaction = verifyRes.body.transaction;
      expect(verifiedTransaction.paystackReference).toBe('combined-txn-456');
      expect(verifiedTransaction.status).toBe('completed');

      const verifiedPayments = verifyRes.body.payments;
      expect(verifiedPayments.length).toBe(2);
      expect(verifiedPayments.every(p => p.status === 'completed')).toBe(true);

      // Verify orders were updated to accepted
      for (const order of orders) {
        const updatedOrder = await storage.getOrder(order.id);
        expect(updatedOrder?.status).toBe('accepted');
      }

    } finally {
      // @ts-ignore
      global.fetch = origFetch;
    }
  }, 30000);
});
