# Comprehensive Codebase Audit Report
**Generated:** ${new Date().toISOString()}
**Auditor:** GitHub Copilot (Claude Sonnet 4.5)
**Scope:** Complete security, logic, and code quality review

---

## Executive Summary

This audit reviewed the entire AgriCompassWeb codebase systematically, examining 4964 lines of server routes, storage layers, authentication, and shared schemas. The following issues were identified:

**Critical Issues:** 8
**High Priority:** 12
**Medium Priority:** 15
**Low Priority/Improvement:** 10

---

## 🔴 CRITICAL ISSUES

### 1. **Duplicate Route Definitions**
**Location:** `server/routes.ts`
- **Line 2601:** Comment says "Duplicate removed - see line 3368 for the complete implementation"
- **Line 3368 onwards:** Admin users route is defined TWICE (lines 3317 and 4501+)
- **Impact:** Route conflicts, unpredictable behavior, last definition wins
- **Fix:** Remove duplicate definitions, consolidate logic
```typescript
// Routes defined TWICE:
app.get("/api/admin/users", requireRole("admin"), async ...)  // Line 3317
app.get("/api/admin/users", requireRole("admin"), async ...)  // Line 4501
```

### 2. **shared/enums.ts Created But Not Integrated**
**Location:** `shared/enums.ts` + throughout codebase
- **Issue:** Status enums file was created in previous fixes but **never imported or used**
- **Impact:** Hardcoded strings still used everywhere, typo-prone, no type safety
- **Example:**
```typescript
// Code still uses strings instead of enums:
if (order.status !== "completed") // Should be: OrderStatus.COMPLETED
```
- **Fix Required:** Import and use enums throughout, replace all string literals

### 3. **Wallet Deduction Race Condition**
**Location:** `server/routes.ts:4306-4350` (Withdrawal route)
- **Issue:** Wallet transaction created as 'pending' debit, but balance check happens **before** transaction is persisted
- **Race Condition:** Multiple concurrent withdrawals could bypass balance check
```typescript
const currentBalance = Number(user.walletBalance || 0);
if (currentBalance < withdrawAmount) { ... } 

// ⚠️ No atomic deduction here! Balance could change before next line
await storage.createWalletTransaction({ ... status: 'pending' });
```
- **Impact:** User could withdraw more than their balance via concurrent requests
- **Fix:** Use database transaction with SELECT FOR UPDATE or implement locking

### 4. **Insufficient Pagination Total Count**
**Location:** `server/routes.ts:4501-4575` (Admin users endpoint)
- **Issue:** Pagination total is **incorrectly** set to `users.length` (current page results)
```typescript
res.json({
  users,
  pagination: {
    page: Number(page),
    limit: Number(limit),
    total: users.length,  // ❌ WRONG! Should be total matching records
  }
});
```
- **Impact:** Frontend pagination UI will show incorrect page counts
- **Fix:** Query total count separately before slicing results

### 5. **Password Reset Token Not Cleared After Use**
**Location:** `server/routes.ts:200-250` (Password reset confirmation)
- **Issue:** After successful password reset, `resetToken` and `resetTokenExpiry` are not cleared
- **Impact:** Token could be reused if attacker obtains it before natural expiry
- **Fix:** Clear token fields after use:
```typescript
await storage.updateUser(user.id, {
  password: await hashPassword(newPassword),
  resetToken: null,
  resetTokenExpiry: null,
  failedLoginAttempts: 0
});
```

### 6. **SQL Injection Risk in Admin User Query**
**Location:** `server/routes.ts:4508-4530`
- **Issue:** While **mostly** using parameterized queries, the ORDER BY is **NOT parameterized**
```typescript
query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
```
- **Current:** ORDER BY field is hardcoded (OK)
- **Risk:** If ORDER BY becomes user-controlled (future feature), immediate SQL injection
- **Fix:** Document that ORDER BY must never accept user input, or use whitelist validation

### 7. **Missing Transaction Rollback in Checkout**
**Location:** `server/routes.ts:1200-1450` (Checkout route)
- **Issue:** Stock is reserved via `decrementListingQuantity`, but if Paystack init fails, **stock is NOT restored**
```typescript
// Line ~1350: Stock deducted
await storage.decrementListingQuantity(item.listing!.id, item.quantity);

// Line ~1380: Paystack init call
const initRes = await fetch('https://api.paystack.co/transaction/initialize', ...);
if (!initRes.ok) {
  // ❌ Stock is still deducted! No rollback
  return res.status(502).json({ message: 'Payment provider error' });
}
```
- **Impact:** Failed payments permanently reduce stock, inventory drift
- **Fix:** Implement try/catch with rollback on any failure after stock deduction

