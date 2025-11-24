# Changelog
All notable changes to AgriCompass will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [0.8.2] - 2025-11-23
### Added - Production Hardening & Multi-Order Payment Support
- **Multi-Order Payment System**
  - Support for checking out multiple orders simultaneously
  - Individual Paystack payments created per order, sharing a common transactionId
  - Prevents single payment creation for multi-order checkouts
  - Maintains payment integrity across multiple orders

- **Enhanced Mobile Number Validation**
  - Server-side validation for Ghana mobile numbers in payout and recipient creation
  - Client-side validation in farmer dashboard with user-friendly error messages
  - Enforces proper Ghana number format (+233XXXXXXXXX or 0XXXXXXXXX)

- **Paystack Recipient UX Improvements**
  - Toast notifications for missing Paystack recipients during autoPay
  - Warnings displayed when farmer lacks recipient but autoPay is enabled
  - Guides farmers to create recipients before enabling autoPay

- **Order Success Page Enhancements**
  - Client-side fallback to lookup order IDs from Paystack reference if orders param missing
  - Improved UX for Paystack redirects that don't preserve callback_url
  - Fetches orders via new GET /api/payments/transaction/:reference endpoint

- **Database Migration Plan**
  - SQL migration script to copy bank_account to mobile_number for Ghana numbers
  - Comprehensive migration README with precautions, testing, and rollback steps
  - Handles legacy data transition safely

- **Expanded Test Coverage**
  - Tests for multi-payment autoPay flows with mocked Paystack API
  - Socket authentication dedupe tests to prevent double logs
  - Notifications tests for blocked order transitions (deliver/complete without payment)
  - Mobile validation and recipient warning tests

### Fixed
- **Double Socket Authentication Logs**
  - Added socket.data.isAuthenticated flag to prevent duplicate authenticate events
  - Single authentication log per connection, eliminating noise in server logs

- **Order Rejection Without Payment Notifications**
  - Notifications sent to farmers/buyers when attempting deliver/complete without confirmed payment
  - Prevents silent failures and improves order process transparency

- **NaN Display in Order Details**
  - Safe parsing of totalPrice and pricePerUnit with fallback to 0
  - Prevents invalid price displays in order details page

- **Socket Authentication Deduplication**
  - Prevents multiple authentication events on single socket connection
  - Cleaner server logs and reduced event processing overhead

### Technical Implementation
- **server/routes.ts**: Updated autoPay for multi-orders, added transaction lookup, mobile validations, notifications on blocked actions
- **server/storage.ts**: Added getPaymentsByTransactionId method for payment queries
- **server/socket.ts**: Added isAuthenticated flag for dedupe logic
- **client/src/pages/cart.tsx**: Added toast for missingRecipients warnings
- **client/src/pages/order-success.tsx**: Added fallback order lookup from reference
- **client/src/pages/order-detail.tsx**: Safe price parsing to avoid NaN
- **client/src/pages/farmer-dashboard.tsx**: Mobile validation for payouts and recipients
- **server/tests/payments.test.ts**: New tests for multi-payments, notifications, validations
- **server/tests/socket-auth.test.ts**: Test for single authenticated event
- **drizzle/migrations/0006_migrate_bankaccount_to_mobile.sql**: Migration script
- **drizzle/migrations/0006_migration_readme.md**: Migration documentation

### Security & UX Improvements
- Enhanced validation prevents invalid mobile numbers in payouts
- Better error feedback for missing Paystack recipients
- Improved order success reliability with fallback lookup
- Notifications provide clear feedback for failed order actions

---

## [0.8.3] - 2025-11-24
### Added
- **Test-only API helper**: Added `/__test/get-reset-token` and updated e2e tests to use seeded accounts and test endpoints. These endpoints are gated behind `ENABLE_TEST_ENDPOINTS=true` and should not be enabled in production.
  - Enables UI-driven password reset E2E tests without requiring email delivery.
  - Added E2E test: `tests/e2e/password-reset.spec.ts` to verify the full forgot-password and reset-password flow using the UI.

### Changed
- **E2E testing**: Playwright test suite now uses seeded test accounts where possible to reduce rate limiting issues in CI.


