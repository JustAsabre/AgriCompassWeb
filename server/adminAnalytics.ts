import { pool } from './db';
import { storage } from './storage';
// Using raw SQL via pg Pool for aggregates; falls back to in-memory storage

type RevenueByMonth = { month: string; revenue: number };

export async function getRevenueAggregated(lastNMonths = 6, providedPool?: any) {
  const p = providedPool ?? pool;
  if (p) {
    const q = `SELECT to_char(date_trunc('month', created_at), 'Mon YYYY') as month, COALESCE(SUM(total_price::numeric), 0) as revenue
      FROM orders
      WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '${lastNMonths} months'
      GROUP BY 1 ORDER BY 1`;
    const result = await p.query(q);
    const revenueByMonth: RevenueByMonth[] = result.rows.map((r: any) => ({ month: r.month, revenue: Number(r.revenue) }));
    const totalRevenue = revenueByMonth.reduce((acc, r) => acc + r.revenue, 0);
    return { totalRevenue, revenueByMonth };
  }

  // Fallback to in-memory storage
  const allOrders = await storage.getAllOrders();
  const completed = allOrders.filter(o => o.status === 'completed');
  const now = new Date();
  const months: string[] = [];
  for (let i = lastNMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
  }
  const revenueByMonth: RevenueByMonth[] = months.map(m => ({ month: m, revenue: 0 }));
  for (const o of completed) {
    if (!o.createdAt) continue;
    const month = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const idx = revenueByMonth.findIndex(r => r.month === month);
    if (idx >= 0) revenueByMonth[idx].revenue += Number(o.totalPrice || 0) || 0;
  }
  const totalRevenue = revenueByMonth.reduce((acc, r) => acc + r.revenue, 0);
  return { totalRevenue, revenueByMonth };
}

export async function getActiveSellers(limit = 10, offset = 0, providedPool?: any) {
  const p = providedPool ?? pool;
  if (p) {
    const q = `SELECT s.farmer_id as "farmerId", u.full_name as "farmerName", s.completed_count as "completedOrders", s.revenue
      FROM (
        SELECT farmer_id, COUNT(*) as completed_count, COALESCE(SUM(total_price::numeric), 0) as revenue
        FROM orders WHERE status = 'completed'
        GROUP BY farmer_id ORDER BY completed_count DESC, revenue DESC LIMIT $1 OFFSET $2
      ) s
      LEFT JOIN users u ON u.id = s.farmer_id`;
    const result = await p.query(q, [limit, offset]);
    return result.rows.map((r: any) => ({
      farmerId: r.farmerId,
      farmerName: r.farmerName,
      completedOrders: Number(r.completedOrders),
      revenue: Number(r.revenue),
    }));
  }

  // Fallback to memory
  const completed = (await storage.getAllOrders()).filter(o => o.status === 'completed');
  const map: Record<string, { farmerId: string; completedOrders: number; revenue: number }> = {};
  for (const o of completed) {
    const fid = o.farmerId;
    if (!map[fid]) map[fid] = { farmerId: fid, completedOrders: 0, revenue: 0 };
    map[fid].completedOrders += 1;
    map[fid].revenue += Number(o.totalPrice || 0) || 0;
  }
  const arr = Object.values(map).sort((a, b) => b.completedOrders - a.completedOrders || b.revenue - a.revenue);
  const result = [] as any[];
  for (const entry of arr.slice(offset, offset + limit)) {
    const farmer = await storage.getUser(entry.farmerId);
    result.push({ farmerId: entry.farmerId, farmerName: farmer?.fullName || 'Unknown', completedOrders: entry.completedOrders, revenue: entry.revenue });
  }
  return result;
}

export async function getAdminTotals(providedPool?: any) {
  const p = providedPool ?? pool;
  if (p) {
    // Run counts: total users, total listings, total orders, total revenue, total payouts, total reviews
    const q = `SELECT
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM listings WHERE status = 'active') as total_listings,
      (SELECT COUNT(*) FROM orders) as total_orders,
      (SELECT COALESCE(SUM(total_price::numeric),0) FROM orders WHERE status = 'completed') as total_revenue,
      (SELECT COUNT(*) FROM payouts) as total_payouts,
      (SELECT COUNT(*) FROM reviews) as total_reviews
      `;
    const res = await p.query(q);
    const r = res.rows[0];
    return {
      totalUsers: Number(r.total_users),
      totalListings: Number(r.total_listings),
      totalOrders: Number(r.total_orders),
      totalRevenueFromCompleted: Number(r.total_revenue),
      totalPayouts: Number(r.total_payouts),
      totalReviews: Number(r.total_reviews),
    };
  }

  // Fallback to memory
  const farmers = await storage.getUsersByRole('farmer');
  const buyers = await storage.getUsersByRole('buyer');
  const officers = await storage.getUsersByRole('field_officer');
  const admins = await storage.getUsersByRole('admin');
  const users = [...farmers, ...buyers, ...officers, ...admins];
  const totalUsers = users.length;
  const totalListings = (await storage.getAllListings()).length;
  const allOrders = await storage.getAllOrders();
  const totalOrders = allOrders.length;
  const totalRevenueFromCompleted = allOrders.filter(o => o.status === 'completed').reduce((acc, o) => acc + (Number(o.totalPrice || 0) || 0), 0);
  const totalPayouts = (await storage.getAllPayouts()).length;
  const totalReviews = (await storage.getAllReviews()).length;
  return { totalUsers, totalListings, totalOrders, totalRevenueFromCompleted, totalPayouts, totalReviews };
}