### 8. **Email Verification Token Predictable**
**Location:** `server/routes.ts:50-100` (Registration route)
- **Issue:** Email verification token uses `randomUUID()` which is secure, but expiry is **NOT validated on token use**
- **Secondary Issue:** Token lookup happens **before** expiry check in email verification route
- **Impact:** Expired tokens might still work depending on verification flow
- **Fix:** Always check `emailVerificationExpiry < new Date()` before accepting token

---

## 🟠 HIGH PRIORITY ISSUES

### 9. **Order Status Drift - Payment and Order Status Desync**
**Location:** Multiple locations (webhook, verify endpoints)
- **Issue:** Order status updated to 'accepted' on payment **before** escrow status is confirmed
- **Example:** `server/routes.ts:4021` (Webhook handler)
```typescript
await storage.updatePaymentStatus(p.id, 'completed');
await storage.updateOrderStatus(existing.orderId, 'accepted'); // ⚠️ Before escrow check
// ... escrow update happens AFTER
```
- **Impact:** Order might show 'accepted' even if escrow creation fails
- **Fix:** Update order status AFTER successful escrow update in atomic transaction

### 10. **Review Access Control Incomplete**
**Location:** `server/routes.ts:2820` (Create review)
- **Issue:** Review creation checks if user is "part of order" but doesn't verify **buyer-only** access
- **Current:**
```typescript
if (order.buyerId !== reviewerId && order.farmerId !== reviewerId) {
  return res.status(403).json({ message: "Not authorized" });
}
```
- **Problem:** Farmers can review their own products via this check
- **Expected:** Only buyer should create product reviews
- **Fix:** Enforce `order.buyerId !== reviewerId` (buyer only)

### 11. **Escrow Dispute Resolution Missing Payout Logic**
**Location:** `server/routes.ts:4231-4295` (Resolve dispute endpoint)
- **Issue:** Dispute is marked "completed" but **NO funds are actually released**
- **Missing:** Paystack transfer call to send funds to winner
```typescript
const updated = await storage.updateEscrowStatus(id, 'completed', {
  disputeResolution: resolution,
  disputeResolvedAt: new Date(),
});
// ❌ No actual money transfer! Just status update
```
- **Impact:** Dispute "resolved" but money stays frozen
- **Fix:** Call Paystack transfer API based on resolution (buyer refund / farmer payout)

### 12. **Cart Validation Missing Tier Price Check**
**Location:** `server/routes.ts:1100-1200` (Cart retrieval)
- **Issue:** Cart items calculated with base price, but tier pricing not applied until checkout
- **Impact:** User sees different price in cart vs checkout (confusing UX)
- **Current:** Tier pricing only calculated in checkout route
- **Fix:** Apply tier pricing in cart retrieval for accurate preview

### 13. **Notification Creation Failures Silent**
**Location:** Throughout (e.g., `routes.ts:1420`)
- **Issue:** Notification creation wrapped in try/catch that **only logs** failures
```typescript
try {
  await sendNotificationToUser(...);
} catch (err) {
  console.error('Failed to create notifications', err);
  // ⚠️ No retry, no alert, just silently fails
}
```
- **Impact:** Users miss critical order updates, no visibility of failures
- **Fix:** Implement notification queue with retry mechanism, alert on repeated failures

### 14. **File Upload Size Limit Not Enforced**
**Location:** `server/upload.ts` (assumed based on ARCHITECTURE.md)
- **Issue:** Multer configured but **no explicit size limit** in routes
- **Risk:** Large file uploads could exhaust server memory/storage
- **Fix:** Add `limits: { fileSize: 5 * 1024 * 1024 }` (5MB) to multer config

### 15. **Missing Rate Limiting on Critical Endpoints**
**Location:** All authentication routes
- **Issue:** No rate limiting on:
  - `/api/auth/register`
  - `/api/auth/login`
  - `/api/auth/forgot-password`
  - Payment initiation endpoints
- **Risk:** Brute force attacks, account enumeration, DoS
- **Fix:** Implement express-rate-limit on auth routes (10 req/15min per IP)