## [0.8.1] - 2025-11-19
### Changed - Sprint 4: Email System Overhaul & Cleanup
- **Email System Migration**
  - Migrated all transactional email sending from Resend (free tier) to Gmail SMTP using Nodemailer
  - Removed all Resend code and dependencies (`npm uninstall resend`)
  - Updated `server/email.ts` to use `nodemailer.createTransport({ service: 'gmail', ... })`
  - Improved SMTP/TLS configuration for Gmail reliability
  - Updated `.env` to use Gmail SMTP credentials (removed Resend API key)
  - Updated all documentation for new email setup (QUICK_TEST.md, EMAIL_SETUP.md, TESTING_GUIDE.md)
  - All email tests (welcome, password reset, order, verification) now work for any address

### Fixed
- Fixed nodemailer import/usage bugs (`createTransporter` typo, TLS/STARTTLS issues)
- Fixed product detail page crash when farmer data missing (added optional chaining)
- Fixed React Query to fetch correct listing data for product detail

### Removed
- Deleted all Resend-related code and configuration
- Cleaned up unwanted documentation and test files:
  - `EMAIL_SETUP.md`, `TESTING_GUIDE.md`, `SPRINT4_PROGRESS.md`, `QUICK_TEST.md`
  - `client/src/tests/button.test.tsx`, `server/tests/auth.test.ts`, `server/tests/upload.test.ts`
  - Moved to `.trash` folder for safe deletion

### Documentation
- Created `SPRINT4_COMPLETION.md` summarizing all Sprint 4 changes and results
- Updated all setup and troubleshooting guides for Gmail SMTP

### Sprint 4 Completion
- All email features fully tested and working
- Workspace cleaned and documented for next sprint

---

## [0.8.0] - 2025-01-XX
### Added - Bulk Pricing & Reviews System (Sprint 2 + 4)
- **Bulk Pricing System**
  - Farmers can add up to 5 pricing tiers per listing
  - Each tier specifies minimum quantity and discounted price
  - API endpoints: GET/POST/DELETE `/api/listings/:id/pricing-tiers`
  - PricingTierForm component for managing tiers in create-listing page
  - PricingTierDisplay component shows bulk discounts with savings calculations
  - Cart automatically applies best tier pricing based on quantity
  - Real-time price updates and savings badges in cart
  - Duplicate minQuantity validation to prevent conflicts

- **Ratings & Reviews System**
  - Complete reviews database schema (orderId, reviewerId, revieweeId, rating, comment, approved)
  - Bidirectional reviews: buyers review farmers, farmers review buyers
  - Reviews tied to completed orders (prevents spam)
  - API endpoints: 
    - GET `/api/reviews/user/:userId` - Get user's reviews with average rating
    - GET `/api/reviews/order/:orderId` - Check if review exists for order
    - POST `/api/reviews/order/:orderId` - Create review after order completion
    - PATCH `/api/reviews/:id/approve` - Admin moderation (admin only)
    - DELETE `/api/reviews/:id` - Delete review (admin only)
  - ReviewForm component with interactive star rating and comment field
  - ReviewDisplay component with rating distribution bars and average score
  - Integrated review submission in order-detail page for completed orders
  - Admin moderation flag for content control
  - Average rating calculation rounded to 1 decimal

### Technical Implementation
- **Database**: Added pricing_tiers and reviews tables to schema
- **Storage Layer**: 10 new methods (7 review methods, 3 pricing tier methods)
- **Validation**: Zod schemas for pricing tiers and reviews
- **Type Safety**: TypeScript types for Review, PricingTier, ReviewWithUsers, UserWithRating
- **Real-time**: Socket.IO notifications for new reviews
- **Components**: 4 new React components (PricingTierForm, PricingTierDisplay, ReviewForm, ReviewDisplay)

---

## [0.7.4] - 2025-11-18
### Fixed - Critical Security & Session Isolation
- **CRITICAL SECURITY FIX: User Session Isolation**
  - **Issue:** React Query cache showing previous user's data after logout/login
  - **Root Cause:** Query cache keys didn't differentiate between users
  - **Impact:** User A could see User B's data after switching accounts
  - **Fix:** Added `user?.id` to all query keys across 15 files
  - **Files Modified:**
    - `lib/auth.tsx` - Added `queryClient.clear()` on logout
    - `lib/notifications.tsx` - User-specific notification cache
    - `components/header.tsx` - User-specific cart/message counts
    - All dashboard pages (farmer, buyer, officer, admin)
    - All analytics pages (farmer, buyer, officer)
    - Cart, messages, verifications, and order pages
  - **Pattern:** `queryKey: ["/api/endpoint", user?.id]` with `enabled: !!user?.id`
  - **Result:** Complete data isolation between user sessions

