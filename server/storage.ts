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
  type ListingWithFarmer,
  type OrderWithDetails,
  type CartItemWithListing,
  type MessageWithUsers,
  type ReviewWithUsers,
  type Conversation
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

  // Listing operations
  getAllListings(): Promise<Listing[]>;
  getListing(id: string): Promise<Listing | undefined>;
  getListingWithFarmer(id: string): Promise<ListingWithFarmer | undefined>;
  getAllListingsWithFarmer(): Promise<ListingWithFarmer[]>;
  getListingsByFarmer(farmerId: string): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  updateListing(id: string, updates: Partial<Listing>): Promise<Listing | undefined>;
  deleteListing(id: string): Promise<boolean>;

  // Order operations
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithDetails(id: string): Promise<OrderWithDetails | undefined>;
  getOrdersByBuyer(buyerId: string): Promise<OrderWithDetails[]>;
  getOrdersByFarmer(farmerId: string): Promise<OrderWithDetails[]>;
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
  getPayment(id: string): Promise<Payment | undefined>;
  updatePaymentStatus(id: string, status: string): Promise<Payment | undefined>;
  getPaymentByTransactionId(transactionId: string): Promise<Payment | undefined>;
  createPayout(payout: InsertPayout): Promise<Payout>;
  getPayout(id: string): Promise<Payout | undefined>;
  updatePayout(id: string, updates: Partial<Payout>): Promise<Payout | undefined>;
  getPayoutsByFarmer(farmerId: string): Promise<Payout[]>;
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
      bankAccount: (insertUser as any).bankAccount ?? null,
      paystackRecipientCode: (insertUser as any).paystackRecipientCode ?? null,
      resetToken: null,
      resetTokenExpiry: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
      verified: insertUser.role === "field_officer" ? true : false,
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
      status: "active",
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
}

export const storage = new MemStorage();