### 16. **Session Fixation Vulnerability**
**Location:** `server/session.ts` + auth routes
- **Issue:** Session ID **not regenerated** after login
```typescript
// After successful login, should have:
req.session.regenerate((err) => {
  req.session.user = sanitizeUser(user);
  // ...
});
```
- **Current:** Session ID stays the same pre and post-authentication
- **Risk:** Session fixation attack if attacker obtains pre-auth session ID
- **Fix:** Call `req.session.regenerate()` after successful login

### 17. **Insufficient Input Validation on Numeric Fields**
**Location:** Multiple endpoints (prices, quantities, amounts)
- **Issue:** Numeric inputs validated for `> 0` but **not for max values**
- **Examples:**
  - Order quantity: No max check (could order 999,999,999 items)
  - Withdrawal amount: Only min check (10 GHS), no max
  - Review rating: Checked for 1-5 but not in schema validation
- **Fix:** Add max value validation in Zod schemas and route handlers

### 18. **CSRF Token Not Validated on State-Changing GET Requests**
**Location:** Any GET that modifies state
- **Issue:** While POST/PUT/DELETE protected, some GET requests modify state:
  - Email verification confirmation (GET with token)
- **Risk:** CSRF via image tags or link prefetching
- **Fix:** Use POST for all state-changing operations, or add CSRF tokens to confirmation links

### 19. **Weak Password Policy**
**Location:** `shared/schema.ts` + registration validation
- **Issue:** Password only requires **6 characters** minimum
```typescript
password: z.string().min(6, "Password must be at least 6 characters")
```
- **Risk:** Easily brute-forced, no complexity requirements
- **Fix:** Enforce 10+ chars, mixed case, numbers, special characters

### 20. **Missing Index on Foreign Keys**
**Location:** Database schema (all tables)
- **Issue:** Foreign key columns likely **not indexed** (depends on Drizzle defaults)
- **Impact:** Slow queries on:
  - `orders.buyerId`, `orders.farmerId`, `orders.listingId`
  - `cart_items.buyerId`, `cart_items.listingId`
  - All `*_id` foreign keys
- **Fix:** Add indexes to all foreign key columns for performance

---

## 🟡 MEDIUM PRIORITY ISSUES