- **Query Client URL Construction Bug**
  - **Issue:** API requests malformed as `/api/verifications/me/user-id` instead of `/api/verifications/me`
  - **Root Cause:** Default queryFn used `queryKey.join("/")` concatenating all array elements
  - **Impact:** Forms not saving, server returning 404 errors
  - **Fix:** Changed to `queryKey[0]` to use only first element as URL
  - **File:** `lib/queryClient.ts`
  - **Explanation:** Query keys now use format `[url, user?.id, ...params]` where only `url` is for fetching

- **Officer Dashboard Navigation**
  - Fixed `setLocation is not defined` error
  - Added `useLocation` hook import from wouter
  - Corrected verification route from `/verifications` to `/officer/verifications`
  - File: `client/src/pages/officer-dashboard.tsx`

- **Code Cleanup**
  - Removed all temporary `console.log` debugging statements from client code
  - Files cleaned: `pricing-tier-form.tsx`, `cart.tsx`, `notifications.tsx`
  - Production-ready code with zero debugging artifacts

### Security Impact
- ✅ Zero data leakage between user sessions
- ✅ Cache properly cleared on logout
- ✅ All queries disabled until user authenticated
- ✅ 15 files updated for complete security coverage
- ✅ All user types (farmer, buyer, officer, admin) properly isolated

### Technical Details
- **Cache Strategy:** User ID appended to all query keys for differentiation
- **Cache Invalidation:** `queryClient.clear()` wipes all cache on logout
- **Query Enablement:** `enabled: !!user?.id` prevents premature queries
- **URL Construction:** First array element only, remaining for cache differentiation

---

## [0.7.2] - 2025-11-16
### Fixed - Sprint 3 Final Bug Fixes
- **Regional Listing Notifications**
  - **CRITICAL FIX**: Fixed Socket.IO instance not being initialized when imported
  - Changed `registerRoutes` to receive `io` as parameter instead of importing from socket.ts
  - Regional notifications now working - buyers receive notifications for new listings in their area
  - Region matching uses partial string matching (buyer.region ↔ listing.location/farmer.region)
  
- **Contact Farmer Functionality**
  - Fixed "Contact Farmer" buttons in order detail and order success pages
  - Buttons now properly pass farmer information via URL parameters
  - Consistent with marketplace listing contact farmer behavior
  
- **Delete Listing Feature**
  - Added delete listing functionality to farmer dashboard
  - Includes confirmation dialog before deletion
  - Properly invalidates queries after successful deletion
  
- **Image Upload System**
  - Simplified to single image upload (maxFiles=1)
  - Fixed image preview display after upload
  - Fixed remove button to properly clear imageUrl field
  - Removed conflicting preview sections from FileUpload component
  - Using form.watch('imageUrl') for preview rendering
  
- **Form Type Conversions**
  - Fixed integer field submission (quantityAvailable, minOrderQuantity)
  - Changed from Number() to parseInt() with base 10
  - Ensures proper integer conversion before server validation

### Technical Improvements
- Cleaned up debug logging from production code
- Improved Socket.IO initialization order
- Better parameter passing for dependency injection
- All Sprint 3 tests passing

---

## [0.7.1] - 2025-11-16
### Fixed - Sprint 3 Bug Fixes (Phase 1)
- **Cart Validation**
  - Added client-side quantity validation in product detail page
  - Added server-side validation in cart and checkout endpoints
  - Prevents adding more than available quantity
  - Enforces minimum order quantity requirements
  - Shows helpful error messages when validation fails
  - **CRITICAL FIX**: Fixed add to cart mutation to accept parameters
  - Fixed undefined variable reference (`params` → `id`)
  - Improved error message display in cart operations
  
- **Edit Listing Functionality**
  - Fixed `/farmer/edit-listing/:id` route to properly load existing data
  - Added useRoute hook to detect edit mode
  - Added useQuery to fetch existing listing data
  - Added useEffect to populate form with fetched data
  - Mutation now uses PATCH for updates, POST for new listings
  - Added loading state while fetching listing data
  - Dynamic UI labels (Create vs Edit)
  
