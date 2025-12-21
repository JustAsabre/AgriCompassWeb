import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { storage } from '../storage';
import { enqueuePayout, stopProcessing } from '../jobs/payoutQueue';
import './setup';

describe('Payout queue processing (legacy payouts)', () => {
  beforeEach(async () => {
    await storage.cleanup();
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_AUTO_PAYOUTS;
  });

  afterEach(() => {
    // The memory backend uses an interval; stop it to prevent leaked handles in the test runner.
    stopProcessing();
    delete process.env.PAYSTACK_SECRET_KEY;
    delete process.env.PAYSTACK_AUTO_PAYOUTS;
  });

  it('enqueues a payout and the worker marks it completed when Paystack is not enabled', async () => {
    // With no Paystack config and auto payouts disabled, the worker should mark payouts as completed.
    process.env.PAYSTACK_AUTO_PAYOUTS = 'false';

    const farmer = await storage.createUser({
      email: 'queue_farmer@test.com',
      password: 'not-used-in-this-test',
      fullName: 'Queue Farmer',
      role: 'farmer',
      isActive: true,
      verified: false,
      emailVerified: true,
    } as any);

    const payout = await storage.createPayout({
      farmerId: farmer.id,
      amount: '10.00',
      status: 'pending',
      mobileNumber: '+233555000001',
      mobileNetwork: 'mtn',
    } as any);

    const enq = await enqueuePayout(payout.id);
    expect(enq).toHaveProperty('queued', true);

    const start = Date.now();
    let processed = false;
    while (Date.now() - start < 7000) {
      const p = await storage.getPayout(payout.id);
      if (p && p.status === 'completed') {
        processed = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 250));
    }

    expect(processed).toBe(true);
  }, 10000);
});