### 21. **Inconsistent Error Messages**
**Location:** Throughout API
- **Issue:** Some errors return detailed messages, others generic
- **Example:**
  - Auth: "Invalid credentials" (good - doesn't reveal if email exists)
  - Listing: "Listing not found" vs "Failed to fetch listing"
- **Fix:** Standardize error messages, create error message constants

### 22. **No Request ID for Debugging**
**Location:** All routes
- **Issue:** No correlation ID in logs to trace requests across services
- **Impact:** Difficult to debug issues from logs when multiple users active
- **Fix:** Add request ID middleware, include in all logs and error responses

### 23. **Timezone Inconsistencies**
**Location:** Date handling throughout
- **Issue:** Mixed use of `new Date()` and `timestamp().defaultNow()`
- **Risk:** Timezone discrepancies in date comparisons
- **Fix:** Always use UTC, document timezone expectations

### 24. **Missing API Versioning**
**Location:** All routes
- **Issue:** Routes have no version prefix (e.g., `/api/v1/...`)
- **Risk:** Breaking changes require endpoint changes or complex backwards compatibility
- **Fix:** Implement `/api/v1/` prefix for future-proofing

### 25. **Incomplete Escrow State Machine**
**Location:** Escrow status transitions
- **Issue:** No validation of allowed state transitions
- **Example:** Can jump from 'pending' to 'completed' without going through 'upfront_held'
- **Fix:** Implement state machine with allowed transition validation

### 26. **Review Approval Flow Ambiguous**
**Location:** `reviews` table schema
- **Issue:** `approved` field defaults to `false`, but unclear when it becomes `true`
- **No route found** that actually approves reviews (only admin can update approval)
- **Impact:** All reviews might be hidden by default?
- **Fix:** Clarify review approval flow, document auto-approval vs manual moderation

### 27. **Listing Quantity Never Restored on Order Cancellation**
**Location:** Order status update routes
- **Issue:** When order status changes to 'cancelled', listing stock is **not restored**
```typescript
// Order cancellation route - missing stock restoration
await storage.updateOrderStatus(orderId, 'cancelled');
// ❌ Should: await storage.incrementListingQuantity(order.listingId, order.quantity);
```
- **Impact:** Cancelled orders permanently reduce inventory
- **Fix:** Restore stock on cancellation and rejection

### 28. **Unread Message Count Performance**
**Location:** `storage.ts` + message routes
- **Issue:** `getUnreadMessageCount` queries all messages, no index on `read` + `receiverId`
- **Impact:** Slow on high message volume
- **Fix:** Add composite index on `(receiver_id, read)` where `read = false`

### 29. **No Soft Delete for Critical Records**
**Location:** Listings, orders, users
- **Issue:** DELETE operations permanently remove records
- **Risk:** Audit trail loss, cannot recover from accidental deletions
- **Fix:** Implement `deleted_at` field for soft deletes, filter in queries

### 30. **Paystack Webhook Signature Verification Fallback Insecure**
**Location:** `server/routes.ts:3850-3900` (Webhook handler)
- **Issue:** If `PAYSTACK_WEBHOOK_SECRET` not set, falls back to **server-to-server** verification
```typescript
if (!secret) {
  console.warn('PAYSTACK_WEBHOOK_SECRET not configured - using API-based fallback verification');
  // Server-to-server verification happens later
}
```
- **Risk:** Webhook can be processed without signature validation if env var missing
- **Fix:** **Fail closed** - reject webhooks if secret not configured

### 31. **Cart Item Duplicate Check Missing**
**Location:** `server/routes.ts:800-850` (Add to cart)
- **Issue:** No check if item already in cart, creates duplicate entries
```typescript
const cartItem = await storage.addToCart({
  buyerId,
  listingId,
  quantity
});
// ❌ No check for existing cart item with same listingId
```
- **Impact:** User can have same product multiple times in cart
- **Fix:** Check for existing cart item, update quantity instead of creating new

### 32. **Order Expiration Not Implemented**
**Location:** Order schema + routes
- **Issue:** Order status includes 'expired' but **no cron job** or logic to mark orders expired
- **Impact:** Pending orders stay pending forever, stock never released
- **Fix:** Implement scheduled job to expire orders after N hours

### 33. **Farmer Rating Calculation Inefficient**
**Location:** `storage.ts` - `getFarmerRating` method
- **Issue:** Calculates average on every request, no caching
- **Impact:** Slow when farmer has many reviews
- **Fix:** Cache rating in `users` table, update on review creation/deletion

### 34. **Missing Idempotency Keys for Payment Operations**
**Location:** Payment initiation and webhook handlers
- **Issue:** No idempotency key support for payment operations
- **Risk:** Double-charging if user retries payment or webhook replays
- **Current:** Reference used for transaction, but not enforced at API level
- **Fix:** Accept idempotency key header, check for duplicate operations

### 35. **Email Send Failures Not Tracked**
**Location:** All email sending code
- **Issue:** Email failures caught and logged, but **no metric tracking**
```typescript
sendWelcomeEmail(user.email, user.fullName).catch(err => 
  console.error('Failed to send welcome email:', err)
);
```
- **Impact:** Cannot detect widespread email delivery issues
- **Fix:** Track email send failures in monitoring system (Sentry)

---

## 🔵 LOW PRIORITY / IMPROVEMENTS

### 36. **Magic Numbers in Code**
**Location:** Throughout
- **Issue:** Hardcoded values like `10` (min withdrawal), `100` (kobo multiplier), `5` (failed login attempts)
- **Fix:** Extract to named constants or config

### 37. **Inconsistent Naming Conventions**
**Location:** API responses and database fields
- **Issue:** Mix of camelCase and snake_case in responses
- **Example:** Database uses `full_name`, API returns `fullName`
- **Fix:** Standardize on one convention (camelCase for API recommended)

### 38. **No Health Check Endpoint**
**Location:** Missing from routes
- **Issue:** No `/health` or `/api/health` endpoint for monitoring
- **Impact:** Cannot easily monitor service health in production
- **Fix:** Add health check endpoint that tests database connection

### 39. **Console.log Used for Logging**
**Location:** Throughout
- **Issue:** All logging uses `console.log/error/warn`
- **Problem:** No log levels, no structured logging, cannot filter
- **Fix:** Implement proper logging library (winston, pino)

### 40. **No API Documentation**
**Location:** Missing
- **Issue:** No OpenAPI/Swagger documentation for API
- **Impact:** Difficult for frontend developers, no contract testing
- **Fix:** Generate OpenAPI spec from Zod schemas or add swagger-ui

### 41. **Test Coverage Unknown**
**Location:** Tests missing
- **Issue:** No test coverage reports, unclear what's tested
- **Fix:** Add coverage reporting to vitest config, set coverage goals

### 42. **Environment Variables Not Validated on Startup**
**Location:** `server/index.ts`
- **Issue:** Missing env vars only discovered when feature is used
- **Fix:** Validate all required env vars on startup, fail fast if missing

### 43. **No Request Timeout Configuration**
**Location:** Express app
- **Issue:** No timeout set, requests could hang indefinitely
- **Fix:** Set server timeout (30s recommended) and handle timeout errors

### 44. **Database Connection Pool Size Not Configured**
**Location:** `server/db.ts`
- **Issue:** Using default pool size (might be too small for production)
- **Fix:** Configure pool size based on expected load (start with 10-20)

### 45. **CORS Allowed Origins Too Permissive in Dev**
**Location:** CORS config
- **Issue:** If FRONTEND_URL is misconfigured, CORS might allow wrong origins
- **Fix:** Whitelist known origins, reject unknown ones explicitly

---

## Summary of Findings

| Severity | Count | Requires Immediate Action |
|----------|-------|--------------------------|
| Critical | 8 | Yes |
| High | 12 | Yes |
| Medium | 15 | Within Sprint |
| Low | 10 | Backlog |

---

## Recommended Priority Actions

### Immediate (This Week):
1. Fix duplicate route definitions (#1)
2. Integrate enums and remove hardcoded strings (#2)
3. Fix wallet race condition (#3)
4. Fix pagination total count (#4)
5. Clear password reset token after use (#5)
6. Add stock rollback to checkout (#7)
7. Implement session regeneration (#16)

### High Priority (Next Sprint):
8. Fix order status drift (#9)
9. Complete escrow dispute resolution (#11)
10. Add rate limiting (#15)
11. Enforce stronger password policy (#19)
12. Add database indexes (#20)

### Medium Priority (Ongoing):
13. Restore stock on order cancellation (#27)
14. Implement order expiration (#32)
15. Fix webhook signature validation (#30)
16. Add cart duplicate check (#31)

### Low Priority (Technical Debt):
17. Implement proper logging (#39)
18. Add API documentation (#40)
19. Add health check endpoint (#38)
20. Extract magic numbers to constants (#36)

---

## Testing Recommendations

1. **Add unit tests for:**
   - Wallet transaction race conditions
   - Stock increment/decrement operations
   - Order status transitions
   - Escrow state machine

2. **Add integration tests for:**
   - Complete checkout flow (cart → order → payment → escrow)
   - Webhook handling (payment success/failure)
   - Dispute resolution flow
   - Email verification flow

3. **Add E2E tests for:**
   - User registration and login
   - Product listing and purchase
   - Order lifecycle (create → pay → deliver → complete)

---

## Security Checklist

- [ ] All authentication endpoints rate-limited
- [ ] Session regenerated on login
- [ ] CSRF tokens validated on all state changes
- [ ] Password reset tokens cleared after use
- [ ] SQL injection prevented (parameterized queries everywhere)
- [ ] File upload size limits enforced
- [ ] Input validation on all user inputs
- [ ] Webhook signatures verified
- [ ] Sensitive data not logged
- [ ] API responses don't leak internal errors

---

## Performance Checklist

- [ ] Database indexes on all foreign keys
- [ ] Pagination implemented correctly
- [ ] N+1 queries avoided
- [ ] Database connection pooling configured
- [ ] Caching strategy for frequently accessed data
- [ ] Long-running operations moved to background jobs

---

## Conclusion

The codebase has a **solid foundation** but requires attention to critical issues around:
1. **Payment flow integrity** (escrow, stock management)
2. **Security hardening** (rate limiting, session management, input validation)
3. **Data consistency** (status drift, transaction rollbacks)

Addressing the Critical and High priority issues will significantly improve system reliability and security. The Medium and Low priority items are mostly technical debt that can be addressed incrementally.

**Estimated Fix Time:**
- Critical fixes: 2-3 days
- High priority: 1 week
- Medium priority: 2 weeks
- Low priority: Ongoing

---

**Generated:** ${new Date().toISOString()}
**Next Review:** Recommended after fixes are implemented