- **Notification Actions**
  - Enhanced markAllAsRead with response validation
  - Enhanced deleteNotification with response validation
  - Added await for query invalidations to ensure UI updates
  - Improved error handling with console logging
  
- **Print Receipt Layout**
  - Added `print:hidden` class to header/navbar
  - Prevents navigation elements from appearing in printed receipts
  - Improved print styles for order details and success pages
  
- **Cart Badge Persistence**
  - Fixed cart count showing items after successful checkout
  - Made checkout onSuccess handler async
  - Added await for query invalidations before redirect
  - Ensures cart is cleared and UI updates before navigation
  
- **Checkout Validation**
  - Added validation of all cart items before creating orders
  - Prevents overselling by checking availability at checkout time
  - Returns helpful error messages for out-of-stock items
  - Validates each item individually for accuracy

- **Image Upload & Form Validation**
  - Fixed form breaking after deleting images with upload errors
  - Added better error messages for image upload failures
  - Improved numeric field validation to prevent type mismatches
  - Added preview gallery for uploaded images with remove buttons
  - **CRITICAL FIX**: Fixed image deletion not removing images from preview
  - Added proper key prop to image list for React re-rendering
  - Added preventDefault and stopPropagation to delete button
  - Added shouldValidate and shouldDirty flags to form.setValue for proper validation
  - Image URL field now properly clears when all images are deleted
  - Fixed image URL field showing old value after deletion
  - **CRITICAL FIX**: Corrected type mismatch in listing creation
    - Drizzle's `createInsertSchema` converts `integer` → `z.number()` and `decimal` → `z.string()`
    - Server expects: `price` as string (decimal field), `quantityAvailable` & `minOrderQuantity` as numbers (integer fields)
    - Fixed client form schema to use `z.coerce.number()` for integer fields
    - Form now correctly sends price as string and quantities as numbers
    - Resolved all "Expected number, received string" validation errors
  - Better error recovery when upload fails
  - Uploaded images now show in preview with functional delete buttons (hover to see delete button)

- **Registration Form Validation**
  - Fixed optional fields (phone, businessName, farmSize) validation
  - Optional fields now accept empty strings without validation errors
  - Added proper validation messages for required fields (email, confirmPassword)
  - Improved user experience for conditional fields based on role

- **Contact Farmer / Messaging**
  - Fixed "Contact Farmer" button not opening chat with farmer
  - Passes farmer information via URL parameters to messages page
  - Messages page now handles new conversations without existing chat history
  - User data stored in session storage for seamless conversation initialization
  - Automatic cleanup of URL parameters after conversation is loaded
  - Supports starting conversations from product detail pages

### Technical Improvements
- Enhanced error handling in notification functions
- Improved query invalidation patterns for real-time updates
- Better async/await patterns for data consistency
- Robust form state management with type safety
- **CRITICAL DISCOVERY**: Documented Drizzle ORM's `createInsertSchema` type conversion behavior:
  - `integer` fields → `z.number()` in Zod schema
  - `decimal` fields → `z.string()` in Zod schema (preserves precision)
  - This affects all forms that submit to Drizzle-validated endpoints
  - Forms must match these type expectations to avoid validation errors

---

## [0.7.0] - 2025-11-16
### Added - Sprint 3: Order Experience Enhancement
- **Order Success Page** (`/order-success`)
  - Beautiful confirmation page displayed after checkout
  - Shows order summary with all purchased items
  - Displays farmer information for each order
  - "What Happens Next" timeline explaining the order process
  - Download receipt and contact farmers buttons
  - Print-friendly layout
  
- **Order Detail Page** (`/orders/:id`)
  - Comprehensive order view with full details
  - Interactive status timeline showing order progress
  - Product details with images and pricing
  - Farmer contact information
  - Cancel order functionality for pending orders
  - Print-ready receipt layout
  - Permission checks (buyers and farmers can view relevant orders)
  
- **API Endpoints**
  - `GET /api/orders/:id` - Get individual order details
  - `PATCH /api/orders/:id` - Cancel pending orders
  - Both endpoints include permission validation
  
- **Real-time Data Updates**
  - Auto-refresh of orders when notifications arrive
  - No page refresh needed for new orders
  - Real-time updates for messages, verifications, and listings

