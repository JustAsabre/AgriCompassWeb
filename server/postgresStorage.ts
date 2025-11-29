import { db } from './drizzleClient';
import { eq, inArray, and, desc } from 'drizzle-orm';
import {
  users,
  listings,
  pricingTiers,
  orders,
  cartItems,
  verifications,
  notifications,
  messages,
  reviews as reviewsTable,
  payments,
  payouts,
  transactions,
  escrow,
  moderationStats,
  walletTransactions,
  withdrawals,
} from '@shared/schema';
import type {
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
  WalletTransaction,
  InsertWalletTransaction,
  Withdrawal,
  InsertWithdrawal
} from '@shared/schema';

// Minimal Postgres-backed storage implementation using Drizzle
export class PostgresStorage {
  constructor() {
    if (!db) throw new Error('Database client not initialized');
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(users).where(eq(users.id, id));
    return res[0] as any;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(users).where(eq(users.email, email));
    return res[0] as any;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(users).where(eq(users.resetToken, token));
    return res[0] as any;
  }

  async createUser(user: InsertUser): Promise<User> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(users).values(user).returning();
    return res as any;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(users).set(updates as any).where(eq(users.id, id)).returning();
    return res as any;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(users).where(eq(users.role, role));
    return res as any;
  }

  async getAllUsers(): Promise<User[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(users);
    return res as any;
  }

  // Listings
  async getAllListings(): Promise<Listing[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(listings);
    return res as any;
  }

  async getListing(id: string): Promise<Listing | undefined> {
    if (!db) throw new Error('Database client not initialized');
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
    if (!db) throw new Error('Database client not initialized');
    const list = await db.select().from(listings).where(eq(listings.status, 'active'));
    const result: ListingWithFarmer[] = [];
    for (const l of list as any[]) {
      const farmer = await this.getUser(l.farmerId);
      if (!farmer) continue;
      const tiers = await db.select().from(pricingTiers).where(eq(pricingTiers.listingId, l.id));
      const reviewsList = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, farmer.id));
      const averageRating = reviewsList.length > 0 ? ((reviewsList as any[]).reduce((s: any, r: any) => s + (r.rating || 0), 0) / reviewsList.length) : undefined;
      result.push({ ...l as any, farmer: { ...farmer as any, averageRating, reviewCount: reviewsList.length }, pricingTiers: tiers as any });
    }
    return result;
  }

  async getListingsByFarmer(farmerId: string): Promise<Listing[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(listings).where(eq(listings.farmerId, farmerId));
    return res as any;
  }

  async createListing(listing: InsertListing): Promise<Listing> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(listings).values(listing).returning();
    return res as any;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(listings).set(updates as any).where(eq(listings.id, id)).returning();
    return res as any;
  }

  async deleteListing(id: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.delete(listings).where(eq(listings.id, id)).returning();
    return Array.isArray(res) ? res.length > 0 : !!res;
  }

  async getListingsByModerationStatus(status: string): Promise<Listing[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(listings).where(eq(listings.moderationStatus, status));
    return res as any;
  }

  // Orders
  async getOrder(id: string): Promise<Order | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(orders).where(eq(orders.id, id));
    return res[0] as any;
  }

  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const o = await this.getOrder(id);
    if (!o) return undefined;
    const listing = await this.getListing(o.listingId);
    const farmer = await this.getUser(o.farmerId);
    const buyer = await this.getUser(o.buyerId);
    if (!listing || !farmer || !buyer) return undefined;
    return { ...o as any, listing: listing as any, farmer: farmer as any, buyer: buyer as any } as any;
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(orders).where(eq(orders.buyerId, buyerId)).orderBy(desc(orders.createdAt));
    const result: OrderWithDetails[] = [];
    for (const o of res as any[]) {
      const details = await this.getOrderWithDetails(o.id);
      if (details) result.push(details);
    }
    return result;
  }

  async getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(orders).where(eq(orders.farmerId, farmerId)).orderBy(desc(orders.createdAt));
    const result: OrderWithDetails[] = [];
    for (const o of res as any[]) {
      const details = await this.getOrderWithDetails(o.id);
      if (details) result.push(details);
    }
    return result;
  }

  async getAllOrders(): Promise<Order[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(orders);
    return res as any;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(orders).values(order).returning();
    return res as any;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(orders).set({ status } as any).where(eq(orders.id, id)).returning();
    return res as any;
  }

  // Cart
  async getCartItemsByBuyer(buyerId: string): Promise<CartItemWithListing[]> {
    if (!db) throw new Error('Database client not initialized');
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
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(cartItems).where(eq(cartItems.id, id));
    return res[0] as any;
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(cartItems).values(item).returning();
    return res as any;
  }

  async removeFromCart(id: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.delete(cartItems).where(eq(cartItems.id, id)).returning();
    return Array.isArray(res) ? res.length > 0 : !!res;
  }

  async updateCartQuantity(id: string, quantity: number): Promise<CartItem> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(cartItems).set({ quantity } as any).where(eq(cartItems.id, id)).returning();
    if (!res) throw new Error('Cart item not found');
    return res as any;
  }

  async clearCart(buyerId: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    await db.delete(cartItems).where(eq(cartItems.buyerId, buyerId));
    return true;
  }

  // Verifications
  async getVerificationsByOfficer(officerId: string): Promise<Verification[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(verifications).where(eq(verifications.officerId, officerId));
    return res as any;
  }

  async getVerificationByFarmer(farmerId: string): Promise<Verification | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(verifications).where(eq(verifications.farmerId, farmerId));
    return res[0] as any;
  }

  async createVerification(verification: InsertVerification): Promise<Verification> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(verifications).values(verification).returning();
    return res as any;
  }

  async updateVerificationStatus(id: string, status: string, notes?: string): Promise<Verification | undefined> {
    if (!db) throw new Error('Database client not initialized');
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
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(verifications);
    return res as any;
  }

  // Pricing tiers
  async getPricingTiersByListing(listingId: string): Promise<PricingTier[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(pricingTiers).where(eq(pricingTiers.listingId, listingId));
    return res as any;
  }

  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(pricingTiers).values(tier).returning();
    return res as any;
  }

  async deletePricingTier(id: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.delete(pricingTiers).where(eq(pricingTiers.id, id)).returning();
    return Array.isArray(res) ? res.length > 0 : !!res;
  }

  // Notifications
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    return res as any;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return (res as any[]).length;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(notifications).values(notification).returning();
    return res as any;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(notifications).set({ read: true as any }).where(eq(notifications.id, id)).returning();
    return res as any;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    await db.update(notifications).set({ read: true as any }).where(eq(notifications.userId, userId));
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.delete(notifications).where(eq(notifications.id, id)).returning();
    return Array.isArray(res) ? res.length > 0 : !!res;
  }

  // Messages
  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(messages).where(
      inArray(messages.senderId, [userId1, userId2])
    );
    // Filter to include only messages exchanged between the two.
    const msgs = (res as any[]).filter((m: any) => (m.senderId === userId1 && m.receiverId === userId2) || (m.senderId === userId2 && m.receiverId === userId1));
    const details: MessageWithUsers[] = [];
    for (const m of msgs) {
      const sender = await this.getUser(m.senderId);
      const receiver = await this.getUser(m.receiverId);
      if (sender && receiver) details.push({ ...m, sender, receiver } as any);
    }
    // sort ascending by createdAt
    details.sort((a: MessageWithUsers, b: MessageWithUsers) => (new Date(a.createdAt as any).getTime() - new Date(b.createdAt as any).getTime()));
    return details;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    // For performance, a real implementation uses grouping and window functions. We'll approximate.
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(messages).where(eq(messages.senderId, userId));
    const received = await db.select().from(messages).where(eq(messages.receiverId, userId));
    const all = [...(res as any[]), ...(received as any[])];
    // group by other user
    const map = new Map<string, any[]>();
    for (const m of all) {
      const other = m.senderId === userId ? m.receiverId : m.senderId;
      if (!map.has(other)) map.set(other, []);
      map.get(other)!.push(m);
    }
    const conversations: Conversation[] = [];
    for (const [other, msgs] of map.entries()) {
      msgs.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const lastMessage = msgs[0];
      const otherUser = await this.getUser(other);
      if (!otherUser) continue;
      const unreadCount = msgs.filter((m: any) => m.senderId === other && !m.read).length;
      conversations.push({ otherUser, lastMessage, unreadCount } as any);
    }
    return conversations;
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(messages).values(message).returning();
    return res as any;
  }

  async markMessageRead(id: string): Promise<Message | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(messages).set({ read: true as any }).where(eq(messages.id, id)).returning();
    return res as any;
  }

  async markConversationRead(userId: string, otherUserId: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    await db.update(messages).set({ read: true as any })
      .where(and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId)));
    return true;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.read, false)));
    return Array.isArray(res) ? res.length : 0;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(messages).where(eq(messages.id, id));
    return res[0] as any;
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(messages).set(updates as any).where(eq(messages.id, id)).returning();
    return res as any;
  }

  async getMessagesByModerationStatus(status: string): Promise<Message[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(messages).where(eq(messages.moderationStatus, status));
    return res as any;
  }



  // Reviews
  async getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, revieweeId));
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable).where(eq(reviewsTable.orderId, orderId));
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async getAllReviews(): Promise<ReviewWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable);
    const out: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      const reviewee = await this.getUser(r.revieweeId);
      if (reviewer && reviewee) out.push({ ...r, reviewer, reviewee } as any);
    }
    return out;
  }

  async createReview(review: InsertReview): Promise<Review> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(reviewsTable).values(review).returning();
    return res as any;
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(reviewsTable).set(updates as any).where(eq(reviewsTable.id, id)).returning();
    return res as any;
  }

  async deleteReview(id: string): Promise<boolean> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.delete(reviewsTable).where(eq(reviewsTable.id, id)).returning();
    return Array.isArray(res) ? res.length > 0 : !!res;
  }

  async getFarmerRating(farmerId: string): Promise<{ average: number; count: number }> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable)
      .where(eq(reviewsTable.revieweeId, farmerId));
    const count = (res as any).length;
    if (count === 0) return { average: 0, count: 0 };
    const sum = (res as any[]).reduce((acc: number, r: any) => acc + (r.rating || 0), 0);
    const avg = Math.round((sum / count) * 10) / 10;
    return { average: avg, count };
  }

  async getReviewsByListing(listingId: string): Promise<ReviewWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable).where(eq(reviewsTable.listingId, listingId));
    const result: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      if (reviewer) result.push({ ...r, reviewer });
    }
    return result;
  }

  async getReviewsByFarmer(farmerId: string): Promise<ReviewWithUsers[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(reviewsTable).where(eq(reviewsTable.revieweeId, farmerId));
    const result: ReviewWithUsers[] = [];
    for (const r of res as any[]) {
      const reviewer = await this.getUser(r.reviewerId);
      if (reviewer) result.push({ ...r, reviewer });
    }
    return result;
  }

  // Payments & Payouts
  async createPayment(payment: InsertPayment): Promise<Payment> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(payments).values(payment).returning();
    return res as any;
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payments).where(eq(payments.orderId, orderId));
    return res as any;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payments).where(eq(payments.id, id));
    return res[0] as any;
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(payments).set({ status } as any).where(eq(payments.id, id)).returning();
    return res as any;
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return res[0] as any;
  }

  async getPaymentsByTransactionId(transactionId: string): Promise<Payment[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payments).where(eq(payments.transactionId, transactionId));
    return res as any;
  }

  async createPayout(payout: InsertPayout): Promise<Payout> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(payouts).values(payout).returning();
    return res as any;
  }

  async getPayout(id: string): Promise<Payout | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payouts).where(eq(payouts.id, id));
    return res[0] as any;
  }

  async updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(payouts).set(updates as any).where(eq(payouts.id, id)).returning();
    return res as any;
  }

  async getPayoutsByFarmer(farmerId: string): Promise<Payout[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payouts).where(eq(payouts.farmerId, farmerId));
    return res as any;
  }

  async getAllPayouts(): Promise<Payout[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payouts);
    return res as any;
  }

  async getAllPayments(): Promise<Payment[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(payments);
    return res as any;
  }

  // Transactions
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(transactions).values(transaction).returning();
    return res as any;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(transactions).set(updates).where(eq(transactions.id, id)).returning();
    return res as any;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(transactions).where(eq(transactions.id, id));
    return res[0] as any;
  }

  async getTransactionByPaystackReference(reference: string): Promise<Transaction | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(transactions).where(eq(transactions.reference, reference));
    return res[0] as any;
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.update(transactions).set({ status }).where(eq(transactions.id, id)).returning();
    return res as any;
  }



  // Reviews


  async createEscrow(esc: InsertEscrow): Promise<Escrow> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(escrow).values(esc).returning();
    return res as any;
  }

  async getEscrowByOrder(orderId: string): Promise<Escrow | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(escrow).where(eq(escrow.orderId, orderId));
    return res[0] as any;
  }

  async getEscrow(id: string): Promise<Escrow | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(escrow).where(eq(escrow.id, id));
    return res[0] as any;
  }

  async updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const updatesAll: any = { status, ...updates };
    if (status === 'upfront_held') updatesAll.upfrontHeldAt = new Date();
    if (status === 'remaining_released') updatesAll.remainingReleasedAt = new Date();
    if (status === 'disputed') updatesAll.disputedAt = new Date();
    if (status === 'completed') updatesAll.updatedAt = new Date();
    const [res] = await db.update(escrow).set(updatesAll).where(eq(escrow.id, id)).returning();
    return res as any;
  }

  async getEscrowsByBuyer(buyerId: string): Promise<Escrow[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(escrow).where(eq(escrow.buyerId, buyerId));
    return res as any;
  }

  async getEscrowsByFarmer(farmerId: string): Promise<Escrow[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(escrow).where(eq(escrow.farmerId, farmerId));
    return res as any;
  }

  async getAllEscrows(): Promise<Escrow[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select().from(escrow);
    return res as any;
  }

  // Moderation stats
  async createModerationStat(stat: InsertModerationStat): Promise<ModerationStat> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(moderationStats).values(stat).returning();
    return res as any;
  }

  async getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]> {
    if (!db) throw new Error('Database client not initialized');
    // Drizzle does not support .between directly; use raw SQL or filter in JS
    const res = await db.select().from(moderationStats);
    return (res as any[]).filter((stat: any) => {
      const d = new Date(stat.date);
      return d >= startDate && d <= endDate;
    });
  }



  async updateUserRole(userId: string, role: string): Promise<void> {
    if (!db) throw new Error('Database client not initialized');
    await db.update(users).set({ role } as any).where(eq(users.id, userId));
  }

  // Wallet operations
  async getWalletBalance(userId: string): Promise<string> {
    if (!db) throw new Error('Database client not initialized');
    const user = await this.getUser(userId);
    return user?.walletBalance || "0.00";
  }

  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> {
    if (!db) throw new Error('Database client not initialized');

    // Start a transaction to ensure atomicity
    return await db.transaction(async (tx) => {
      // 1. Create the transaction record
      const [newTx] = await tx.insert(walletTransactions).values(transaction).returning();

      // 2. Update user wallet balance
      const [user] = await tx.select().from(users).where(eq(users.id, transaction.userId));

      if (!user) throw new Error('User not found');

      const currentBalance = parseFloat(user.walletBalance || "0");
      const txAmount = parseFloat(transaction.amount.toString());

      let newBalance = currentBalance;
      if (transaction.type === 'credit') {
        newBalance += txAmount;
      } else if (transaction.type === 'debit') {
        newBalance -= txAmount;
      }

      await tx.update(users)
        .set({ walletBalance: newBalance.toFixed(2) })
        .where(eq(users.id, transaction.userId));

      return newTx as any;
    });
  }

  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select()
      .from(walletTransactions)
      .where(eq(walletTransactions.userId, userId))
      .orderBy(desc(walletTransactions.createdAt));
    return res as any;
  }

  async requestWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> {
    if (!db) throw new Error('Database client not initialized');
    const [res] = await db.insert(withdrawals).values(withdrawal).returning();
    return res as any;
  }

  async getWithdrawals(userId: string): Promise<Withdrawal[]> {
    if (!db) throw new Error('Database client not initialized');
    const res = await db.select()
      .from(withdrawals)
      .where(eq(withdrawals.userId, userId))
      .orderBy(desc(withdrawals.createdAt));
    return res as any;
  }

  async updateWithdrawalStatus(id: string, status: string, transactionId?: string): Promise<Withdrawal | undefined> {
    if (!db) throw new Error('Database client not initialized');
    const updates: any = { status, processedAt: new Date() };
    if (transactionId) updates.transactionId = transactionId;

    const [res] = await db.update(withdrawals)
      .set(updates)
      .where(eq(withdrawals.id, id))
      .returning();
    return res as any;
  }
}

export default PostgresStorage;
