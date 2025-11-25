import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users with role-based authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  fullName: text("full_name").notNull(),
  role: text("role").notNull(), // "farmer" | "buyer" | "field_officer" | "admin"
  phone: text("phone"),
  region: text("region"),
  // Mobile money details
  mobileNumber: text("mobile_number"),
  mobileNetwork: text("mobile_network"),
  paystackRecipientCode: text("paystack_recipient_code"),
  // security fields for account lockouts
  failedLoginAttempts: integer("failed_login_attempts").default(0),
  lockedUntil: timestamp("locked_until"),
  verified: boolean("verified").default(false),
  isActive: boolean("is_active").default(true), // Account active status for admin management
  businessName: text("business_name"), // for buyers
  farmSize: text("farm_size"), // for farmers
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Product listings
export const listings = pgTable("listings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  productName: text("product_name").notNull(),
  category: text("category").notNull(), // Content category for better organization
  subcategory: text("subcategory"), // Optional subcategory
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull(), // kg, tons, boxes, etc
  quantityAvailable: integer("quantity_available").notNull(),
  minOrderQuantity: integer("min_order_quantity").notNull(),
  harvestDate: text("harvest_date"),
  location: text("location").notNull(),
  imageUrl: text("image_url"),
  status: text("status").default("active"), // active, sold_out, inactive
  // Content moderation fields
  moderated: boolean("moderated").default(false), // Whether admin has reviewed this listing
  moderationStatus: text("moderation_status").default("pending"), // pending, approved, rejected
  moderationReason: text("moderation_reason"), // Reason for rejection if applicable
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: varchar("moderated_by").references(() => users.id), // Admin who moderated
  createdAt: timestamp("created_at").defaultNow(),
});

// Bulk pricing tiers
export const pricingTiers = pgTable("pricing_tiers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  minQuantity: integer("min_quantity").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

// Orders
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  quantity: integer("quantity").notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, accepted, rejected, completed, cancelled
  deliveryAddress: text("delivery_address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").notNull().references(() => listings.id),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Payments
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  payerId: varchar("payer_id").notNull().references(() => users.id),
  transactionId: varchar("transaction_id").references(() => transactions.id), // Link to transaction for combined payments
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  paystackReference: text("paystack_reference"), // Individual payment reference
  status: text("status").default("pending"), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow(),
});

// Transactions (for combined payments)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"),
  paystackReference: text("paystack_reference"),
  status: text("status").default("pending"), // pending, completed, failed, refunded
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, processing, completed, failed
  // Allow either bank or mobile number as a payout destination
  bankAccount: text("bank_account"),
  mobileNumber: text("mobile_number"),
  mobileNetwork: text("mobile_network"),
  scheduledDate: timestamp("scheduled_date"),
  completedAt: timestamp("completed_at"),
  adminNote: text("admin_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Field officer verification records
export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  officerId: varchar("officer_id").notNull().references(() => users.id),
  status: text("status").default("pending"), // pending, approved, rejected
  notes: text("notes"),
  documentUrl: text("document_url"),
  verifiedAt: timestamp("verified_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // order_update, new_listing, price_change, verification_update, message
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedId: varchar("related_id"), // ID of related order, listing, etc.
  relatedType: text("related_type"), // order, listing, verification, etc.
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages/Conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  listingId: varchar("listing_id").references(() => listings.id), // Optional: context for the conversation
  content: text("content").notNull(),
  read: boolean("read").default(false),
  // Content moderation fields
  moderated: boolean("moderated").default(false), // Whether admin has reviewed this message
  moderationStatus: text("moderation_status").default("approved"), // approved, rejected, flagged
  moderationReason: text("moderation_reason"), // Reason for moderation action
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: varchar("moderated_by").references(() => users.id), // Admin who moderated
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id),
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  approved: boolean("approved").default(true), // Admin moderation
  createdAt: timestamp("created_at").defaultNow(),
});

// Moderation analytics and statistics
export const moderationStats = pgTable("moderation_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  date: timestamp("date").notNull(), // Date for the stats
  contentType: text("content_type").notNull(), // 'listing', 'message', 'review'
  totalPending: integer("total_pending").default(0),
  totalApproved: integer("total_approved").default(0),
  totalRejected: integer("total_rejected").default(0),
  averageModerationTime: integer("average_moderation_time"), // in minutes
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  verified: true,
  // TODO: These are managed server-side
  failedLoginAttempts: true,
  lockedUntil: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  status: true,
  moderated: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedAt: true,
  moderatedBy: true,
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  createdAt: true,
  verifiedAt: true,
  status: true,
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  read: true,
  moderated: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedAt: true,
  moderatedBy: true,
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true,
  approved: true,
}).extend({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
});

export const insertModerationStatSchema = createInsertSchema(moderationStats).omit({
  id: true,
  createdAt: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  status: true,
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;

export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;

export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;

export type ModerationStat = typeof moderationStats.$inferSelect;
export type InsertModerationStat = z.infer<typeof insertModerationStatSchema>;

// Extended types for frontend
export type ListingWithFarmer = Listing & {
  farmer: UserWithRating;
  pricingTiers?: PricingTier[];
};

export type OrderWithDetails = Order & {
  listing: Listing;
  farmer: UserWithRating;
  buyer: UserWithRating;
};

export type CartItemWithListing = CartItem & {
  listing: ListingWithFarmer;
};

export type MessageWithUsers = Message & {
  sender: User;
  receiver: User;
};

export type Conversation = {
  otherUser: User;
  lastMessage: Message;
  unreadCount: number;
};

export type ReviewWithUsers = Review & {
  reviewer: User;
  reviewee: User;
  order?: OrderWithDetails;
};

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;

export type UserWithRating = User & {
  averageRating?: number;
  reviewCount?: number;
};
