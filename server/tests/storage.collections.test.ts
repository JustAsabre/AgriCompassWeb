import { describe, it, expect } from 'vitest';
import { storage } from '../storage';

describe('Storage collection helpers', () => {
  it('returns orders with getAllOrders()', async () => {
    const orders = await storage.getAllOrders();
    expect(Array.isArray(orders)).toBe(true);
  });

  it('returns verifications with getAllVerifications()', async () => {
    const verifs = await storage.getAllVerifications();
    expect(Array.isArray(verifs)).toBe(true);
  });
});
