# AgriCompass Product Requirements Document (PRD)
**Version:** 1.0.0  
**Last Updated:** November 15, 2025  
**Status:** Active Development  
**Project Type:** Agricultural Marketplace Platform (Funding-Ready)

---

## Executive Summary

AgriCompass is a B2B agricultural marketplace connecting verified farmers directly with buyers (food processors, exporters, wholesalers) through a trusted platform. The system eliminates middlemen, ensures quality through field officer verification, and provides transparent pricing with bulk discount capabilities.

**Target Market:** Agricultural economies in developing regions  
**Primary Users:** Farmers, Buyers (Businesses), Field Officers, Platform Admins  
**Competitive Advantage:** Verification-first approach, bulk pricing, direct farmer-buyer relationships

---

## 1. Current Implementation Status

### ✅ **IMPLEMENTED - MVP Core Features**

#### **Public/Marketing** (33% Complete)
- ✅ Landing/Home page - Value proposition, CTAs, statistics
- ❌ About/How it Works - Static page
- ❌ Pricing/Plans page
- ❌ Contact/Support page
- ❌ FAQs/Help Centre

#### **Authentication & Account** (70% Complete)
- ✅ Login - Email + password authentication
- ✅ Register - Role selection (Farmer/Buyer/Field Officer)
- ❌ Password Reset flow
- ✅ Profile page - Basic account settings
- ❌ Organization/Business profile - Enhanced buyer profiles

#### **Marketplace & Commerce** (60% Complete)
- ✅ Marketplace browse - Filters (category, region, verified)
- ✅ Listing detail page - Product info, farmer details
- ✅ Create/Edit Listing - Farmer product forms
- ✅ Cart - Shopping cart for buyers
- ✅ Checkout - Basic order placement
- ❌ Order success/receipt page
- ✅ Orders/Invoices (buyer) - Basic order history
- ✅ Orders/Sales (farmer) - Incoming orders, accept/reject
- ⚠️ Bulk price management - **Schema exists, UI missing**

#### **User Roles & Dashboards** (75% Complete)
- ✅ Farmer Dashboard - Listings, orders, revenue stats
- ✅ Buyer Dashboard - Orders, cart access
- ✅ Field Officer Dashboard - Verification queue
- ✅ Field Officer Verify Farmer - Basic approve/reject
- ❌ Admin Dashboard - Platform management

#### **API Endpoints** (65% Complete)
- ✅ Authentication (register, login, logout, session)
- ✅ Listings (CRUD, farmer-specific)
- ✅ Cart (add, remove, get)
- ✅ Orders (checkout, status updates, history)
- ✅ Field Officer (get farmers, verify)
- ❌ Pricing tiers (backend exists, no routes)

### ❌ **NOT IMPLEMENTED - Critical Gaps**

#### **Transaction & Logistics** (0% Complete)
- ❌ Logistics/Delivery options
- ❌ Fulfillment/Dispatch tracking
- ❌ Payments/Payouts integration
- ❌ Disputes/Claims system

#### **Trust & Safety** (20% Complete)
- ⚠️ Verification center - Basic verification only
- ❌ Ratings & Reviews
- ❌ Policy & Legal pages (Terms, Privacy)

#### **Communication** (0% Complete)
- ❌ Messages/Chat system
- ❌ Notifications center
- ❌ Email notifications

#### **Content & Support** (0% Complete)
- ❌ Knowledge base/Guides
- ❌ Announcements/News

#### **Analytics & Reporting** (0% Complete)
- ❌ Market Insights
- ❌ Seller Performance metrics
- ❌ Buyer Insights
- ❌ Exportable Reports

#### **Developer/Integration** (0% Complete)
- ❌ API documentation
- ❌ Webhooks
- ❌ Third-party integrations

---

## 2. Technical Architecture

### **Current Tech Stack**
```
Frontend:  React 18.3 + TypeScript 5.6 + Vite 5.4
UI:        Tailwind CSS 3.4 + shadcn/ui
Routing:   Wouter 3.3
State:     TanStack Query, React Hook Form
Backend:   Express.js 4.21 + TypeScript
Auth:      Session-based (express-session + bcrypt)
Database:  Drizzle ORM + PostgreSQL (In-memory for dev)
Testing:   (Not implemented yet)
```

### **Database Schema**

