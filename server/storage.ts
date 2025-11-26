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
  type InsertEscrow
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;

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
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
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
  getConversations(userId: string): Promise<Conversation[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(id: string): Promise<Message | undefined>;
  markConversationRead(userId: string, otherUserId: string): Promise<boolean>;
  getUnreadMessageCount(userId: string): Promise<number>;
  getMessage(id: string): Promise<Message | undefined>;
  updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined>;
  getMessagesByModerationStatus(status: string): Promise<Message[]>;

  // Review operations
  getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]>;
  getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]>;
  getAllReviews(): Promise<ReviewWithUsers[]>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined>;
  deleteReview(id: string): Promise<boolean>;
  getAverageRating(userId: string): Promise<{ average: number; count: number }>;
  // Payments & Payouts
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentsByOrder(orderId: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: string, status: string): Promise<Payment | undefined>;
  getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined>;
  getPaymentsByTransactionId(transactionId: string): Promise<Payment[]>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayout(id: string): Promise<Payout | undefined>;
  updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined>;
  getPayoutsByFarmer(farmerId: string): Promise<Payout[]>;
  getAllPayouts(): Promise<Payout[]>;
  // Return all payments in the system
  getAllPayments(): Promise<Payment[]>;

  // Escrow operations
  createEscrow(escrow: InsertEscrow): Promise<Escrow>;
  getEscrowByOrder(orderId: string): Promise<Escrow | undefined>;
  getEscrow(id: string): Promise<Escrow | undefined>;
  updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined>;
  getEscrowsByBuyer(buyerId: string): Promise<Escrow[]>;
  getEscrowsByFarmer(farmerId: string): Promise<Escrow[]>;
  getAllEscrows(): Promise<Escrow[]>;

  // Moderation stats operations
  createModerationStat(stat: InsertModerationStat): Promise<ModerationStat>;
  getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]>;
  getModerationStatsByContentType(contentType: string): Promise<ModerationStat[]>;
  updateUserRole(userId: string, role: string): Promise<void>;
  getAllUsers(): Promise<User[]>;
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

    // Seed data for testing
    this.seedData();
  }

  private async seedData() {
    // Create sample farmers (using plain password for demo - will be hashed by routes)
    // Note: In real implementation, passwords would be hashed here too
    const hashedPass = "$2a$10$YourHashedPasswordHere"; // Placeholder - routes will hash properly
    
        const testFarmer = await this.createUser({
      email: "farmer@example.com",
      password: "password123",
      fullName: "Test Farmer",
      role: "farmer",
      farmSize: "5 hectares"
    });
    // Manually set verified after creation
    const farmer = this.users.get(testFarmer.id);
    if (farmer) farmer.verified = true;

    const farmer2 = await this.createUser({
      email: "farmer2@test.com",
      password: hashedPass,
      fullName: "Sarah Green",
      role: "farmer",
      region: "South Region",
      phone: "+1234567891",
      mobileNumber: "+233555000001",
      mobileNetwork: "mtn",
      farmSize: "5 acres",
    });
    // Manually set verified after creation
    const farmer2User = this.users.get(farmer2.id);
    if (farmer2User) farmer2User.verified = true;

    // Create sample buyer
    await this.createUser({
      email: "buyer@test.com",
      password: hashedPass,
      fullName: "Mike Buyer",
      role: "buyer",
      region: "Central Region",
      phone: "+1234567892",
      businessName: "Fresh Foods Inc",
    });

    // Create sample field officer
    await this.createUser({
      email: "officer@test.com",
      password: hashedPass,
      fullName: "Jane Officer",
      role: "field_officer",
      region: "North Region",
      phone: "+1234567893",
    });

    // Create sample listings
    await this.createListing({
      farmerId: testFarmer.id,
      productName: "Fresh Tomatoes",
      category: "Vegetables",
      description: "Organic, fresh tomatoes harvested this week. Perfect for salads and cooking.",
      price: "2.50",
      unit: "kg",
      quantityAvailable: 500,
      minOrderQuantity: 10,
      harvestDate: "December 2024",
      location: "North Region",
      imageUrl: "",
    });

    await this.createListing({
      farmerId: testFarmer.id,
      productName: "Sweet Corn",
      category: "Vegetables",
      description: "Premium quality sweet corn, non-GMO and organically grown.",
      price: "1.80",
      unit: "kg",
      quantityAvailable: 300,
      minOrderQuantity: 20,
      location: "North Region",
      imageUrl: "",
    });

    await this.createListing({
      farmerId: farmer2.id,
      productName: "Fresh Strawberries",
      category: "Fruits",
      description: "Sweet and juicy strawberries, perfect for desserts and fresh consumption.",
      price: "5.00",
      unit: "kg",
      quantityAvailable: 100,
      minOrderQuantity: 5,
      harvestDate: "December 2024",
      location: "South Region",
      imageUrl: "",
    });

    await this.createListing({
      farmerId: farmer2.id,
      productName: "Organic Lettuce",
      category: "Vegetables",
      description: "Crisp and fresh organic lettuce, grown without pesticides.",
      price: "3.00",
      unit: "kg",
      quantityAvailable: 200,
      minOrderQuantity: 10,
      location: "South Region",
      imageUrl: "",
    });
  }

  // User operations
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.resetToken === token);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    // Password should already be hashed by the caller
    const user: User = { 
      ...insertUser,
      id,
      region: insertUser.region ?? null,
      phone: insertUser.phone ?? null,
      businessName: insertUser.businessName ?? null,
      farmSize: insertUser.farmSize ?? null,
      mobileNumber: (insertUser as any).mobileNumber ?? null,
      mobileNetwork: (insertUser as any).mobileNetwork ?? null,
      paystackRecipientCode: (insertUser as any).paystackRecipientCode ?? null,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      verified: insertUser.role === "field_officer" ? true : false,
      isActive: true, // New users are active by default
      createdAt: new Date()
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getUsersByRole(role: string): Promise<User[]> {
    // Return users with passwords - routes must sanitize before sending
    return Array.from(this.users.values()).filter((user) => user.role === role);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Listing operations
  async getAllListings(): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(l => l.status === "active");
  }

  async getListing(id: string): Promise<Listing | undefined> {
    return this.listings.get(id);
  }

  async getListingWithFarmer(id: string): Promise<ListingWithFarmer | undefined> {
    const listing = this.listings.get(id);
    if (!listing) return undefined;

    const farmer = await this.getUser(listing.farmerId);
    if (!farmer) return undefined;

    const pricingTiers = await this.getPricingTiersByListing(listing.id);

    // Remove password from farmer
    const { password, ...safeFarmer } = farmer;

    return {
      ...listing,
      farmer: safeFarmer as any,
      pricingTiers,
    };
  }

  async getAllListingsWithFarmer(): Promise<ListingWithFarmer[]> {
    const listings = await this.getAllListings();
    const result: ListingWithFarmer[] = [];

    for (const listing of listings) {
      const farmer = await this.getUser(listing.farmerId);
      if (farmer) {
        const pricingTiers = await this.getPricingTiersByListing(listing.id);
        
        // Calculate farmer rating
        const farmerReviews = Array.from(this.reviews.values()).filter(
          r => r.revieweeId === farmer.id
        );
        const averageRating = farmerReviews.length > 0
          ? farmerReviews.reduce((sum, r) => sum + r.rating, 0) / farmerReviews.length
          : undefined;
        
        // Remove password from farmer
        const { password, ...safeFarmer } = farmer;
        result.push({
          ...listing,
          farmer: {
            ...safeFarmer as any,
            averageRating,
            reviewCount: farmerReviews.length,
          },
          pricingTiers,
        });
      }
    }

    return result;
  }

  async getListingsByFarmer(farmerId: string): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(
      (listing) => listing.farmerId === farmerId
    );
  }

  async createListing(insertListing: InsertListing): Promise<Listing> {
    const id = randomUUID();
    const listing: Listing = { 
      ...insertListing,
      id,
      harvestDate: insertListing.harvestDate ?? null,
      imageUrl: insertListing.imageUrl ?? null,
      subcategory: insertListing.subcategory ?? null,
      status: "active",
      moderated: false,
      moderationStatus: "pending",
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date()
    };
    this.listings.set(id, listing);
    return listing;
  }

  async updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined> {
    const listing = this.listings.get(id);
    if (!listing) return undefined;
    const updated = { ...listing, ...updates };
    this.listings.set(id, updated);
    return updated;
  }

  async deleteListing(id: string): Promise<boolean> {
    return this.listings.delete(id);
  }

  async getListingsByModerationStatus(status: string): Promise<Listing[]> {
    return Array.from(this.listings.values()).filter(
      (listing) => listing.moderationStatus === status
    );
  }

  // Order operations
  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;

    const [listing, farmer, buyer] = await Promise.all([
      this.getListing(order.listingId),
      this.getUser(order.farmerId),
      this.getUser(order.buyerId),
    ]);

    if (!listing || !farmer || !buyer) return undefined;

    // Remove passwords from users
    const { password: farmerPass, ...safeFarmer } = farmer;
    const { password: buyerPass, ...safeBuyer } = buyer;

    return {
      ...order,
      listing,
      farmer: safeFarmer as any,
      buyer: safeBuyer as any,
    };
  }

  async getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]> {
    const orders = Array.from(this.orders.values()).filter(
      (order) => order.buyerId === buyerId
    );

    const result: OrderWithDetails[] = [];
    for (const order of orders) {
      const details = await this.getOrderWithDetails(order.id);
      if (details) result.push(details);
    }

    return result;
  }

  async getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]> {
    const orders = Array.from(this.orders.values()).filter(
      (order) => order.farmerId === farmerId
    );

    const result: OrderWithDetails[] = [];
    for (const order of orders) {
      const details = await this.getOrderWithDetails(order.id);
      if (details) result.push(details);
    }

    return result;
  }

  async getAllOrders(): Promise<Order[]> {
    return Array.from(this.orders.values());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
      ...insertOrder,
      id,
      deliveryAddress: insertOrder.deliveryAddress ?? null,
      notes: insertOrder.notes ?? null,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, status, updatedAt: new Date() };
    this.orders.set(id, updated);
    return updated;
  }

  // Payments & Payouts
  async createPayment(insertPayment: InsertPayment): Promise<Payment> {
    const id = randomUUID();
    const payment: Payment = {
      ...insertPayment,
      id,
      transactionId: insertPayment.transactionId ?? null,
      paymentMethod: insertPayment.paymentMethod ?? null,
      createdAt: new Date(),
      status: insertPayment.status ?? 'pending',
    } as any;
    this.payments.set(id, payment);
    return payment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.payments.get(id);
  }

  async getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined> {
    return Array.from(this.payments.values()).find(p => p.transactionId === transactionId);
  }

  async getPaymentsByTransactionId(transactionId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.transactionId === transactionId);
  }

  async getPaymentsByOrder(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(p => p.orderId === orderId);
  }

  async updatePaymentStatus(id: string, status: string): Promise<Payment | undefined> {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    const updated = { ...payment, status } as Payment;
    this.payments.set(id, updated);
    return updated;
  }

  async createPayout(insertPayout: InsertPayout): Promise<Payout> {
    const id = randomUUID();
    const payout: Payout = {
      ...insertPayout,
      id,
      createdAt: new Date(),
    } as any;
    this.payouts.set(id, payout);
    return payout;
  }

  async getPayout(id: string): Promise<Payout | undefined> {
    return this.payouts.get(id);
  }

  async updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined> {
    const payout = this.payouts.get(id);
    if (!payout) return undefined;
    const updated = { ...payout, ...updates } as Payout;
    this.payouts.set(id, updated);
    return updated;
  }

  async getPayoutsByFarmer(farmerId: string): Promise<Payout[]> {
    return Array.from(this.payouts.values()).filter(p => p.farmerId === farmerId);
  }

  async getAllPayouts(): Promise<Payout[]> {
    return Array.from(this.payouts.values());
  }

  async getAllPayments(): Promise<Payment[]> {
    return Array.from(this.payments.values());
  }

  // Escrow operations
  async createEscrow(insertEscrow: InsertEscrow): Promise<Escrow> {
    const id = randomUUID();
    const escrow: Escrow = {
      ...insertEscrow,
      id,
      upfrontPaymentId: insertEscrow.upfrontPaymentId ?? null,
      remainingPaymentId: insertEscrow.remainingPaymentId ?? null,
      upfrontHeldAt: null,
      remainingReleasedAt: null,
      disputedAt: null,
      disputeReason: null,
      disputeResolvedAt: null,
      disputeResolution: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.escrows.set(id, escrow);
    return escrow;
  }

  async getEscrowByOrder(orderId: string): Promise<Escrow | undefined> {
    return Array.from(this.escrows.values()).find(e => e.orderId === orderId);
  }

  async getEscrow(id: string): Promise<Escrow | undefined> {
    return this.escrows.get(id);
  }

  async updateEscrowStatus(id: string, status: string, updates?: Partial<Escrow>): Promise<Escrow | undefined> {
    const escrow = this.escrows.get(id);
    if (!escrow) return undefined;

    const now = new Date();
    const statusUpdates: Partial<Escrow> = { status, updatedAt: now };

    // Set timestamps based on status changes
    if (status === 'upfront_held' && !escrow.upfrontHeldAt) {
      statusUpdates.upfrontHeldAt = now;
    } else if (status === 'remaining_released' && !escrow.remainingReleasedAt) {
      statusUpdates.remainingReleasedAt = now;
    } else if (status === 'disputed' && !escrow.disputedAt) {
      statusUpdates.disputedAt = now;
    } else if (status === 'completed' && escrow.disputeResolvedAt === null) {
      statusUpdates.disputeResolvedAt = now;
    }

    const updated = { ...escrow, ...statusUpdates, ...updates };
    this.escrows.set(id, updated);
    return updated;
  }

  async getEscrowsByBuyer(buyerId: string): Promise<Escrow[]> {
    return Array.from(this.escrows.values()).filter(e => e.buyerId === buyerId);
  }

  async getEscrowsByFarmer(farmerId: string): Promise<Escrow[]> {
    return Array.from(this.escrows.values()).filter(e => e.farmerId === farmerId);
  }

  async getAllEscrows(): Promise<Escrow[]> {
    return Array.from(this.escrows.values());
  }

  // Transaction operations
  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = randomUUID();
    const transaction: Transaction = {
      ...insertTransaction,
      id,
      paystackReference: insertTransaction.paystackReference ?? null,
      completedAt: null,
      createdAt: new Date(),
      status: insertTransaction.status ?? 'pending',
    } as any;
    this.transactions.set(id, transaction);
    return transaction;
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByPaystackReference(reference: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(t => t.paystackReference === reference);
  }

  async updateTransactionStatus(id: string, status: string): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    const updated = { 
      ...transaction, 
      status,
      completedAt: status === 'completed' ? new Date() : transaction.completedAt
    } as Transaction;
    this.transactions.set(id, updated);
    return updated;
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;
    const updated: Transaction = { ...transaction, ...updates } as Transaction;
    // Ensure completedAt is set when status becomes completed
    if (updates.status === 'completed' && !updated.completedAt) {
      updated.completedAt = new Date();
    }
    this.transactions.set(id, updated);
    return updated;
  }

  // Removed updateTransactionReference in favor of the generic updateTransaction method

  // Cart operations
  async getCartItemsByBuyer(buyerId: string): Promise<CartItemWithListing[]> {
    const items = Array.from(this.cartItems.values()).filter(
      (item) => item.buyerId === buyerId
    );

    const result: CartItemWithListing[] = [];
    for (const item of items) {
      const listing = await this.getListingWithFarmer(item.listingId);
      if (listing) {
        // Listing already has sanitized farmer from getListingWithFarmer
        result.push({
          ...item,
          listing,
        });
      }
    }

    return result;
  }

  async getCartItem(id: string): Promise<CartItem | undefined> {
    return this.cartItems.get(id);
  }

  async addToCart(insertItem: InsertCartItem): Promise<CartItem> {
    const id = randomUUID();
    const item: CartItem = { 
      ...insertItem, 
      id,
      createdAt: new Date()
    };
    this.cartItems.set(id, item);
    return item;
  }

  async removeFromCart(id: string): Promise<boolean> {
    return this.cartItems.delete(id);
  }

  async updateCartQuantity(id: string, quantity: number): Promise<CartItem> {
    const item = this.cartItems.get(id);
    if (!item) {
      throw new Error("Cart item not found");
    }
    item.quantity = quantity;
    this.cartItems.set(id, item);
    return item;
  }

  async clearCart(buyerId: string): Promise<boolean> {
    const items = Array.from(this.cartItems.entries()).filter(
      ([_, item]) => item.buyerId === buyerId
    );
    items.forEach(([id]) => this.cartItems.delete(id));
    return true;
  }

  // Verification operations
  async getVerificationsByOfficer(officerId: string): Promise<Verification[]> {
    return Array.from(this.verifications.values()).filter(
      (v) => v.officerId === officerId
    );
  }

  async getVerificationByFarmer(farmerId: string): Promise<Verification | undefined> {
    return Array.from(this.verifications.values()).find(
      (v) => v.farmerId === farmerId
    );
  }

  async createVerification(insertVerification: InsertVerification): Promise<Verification> {
    const id = randomUUID();
    const verification: Verification = { 
      ...insertVerification,
      notes: insertVerification.notes ?? null,
      documentUrl: insertVerification.documentUrl ?? null,
      id,
      status: "pending",
      verifiedAt: null,
      createdAt: new Date()
    };
    this.verifications.set(id, verification);
    return verification;
  }

  async updateVerificationStatus(
    id: string, 
    status: string, 
    notes?: string
  ): Promise<Verification | undefined> {
    const verification = this.verifications.get(id);
    if (!verification) return undefined;

    const updated = { 
      ...verification, 
      status, 
      notes: notes || verification.notes,
      verifiedAt: status === "approved" ? new Date() : verification.verifiedAt
    };
    this.verifications.set(id, updated);

    // Update farmer verification status
    if (status === "approved") {
      await this.updateUser(verification.farmerId, { verified: true });
    }

    return updated;
  }
  async getAllVerifications(): Promise<Verification[]> {
    return Array.from(this.verifications.values());
  }
  // Notification operations
  async getNotificationsByUser(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA; // Newest first
      });
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter((n) => n.userId === userId && !n.read)
      .length;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const notification: Notification = {
      ...insertNotification,
      id,
      relatedId: insertNotification.relatedId ?? null,
      relatedType: insertNotification.relatedType ?? null,
      read: false,
      createdAt: new Date(),
    };
    this.notifications.set(id, notification);
    return notification;
  }

  async markNotificationRead(id: string): Promise<Notification | undefined> {
    const notification = this.notifications.get(id);
    if (!notification) return undefined;
    const updated = { ...notification, read: true };
    this.notifications.set(id, updated);
    return updated;
  }

  async markAllNotificationsRead(userId: string): Promise<boolean> {
    const userNotifications = Array.from(this.notifications.entries())
      .filter(([_, n]) => n.userId === userId && !n.read);
    
    userNotifications.forEach(([id, notification]) => {
      this.notifications.set(id, { ...notification, read: true });
    });
    
    return true;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  // Message operations
  async getMessagesBetweenUsers(userId1: string, userId2: string): Promise<MessageWithUsers[]> {
    const messages = Array.from(this.messages.values())
      .filter((m) => 
        (m.senderId === userId1 && m.receiverId === userId2) ||
        (m.senderId === userId2 && m.receiverId === userId1)
      )
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateA - dateB; // Oldest first for chat history
      });

    // Attach user details
    const messagesWithUsers: MessageWithUsers[] = [];
    for (const message of messages) {
      const sender = await this.getUser(message.senderId);
      const receiver = await this.getUser(message.receiverId);
      if (sender && receiver) {
        messagesWithUsers.push({
          ...message,
          sender,
          receiver,
        });
      }
    }
    return messagesWithUsers;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    // Get all messages where user is sender or receiver
    const userMessages = Array.from(this.messages.values())
      .filter((m) => m.senderId === userId || m.receiverId === userId)
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA; // Newest first
      });

    // Group by other user
    const conversationMap = new Map<string, Message[]>();
    for (const message of userMessages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, []);
      }
      conversationMap.get(otherUserId)!.push(message);
    }

    // Build conversation objects
    const conversations: Conversation[] = [];
    const conversationEntries = Array.from(conversationMap.entries());
    for (const [otherUserId, messages] of conversationEntries) {
      const otherUser = await this.getUser(otherUserId);
      if (!otherUser) continue;

      const lastMessage = messages[0]; // Already sorted newest first
      const unreadCount = messages.filter((m: Message) => 
        m.senderId === otherUserId && m.receiverId === userId && !m.read
      ).length;

      conversations.push({
        otherUser,
        lastMessage,
        unreadCount,
      });
    }

    return conversations;
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      listingId: insertMessage.listingId ?? null,
      read: false,
      moderated: false,
      moderationStatus: "pending",
      moderationReason: null,
      moderatedAt: null,
      moderatedBy: null,
      createdAt: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessageRead(id: string): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    const updated = { ...message, read: true };
    this.messages.set(id, updated);
    return updated;
  }

  async markConversationRead(userId: string, otherUserId: string): Promise<boolean> {
    const messagesToMark = Array.from(this.messages.entries())
      .filter(([_, m]) => 
        m.senderId === otherUserId && 
        m.receiverId === userId && 
        !m.read
      );

    messagesToMark.forEach(([id, message]) => {
      this.messages.set(id, { ...message, read: true });
    });

    return true;
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    return Array.from(this.messages.values())
      .filter((m) => m.receiverId === userId && !m.read)
      .length;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async updateMessage(id: string, updates: Partial<Message>): Promise<Message | undefined> {
    const message = this.messages.get(id);
    if (!message) return undefined;
    const updated = { ...message, ...updates };
    this.messages.set(id, updated);
    return updated;
  }

  async getMessagesByModerationStatus(status: string): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(
      (message) => message.moderationStatus === status
    );
  }

  // Pricing Tier Operations
  async getPricingTiersByListing(listingId: string): Promise<PricingTier[]> {
    return Array.from(this.pricingTiers.values())
      .filter((tier) => tier.listingId === listingId)
      .sort((a, b) => a.minQuantity - b.minQuantity);
  }

  async createPricingTier(insertTier: InsertPricingTier): Promise<PricingTier> {
    const id = randomUUID();
    const tier: PricingTier = {
      ...insertTier,
      id,
    };
    this.pricingTiers.set(id, tier);
    return tier;
  }

  async deletePricingTier(id: string): Promise<boolean> {
    return this.pricingTiers.delete(id);
  }

  // Review Operations
  async getReviewsByReviewee(revieweeId: string): Promise<ReviewWithUsers[]> {
    const reviews = Array.from(this.reviews.values())
      .filter((r) => r.revieweeId === revieweeId)
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

    const reviewsWithUsers: ReviewWithUsers[] = [];
    for (const review of reviews) {
      const reviewer = await this.getUser(review.reviewerId);
      const reviewee = await this.getUser(review.revieweeId);
      if (reviewer && reviewee) {
        reviewsWithUsers.push({
          ...review,
          reviewer,
          reviewee,
        });
      }
    }
    return reviewsWithUsers;
  }

  async getReviewsByOrder(orderId: string): Promise<ReviewWithUsers[]> {
    const reviews = Array.from(this.reviews.values())
      .filter((r) => r.orderId === orderId);

    const reviewsWithUsers: ReviewWithUsers[] = [];
    for (const review of reviews) {
      const reviewer = await this.getUser(review.reviewerId);
      const reviewee = await this.getUser(review.revieweeId);
      if (reviewer && reviewee) {
        reviewsWithUsers.push({
          ...review,
          reviewer,
          reviewee,
        });
      }
    }
    return reviewsWithUsers;
  }

  async getAllReviews(): Promise<ReviewWithUsers[]> {
    const reviews = Array.from(this.reviews.values())
      .sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0));

    const reviewsWithUsers: ReviewWithUsers[] = [];
    for (const review of reviews) {
      const reviewer = await this.getUser(review.reviewerId);
      const reviewee = await this.getUser(review.revieweeId);
      if (reviewer && reviewee) {
        reviewsWithUsers.push({
          ...review,
          reviewer,
          reviewee,
        });
      }
    }
    return reviewsWithUsers;
  }

  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = randomUUID();
    const review: Review = {
      ...insertReview,
      id,
      comment: insertReview.comment ?? null,
      approved: true,
      createdAt: new Date(),
    };
    this.reviews.set(id, review);
    return review;
  }

  async updateReview(id: string, updates: Partial<Review>): Promise<Review | undefined> {
    const review = this.reviews.get(id);
    if (!review) return undefined;
    const updated = { ...review, ...updates };
    this.reviews.set(id, updated);
    return updated;
  }

  async deleteReview(id: string): Promise<boolean> {
    return this.reviews.delete(id);
  }

  async getAverageRating(userId: string): Promise<{ average: number; count: number }> {
    const reviews = Array.from(this.reviews.values())
      .filter((r) => r.revieweeId === userId && r.approved);
    
    if (reviews.length === 0) {
      return { average: 0, count: 0 };
    }

    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    const average = sum / reviews.length;
    
    return {
      average: Math.round(average * 10) / 10, // Round to 1 decimal
      count: reviews.length,
    };
  }

  // Moderation stats operations
  async createModerationStat(insertStat: InsertModerationStat): Promise<ModerationStat> {
    const id = randomUUID();
    const stat: ModerationStat = {
      ...insertStat,
      id,
      totalPending: insertStat.totalPending ?? null,
      totalApproved: insertStat.totalApproved ?? null,
      totalRejected: insertStat.totalRejected ?? null,
      averageModerationTime: insertStat.averageModerationTime ?? null,
      createdAt: new Date(),
    };
    this.moderationStats.set(id, stat);
    return stat;
  }

  async getModerationStatsByDateRange(startDate: Date, endDate: Date): Promise<ModerationStat[]> {
    return Array.from(this.moderationStats.values())
      .filter(stat => stat.date >= startDate && stat.date <= endDate)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async getModerationStatsByContentType(contentType: string): Promise<ModerationStat[]> {
    return Array.from(this.moderationStats.values())
      .filter(stat => stat.contentType === contentType)
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async updateUserRole(userId: string, role: string): Promise<void> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }
    user.role = role;
  }

  // Cleanup method for testing
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
  }
}

export const storage = new MemStorage();
