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
  type ListingWithFarmer,
  type OrderWithDetails,
  type CartItemWithListing
} from "@shared/schema";
import { randomUUID } from "crypto";

// Storage interface with all CRUD operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
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
  clearCart(buyerId: string): Promise<boolean>;

  // Verification operations
  getVerificationsByOfficer(officerId: string): Promise<Verification[]>;
  getVerificationByFarmer(farmerId: string): Promise<Verification | undefined>;
  createVerification(verification: InsertVerification): Promise<Verification>;
  updateVerificationStatus(id: string, status: string, notes?: string): Promise<Verification | undefined>;

  // Pricing tier operations
  getPricingTiersByListing(listingId: string): Promise<PricingTier[]>;
  createPricingTier(tier: InsertPricingTier): Promise<PricingTier>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private listings: Map<string, Listing>;
  private orders: Map<string, Order>;
  private cartItems: Map<string, CartItem>;
  private verifications: Map<string, Verification>;
  private pricingTiers: Map<string, PricingTier>;

  constructor() {
    this.users = new Map();
    this.listings = new Map();
    this.orders = new Map();
    this.cartItems = new Map();
    this.verifications = new Map();
    this.pricingTiers = new Map();

    // Seed data for testing
    this.seedData();
  }

  private async seedData() {
    // Create sample farmers (using plain password for demo - will be hashed by routes)
    // Note: In real implementation, passwords would be hashed here too
    const hashedPass = "$2a$10$YourHashedPasswordHere"; // Placeholder - routes will hash properly
    
    const farmer1 = await this.createUser({
      email: "farmer1@test.com",
      password: hashedPass, // Will be replaced with actual hash on first real user
      fullName: "John Farmer",
      role: "farmer",
      region: "North Region",
      phone: "+1234567890",
      farmSize: "10 acres",
      verified: true,
    });

    const farmer2 = await this.createUser({
      email: "farmer2@test.com",
      password: hashedPass,
      fullName: "Sarah Green",
      role: "farmer",
      region: "South Region",
      phone: "+1234567891",
      farmSize: "5 acres",
      verified: true,
    });

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
      farmerId: farmer1.id,
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
      farmerId: farmer1.id,
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

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    // Password should already be hashed by the caller
    const user: User = { 
      ...insertUser, 
      id,
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
        // Remove password from farmer
        const { password, ...safeFarmer } = farmer;
        result.push({
          ...listing,
          farmer: safeFarmer as any,
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

  // Pricing tier operations
  async getPricingTiersByListing(listingId: string): Promise<PricingTier[]> {
    return Array.from(this.pricingTiers.values()).filter(
      (tier) => tier.listingId === listingId
    );
  }

  async createPricingTier(insertTier: InsertPricingTier): Promise<PricingTier> {
    const id = randomUUID();
    const tier: PricingTier = { ...insertTier, id };
    this.pricingTiers.set(id, tier);
    return tier;
  }
}

export const storage = new MemStorage();
