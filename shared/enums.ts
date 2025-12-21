/**
 * Centralized enums for status values across the application
 * This prevents status value drift between code and schema
 */

// Order status values
export const OrderStatus = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  EXPIRED: "expired",
  DELIVERED: "delivered",
} as const;

export type OrderStatusType = typeof OrderStatus[keyof typeof OrderStatus];

// Payment status values
export const PaymentStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
  REFUNDED: "refunded",
  EXPIRED: "expired",
} as const;

export type PaymentStatusType = typeof PaymentStatus[keyof typeof PaymentStatus];

// Transaction status values
export const TransactionStatus = {
  PENDING: "pending",
  SUCCESS: "success",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type TransactionStatusType = typeof TransactionStatus[keyof typeof TransactionStatus];

// Payout/Withdrawal status values
export const PayoutStatus = {
  PENDING: "pending",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type PayoutStatusType = typeof PayoutStatus[keyof typeof PayoutStatus];

// Escrow status values
export const EscrowStatus = {
  PENDING: "pending",
  UPFRONT_HELD: "upfront_held",
  REMAINING_RELEASED: "remaining_released",
  RELEASED: "released",
  REFUNDED: "refunded",
  DISPUTED: "disputed",
  COMPLETED: "completed",
} as const;

export type EscrowStatusType = typeof EscrowStatus[keyof typeof EscrowStatus];

// Wallet transaction status
export const WalletTransactionStatus = {
  PENDING: "pending",
  COMPLETED: "completed",
  FAILED: "failed",
} as const;

export type WalletTransactionStatusType = typeof WalletTransactionStatus[keyof typeof WalletTransactionStatus];

// Listing status values
export const ListingStatus = {
  ACTIVE: "active",
  SOLD_OUT: "sold_out",
  INACTIVE: "inactive",
} as const;

export type ListingStatusType = typeof ListingStatus[keyof typeof ListingStatus];

// Moderation status values
export const ModerationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type ModerationStatusType = typeof ModerationStatus[keyof typeof ModerationStatus];

// Verification status values
export const VerificationStatus = {
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
} as const;

export type VerificationStatusType = typeof VerificationStatus[keyof typeof VerificationStatus];

// User roles
export const UserRole = {
  FARMER: "farmer",
  BUYER: "buyer",
  FIELD_OFFICER: "field_officer",
  ADMIN: "admin",
} as const;

export type UserRoleType = typeof UserRole[keyof typeof UserRole];

// Wallet transaction types
export const WalletTransactionType = {
  CREDIT: "credit",
  DEBIT: "debit",
} as const;

export type WalletTransactionTypeValue = typeof WalletTransactionType[keyof typeof WalletTransactionType];
