import { test, expect } from '@playwright/test';
import { registerAndLogin } from './helpers/auth';

test.describe('Checkout + Paystack webhook flow', () => {
  test('should mark payments completed when webhook delivered', async ({ page, context }) => {
    // Ensure the PAYSTACK_WEBHOOK_SECRET is set for the test run
    // When running locally, set PAYSTACK_WEBHOOK_SECRET env var in CI or locally
    const webhookSecret = process.env.PAYSTACK_WEBHOOK_SECRET || 'test-paystack-secret';

    // Register farmer & create listing
    const farmer = await registerAndLogin(page, 'farmer');
    await page.goto('/farmer/create-listing');
    await page.fill('[data-testid="input-product-name"]', 'Webhook Tomatoes');
    await page.fill('[data-testid="input-description"]', 'Testing webhook');
    await page.fill('[data-testid="input-price"]', '2.50');
    await page.fill('[data-testid="input-quantity"]', '20');
    await page.fill('[data-testid="input-moq"]', '1');
    await page.fill('[data-testid="input-location"]', 'Accra');
    await page.click('[data-testid="button-submit"]');
    // Wait a bit for the listing to be created
    await page.waitForTimeout(500);

    // Buyer: register, add to cart, checkout with autoPay
    const buyerPage = await context.newPage();
    const buyer = await registerAndLogin(buyerPage, 'buyer');
    // Navigate marketplace and add first listing to cart
    await buyerPage.goto('/marketplace');
    await buyerPage.locator('text=Webhook Tomatoes').first().click();
    await buyerPage.click('text=Add to Cart');

    // Checkout via API for stability: call orders/checkout with autoPay true
    const cookies = await buyerPage.context().cookies();
    const sessionCookie = cookies.find(c => c.name === 'connect.sid');
    const headers: any = {};
    if (sessionCookie) headers.Cookie = `connect.sid=${sessionCookie.value}`;

    // Hit Checkout (API) to create orders + autoPay
    const checkoutResp = await buyerPage.request.post('/api/orders/checkout', {
      data: { deliveryAddress: '123 Market', notes: 'E2E', autoPay: true, returnUrl: 'http://localhost:5000/order-success' },
      headers,
    });
    expect(checkoutResp.ok()).toBeTruthy();
    const checkoutBody = await checkoutResp.json();
    const autoPay = checkoutBody.autoPay;
    expect(autoPay).toBeDefined();
    const reference = autoPay.reference || autoPay.paystackReference || autoPay.transaction?.paystackReference;
    expect(reference).toBeDefined();

    // Simulate webhook payload to mark payments as completed
    const payload = { event: 'charge.success', data: { reference } };
    let signature: string | undefined = undefined;
    if (webhookSecret) {
      // Compute HMAC using the webhook secret
      const crypto = await import('crypto');
      signature = crypto.createHmac('sha512', webhookSecret).update(JSON.stringify(payload)).digest('hex');
    }
    const webhookResp = await buyerPage.request.post('/api/payments/paystack/webhook', {
      data: payload,
      headers: { 'Content-Type': 'application/json', ...(signature ? { 'x-paystack-signature': signature } : {}) },
    });

    expect(webhookResp.ok()).toBeTruthy();

    // Verify orders/payments are now updated: fetch buyer orders and check payment/pending status cleared
    const ordersResp = await buyerPage.request.get('/api/buyer/orders', { headers });
    expect(ordersResp.ok()).toBeTruthy();
    const orders = await ordersResp.json();
    expect(orders.length).toBeGreaterThanOrEqual(1);
    // Each order should have a payment with status completed; check storage via payment endpoints
    const orderIds = orders.map((o: any) => o.id);
    let anyCompleted = false;
    for (const oid of orderIds) {
      const paymentsRes = await buyerPage.request.get(`/api/payments/order/${encodeURIComponent(oid)}`, { headers }).catch(() => null);
      if (!paymentsRes) continue;
      if (!paymentsRes.ok()) continue;
      const payData = await paymentsRes.json();
      const payments = payData.payments || [];
      if (payments.some((p: any) => p.status === 'completed')) anyCompleted = true;
    }
    expect(anyCompleted).toBe(true);
  });
});
