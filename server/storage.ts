import {
  type User,
  type InsertUser,
  type Listing,
  type InsertListing,
  type Order,
  type InsertOrder,
  type CartItem,
  type InsertCartItem,
  type Verification,
  type InsertVerification,
  type PricingTier,
  type InsertPricingTier,
  type Notification,
  type InsertNotification,
  type Message,
  type InsertMessage,
  type Review,
  type InsertReview,
  type Payment,
  type InsertPayment,
  type Payout,
  type InsertPayout,
  type Transaction,
  type InsertTransaction,
  type ModerationStat,
  type InsertModerationStat,
  type ListingWithFarmer,
  type OrderWithDetails,
  type CartItemWithListing,
  type MessageWithUsers,
  type ReviewWithUsers,
  type Conversation,
  type Escrow,
  type InsertEscrow,
  type WalletTransaction,
  type InsertWalletTransaction,
  type Withdrawal,
  type InsertWithdrawal
} from "@shared/schema";
import { randomUUID } from "crypto";
import PostgresStorage from './postgresStorage';

// Storage interface with all CRUD operations
export interface IStorage {
  /**
   * Test/support helper to reset storage state.
   * In Postgres this should clear tables; in-memory should clear maps.
   */
  cleanup(): Promise<void>;

  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  getUserByEmailVerificationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: string): Promise<void>;

  // Listing operations
  getAllListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getListingWithFarmer(id: string): Promise<ListingWithFarmer | undefined>;
  getAllListingsWithFarmer(): Promise<ListingWithFarmer[]>;
  getListingsByFarmer(farmerId: string): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: string): Promise<boolean>;
  getListingsByModerationStatus(status: string): Promise<Listing[]>;
  decrementListingQuantity(id: string, quantity: number): Promise<boolean>;
  incrementListingQuantity(id: string, quantity: number): Promise<boolean>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]>;
  getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]>;
  // Return all orders in the system
  getAllOrders(): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;

  // Cart operations
  getCartItemsByBuyer(buyerId: string): Promise<CartItemWithListing[]>;
  getCartItem(id: string): Promise<CartItem | undefined>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  removeFromCart(id: string): Promise<boolean>;
  updateCartQuantity(id: string, quantity: number): Promise<CartItem>;
  clearCart(buyerId: string): Promise<boolean>;

  // Verification operations
  getVerificationsByOfficer(officerId: string): Promise<Verification[]>;
  getVerificationByFarmer(farmerId: string): Promise<Verification | undefined>;
  createVerification(verification: InsertVerification): Promise<Verification>;
  updateVerificationStatus(id: string, status: string, notes?: string): Promise<Verification | undefined>;
  // Return all verifications
  getAllVerifications(): Promise<Verification[]>;

  // Pricing tier operations
  getPricingTiersByListing(listingId: string): Promise<PricingTier[]>;
  getPricingTier(id: string): Promise<PricingTier | undefined>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
  updatePricingTier(id: string, updates: Partial<PricingTier>): Promise<PricingTier | undefined>;
  deletePricingTier(id: string): Promise<boolean>;

  // Notification operations
  getNotificationsByUser(userId: string): Promise<Notification[]>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: string): Promise<Notification | undefined>;
  markAllNotificationsRead(userId: string): Promise<boolean>;
  deleteNotification(id: string): Promise<boolean>;

  // Message operations
  getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]>;
  getMessage(id: string): Promise<Message | undefined>;
  getConversations(userId: string): Promise<Conversation[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  markConversationRead(userId: string, otherUserId: string): Promise<boolean>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Review operations
  getReviewsByListing(listingId: string): Promise<ReviewWithUsers[]>;
  getReviewsByFarmer(farmerId: string): Promise<ReviewWithUsers[]>;
  getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]>;
  getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]>;
  getReview(id: string): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<boolean>;
  getFarmerRating(farmerId: string): Promise<{ average: number; count: number }>;
  getAllReviews(): Promise<ReviewWithUsers[]>;

  // Payment operations
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;
  getPaymentsByTransactionId(transactionId: string): Promise<Payment[]>;
  updatePaymentStatus(id: string, status: string, transactionId?: string): Promise<Payment | undefined>;

  // Return all payments in the system
  getAllPayments(): Promise<Payment[]>;

  // Payout operations
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayout(id: string): Promise<Payout | undefined>;
  updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined>;
  getPayoutsByFarmer(farmerId: string): Promise<Payout[]>;
  getAllPayouts(): Promise<Payout[]>;

  // Transaction operations
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  getTransactionByPaystackReference(reference: string): Promise<Transaction | undefined>;
  updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Escrow operations
  createEscrow(esc: InsertEscrow): Promise<Escrow>;
  getEscrowByOrder(orderId: string): Promise<Escrow | undefined>;
  getEscrow(id: string): Promise<Escrow | undefined>;
  updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined>;
  getEscrowsByBuyer(buyerId: string): Promise<Escrow[]>;
  getEscrowsByFarmer(farmerId: string): Promise<Escrow[]>;
  getAllEscrows(): Promise<Escrow[]>;

  // Wallet operations
  getWalletBalance(userId: string): Promise<string>;
  createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction>;
  getWalletTransactions(userId: string): Promise<WalletTransaction[]>;
  requestWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal>;
  getWithdrawals(userId: string): Promise<Withdrawal[]>;
  updateWithdrawalStatus(id: string, status: string, transactionId?: string): Promise<Withdrawal | undefined>;

  // Order completion helpers
  completeOrderAndCreditWallet(orderId: string): Promise<void>;

  // Admin operations
  getModerationStats(): Promise<ModerationStat[]>;
  getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]>;
  resetModerationStats(moderatorId: string): Promise<ModerationStat>;
  incrementModerationStats(moderatorId: string, type: 'approved' | 'rejected'): Promise<void>;
  getMessagesByModerationStatus(status: string): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private listings: Map<string, Listing>;
  private orders: Map<string, Order>;
  private cartItems: Map<string, CartItem>;
  private verifications: Map<string, Verification>;
  private pricingTiers: Map<string, PricingTier>;
  private notifications: Map<string, Notification>;
  private messages: Map<string, Message>;
  private reviews: Map<string, Review>;
  private payments: Map<string, Payment>;
  private payouts: Map<string, Payout>;
  private transactions: Map<string, Transaction>;
  private moderationStats: Map<string, ModerationStat>;
  private escrows: Map<string, Escrow>;
  private walletTransactions: Map<string, WalletTransaction>;
  private withdrawals: Map<string, Withdrawal>;

  constructor() {
    this.users = new Map();
    this.listings = new Map();
    this.orders = new Map();
    this.cartItems = new Map();
    this.verifications = new Map();
    this.pricingTiers = new Map();
    this.notifications = new Map();
    this.messages = new Map();
    this.reviews = new Map();
    this.payments = new Map();
    this.payouts = new Map();
    this.transactions = new Map();
    this.moderationStats = new Map();
    this.escrows = new Map();
    this.walletTransactions = new Map();
    this.withdrawals = new Map();

    // Seed admin user
    const adminId = "admin-user-id";
    this.users.set(adminId, {
      id: adminId,
      email: "admin@agricompass.com",
      password: "$2b$10$vUVIrSa8.3TH9R6SFpL7XOY6Z13wstj9bn6PTNWBU.eVftCfGiYAy", // admin123
      fullName: "System Admin",
      role: "admin",
      verified: true,
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      walletBalance: "0.00",
      failedLoginAttempts: 0,
      phone: null,
      region: null,
      mobileNumber: null,
      mobileNetwork: null,
      paystackRecipientCode: null,
      lockedUntil: null,
      emailVerificationToken: null,
      emailVerificationExpiry: null,
      businessName: null,
      farmSize: null,
      resetToken: null,
      resetTokenExpiry: null,
    } as User);
  }

  async cleanup(): Promise<void> {
    this.users.clear();
    this.listings.clear();
    this.orders.clear();
    this.cartItems.clear();
    this.verifications.clear();
    this.pricingTiers.clear();
    this.notifications.clear();
    this.messages.clear();
    this.reviews.clear();
    this.payments.clear();
    this.payouts.clear();
    this.transactions.clear();
    this.moderationStats.clear();
    this.escrows.clear();
    this.walletTransactions.clear();
    this.withdrawals.clear();
  }

  async getUser(id: string): Promise<User | undefined> { return this.users.get(id); }
  async getUserByEmail(email: string): Promise<User | undefined> { return Array.from(this.users.values()).find(u => u.email === email); }
  async getUserByResetToken(token: string): Promise<User | undefined> { return Array.from(this.users.values()).find(u => u.resetToken === token); }
  async getUserByEmailVerificationToken(token: string): Promise<User | undefined> { return Array.from(this.users.values()).find(u => u.emailVerificationToken === token); }
  async createUser(user: InsertUser): Promise<User> { const id = randomUUID(); const newUser = { ...user, id, createdAt: new Date(), walletBalance: "0.00" } as User; this.users.set(id, newUser); return newUser; }
  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> { const user = this.users.get(id); if (!user) return undefined; const updated = { ...user, ...updates }; this.users.set(id, updated); return updated; }
  async getUsersByRole(role: string): Promise<User[]> { return Array.from(this.users.values()).filter(u => u.role === role); }
  async getAllUsers(): Promise<User[]> { return Array.from(this.users.values()); }
  async updateUserRole(userId: string, role: string): Promise<void> { const user = this.users.get(userId); if (user) this.users.set(userId, { ...user, role } as any); }

  async getAllListings(): Promise<Listing[]> { return Array.from(this.listings.values()); }
  async getListing(id: string): Promise<Listing | undefined> { return this.listings.get(id); }
  async getListingWithFarmer(id: string): Promise<ListingWithFarmer | undefined> { const listing = this.listings.get(id); if (!listing) return undefined; const farmer = this.users.get(listing.farmerId); return farmer ? { ...listing, farmer } : undefined; }
  async getAllListingsWithFarmer(): Promise<ListingWithFarmer[]> { return []; }
  async getListingsByFarmer(farmerId: string): Promise<Listing[]> { return Array.from(this.listings.values()).filter(l => l.farmerId === farmerId); }
  async createListing(listing: InsertListing): Promise<Listing> { const id = randomUUID(); const newListing = { ...listing, id, createdAt: new Date() } as Listing; this.listings.set(id, newListing); return newListing; }
  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> { const listing = this.listings.get(id); if (!listing) return undefined; const updated = { ...listing, ...updates }; this.listings.set(id, updated); return updated; }
  async deleteListing(id: string): Promise<boolean> { return this.listings.delete(id); }
  async getListingsByModerationStatus(status: string): Promise<Listing[]> { return Array.from(this.listings.values()).filter(l => l.moderationStatus === status); }
  async decrementListingQuantity(id: string, quantity: number): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing || listing.quantityAvailable < quantity) return false;
    listing.quantityAvailable -= quantity;
    this.listings.set(id, listing);
    return true;
  }
  async incrementListingQuantity(id: string, quantity: number): Promise<boolean> {
    const listing = this.listings.get(id);
    if (!listing) return false;
    listing.quantityAvailable += quantity;
    this.listings.set(id, listing);
    return true;
  }

  async getOrder(id: string): Promise<Order | undefined> { return this.orders.get(id); }
  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> { return undefined; }
  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> { return []; }
  async getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]> { return []; }
  async getAllOrders(): Promise<Order[]> { return Array.from(this.orders.values()); }
  async createOrder(order: InsertOrder): Promise<Order> { const id = randomUUID(); const newOrder = { ...order, id, createdAt: new Date() } as Order; this.orders.set(id, newOrder); return newOrder; }
  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> { const order = this.orders.get(id); if (!order) return undefined; const updated = { ...order, status }; this.orders.set(id, updated); return updated; }

  async getCartItemsByBuyer(buyerId: string): Promise<CartItemWithListing[]> { return []; }
  async getCartItem(id: string): Promise<CartItem | undefined> { return this.cartItems.get(id); }
  async addToCart(item: InsertCartItem): Promise<CartItem> { const id = randomUUID(); const newItem = { ...item, id, createdAt: new Date() } as CartItem; this.cartItems.set(id, newItem); return newItem; }
  async removeFromCart(id: string): Promise<boolean> { return this.cartItems.delete(id); }
  async updateCartQuantity(id: string, quantity: number): Promise<CartItem> { const item = this.cartItems.get(id); if (!item) throw new Error("Item not found"); item.quantity = quantity; return item; }
  async clearCart(buyerId: string): Promise<boolean> { return true; }

  async getVerificationsByOfficer(officerId: string): Promise<Verification[]> { return []; }
  async getVerificationByFarmer(farmerId: string): Promise<Verification | undefined> { return undefined; }
  async createVerification(verification: InsertVerification): Promise<Verification> { const id = randomUUID(); const newVerification = { ...verification, id, submittedAt: new Date(), reviewedAt: null, status: 'pending' } as unknown as Verification; this.verifications.set(id, newVerification); return newVerification; }
  async updateVerificationStatus(id: string, status: string, notes?: string): Promise<Verification | undefined> {
    const v = this.verifications.get(id);
    if (!v) return undefined;
    const updated = { ...v, status, notes: notes || null, reviewedAt: new Date() } as Verification;
    this.verifications.set(id, updated);

    // Update farmer's verified status
    if (status === 'approved') {
      const farmer = this.users.get(v.farmerId);
      if (farmer) this.users.set(v.farmerId, { ...farmer, verified: true } as any);
    } else if (status === 'rejected') {
      const farmer = this.users.get(v.farmerId);
      if (farmer) this.users.set(v.farmerId, { ...farmer, verified: false } as any);
    }

    return updated;
  }
  async getAllVerifications(): Promise<Verification[]> { return Array.from(this.verifications.values()); }

  async getPricingTiersByListing(listingId: string): Promise<PricingTier[]> { return Array.from(this.pricingTiers.values()).filter(t => t.listingId === listingId); }
  async getPricingTier(id: string): Promise<PricingTier | undefined> { return this.pricingTiers.get(id); }
  async createPricingTier(tier: InsertPricingTier): Promise<PricingTier> { const id = randomUUID(); const newTier = { ...tier, id } as PricingTier; this.pricingTiers.set(id, newTier); return newTier; }
  async updatePricingTier(id: string, updates: Partial<PricingTier>): Promise<PricingTier | undefined> { const tier = this.pricingTiers.get(id); if (!tier) return undefined; const updated = { ...tier, ...updates }; this.pricingTiers.set(id, updated); return updated; }
  async deletePricingTier(id: string): Promise<boolean> { return this.pricingTiers.delete(id); }

  async getNotificationsByUser(userId: string): Promise<Notification[]> { return []; }
  async getUnreadNotificationCount(userId: string): Promise<number> { return 0; }
  async createNotification(notification: InsertNotification): Promise<Notification> { const id = randomUUID(); const newNotif = { ...notification, id, createdAt: new Date() } as Notification; this.notifications.set(id, newNotif); return newNotif; }
  async markNotificationRead(id: string): Promise<Notification | undefined> { return undefined; }
  async markAllNotificationsRead(userId: string): Promise<boolean> { return true; }
  async deleteNotification(id: string): Promise<boolean> { return this.notifications.delete(id); }

  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]> {
    const msgs = Array.from(this.messages.values()).filter((m: any) =>
      (m.senderId === userId1 && m.receiverId === userId2) ||
      (m.senderId === userId2 && m.receiverId === userId1)
    );
    return msgs as any;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getConversations(userId: string): Promise<Conversation[]> { return []; }
  async createMessage(message: InsertMessage): Promise<Message> { const id = randomUUID(); const newMsg = { ...message, id, createdAt: new Date() } as Message; this.messages.set(id, newMsg); return newMsg; }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const existing = this.messages.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates } as Message;
    this.messages.set(id, updated);
    return updated;
  }

  async markConversationRead(userId: string, otherUserId: string): Promise<boolean> {
    for (const [id, m] of this.messages.entries()) {
      const msg: any = m;
      if (msg.senderId === otherUserId && msg.receiverId === userId) {
        this.messages.set(id, { ...msg, read: true } as any);
      }
    }
    return true;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return Array.from(this.messages.values()).filter((m: any) => m.receiverId === userId && !m.read).length;
  }

  async createPayout(payout: InsertPayout): Promise<Payout> { const id = randomUUID(); const newPayout = { ...payout, id, createdAt: new Date() } as any; this.payouts.set(id, newPayout); return newPayout as any; }
  async getPayout(id: string): Promise<Payout | undefined> { return this.payouts.get(id); }
  async updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined> { const p = this.payouts.get(id); if (!p) return undefined; const updated = { ...p, ...updates } as any; this.payouts.set(id, updated); return updated; }
  async getPayoutsByFarmer(farmerId: string): Promise<Payout[]> { return Array.from(this.payouts.values()).filter(p => p.farmerId === farmerId); }
  async getAllPayouts(): Promise<Payout[]> { return Array.from(this.payouts.values()); }

  async createPayment(payment: InsertPayment): Promise<Payment> { const id = randomUUID(); const newPayment = { ...payment, id, createdAt: new Date() } as Payment; this.payments.set(id, newPayment); return newPayment; }
  async getPayment(id: string): Promise<Payment | undefined> { return this.payments.get(id); }
  async getPaymentsByOrder(orderId: string): Promise<Payment[]> { return Array.from(this.payments.values()).filter(p => p.orderId === orderId); }
  async getAllPayments(): Promise<Payment[]> { return Array.from(this.payments.values()); }
  async getPaymentsByTransactionId(transactionId: string): Promise<Payment[]> { return []; }
  async updatePaymentStatus(id: string, status: string, transactionId?: string): Promise<Payment | undefined> { const p = this.payments.get(id); if (!p) return undefined; const updated: any = { ...p, status }; if (transactionId) updated.transactionId = transactionId; this.payments.set(id, updated); return updated; }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> { const id = randomUUID(); const newTx = { ...transaction, id, createdAt: new Date() } as Transaction; this.transactions.set(id, newTx); return newTx; }
  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> { const tx = this.transactions.get(id); if (!tx) return undefined; const updated = { ...tx, ...updates }; this.transactions.set(id, updated); return updated; }
  async getTransaction(id: string): Promise<Transaction | undefined> { return this.transactions.get(id); }
  async getTransactionByPaystackReference(reference: string): Promise<Transaction | undefined> { return Array.from(this.transactions.values()).find(t => t.reference === reference); }
  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> { return this.updateTransaction(id, { status }); }

  async createEscrow(escrow: InsertEscrow): Promise<Escrow> { const id = randomUUID(); const newEscrow = { ...escrow, id, createdAt: new Date(), updatedAt: new Date() } as Escrow; this.escrows.set(id, newEscrow); return newEscrow; }
  async getEscrowByOrder(orderId: string): Promise<Escrow | undefined> { return Array.from(this.escrows.values()).find(e => e.orderId === orderId); }
  async getEscrow(id: string): Promise<Escrow | undefined> { return this.escrows.get(id); }
  async updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined> { const e = this.escrows.get(id); if (!e) return undefined; const updated = { ...e, status, ...updates, updatedAt: new Date() }; this.escrows.set(id, updated); return updated; }
  async getEscrowsByBuyer(buyerId: string): Promise<Escrow[]> { return Array.from(this.escrows.values()).filter(e => e.buyerId === buyerId); }
  async getEscrowsByFarmer(farmerId: string): Promise<Escrow[]> { return Array.from(this.escrows.values()).filter(e => e.farmerId === farmerId); }
  async getAllEscrows(): Promise<Escrow[]> { return Array.from(this.escrows.values()); }

  async getReviewsByListing(listingId: string): Promise<ReviewWithUsers[]> { return Array.from(this.reviews.values()).filter((r: any) => r.listingId === listingId) as any; }
  async getReviewsByFarmer(farmerId: string): Promise<ReviewWithUsers[]> { return Array.from(this.reviews.values()).filter((r: any) => r.revieweeId === farmerId) as any; }
  async getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]> { return Array.from(this.reviews.values()).filter((r: any) => r.revieweeId === revieweeId) as any; }
  async getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]> { return Array.from(this.reviews.values()).filter((r: any) => r.orderId === orderId) as any; }
  async getReview(id: string): Promise<Review | undefined> { return this.reviews.get(id); }
  async createReview(review: InsertReview): Promise<Review> { const id = randomUUID(); const newReview = { ...review, id, createdAt: new Date() } as Review; this.reviews.set(id, newReview); return newReview; }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined> {
    const existing = this.reviews.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...updates } as Review;
    this.reviews.set(id, updated);
    return updated;
  }

  async deleteReview(id: string): Promise<boolean> {
    return this.reviews.delete(id);
  }

  async getFarmerRating(farmerId: string): Promise<{ average: number; count: number }> { return { average: 0, count: 0 }; }
  // Wallet methods
  async getWalletBalance(userId: string): Promise<string> { return "0.00"; }
  async createWalletTransaction(transaction: InsertWalletTransaction): Promise<WalletTransaction> { const id = randomUUID(); const newTx = { ...transaction, id, createdAt: new Date() } as WalletTransaction; this.walletTransactions.set(id, newTx); return newTx; }
  async getWalletTransactions(userId: string): Promise<WalletTransaction[]> { return []; }
  async requestWithdrawal(withdrawal: InsertWithdrawal): Promise<Withdrawal> { const id = randomUUID(); const newW = { ...withdrawal, id, createdAt: new Date() } as Withdrawal; this.withdrawals.set(id, newW); return newW; }
  async getWithdrawals(userId: string): Promise<Withdrawal[]> { return []; }
  async updateWithdrawalStatus(id: string, status: string, transactionId?: string): Promise<Withdrawal | undefined> { return undefined; }

  async getModerationStats(): Promise<ModerationStat[]> { return []; }
  async getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]> { return []; }
  async resetModerationStats(moderatorId: string): Promise<ModerationStat> { throw new Error("Method not implemented."); }
  async incrementModerationStats(moderatorId: string, type: 'approved' | 'rejected'): Promise<void> { }
  async getMessagesByModerationStatus(status: string): Promise<Message[]> { return Array.from(this.messages.values()).filter(m => m.moderationStatus === status); }
  async getAllReviews(): Promise<ReviewWithUsers[]> { return Array.from(this.reviews.values()) as any; }

  async completeOrderAndCreditWallet(orderId: string): Promise<void> { throw new Error("Method not implemented."); }
}

function createStorage(): IStorage {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

  // Tests should use the dedicated Postgres test database (no silent fallback).
  if (process.env.NODE_ENV === 'test') {
    if (!hasDatabaseUrl) {
      throw new Error('DATABASE_URL is required when NODE_ENV=test. Configure a dedicated *_test database URL.');
    }
    return new PostgresStorage() as any;
  }

  if (!hasDatabaseUrl) {
    return new MemStorage();
  }

  try {
    return new PostgresStorage();
  } catch (err) {
    // In tests/dev, we prefer falling back to in-memory rather than crashing the whole process.
    // In production, a configured DATABASE_URL should be considered mandatory.
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to initialize Postgres storage; falling back to in-memory storage:', err);
      return new MemStorage();
    }
    throw err;
  }
}

export const storage: IStorage = createStorage();