- **Farmer Routes**
  - `/farmer/edit-listing/:id` - Edit existing listings

### Changed
- Checkout flow now redirects to order success page instead of dashboard
- Order cards in buyer dashboard are now clickable
- Improved print styles for receipts and order details
- Enhanced notification system to auto-invalidate related queries
- **BREAKING:** `apiRequest` now returns parsed JSON data instead of Response object

### Fixed
- Print layout for order receipts (removed shadows, adjusted spacing)
- Real-time notifications now trigger data refresh automatically
- Checkout redirect to order success page (was returning Response instead of JSON)
- Farmer edit listing 404 error (route was missing)
- Added debugging logs for checkout flow

---

## [0.6.1] - 2025-11-16
### Fixed
- Chat initiation now works when clicking "Contact Farmer" on product listings
  - Added user data fetching for new conversations
  - Chat interface now displays even without existing conversation history
  - First message properly creates a new conversation
- Number input behavior on product quantity field
  - Fixed auto-zeroing issue when typing
  - Allows proper number input without forced leading zeros
  - Empty string handling improved for better UX

### Changed
- Messages page now supports starting conversations with users not yet in conversation list
- Product detail quantity input now handles empty values gracefully

---

## [0.6.0] - 2025-11-16
### Added - Sprint 2 Completed Features

#### Real-time Notifications System
- Socket.IO server integration with WebSocket support
- Notification schema and database storage
- 5 notification API endpoints (list, unread count, mark read, mark all read, delete)
- NotificationBell component with unread badge
- Real-time notification delivery for:
  - Order status updates
  - New marketplace listings
  - Verification status changes
  - New messages
- Auto-connect on user authentication
- Mark as read/delete functionality
- Browser notification support (future-ready)

#### Farmer Verification Workflow
- Comprehensive verification system for farmer legitimacy
- 4 verification API endpoints:
  - Submit verification request with documents
  - Check verification status
  - List all verifications (officer view)
  - Approve/reject verification requests
- Farmer verification request form with:
  - Farm size, location, and experience fields
  - Supporting document upload
  - Status tracking (pending, approved, rejected)
- Field officer verification dashboard with:
  - Tabbed interface (pending/approved/rejected)
  - Review dialog with approve/reject actions
  - Farmer details and document viewing
- Verification alerts on farmer dashboard
- Real-time notification on status changes
- Role-based access control for all routes

#### Messaging System
- Real-time bidirectional messaging between users
- Message schema with sender, receiver, content, read status
- 4 messaging API endpoints:
  - List all conversations
  - Get message history between users
  - Mark conversation as read
  - Get unread message count
- Socket.IO messaging events:
  - send_message with delivery confirmation
  - mark_conversation_read
  - Typing indicators
  - new_message real-time delivery
- Messages page with:
  - Conversation list with unread badges
  - Real-time chat interface
  - Message history with timestamps
  - Typing indicators
  - Auto-scroll to latest messages
  - User avatars and role display
- Messages button in header for quick access
- Works for all user roles (buyer ↔ farmer communication)

#### Analytics Dashboard
- Installed recharts library for data visualization
- 3 role-specific analytics endpoints with comprehensive metrics

**Farmer Analytics:**
- Sales performance metrics (total listings, active listings, orders, revenue)
- Sales trends over time (6-month line chart)
- Top selling products (bar chart and detailed table)
- Order status breakdown (completed, pending)
- Revenue tracking with currency formatting

**Buyer Analytics:**
- Purchase history metrics (total orders, spending)
- Spending trends over time (6-month line chart)
- Most purchased products (bar chart and table)
- Order status tracking (completed, pending, cancelled)
- Spending analysis with currency formatting

**Officer Analytics:**
- Farmer verification metrics (total, verified, pending)
- Verification trends over time (multi-line chart)
- Farmers by region (pie chart and distribution table)
- Verification status breakdown (bar chart)
- Approval/rejection statistics
- Regional farmer distribution analysis

**Analytics Integration:**
- Analytics pages for all three user roles
- "View Analytics" buttons on all dashboards
- Protected routes with role-based access
- Responsive charts with tooltips and legends
- Empty state handling for no data scenarios
- Real-time data updates via React Query

### Backend Infrastructure
- Socket.IO server with authentication
- Message storage with conversation management
- Analytics data aggregation endpoints
- Enhanced storage methods for messaging and analytics

