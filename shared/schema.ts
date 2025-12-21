import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, json } from "drizzle-orm/pg-core";
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
  // Email verification
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: text("email_verification_token"),
  emailVerificationExpiry: timestamp("email_verification_expiry"),
  businessName: text("business_name"), // for buyers
  farmSize: text("farm_size"), // for farmers
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow(),
  // Wallet
  walletBalance: decimal("wallet_balance", { precision: 10, scale: 2 }).default("0.00"),
});

// Postgres session storage table (connect-pg-simple)
// Note: this table is created via a Drizzle SQL migration in `drizzle/migrations/0001_create_sessions.sql`.
// Keeping it in the schema prevents `drizzle-kit push` from treating it as an extra table to drop.
export const sessions = pgTable("session", {
  sid: varchar("sid").primaryKey(),
  sess: json("sess").notNull(),
  expire: timestamp("expire").notNull(),
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
  status: text("status").default("pending"), // pending, accepted, rejected, completed, cancelled, expired
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
  status: text("status").default("pending"), // pending, completed, failed, refunded, expired
  createdAt: timestamp("created_at").defaultNow(),
});

// Payouts (Legacy - kept for history, replaced by Withdrawals)
export const payouts = pgTable("payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, processing, completed, failed
  transactionId: text("transaction_id"), // Paystack transfer code
  mobileNumber: text("mobile_number"),
  mobileNetwork: text("mobile_network"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Transactions (for combined payments)
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  reference: text("reference").notNull().unique(),
  buyerId: varchar("buyer_id").references(() => users.id), // Added to match DB constraint
  amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, success, completed, failed
  metadata: text("metadata"), // JSON string
  createdAt: timestamp("created_at").defaultNow(),
});

// Moderation stats
export const moderationStats = pgTable("moderation_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  moderatorId: varchar("moderator_id").notNull().references(() => users.id),
  approvedCount: integer("approved_count").default(0),
  rejectedCount: integer("rejected_count").default(0),
  lastReset: timestamp("last_reset").defaultNow(),
});

// Notifications
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // order_update, system, etc
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  relatedId: text("related_id"), // ID of related entity (order, listing, etc)
  relatedType: text("related_type"), // type of related entity
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  receiverId: varchar("receiver_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  listingId: varchar("listing_id").references(() => listings.id),
  read: boolean("read").default(false),
  // Content moderation fields
  moderated: boolean("moderated").default(false),
  moderationStatus: text("moderation_status").default("pending"), // pending, approved, rejected
  moderationReason: text("moderation_reason"),
  moderatedAt: timestamp("moderated_at"),
  moderatedBy: varchar("moderated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// Reviews
export const reviews = pgTable("reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  reviewerId: varchar("reviewer_id").notNull().references(() => users.id), // Buyer
  revieweeId: varchar("reviewee_id").notNull().references(() => users.id), // Farmer
  listingId: varchar("listing_id").references(() => listings.id),
  rating: integer("rating").notNull(), // 1-5
  comment: text("comment"),
  approved: boolean("approved").default(false), // Simple approval for reviews
  createdAt: timestamp("created_at").defaultNow(),
});

// Farmer Verification Requests
export const verifications = pgTable("verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  officerId: varchar("officer_id").references(() => users.id), // Assigned field officer
  status: text("status").default("pending"), // pending, approved, rejected
  notes: text("notes"), // Officer's notes or rejection reason
  documentUrl: text("document_url"), // URL to uploaded verification document
  submittedAt: timestamp("submitted_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
});

// Escrow Records
export const escrow = pgTable("escrow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").notNull().references(() => orders.id),
  buyerId: varchar("buyer_id").notNull().references(() => users.id),
  farmerId: varchar("farmer_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  upfrontAmount: decimal("upfront_amount", { precision: 10, scale: 2 }).notNull(),
  remainingAmount: decimal("remaining_amount", { precision: 10, scale: 2 }).notNull(),
  upfrontPaymentId: varchar("upfront_payment_id").references(() => payments.id),
  remainingPaymentId: varchar("remaining_payment_id").references(() => payments.id),
  status: text("status").default("pending"), // pending, upfront_held, remaining_released, released, refunded, disputed, completed
  upfrontHeldAt: timestamp("upfront_held_at"),
  remainingReleasedAt: timestamp("remaining_released_at"),
  disputedAt: timestamp("disputed_at"),
  disputeReason: text("dispute_reason"),
  disputeResolvedAt: timestamp("dispute_resolved_at"),
  disputeResolution: text("dispute_resolution"), // buyer, farmer, split
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wallet Transactions
export const walletTransactions = pgTable("wallet_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // "credit" | "debit"
  description: text("description").notNull(),
  referenceId: text("reference_id"), // orderId or withdrawalId
  referenceType: text("reference_type"), // "order" | "withdrawal"
  status: text("status").default("completed"), // pending, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Withdrawals
export const withdrawals = pgTable("withdrawals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").default("pending"), // pending, processing, completed, failed
  recipientCode: text("recipient_code"),
  mobileNumber: text("mobile_number"),
  mobileNetwork: text("mobile_network"),
  transactionId: text("transaction_id"), // Paystack transfer code
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow(),
  processedAt: timestamp("processed_at"),
});

// Export insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  verified: true,
  resetToken: true,
  resetTokenExpiry: true,
  walletBalance: true,
  emailVerified: true,
  emailVerificationToken: true,
  emailVerificationExpiry: true,
});

