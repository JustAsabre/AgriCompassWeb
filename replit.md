# Agricompass - Agricultural Marketplace Platform

## Overview
Agricompass is a comprehensive agricultural marketplace platform that connects farmers directly with buyers through a verified, transparent system. The platform features multi-role support (Farmers, Buyers, Field Officers, Admin) with role-specific dashboards and workflows.

## Purpose & Goals
- Connect farmers with buyers for transparent, direct pricing
- Provide verification system through field officers for farmer authenticity
- Enable bulk ordering with pricing tiers
- Support multiple agricultural product categories
- Build trust through verified profiles and ratings

## Current State
MVP Implementation Complete with:
- Landing page with value proposition
- Multi-role authentication (Farmer, Buyer, Field Officer)
- Marketplace browse with advanced filtering
- Product listing detail pages
- Farmer dashboard with listing management
- Buyer dashboard with cart and order management
- Field Officer verification workflow
- Profile management
- Full order placement and tracking

## Recent Changes (November 2024)
- **CRITICAL SECURITY UPDATE**: Implemented bcrypt password hashing with secure session-based authentication
- **SECURITY FIX**: Sanitized all API responses to prevent password hash leakage
- **SECURITY FIX**: Server-side authorization with ownership verification on all protected routes
- Implemented complete data schema with all entity relationships
- Built all frontend components with exceptional visual polish
- Created comprehensive backend API with all CRUD operations
- Integrated React Query for data fetching with session-based authentication
- Added role-based authentication and routing with proper middleware
- Implemented in-memory storage with seed data for testing

## Project Architecture

### Tech Stack
- **Frontend**: React, TypeScript, Wouter (routing), TanStack Query, Tailwind CSS, Shadcn UI
- **Backend**: Express.js, TypeScript, bcryptjs (password hashing), express-session
- **Data Storage**: In-memory (MemStorage) for MVP
- **Authentication**: Secure session-based with HTTP-only cookies, bcrypt password hashing
- **Session Management**: MemoryStore (production should use connect-pg-simple or Redis)

### Data Models
1. **Users** - Multi-role (farmer, buyer, field_officer, admin) with verification status
2. **Listings** - Product listings with category, pricing, quantity, location
3. **Orders** - Order management with status tracking
4. **Cart Items** - Shopping cart for buyers
5. **Verifications** - Field officer verification records
6. **Pricing Tiers** - Bulk pricing support

### Pages & Routes

**Public Pages**:
- `/` - Landing page with hero, features, and how it works
- `/login` - Login page
- `/register` - Registration with role selection
- `/marketplace` - Browse all products with filters
- `/marketplace/:id` - Product detail page

**Farmer Routes** (Protected):
- `/farmer/dashboard` - View listings and orders
- `/farmer/create-listing` - Create new product listing

**Buyer Routes** (Protected):
- `/buyer/dashboard` - View orders
- `/buyer/cart` - Shopping cart and checkout

**Field Officer Routes** (Protected):
- `/officer/dashboard` - View and verify farmers

**Common Routes** (Protected):
- `/profile` - User profile page

### API Endpoints

**Authentication**:
- `POST /api/auth/register` - User registration (hashes password with bcrypt)
- `POST /api/auth/login` - User login (validates with bcrypt, creates session)
- `POST /api/auth/logout` - User logout (destroys session)
- `GET /api/auth/me` - Get current session user

**Listings**:
- `GET /api/listings` - Get all listings
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create listing (Farmer)
- `PATCH /api/listings/:id` - Update listing (Farmer)
- `DELETE /api/listings/:id` - Delete listing (Farmer)
- `GET /api/farmer/listings` - Get farmer's listings

**Orders**:
- `POST /api/orders/checkout` - Place order(s) from cart
- `PATCH /api/orders/:id/status` - Update order status
- `GET /api/farmer/orders` - Get farmer's orders
- `GET /api/buyer/orders` - Get buyer's orders

**Cart**:
- `GET /api/cart` - Get cart items
- `POST /api/cart` - Add to cart
- `DELETE /api/cart/:id` - Remove from cart

**Field Officer**:
- `GET /api/officer/farmers` - Get all farmers
- `POST /api/officer/verify/:farmerId` - Verify farmer

**User**:
- `GET /api/user/:id` - Get user profile

## Design System

### Colors
- **Primary**: Green (142, 68%, 32%) - Agricultural theme
- **Background**: Very light off-white in light mode, dark in dark mode
- **Cards**: Slightly elevated from background
- **Accent**: Muted green for secondary elements

### Typography
- **Font**: Inter for UI, system fonts for body
- **Headings**: Bold, large sizes (text-3xl to text-5xl)
- **Body**: text-base, readable
- **Data**: Larger, semibold for prices and quantities

### Components
- Shadcn UI components with custom theming
- Hover elevate interactions
- Responsive grid layouts
- Beautiful loading states with skeletons
- Empty states with icons and CTAs

### Features
- Dark mode support
- Fully responsive (mobile-first)
- Accessible with proper ARIA labels
- Consistent spacing and visual hierarchy

## User Workflows

### Farmer Workflow
1. Register as farmer
2. Wait for field officer verification
3. Create product listings
4. Manage incoming orders (accept/reject)
5. Track completed sales

### Buyer Workflow
1. Register as buyer
2. Browse marketplace with filters
3. Add products to cart
4. Checkout with delivery address
5. Track order status

### Field Officer Workflow
1. Register as field officer
2. View pending farmer verifications
3. Verify or reject farmers
4. Track verified farmers

## Testing Credentials
Seed data includes (passwords are hashed with bcrypt):
- **Farmer**: farmer1@test.com / password123
- **Farmer**: farmer2@test.com / password123
- **Buyer**: buyer@test.com / password123
- **Officer**: officer@test.com / password123

## Security Implementation

### Authentication Security
- **Password Hashing**: bcryptjs with SALT_ROUNDS=10
- **Session Management**: express-session with HTTP-only cookies
- **Cookie Settings**: SameSite=Lax, Secure in production, 7-day maxAge
- **Session Store**: MemoryStore (IMPORTANT: Replace with connect-pg-simple or Redis for production)

### Authorization Security
- **Server-Side Verification**: All protected routes use requireAuth middleware
- **Role-Based Access**: requireRole middleware enforces farmer/buyer/field_officer roles
- **Ownership Checks**: Listings, cart items, and orders verified for ownership before modification
- **No Client Trust**: All authentication derived from req.session.user, never client headers

### Data Protection
- **Password Sanitization**: All API responses strip password field before sending to client
- **Session-Only Auth**: No localStorage user storage, all state derived from server session
- **Credential Requests**: Frontend sends credentials: "include" on all API calls

### Production Deployment Checklist
- [ ] Set strong SESSION_SECRET environment variable (use crypto.randomBytes(32).toString('hex'))
- [ ] Replace MemoryStore with persistent session store (connect-pg-simple for PostgreSQL)
- [ ] Verify secure cookies enabled in production (process.env.NODE_ENV === 'production')
- [ ] Enable HTTPS for secure cookie transmission
- [ ] Review CORS settings for production domain
- [ ] Add rate limiting to authentication endpoints
- [ ] Implement automated security testing for password field exposure

## Next Phase Features
1. In-app messaging between buyers/farmers/officers
2. Payment integration (Mobile Money, bank transfer)
3. Ratings and reviews system
4. Real-time notifications
5. Market insights and analytics
6. Database persistence (PostgreSQL)
7. File upload for product images and verification documents
8. Advanced search and recommendations
9. Dispute resolution workflow
10. Admin dashboard for platform management