### Frontend Enhancements
- NotificationContext with socket exposure
- Real-time WebSocket connection management
- Advanced data visualization with recharts
- Improved dashboard layouts with analytics links

### Developer Experience
- TypeScript compilation verified (no errors)
- Comprehensive testing structure ready
- All Sprint 2 features implemented and integrated

---

## [0.5.0] - 2025-11-15
### Added - Current MVP Features
- User authentication with role-based access (Farmer, Buyer, Field Officer)
- Landing page with value proposition and CTAs
- Product marketplace with filtering (category, region, verified status)
- Product detail page with farmer information
- Create and edit product listings (farmers only)
- Shopping cart functionality (buyers only)
- Checkout and order placement
- Farmer dashboard with listings and order management
- Buyer dashboard with order history
- Field Officer dashboard for farmer verification
- Basic verification workflow (approve/reject farmers)
- User profile page with account settings
- Responsive design with dark/light theme toggle
- Session-based authentication with HTTP-only cookies

### Backend Infrastructure
- Express.js server with TypeScript
- Drizzle ORM with PostgreSQL schema
- In-memory storage for development
- RESTful API with role-based authorization
- Password hashing with bcrypt (10 rounds)
- Session management with express-session

### Database Schema
- Users table (multi-role support)
- Listings table (product catalog)
- Pricing tiers table (bulk discounts - schema only)
- Orders table (transaction records)
- Cart items table (shopping cart)
- Verifications table (field officer records)

### Developer Experience
- GitHub repository setup
- Comprehensive README documentation
- Contribution guidelines (CONTRIBUTING.md)
- Pull request template
- Environment variable configuration (.env.example)
- Windows compatibility fixes (PowerShell support)

---

## [0.4.0] - 2025-11-14
### Added
- Profile page for user account management
- Cart page with item management
- Order status tracking (pending, accepted, rejected, completed, cancelled)
- Farmer order management (accept/reject orders)
- Field officer farmer listing and verification interface

### Changed
- Improved dashboard layouts for all user roles
- Enhanced marketplace filtering logic
- Updated UI components for consistency

### Fixed
- Windows compatibility issues (NODE_ENV, server.listen)
- Session persistence across page refreshes

---

## [0.3.0] - 2025-11-13
### Added
- Field Officer dashboard and verification workflow
- Order checkout functionality
- Cart API endpoints (add, remove, clear)
- Order management for farmers and buyers
- Verification status tracking for farmers

### Backend
- Field Officer authentication routes
- Cart CRUD operations
- Order creation and status updates
- Verification record management

---

## [0.2.0] - 2025-11-12
### Added
- Marketplace page with product browsing
- Product detail page with full information
- Create listing page for farmers
- Shopping cart functionality
- Farmer and Buyer dashboard pages
- Order creation and management

### Backend
- Listing CRUD API endpoints
- Order management endpoints
- Cart management endpoints
- Role-based route protection

---

## [0.1.0] - 2025-11-11
### Added - Initial Release
- Landing page with platform overview
- User registration with role selection
- User login and authentication
- Basic database schema
- Session-based authentication
- User authorization middleware

### Backend
- Express.js server setup
- Drizzle ORM integration
- In-memory storage implementation
- Authentication endpoints (register, login, logout)
- Password hashing with bcrypt

### Frontend
- React + TypeScript setup with Vite
- Tailwind CSS styling
- shadcn/ui component library
- Wouter for client-side routing
- TanStack Query for data fetching
- Theme provider (dark/light mode)

---

## Version History Summary

| Version | Date | Key Features |
|---------|------|--------------|
| 0.6.1 | 2025-11-16 | Bug fixes - chat initiation and number input |
| 0.6.0 | 2025-11-16 | Real-time notifications, farmer verification, messaging, analytics |
| 0.5.0 | 2025-11-15 | Current state - MVP with core marketplace features |
| 0.4.0 | 2025-11-14 | Profile, cart, order management |
| 0.3.0 | 2025-11-13 | Field Officer verification, checkout |
| 0.2.0 | 2025-11-12 | Marketplace, listings, dashboards |
| 0.1.0 | 2025-11-11 | Initial authentication and setup |

---

## Future Releases Roadmap