export const insertListingSchema = createInsertSchema(listings).omit({
  id: true,
  createdAt: true,
  moderated: true,
  moderationStatus: true,
  moderationReason: true,
  moderatedAt: true,
  moderatedBy: true
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true
});

export const insertCartItemSchema = createInsertSchema(cartItems).omit({
  id: true,
  createdAt: true
});

export const insertPricingTierSchema = createInsertSchema(pricingTiers).omit({
  id: true
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
  read: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  read: true
});

export const insertReviewSchema = createInsertSchema(reviews).omit({
  id: true,
  createdAt: true
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  status: true
});

export const insertPayoutSchema = createInsertSchema(payouts).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  status: true,
  transactionId: true
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true
});

export const insertModerationStatSchema = createInsertSchema(moderationStats).omit({
  id: true,
  lastReset: true
});

export const insertVerificationSchema = createInsertSchema(verifications).omit({
  id: true,
  submittedAt: true,
  reviewedAt: true,
  status: true
});

export const insertEscrowSchema = createInsertSchema(escrow).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({
  id: true,
  createdAt: true
});

export const insertWithdrawalSchema = createInsertSchema(withdrawals).omit({
  id: true,
  createdAt: true,
  processedAt: true,
  status: true,
  transactionId: true
});

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Listing = typeof listings.$inferSelect;
export type InsertListing = z.infer<typeof insertListingSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type PricingTier = typeof pricingTiers.$inferSelect;
export type InsertPricingTier = z.infer<typeof insertPricingTierSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Review = typeof reviews.$inferSelect;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payout = typeof payouts.$inferSelect;
export type InsertPayout = z.infer<typeof insertPayoutSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type ModerationStat = typeof moderationStats.$inferSelect;
export type InsertModerationStat = z.infer<typeof insertModerationStatSchema>;
export type Verification = typeof verifications.$inferSelect;
export type InsertVerification = z.infer<typeof insertVerificationSchema>;
export type Escrow = typeof escrow.$inferSelect;
export type InsertEscrow = z.infer<typeof insertEscrowSchema>;
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = z.infer<typeof insertWithdrawalSchema>;

// Extended types for joins
export type ListingWithFarmer = Listing & { farmer: Omit<User, "password"> };
export type OrderWithDetails = Order & {
  listing: Listing;
  farmer: Omit<User, "password">;
  buyer: Omit<User, "password">;
};
export type CartItemWithListing = CartItem & {
  listing: Listing & { farmer: Omit<User, "password"> }
};
export type MessageWithUsers = Message & {
  sender: Omit<User, "password">;
  receiver: Omit<User, "password">;
};
export type ReviewWithUsers = Review & {
  reviewer: Omit<User, "password">;
  reviewee: Omit<User, "password">;
};
export type UserWithRating = Omit<User, "password"> & {
  averageRating?: number;
  reviewCount?: number;
};
export type Conversation = {
  otherUser: Omit<User, "password">;
  lastMessage: Message;
  unreadCount: number;
};
