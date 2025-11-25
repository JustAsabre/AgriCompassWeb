import { describe, it, expect } from 'vitest';
import { getRevenueAggregated, getActiveSellers, getAdminTotals } from '../adminAnalytics';

describe('AdminAnalytics DB-level queries (mocked pool)', () => {
  it('getRevenueAggregated uses DB pool when provided', async () => {
    const fakePool = {
      query: async (q: string) => ({ rows: [ { month: 'Nov 2025', revenue: '100.00' }, { month: 'Oct 2025', revenue: '200.00' } ] })
    } as any;
    const r = await getRevenueAggregated(2, fakePool);
    expect(r.totalRevenue).toBe(300);
    expect(Array.isArray(r.revenueByMonth)).toBe(true);
    expect(r.revenueByMonth.length).toBe(2);
  });

  it('getActiveSellers returns aggregated sellers from DB', async () => {
    const fakePool = {
      query: async (q: string, params?: any[]) => ({ rows: [ { farmerId: 'f1', farmerName: 'Farmer One', completedOrders: '2', revenue: '50.00' } ] })
    } as any;
    const sellers = await getActiveSellers(10, 0, fakePool);
    expect(Array.isArray(sellers)).toBe(true);
    expect(sellers.length).toBeGreaterThan(0);
    expect(sellers[0].farmerName).toBe('Farmer One');
  });

  it('getAdminTotals uses DB pool when provided', async () => {
    const fakePool = {
      query: async (q: string) => ({ rows: [ { total_users: '4', total_listings: '3', total_orders: '10', total_revenue: '500.00', total_payouts: '2', total_reviews: '1' } ] })
    } as any;
    const totals = await getAdminTotals(fakePool);
    expect(totals.totalUsers).toBe(4);
    expect(totals.totalListings).toBe(3);
    expect(totals.totalOrders).toBe(10);
    expect(totals.totalRevenueFromCompleted).toBe(500);
    expect(totals.totalPayouts).toBe(2);
    expect(totals.totalReviews).toBe(1);
  });
});