#### **Existing Tables**
1. **users** - Multi-role (farmer, buyer, field_officer, admin)
2. **listings** - Product catalog with pricing
3. **pricing_tiers** - Bulk discount tiers (NO API ROUTES YET)
4. **orders** - Order transactions
5. **cart_items** - Shopping cart
6. **verifications** - Field officer verification records

#### **Missing Critical Tables**
- **messages** - In-app chat
- **notifications** - User notifications
- **reviews** - Ratings and feedback
- **disputes** - Claim management
- **payments** - Transaction records
- **logistics** - Delivery tracking
- **business_profiles** - Enhanced buyer/seller profiles
- **product_images** - Multiple images per listing
- **audit_logs** - Platform activity tracking

### **Security & Compliance**
- ✅ Password hashing (bcrypt with 10 rounds)
- ✅ Session-based auth (HTTP-only cookies)
- ✅ Role-based access control (RBAC)
- ❌ HTTPS enforcement
- ❌ Rate limiting
- ❌ CSRF protection
- ❌ XSS sanitization
- ❌ SQL injection prevention (using ORM, but needs validation)
- ❌ GDPR compliance
- ❌ Data encryption at rest

---

## 3. Feature Requirements by Priority

### **PHASE 1: MVP Enhancement (Weeks 1-4)**
*Goal: Production-ready core marketplace*

#### **1.1 Critical Fixes & Security**
- [ ] Implement password reset flow (email-based)
- [ ] Add HTTPS enforcement
- [ ] Implement rate limiting (express-rate-limit)
- [ ] Add CSRF protection (csurf)
- [ ] Input validation & XSS sanitization
- [ ] Error boundary components
- [ ] Comprehensive error logging

#### **1.2 Bulk Pricing System**
**User Story:** As a farmer, I want to offer bulk discounts so I can sell larger quantities  
**Acceptance Criteria:**
- Create pricing tiers when listing products
- Display tiered pricing on product detail page
- Automatically apply correct price at checkout based on quantity
- Show savings/discount amount to buyer

**Technical Implementation:**
```typescript
// API Routes needed
POST   /api/listings/:id/pricing-tiers
GET    /api/listings/:id/pricing-tiers
DELETE /api/pricing-tiers/:id

// UI Components
- PricingTierForm (on create-listing page)
- PricingTierDisplay (on product-detail page)
- BulkSavingsCalculator (on cart page)
```

#### **1.3 Order Success & Receipts**
- Order confirmation page with order number
- Email receipts (SendGrid/AWS SES integration)
- PDF invoice generation
- Order tracking page

#### **1.4 Policy & Legal Pages**
- Terms of Service
- Privacy Policy
- Cookie Policy
- Seller Agreement
- Buyer Agreement

### **PHASE 2: Trust & Communication (Weeks 5-8)**
*Goal: Build platform trust and user engagement*

