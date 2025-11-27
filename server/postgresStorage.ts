import { db } from './drizzleClient';
import { eq, inArray } from 'drizzle-orm';
import {
  users,
  listings,
  pricingTiers,
  orders,
  cartItems,
  verifications,
  notifications,
  messages,
  reviews,
  payments,
  payouts,
  transactions,
  escrow,
  moderationStats,
} from '@shared/schema';
import type {
  IStorage,
  User,
  InsertUser,
  Listing,
  InsertListing,
  Order,
  InsertOrder,
  CartItem,
  InsertCartItem,
  Verification,
  InsertVerification,
  PricingTier,
  InsertPricingTier,
  Notification,
  InsertNotification,
  Message,
  InsertMessage,
  Review,
  InsertReview,
  Payment,
  InsertPayment,
  Payout,
  InsertPayout,
  Transaction,
  InsertTransaction,
  ModerationStat,
  InsertModerationStat,
  ListingWithFarmer,
  OrderWithDetails,
  CartItemWithListing,
  MessageWithUsers,
  ReviewWithUsers,
  Conversation,
  Escrow,
  InsertEscrow,
} from '@shared/schema';

// Minimal Postgres-backed storage implementation using Drizzle
export class PostgresStorage implements IStorage {
  constructor() {
    if (!db) throw new Error('Database client not initialized');
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const res = await db.select().from(users).where(eq(users.id, id));
    return res[0] as any;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const res = await db.select().from(users).where(eq(users.email, email));
    return res[0] as any;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    const res = await db.select().from(users).where(eq(users.resetToken, token));
    return res[0] as any;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [res] = await db.insert(users).values(user).returning();
    return res as any;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const [res] = await db.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return res as any;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    const res = await db.select().from(users).where(eq(users.role, role));
    return res as any;
  }

  async getAllUsers(): Promise<User[]> {
    const res = await db.select().from(users);
    return res as any;
  }

  // Listings
  async getAllListings(): Promise<Listing[]> {
    const res = await db.select().from(listings).where(eq(listings.status, 'active'));
    return res as any;
  }

  async getListing(id: string): Promise<Listing | undefined> {
    const res = await db.select().from(listings).where(eq(listings.id, id));
    return res[0] as any;
  }

