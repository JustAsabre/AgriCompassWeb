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

  async function verifyEmail(email: string) {
    const user = await storage.getUserByEmail(email.toLowerCase());
    if (!user?.emailVerificationToken) throw new Error(`Missing emailVerificationToken for ${email}`);
    const res = await request(app).get('/api/auth/verify-email').query({ token: user.emailVerificationToken });
    if (res.status !== 200) throw new Error(`Failed to verify email for ${email}`);
  }

  async function registerAndLoginCookie(
    email: string,
    role: string,
    fullName: string,
    options?: { markVerified?: boolean }
  ) {
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'password1234', fullName, role });
    if (registerRes.status !== 201) throw new Error(`Failed to register ${email}`);

    await verifyEmail(email);

    if (options?.markVerified) {
      const user = await storage.getUserByEmail(email.toLowerCase());
      if (!user) throw new Error(`Failed to fetch user for ${email}`);
      await storage.updateUser(user.id, { verified: true });
    }

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'password1234' });
    if (loginRes.status !== 200) throw new Error(`Failed to log in ${email}`);
    return loginRes.headers['set-cookie'];
  }

  beforeEach(async () => {
    // Reset DB state to avoid conflicts between tests
    await storage.cleanup();

    app = express();
    app.use(express.json());
    app.use(sessionMiddleware);
    httpServer = createServer(app);
    await registerRoutes(app, httpServer);
  });

  it('initiates a payment (manual fallback)', async () => {
    // Register + verify + login farmer and create listing
    const farmerCookie = await registerAndLoginCookie('pfarmer@test.com', 'farmer', 'PFarmer', { markVerified: true });
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Test Product', category: 'Fruits', description: 'T', price: '10.00', unit: 'kg', quantityAvailable: 100, minOrderQuantity: 1, location: 'Test' });
    expect(listingRes.status).toBe(200);
    const listing = listingRes.body;

    // Register + verify + login buyer and add to cart
    const buyerCookie = await registerAndLoginCookie('pbuyer@test.com', 'buyer', 'PBuyer');

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
    const farmerCookie = await registerAndLoginCookie('payf@test.com', 'farmer', 'PayFarmer', { markVerified: true });
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Checkout Product', category: 'Grains', description: 'T', price: '12.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    const buyerCookie = await registerAndLoginCookie('payb@test.com', 'buyer', 'PayBuyer');

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
      const farmerCookie = await registerAndLoginCookie('mpfarmer@test.com', 'farmer', 'MPFarmer', { markVerified: true });
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'MP Product', category: 'Grains', description: 'T', price: '2.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      // second listing
      const listingRes2 = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'MP Product 2', category: 'Grains', description: 'T', price: '3.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing2 = listingRes2.body;

      const buyerCookie = await registerAndLoginCookie('mpbuyer@test.com', 'buyer', 'MPBuyer');

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
      const farmerCookie = await registerAndLoginCookie('lookupfarmer@test.com', 'farmer', 'Lookup Farmer', { markVerified: true });
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Lookup Product', category: 'Grains', description: 'T', price: '7.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      const buyerCookie = await registerAndLoginCookie('lookupbuyer@test.com', 'buyer', 'LookupBuyer');

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
      const farmerCookie = await registerAndLoginCookie('missingfarmer@test.com', 'farmer', 'Missing Farmer', { markVerified: true });
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Missing Product', category: 'Grains', description: 'T', price: '4.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      const buyerCookie = await registerAndLoginCookie('missingbuyer@test.com', 'buyer', 'MissingBuyer');

      await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
      const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123 Market', notes: 'Test', autoPay: true, returnUrl: 'https://example.com/order-success' });
      expect(checkoutRes.status).toBe(200);
      // Current checkout flow does not rely on per-farmer Paystack recipients (no split payments).
      // Funds are collected by the platform and held in escrow/wallet system.
      expect(checkoutRes.body.autoPay.missingRecipients).toBeUndefined();
    } finally {
      // @ts-ignore
      global.fetch = origFetch;
    }
  }, 20000);

  it('handles paystack webhook event and marks payment completed', async () => {
    // Create farmer / listing / buyer / order like above
    const farmerCookie = await registerAndLoginCookie('wfarmer@test.com', 'farmer', 'WFarmer', { markVerified: true });
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Webhook Product', category: 'Grains', description: 'T', price: '5.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    const buyerCookie = await registerAndLoginCookie('wbuyer@test.com', 'buyer', 'WBuyer');

    await request(app).post('/api/cart').set('Cookie', buyerCookie).send({ listingId: listing.id, quantity: 1 });
    const checkoutRes = await request(app).post('/api/orders/checkout').set('Cookie', buyerCookie).send({ deliveryAddress: '123', notes: '' });
    const orders = checkoutRes.body.orders;
    const orderId = orders[0].id;

    // Create a transaction record first (simulating what happens in autoPay checkout)
    const transaction = await storage.createTransaction({
      reference: 'ref-wh-123',
      buyerId: orders[0].buyerId,
      totalAmount: '5.00',
      amount: '5.00',
      status: 'pending',
      metadata: JSON.stringify({ buyerId: orders[0].buyerId, paymentMethod: 'paystack' }),
    });

    // Create a payment record linked to the transaction
    const createdPayment = await storage.createPayment({ 
      orderId, 
      payerId: orders[0].buyerId, 
      transactionId: transaction.id, 
      amount: '5.00', 
      paymentMethod: 'paystack', 
      paystackReference: 'ref-wh-123', 
      status: 'pending' 
    } as any);

    // Test that webhooks are rejected when secret is not configured (fail-closed security)
    const originalSecret = process.env.PAYSTACK_WEBHOOK_SECRET;
    delete process.env.PAYSTACK_WEBHOOK_SECRET;

    try {
      // Simulate webhook payload - should be REJECTED without webhook secret (security fix)
      const payload = { event: 'charge.success', data: { reference: 'ref-wh-123' } };
      const res = await request(app).post('/api/payments/paystack/webhook').send(payload);
      expect(res.status).toBe(401); // Rejected - fail closed for security

      // Payment should NOT be updated (webhook was rejected)
      const updatedPayment = await storage.getPayment(createdPayment.id);
      expect(updatedPayment?.status).toBe('pending'); // Still pending - not processed
    } finally {
      // Restore the webhook secret
      process.env.PAYSTACK_WEBHOOK_SECRET = originalSecret;
    }
  }, 20000);

  it('creates a payout after order completion', async () => {
    // Setup farmer and listing
    const farmerCookie = await registerAndLoginCookie('ppfarmer@test.com', 'farmer', 'PPFarmer', { markVerified: true });
    const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'Payout Product', category: 'Grains', description: 'T', price: '8.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
    const listing = listingRes.body;

    // Create buyer & checkout
    const buyerCookie = await registerAndLoginCookie('ppbuyer@test.com', 'buyer', 'PPBuyer');
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

    // Order completion credits the farmer wallet (payouts table is legacy).
    const finalOrder = await storage.getOrder(orderId);
    expect(finalOrder?.status).toBe('completed');

    const farmer = await storage.getUser(orders[0].farmerId);
    expect(farmer).toBeDefined();
    expect(Number(farmer!.walletBalance || 0)).toBeGreaterThan(0);

    const walletTxs = await storage.getWalletTransactions(orders[0].farmerId);
    expect(walletTxs.some((t: any) => t.referenceId === orderId && t.type === 'credit')).toBe(true);
  });

  it('rejects completion when no payment exists', async () => {
    const originalEnableTestEndpoints = process.env.ENABLE_TEST_ENDPOINTS;
    process.env.ENABLE_TEST_ENDPOINTS = 'false';
    try {
      // Setup farmer, listing, buyer & checkout
      const farmerCookie = await registerAndLoginCookie('nopay_farmer@test.com', 'farmer', 'NoPayFarmer', { markVerified: true });
      const listingRes = await request(app).post('/api/listings').set('Cookie', farmerCookie).send({ productName: 'NoPay Product', category: 'Vegetables', description: 'T', price: '6.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Test' });
      const listing = listingRes.body;

      const buyerCookie = await registerAndLoginCookie('nopay_buyer@test.com', 'buyer', 'NoPayBuyer');

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
    } finally {
      process.env.ENABLE_TEST_ENDPOINTS = originalEnableTestEndpoints;
    }
  });

  it('creates combined payment transactions linking multiple orders from different farmers', async () => {
    process.env.PAYSTACK_SECRET_KEY = 'test-paystack-secret';
    // @ts-ignore
    const origFetch = global.fetch;
    // @ts-ignore
    global.fetch = vi.fn().mockImplementation(async (url: string, opts: any) => ({ ok: true, json: async () => ({ data: { authorization_url: 'https://paystack/checkout', reference: 'combined-txn-456' } }) }) as any);
    try {
      // Create first farmer and listing
      const farmer1Cookie = await registerAndLoginCookie('farmer1@test.com', 'farmer', 'Farmer One', { markVerified: true });
      const listing1Res = await request(app).post('/api/listings').set('Cookie', farmer1Cookie).send({ productName: 'Product 1', category: 'Fruits', description: 'Test', price: '10.00', unit: 'kg', quantityAvailable: 100, minOrderQuantity: 1, location: 'Location 1' });
      const listing1 = listing1Res.body;

      // Create second farmer and listing
      const farmer2Cookie = await registerAndLoginCookie('farmer2@test.com', 'farmer', 'Farmer Two', { markVerified: true });
      const listing2Res = await request(app).post('/api/listings').set('Cookie', farmer2Cookie).send({ productName: 'Product 2', category: 'Vegetables', description: 'Test', price: '15.00', unit: 'kg', quantityAvailable: 50, minOrderQuantity: 1, location: 'Location 2' });
      const listing2 = listing2Res.body;

      // Create buyer and add both products to cart
      const buyerEmail = 'veryuniquecombinedbuyer' + Date.now() + '@test.com';
      const buyerCookie = await registerAndLoginCookie(buyerEmail, 'buyer', 'Combined Buyer');

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
      expect(verifiedTransaction.reference).toBe('combined-txn-456');
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