#### **2.1 Ratings & Reviews System**
**Database Schema:**
```sql
CREATE TABLE reviews (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR REFERENCES orders(id),
  reviewer_id VARCHAR REFERENCES users(id),
  reviewee_id VARCHAR REFERENCES users(id),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- Buyers rate farmers after order completion
- Farmers rate buyers (reliability, payment)
- Average rating display on profiles
- Review moderation (admin approval)
- Flag inappropriate reviews

#### **2.2 In-App Messaging System**
**Real-time Requirements:** WebSocket (Socket.io) or polling

**Database Schema:**
```sql
CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY,
  participant_1_id VARCHAR REFERENCES users(id),
  participant_2_id VARCHAR REFERENCES users(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
  id VARCHAR PRIMARY KEY,
  conversation_id VARCHAR REFERENCES conversations(id),
  sender_id VARCHAR REFERENCES users(id),
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Features:**
- 1-on-1 buyer-farmer conversations
- Attachment support (images, documents)
- Read receipts
- Message templates (common questions)
- Unread message count badge

#### **2.3 Notification System**
**Types:**
- Order placed/accepted/shipped/completed
- New message received
- Verification status changed
- Payment received
- Price drop on watched items

**Channels:**
- In-app (notification center)
- Email (SendGrid)
- SMS (Twilio) - Optional premium feature

**Database Schema:**
```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  type VARCHAR, -- order, message, verification, payment
  title VARCHAR,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  user_id VARCHAR PRIMARY KEY REFERENCES users(id),
  email_orders BOOLEAN DEFAULT TRUE,
  email_messages BOOLEAN DEFAULT TRUE,
  email_marketing BOOLEAN DEFAULT FALSE,
  sms_orders BOOLEAN DEFAULT FALSE
);
```

### **PHASE 3: Transactions & Payments (Weeks 9-12)**
*Goal: Enable secure financial transactions*

#### **3.1 Payment Integration**
**Providers:** Stripe, Flutterwave, or M-Pesa (regional preference)

**Payment Flows:**
1. **Deposit System:** Buyer pays 30% upfront, 70% on delivery
2. **Escrow:** Platform holds funds until delivery confirmation
3. **Direct Transfer:** For trusted/verified relationships

**Database Schema:**
```sql
CREATE TABLE payments (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR REFERENCES orders(id),
  payer_id VARCHAR REFERENCES users(id),
  amount DECIMAL(10,2),
  payment_method VARCHAR, -- card, bank_transfer, mobile_money
  transaction_id VARCHAR, -- Provider transaction ID
  status VARCHAR, -- pending, completed, failed, refunded
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE payouts (
  id VARCHAR PRIMARY KEY,
  farmer_id VARCHAR REFERENCES users(id),
  amount DECIMAL(10,2),
  status VARCHAR, -- pending, processing, completed, failed
  bank_account VARCHAR,
  scheduled_date DATE,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **3.2 Disputes & Claims**
**Trigger Events:**
- Product quality issues
- Non-delivery
- Payment disputes
- Incorrect quantity

**Workflow:**
1. Buyer/Farmer opens dispute
2. Platform admin reviews evidence
3. Communication between parties
4. Resolution: refund, partial refund, or dismiss
5. Escalation to external arbitration (if needed)

**Database Schema:**
```sql
CREATE TABLE disputes (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR REFERENCES orders(id),
  raised_by VARCHAR REFERENCES users(id),
  reason VARCHAR,
  description TEXT,
  status VARCHAR, -- open, investigating, resolved, escalated
  resolution TEXT,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE dispute_messages (
  id VARCHAR PRIMARY KEY,
  dispute_id VARCHAR REFERENCES disputes(id),
  sender_id VARCHAR REFERENCES users(id),
  message TEXT,
  attachment_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **PHASE 4: Logistics & Fulfillment (Weeks 13-16)**
*Goal: Complete order lifecycle management*

#### **4.1 Delivery Options**
**Types:**
- **Buyer Pickup:** Farmer location pickup
- **Farmer Delivery:** Farmer arranges transport
- **Third-Party Logistics (3PL):** Platform-integrated shipping

**Database Schema:**
```sql
CREATE TABLE delivery_options (
  id VARCHAR PRIMARY KEY,
  listing_id VARCHAR REFERENCES listings(id),
  type VARCHAR, -- pickup, farmer_delivery, 3pl
  cost DECIMAL(10,2),
  estimated_days INTEGER,
  available_regions TEXT[]
);

CREATE TABLE shipments (
  id VARCHAR PRIMARY KEY,
  order_id VARCHAR REFERENCES orders(id),
  carrier VARCHAR, -- DHL, local courier, farmer
  tracking_number VARCHAR,
  status VARCHAR, -- pending, in_transit, delivered, failed
  shipped_at TIMESTAMP,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **4.2 Fulfillment Workflow**
1. Order placed → Status: `pending`
2. Farmer accepts → Status: `accepted`
3. Farmer marks as packed → Status: `packed`
4. Shipment created → Status: `in_transit`
5. Buyer confirms delivery → Status: `delivered`
6. Payment released to farmer → Status: `completed`

### **PHASE 5: Advanced Features (Weeks 17-20)**
*Goal: Platform differentiation and analytics*

#### **5.1 Market Insights Dashboard**
**Data Points:**
- Average prices by product category over time
- Regional demand heatmaps
- Seasonal trends
- Top-selling products
- Price comparison charts

**User Access:**
- Farmers: See market prices to set competitive rates
- Buyers: Identify best pricing opportunities
- Admins: Platform-wide analytics

**Technologies:**
- Chart.js or Recharts for visualizations
- Data aggregation cron jobs
- Cached results for performance

#### **5.2 Seller Performance Metrics**
**Tracked Metrics:**
- Order fulfillment rate (%)
- Average delivery time (days)
- Customer satisfaction (rating)
- Response time to messages
- Cancellation rate

**Gamification:**
- Performance badges (Gold, Silver, Bronze seller)
- Top seller leaderboard
- Incentives for high performers

#### **5.3 Admin Dashboard**
**Capabilities:**
- User management (ban, verify, edit)
- Listing moderation (approve, reject, flag)
- Order monitoring
- Dispute resolution
- Platform analytics
- Revenue reports
- System logs

**Database Schema:**
```sql
CREATE TABLE admin_actions (
  id VARCHAR PRIMARY KEY,
  admin_id VARCHAR REFERENCES users(id),
  action_type VARCHAR, -- ban_user, approve_listing, resolve_dispute
  target_id VARCHAR,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **PHASE 6: Scale & Optimize (Weeks 21-24)**
*Goal: Production hardening and performance*

#### **6.1 Testing Infrastructure**
- Unit tests (Jest + React Testing Library)
- Integration tests (Supertest for API)
- E2E tests (Playwright)
- Load testing (k6 or Artillery)
- Security testing (OWASP ZAP)

**Coverage Goals:**
- Unit: 80% coverage
- Critical paths: 100% E2E coverage

#### **6.2 Performance Optimization**
- Image CDN (Cloudinary or AWS CloudFront)
- Database indexing strategy
- Query optimization
- Redis caching layer
- Lazy loading and code splitting
- Service worker for offline capability

#### **6.3 SEO & Marketing**
- Meta tags and OpenGraph
- Sitemap generation
- robots.txt
- Schema.org markup
- Google Analytics integration
- Social media sharing

#### **6.4 Mobile Responsiveness**
- Mobile-first design audit
- Touch-optimized UI
- Progressive Web App (PWA)
- Mobile push notifications

---

## 4. Non-Functional Requirements

### **Performance**
- Page load time: < 2 seconds (3G connection)
- API response time: < 500ms (p95)
- Support 10,000 concurrent users
- 99.9% uptime SLA

### **Scalability**
- Horizontal scaling via load balancer
- Database read replicas
- Microservices consideration for v2.0
- CDN for static assets

### **Security**
- SOC 2 Type II compliance (future)
- PCI DSS Level 1 (for payments)
- Regular security audits
- Bug bounty program

### **Accessibility**
- WCAG 2.1 AA compliance
- Screen reader support
- Keyboard navigation
- High contrast mode

### **Internationalization**
- Multi-language support (English, Swahili, French)
- Multi-currency (USD, local currency)
- Regional date/time formats
- RTL language support (future)

---

## 5. Risk Assessment

### **Technical Risks**
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Payment gateway integration failures | Medium | High | Multiple provider fallbacks, extensive testing |
| Real-time messaging scalability | High | Medium | Use Socket.io with Redis adapter, implement polling fallback |
| Database performance at scale | Medium | High | Proper indexing, query optimization, caching layer |
| Security vulnerabilities | Medium | Critical | Regular audits, penetration testing, bug bounty |

### **Business Risks**
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Low farmer adoption | Medium | High | Field officer incentives, farmer training programs |
| Trust issues (fraud) | High | Critical | Robust verification, escrow payments, dispute system |
| Competition from incumbents | High | Medium | Focus on verification USP, superior UX |
| Regulatory compliance | Medium | High | Legal counsel, GDPR/data protection compliance |

---

## 6. Success Metrics (KPIs)

### **User Acquisition**
- 500 verified farmers in first 6 months
- 1,000 active buyers in first year
- 50 field officers onboarded

### **Engagement**
- 70% user retention (month-over-month)
- Average 3 logins per week (active users)
- 50% of farmers list ≥ 3 products

### **Transaction Metrics**
- $100,000 GMV (Gross Merchandise Value) in first year
- 20% month-over-month GMV growth
- Average order value: $500+
- 80% order completion rate

### **Quality Metrics**
- 90% farmer verification rate
- Average rating: 4.0+ stars
- < 5% dispute rate
- < 2% fraud/abuse incidents

---

## 7. Compliance & Legal

### **Data Protection**
- GDPR compliance (if operating in EU)
- CCPA compliance (if US-based)
- Local data protection laws

### **Financial Regulations**
- Payment processor licensing
- Tax reporting (1099 forms, VAT)
- Anti-money laundering (AML) checks

### **Agricultural Standards**
- Organic certification verification
- Food safety standards (HACCP)
- Import/export regulations

### **Terms of Service**
- User liability limitations
- Platform fee structure
- Dispute resolution process
- Intellectual property rights

---

## 8. Future Roadmap (Post-Launch)

### **Q1 2026: Enhance Core**
- Mobile apps (iOS + Android)
- Advanced search (AI-powered recommendations)
- Subscription tiers (premium features)
- Farmer credit/financing integration

### **Q2 2026: Expand Market**
- Multi-region support
- B2C marketplace (direct to consumers)
- Export/import facilitation
- Contract farming module

### **Q3 2026: Innovate**
- Blockchain for supply chain transparency
- IoT integration (farm sensors, weather data)
- AI crop yield predictions
- Satellite imagery for farm verification

### **Q4 2026: Scale**
- Franchise/white-label platform
- API marketplace for third-party apps
- Agricultural insurance integration
- Carbon credit tracking

---

## Appendix A: User Personas

### **Persona 1: Jane - Small-Scale Farmer**
**Demographics:** 35 years old, 5-acre farm, produces tomatoes and maize  
**Goals:** Find reliable buyers, get fair prices, reduce post-harvest losses  
**Pain Points:** Middlemen take 40% margin, lack of market information, payment delays  
**Tech Savvy:** Medium - has smartphone, uses WhatsApp daily

### **Persona 2: Michael - Food Processor (Buyer)**
**Demographics:** 42 years old, owns medium-scale processing plant  
**Goals:** Source quality raw materials, reduce procurement costs, ensure supply consistency  
**Pain Points:** Unreliable suppliers, quality inconsistencies, lack of traceability  
**Tech Savvy:** High - uses ERP systems, comfortable with B2B platforms

### **Persona 3: Sarah - Field Officer**
**Demographics:** 28 years old, agricultural extension officer  
**Goals:** Help farmers succeed, verify quality standards, earn extra income  
**Pain Points:** Manual verification processes, lack of tools, travel costs  
**Tech Savvy:** Medium - uses mobile apps for reporting

---

## Appendix B: Wireframe References

*Note: Wireframes to be created in Figma and linked here*

**Key Pages:**
1. Landing page redesign with trust signals
2. Marketplace with advanced filters
3. Product detail with bulk pricing display
4. Checkout flow (3 steps)
5. Farmer dashboard with analytics
6. Admin dashboard layout
7. Messaging interface
8. Mobile-responsive designs

---

## Appendix C: API Specifications

### **Authentication Endpoints**
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
POST   /api/auth/forgot-password
POST   /api/auth/reset-password
```

### **Listing Endpoints (Enhanced)**
```
GET    /api/listings?category=&region=&verified=&minPrice=&maxPrice=
GET    /api/listings/:id
POST   /api/listings
PATCH  /api/listings/:id
DELETE /api/listings/:id
GET    /api/listings/:id/pricing-tiers    [NEW]
POST   /api/listings/:id/pricing-tiers    [NEW]
DELETE /api/pricing-tiers/:id             [NEW]
```

### **Order Endpoints (Enhanced)**
```
POST   /api/orders/checkout
GET    /api/orders/:id
PATCH  /api/orders/:id/status
POST   /api/orders/:id/dispute            [NEW]
GET    /api/orders/:id/tracking            [NEW]
POST   /api/orders/:id/confirm-delivery   [NEW]
```

### **Payment Endpoints** [NEW]
```
POST   /api/payments/initiate
POST   /api/payments/verify
GET    /api/payments/:id
POST   /api/payouts/request
GET    /api/payouts/history
```

### **Messaging Endpoints** [NEW]
```
GET    /api/conversations
GET    /api/conversations/:id/messages
POST   /api/conversations/:id/messages
PATCH  /api/messages/:id/read
POST   /api/conversations/start
```

### **Review Endpoints** [NEW]
```
GET    /api/reviews/user/:userId
POST   /api/reviews/order/:orderId
PATCH  /api/reviews/:id
DELETE /api/reviews/:id (admin only)
```

---

**Document Control:**
- **Author:** AgriCompass Development Team
- **Approval Required:** Product Manager, CTO, CEO
- **Review Cycle:** Quarterly
- **Version History:**
  - v1.0.0 (Nov 15, 2025): Initial PRD creation