  async getListingWithFarmer(id: string): Promise<ListingWithFarmer | undefined> {
    const l = await this.getListing(id);
    if (!l) return undefined;
    const farmer = await this.getUser(l.farmerId);
    if (!farmer) return undefined;
    const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.listingId, id));
    return { ...l as any, farmer: farmer as any, pricingTiers: tiers as any } as any;
  }

  async getAllListingsWithFarmer(): Promise<ListingWithFarmer[]> {
    const list = await db.select().from(listings).where(eq(listings.status, 'active'));
    const result: ListingWithFarmer[] = [];
    for (const l of list as any[]) {
      const farmer = await this.getUser(l.farmerId);
      if (!farmer) continue;
      const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.listingId, l.id));
      const reviewsList = await db.select().from(reviews).where(eq(reviews.revieweeId, farmer.id));
      const averageRating = reviewsList.length > 0 ? (reviewsList.reduce((s, r) => s + (r.rating || 0), 0) / reviewsList.length) : undefined;
      result.push({ ...l as any, farmer: { ...farmer as any, averageRating, reviewCount: reviewsList.length }, pricingTiers: tiers as any });
    }
    return result;
  }

  async getListingsByFarmer(farmerId: string): Promise<Listing[]> {
    const res = await db.select().from(listings).where(eq(listings.farmerId, farmerId));
    return res as any;
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    const [res] = await db.insert(listings).values(listing).returning();
    return res as any;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    const [res] = await db.update(listings).set(updates as any).where(eq(listings.id, id)).returning();
    return res as any;
  }

  async deleteListing(id: string): Promise<boolean> {
    const r = await db.delete(listings).where(eq(listings.id, id));
    return (r > 0);
  }

  async getListingsByModerationStatus(status: string): Promise<Listing[]> {
    const res = await db.select().from(listings).where(eq(listings.moderationStatus, status));
    return res as any;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    const res = await db.select().from(orders).where(eq(orders.id, id));
    return res[0] as any;
  }

  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> {
    const o = await this.getOrder(id);
    if (!o) return undefined;
    const listing = await this.getListing(o.listingId);
    const farmer = await this.getUser(o.farmerId);
    const buyer = await this.getUser(o.buyerId);
    if (!listing || !farmer || !buyer) return undefined;
    return { ...o as any, listing: listing as any, farmer: farmer as any, buyer: buyer as any } as any;
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    const res = await db.select().from(orders).where(eq(orders.buyerId, buyerId));
    const result: OrderWithDetails[] = [];
    for (const o of res as any[]) {
      const details = await this.getOrderWithDetails(o.id);
      if (details) result.push(details);
    }
    return result;
  }

  async getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]> {
    const res = await db.select().from(orders).where(eq(orders.farmerId, farmerId));
    const result: OrderWithDetails[] = [];
    for (const o of res as any[]) {
      const details = await this.getOrderWithDetails(o.id);
      if (details) result.push(details);
    }
    return result;
  }

  async getAllOrders(): Promise<Order[]> {
    const res = await db.select().from(orders);
    return res as any;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [res] = await db.insert(orders).values(order).returning();
    return res as any;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [res] = await db.update(orders).set({ status } as any).where(eq(orders.id, id)).returning();
    return res as any;
  }

  // Cart
  async getCartItemsByBuyer(buyerId: string): Promise<CartItemWithListing[]> {
    const items = await db.select().from(cartItems).where(eq(cartItems.buyerId, buyerId));
    const result: CartItemWithListing[] = [];
    for (const c of items as any[]) {
      const listing = await this.getListingWithFarmer(c.listingId);
      if (listing) {
        result.push({ ...c, listing } as any);
      }
    }
    return result;
  }

  async getCartItem(id: string): Promise<CartItem | undefined> {
    const res = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return res[0] as any;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const [res] = await db.insert(cartItems).values(item).returning();
    return res as any;
  }

  async removeFromCart(id: string): Promise<boolean> {
    const r = await db.delete(cartItems).where(eq(cartItems.id, id));
    return r > 0;
  }

  async updateCartQuantity(id: string, quantity: number): Promise<CartItem> {
    const [res] = await db.update(cartItems).set({ quantity } as any).where(eq(cartItems.id, id)).returning();
    if (!res) throw new Error('Cart item not found');
    return res as any;
  }

  async clearCart(buyerId: string): Promise<boolean> {
    await db.delete(cartItems).where(eq(cartItems.buyerId, buyerId));
    return true;
  }

  // Verifications
  async getVerificationsByOfficer(officerId: string): Promise<Verification[]> {
    const res = await db.select().from(verifications).where(eq(verifications.officerId, officerId));
    return res as any;
  }

  async getVerificationByFarmer(farmerId: string): Promise<Verification | undefined> {
    const res = await db.select().from(verifications).where(eq(verifications.farmerId, farmerId));
    return res[0] as any;
  }

  async createVerification(verification: InsertVerification): Promise<Verification> {
    const [res] = await db.insert(verifications).values(verification).returning();
    return res as any;
  }

  async updateVerificationStatus(id: string, status: string, notes?: string): Promise<Verification | undefined> {
    const updates: any = { status };
    if (notes) updates.notes = notes;
    if (status === 'approved') updates.verifiedAt = new Date();
    const [res] = await db.update(verifications).set(updates).where(eq(verifications.id, id)).returning();
    // Update farmer's verified status if approved
    if (res && status === 'approved') {
      const fv = res.farmerId as string;
      await db.update(users).set({ verified: true as any }).where(eq(users.id, fv));
    }
    return res as any;
  }

  async getAllVerifications(): Promise<Verification[]> {
    const res = await db.select().from(verifications);
    return res as any;
  }

  // Pricing tiers
  async getPricingTiersByListing(listingId: string): Promise<PricingTier[]> {
    const res = await db.select().from(pricingTiers).where(eq(pricingTiers.listingId, listingId));
    return res as any;
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    const [res] = await db.insert(pricingTiers).values(tier).returning();
    return res as any;
  }

  async deletePricingTier(id: string): Promise<boolean> {
    const r = await db.delete(pricingTiers).where(eq(pricingTiers.id, id));
    return r > 0;
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    const res = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(notifications.createdAt, 'desc');
    return res as any;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const res = await db.select().from(notifications).where(eq(notifications.userId, userId), eq(notifications.read, false));
    return (res as any[]).length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [res] = await db.insert(notifications).values(notification).returning();
    return res as any;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const [res] = await db.update(notifications).set({ read: true as any }).where(eq(notifications.id, id)).returning();
    return res as any;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    await db.update(notifications).set({ read: true as any }).where(eq(notifications.userId, userId));
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    const r = await db.delete(notifications).where(eq(notifications.id, id));
    return r > 0;
  }

  // Messages
  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]> {
    const res = await db.select().from(messages).where(
      inArray(messages.senderId, [userId1, userId2])
    );
    // Filter to include only messages exchanged between the two.
    const msgs = (res as any[]).filter(m => (m.senderId === userId1 && m.receiverId === userId2) || (m.senderId === userId2 && m.receiverId === userId1));
    const details: MessageWithUsers[] = [];
    for (const m of msgs) {
      const sender = await this.getUser(m.senderId);
      const receiver = await this.getUser(m.receiverId);
      if (sender && receiver) details.push({ ...m, sender, receiver } as any);
    }
    // sort ascending by createdAt
    details.sort((a, b) => (new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime()));
    return details;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    // For performance, a real implementation uses grouping and window functions. We'll approximate.
    const res = await db.select().from(messages).where(eq(messages.senderId, userId));
    const received = await db.select().from(messages).where(eq(messages.receiverId, userId));
    const all = [...(res as any[]), ...(received as any[])];
    // group by other user
    const map = new Map<string, any[]>();
    for (const m of all) {
      const other = m.senderId === userId ? m.receiverId : m.senderId;
      if (!map.has(other)) map.set(other, []);
      map.get(other).push(m);
    }
    const conversations: Conversation[] = [];
    for (const [other, msgs] of map.entries()) {
      msgs.sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastMessage = msgs[0];
      const otherUser = await this.getUser(other);
      if (!otherUser) continue;
      const unreadCount = msgs.filter(m => m.senderId === other && !m.read).length;
      conversations.push({ otherUser, lastMessage, unreadCount } as any);
    }
    return conversations;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [res] = await db.insert(messages).values(message).returning();
    return res as any;
  }

  async markMessageRead(id: string): Promise<Message | undefined> {
    const [res] = await db.update(messages).set({ read: true as any }).where(eq(messages.id, id)).returning();
    return res as any;
  }

  async markConversationRead(userId: string, otherUserId: string): Promise<boolean> {
    await db.update(messages).set({ read: true as any }).where(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId));
    return true;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const r = await db.select().from(messages).where(eq(messages.receiverId, userId), eq(messages.read, false));
    return (r as any[]).length;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const res = await db.select().from(messages).where(eq(messages.id, id));
    return res[0] as any;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const [res] = await db.update(messages).set(updates as any).where(eq(messages.id, id)).returning();
    return res as any;
  }

  async getMessagesByModerationStatus(status: string): Promise<Message[]> {
    const res = await db.select().from(messages).where(eq(messages.moderationStatus, status));
    return res as any;
  }

  // Reviews
  async getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]> {
    const res = await db.select().from(reviews).where(eq(reviews.revieweeId, revieweeId));
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]> {
    const res = await db.select().from(reviews).where(eq(reviews.orderId, orderId));
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async getAllReviews(): Promise<ReviewWithUsers[]> {
    const res = await db.select().from(reviews);
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [res] = await db.insert(reviews).values(review).returning();
    return res as any;
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined> {
    const [res] = await db.update(reviews).set(updates as any).where(eq(reviews.id, id)).returning();
    return res as any;
  }

  async deleteReview(id: string): Promise<boolean> {
    const r = await db.delete(reviews).where(eq(reviews.id, id));
    return r > 0;
  }

  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    const res = await db.select().from(reviews).where(eq(reviews.revieweeId, userId), eq(reviews.approved, true));
    const count = (res as any).length;
    if (count === 0) return { average: 0, count: 0 };
    const sum = (res as any[]).reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = Math.round((sum / count) * 10) / 10;
    return { average: avg, count };
  }

  // Payments & Payouts
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [res] = await db.insert(payments).values(payment).returning();
    return res as any;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    const res = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return res as any;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const res = await db.select().from(payments).where(eq(payments.id, id));
    return res[0] as any;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment | undefined> {
    const [res] = await db.update(payments).set({ status } as any).where(eq(payments.id, id)).returning();
    return res as any;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    const res = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return res[0] as any;
  }

  async getPaymentsByTransactionId(transactionId: string): Promise<Payment[]> {
    const res = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return res as any;
  }

  async createPayout(payout: InsertPayout): Promise<Payout> {
    const [res] = await db.insert(payouts).values(payout).returning();
    return res as any;
  }

  async getPayout(id: string): Promise<Payout | undefined> {
    const res = await db.select().from(payouts).where(eq(payouts.id, id));
    return res[0] as any;
  }

  async updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined> {
    const [res] = await db.update(payouts).set(updates as any).where(eq(payouts.id, id)).returning();
    return res as any;
  }

  async getPayoutsByFarmer(farmerId: string): Promise<Payout[]> {
    const res = await db.select().from(payouts).where(eq(payouts.farmerId, farmerId));
    return res as any;
  }

  async getAllPayouts(): Promise<Payout[]> {
    const res = await db.select().from(payouts);
    return res as any;
  }

  async getAllPayments(): Promise<Payment[]> {
    const res = await db.select().from(payments);
    return res as any;
  }

  // Escrow
  async createEscrow(esc: InsertEscrow): Promise<Escrow> {
    const [res] = await db.insert(escrow).values(esc).returning();
    return res as any;
  }

  async getEscrowByOrder(orderId: string): Promise<Escrow | undefined> {
    const res = await db.select().from(escrow).where(eq(escrow.orderId, orderId));
    return res[0] as any;
  }

  async getEscrow(id: string): Promise<Escrow | undefined> {
    const res = await db.select().from(escrow).where(eq(escrow.id, id));
    return res[0] as any;
  }

  async updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined> {
    const updatesAll: any = { status, ...updates };
    if (status === 'upfront_held') updatesAll.upfrontHeldAt = new Date();
    if (status === 'remaining_released') updatesAll.remainingReleasedAt = new Date();
    if (status === 'disputed') updatesAll.disputedAt = new Date();
    if (status === 'completed') updatesAll.updatedAt = new Date();
    const [res] = await db.update(escrow).set(updatesAll).where(eq(escrow.id, id)).returning();
    return res as any;
  }

  async getEscrowsByBuyer(buyerId: string): Promise<Escrow[]> {
    const res = await db.select().from(escrow).where(eq(escrow.buyerId, buyerId));
    return res as any;
  }

  async getEscrowsByFarmer(farmerId: string): Promise<Escrow[]> {
    const res = await db.select().from(escrow).where(eq(escrow.farmerId, farmerId));
    return res as any;
  }

  async getAllEscrows(): Promise<Escrow[]> {
    const res = await db.select().from(escrow);
    return res as any;
  }

  // Moderation stats
  async createModerationStat(stat: InsertModerationStat): Promise<ModerationStat> {
    const [res] = await db.insert(moderationStats).values(stat).returning();
    return res as any;
  }

  async getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]> {
    const res = await db
      .select()
      .from(moderationStats)
      .where(moderationStats.date.between(startDate, endDate));
    return res as any;
  }

  async getModerationStatsByContentType(contentType: string): Promise<ModerationStat[]> {
    const res = await db.select().from(moderationStats).where(eq(moderationStats.contentType, contentType));
    return res as any;
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    await db.update(users).set({ role } as any).where(eq(users.id, userId));
  }

}

export default PostgresStorage;