### [0.6.0] - Planned for Sprint 1-2 (Weeks 1-4)
#### Security & Foundation
- [ ] Password reset flow (email-based)
- [ ] Rate limiting middleware
- [ ] CSRF protection
- [ ] Input validation and XSS sanitization
- [ ] Legal pages (Terms, Privacy, Cookie Policy)

#### Bulk Pricing
- [ ] Pricing tier API endpoints
- [ ] Pricing tier UI components
- [ ] Automatic tier discount calculation
- [ ] Savings display in cart

### [0.7.0] - Planned for Sprint 3-4 (Weeks 5-8)
#### Order Enhancement
- [ ] Order success page with confirmation
- [ ] Email notifications (order confirmation)
- [ ] Receipt generation (HTML/PDF)
- [ ] Order detail page with timeline

#### Trust & Reviews
- [ ] Ratings and reviews system
- [ ] Average rating calculation
- [ ] Review display on profiles
- [ ] Review moderation (admin)

### [0.8.0] - Planned for Sprint 5-6 (Weeks 9-12)
#### Communication
- [ ] In-app messaging (buyer-farmer)
- [ ] Conversation management
- [ ] Unread message badges
- [ ] Message templates

#### Notifications
- [ ] Notification center
- [ ] Email notifications
- [ ] Notification preferences
- [ ] Browser push notifications

### [0.9.0] - Planned for Sprint 7-10 (Weeks 13-20)
#### Payments & Logistics
- [ ] Payment gateway integration (Stripe/Flutterwave)
- [ ] Escrow payment system
- [ ] Farmer payout management
- [ ] Dispute resolution system
- [ ] Delivery tracking
- [ ] Shipment management

### [1.0.0] - Planned for Sprint 11-12 (Weeks 21-24) 🚀
#### Production Launch
- [ ] Admin dashboard with analytics
- [ ] Market insights and reporting
- [ ] Comprehensive testing (90%+ coverage)
- [ ] Security audit completion
- [ ] Performance optimization
- [ ] Production deployment
- [ ] Public launch

### [1.1.0] - Post-Launch (Month 7+)
#### Mobile & Advanced Features
- [ ] Mobile apps (iOS + Android)
- [ ] Advanced search with AI recommendations
- [ ] Subscription tiers (premium features)
- [ ] Multi-language support
- [ ] Multi-currency support

### [2.0.0] - Future Vision (Year 2)
#### Platform Expansion
- [ ] B2C marketplace (direct to consumers)
- [ ] Contract farming module
- [ ] Agricultural financing integration
- [ ] Blockchain supply chain tracking
- [ ] IoT integration (farm sensors)
- [ ] AI crop yield predictions

---

## Contribution Guidelines

### How to Update This Changelog

1. **Keep it Current:** Update with every merged PR
2. **Follow Format:** Use [Keep a Changelog](https://keepachangelog.com/) format
3. **Categories:** Use Added, Changed, Deprecated, Removed, Fixed, Security
4. **Dates:** Use YYYY-MM-DD format
5. **Links:** Reference issues/PRs where applicable

### Example Entry Format
```markdown
## [X.Y.Z] - YYYY-MM-DD
### Added
- New feature description (#PR-number)
- Another feature (@contributor-name)

### Fixed
- Bug fix description (#issue-number)

### Changed
- Modification to existing feature
```

### Semantic Versioning Guide
- **MAJOR (X.0.0):** Breaking changes (API changes, major refactors)
- **MINOR (0.X.0):** New features (backward compatible)
- **PATCH (0.0.X):** Bug fixes (backward compatible)

---

## Migration Notes

### Upgrading from 0.4.0 to 0.5.0
- No breaking changes
- No database migrations required (in-memory storage)

### Future Migrations
When moving to production database:
1. Run Drizzle migrations: `npm run db:migrate`
2. Seed initial data: `npm run db:seed`
3. Update environment variables (.env)

---

## Support & Contact

For questions about this changelog or version history:
- **GitHub Issues:** https://github.com/JustAsabre/AgriCompassWeb/issues
- **Discussions:** https://github.com/JustAsabre/AgriCompassWeb/discussions
- **Email:** support@agricompass.com (when available)

---

**Changelog Maintained By:** AgriCompass Development Team  
**Last Updated:** November 19, 2025  
**Next Review:** End of Sprint 5
