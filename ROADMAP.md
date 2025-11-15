# AgriCompass Implementation Roadmap
**Project Duration:** 24 weeks (6 months)  
**Team Size:** 4 developers  
**Sprint Duration:** 2 weeks  
**Total Sprints:** 12

---

## 📋 Project Overview

### Current Status
- **MVP Completion:** ~65%
- **Code Quality:** Good foundation, needs testing
- **Technical Debt:** Low (new project)
- **Blocker Issues:** None critical

### Team Structure (Recommended)
- **Developer 1:** Full-stack lead (Backend APIs, Database)
- **Developer 2:** Frontend specialist (React, UI/UX)
- **Developer 3:** Full-stack (Features, Integration)
- **Developer 4:** DevOps/QA (Testing, Deployment, Infrastructure)

---

## 🎯 Sprint-by-Sprint Breakdown

### **SPRINT 1 (Weeks 1-2): Foundation & Security**
**Goal:** Production-ready authentication and security hardening

#### Developer 1 (Backend Lead)
- [ ] Implement password reset flow
  - Email service setup (SendGrid/AWS SES)
  - Reset token generation & validation
  - API endpoints: `/api/auth/forgot-password`, `/api/auth/reset-password`
- [ ] Add rate limiting middleware (express-rate-limit)
  - 100 requests/15 minutes per IP
  - 5 login attempts/hour per account
- [ ] Implement CSRF protection (csurf)
- [ ] Add input validation middleware (express-validator)

#### Developer 2 (Frontend)
- [ ] Create password reset pages
  - Forgot password form
  - Email sent confirmation
  - Reset password form
- [ ] Add loading states and error boundaries
- [ ] Implement client-side validation
- [ ] Design system audit (ensure consistency)

#### Developer 3 (Full-stack)
- [ ] Create Terms of Service page
- [ ] Create Privacy Policy page
- [ ] Create Cookie Policy page
- [ ] Add footer with policy links
- [ ] Implement cookie consent banner

#### Developer 4 (DevOps/QA)
- [ ] Set up testing framework (Jest + React Testing Library)
- [ ] Configure ESLint and Prettier
- [ ] Set up GitHub Actions CI/CD pipeline
- [ ] Write tests for authentication flows
- [ ] Set up staging environment

**Deliverables:**
- ✅ Password reset functional
- ✅ Security middleware active
- ✅ Legal pages published
- ✅ CI/CD pipeline running
- ✅ 40% test coverage

**Demo:** Password reset flow + security headers inspection

---

### **SPRINT 2 (Weeks 3-4): Bulk Pricing System**
**Goal:** Enable farmers to set tiered pricing for bulk orders

#### Developer 1 (Backend Lead)
- [ ] Create pricing tiers API endpoints
  ```
  POST   /api/listings/:id/pricing-tiers
  GET    /api/listings/:id/pricing-tiers
  DELETE /api/pricing-tiers/:id
  PATCH  /api/pricing-tiers/:id
  ```
- [ ] Add pricing tier validation logic
- [ ] Update checkout to calculate tiered pricing
- [ ] Write API tests for pricing tiers

#### Developer 2 (Frontend)
- [ ] Design pricing tier UI components
  - PricingTierForm (on create-listing page)
  - PricingTierTable (editable tiers)
  - BulkPricingDisplay (product detail page)
  - SavingsCalculator (cart page)
- [ ] Implement real-time price calculation
- [ ] Add visual indicators for savings

#### Developer 3 (Full-stack)
- [ ] Update create-listing page with pricing tier section
- [ ] Update product detail page to show tiers
- [ ] Update cart to show tier discounts
- [ ] Add pricing tier examples/help text

#### Developer 4 (DevOps/QA)
- [ ] Write E2E tests for bulk pricing flow
- [ ] Performance testing on pricing calculations
- [ ] Database query optimization
- [ ] Load testing (simulate 1000 concurrent checkouts)

**Deliverables:**
- ✅ Farmers can create up to 5 pricing tiers
- ✅ Buyers see automatic discounts
- ✅ Cart shows savings clearly
- ✅ 60% test coverage

**Demo:** Create listing with 3 tiers → Add to cart → See discount applied

---

### **SPRINT 3 (Weeks 5-6): Order Success & Enhanced UX**
**Goal:** Complete order lifecycle with confirmations

#### Developer 1 (Backend Lead)
- [ ] Implement email notification service
  - Order confirmation emails (buyer + farmer)
  - Receipt generation (HTML template)
- [ ] Create order detail API endpoint
- [ ] Add order number generation (unique, readable)
- [ ] Implement order status webhooks

#### Developer 2 (Frontend)
- [ ] Create Order Success page
  - Order number display
  - Summary of items
  - Farmer contact info
  - Next steps timeline
- [ ] Create Order Detail page (buyer & farmer views)
- [ ] Add order tracking timeline component
- [ ] Improve mobile responsiveness

#### Developer 3 (Full-stack)
- [ ] Create About/How It Works page
  - Platform workflow explanation
  - Infographics/illustrations
  - Video embed (explainer video)
- [ ] Create Contact/Support page
  - Contact form (sends email)
  - Regional office info
  - Social media links

#### Developer 4 (DevOps/QA)
- [ ] Set up email monitoring (delivery rates)
- [ ] Test email rendering across clients
- [ ] Mobile responsiveness testing
- [ ] Accessibility audit (WCAG AA)

**Deliverables:**
- ✅ Order confirmation emails sent
- ✅ Order success page functional
- ✅ About & Contact pages live
- ✅ Mobile-optimized UI
- ✅ 65% test coverage

**Demo:** Complete checkout → Receive email → View order details

---

### **SPRINT 4 (Weeks 7-8): Ratings & Reviews System**
**Goal:** Build trust through transparent feedback

#### Developer 1 (Backend Lead)
- [ ] Create reviews database schema
  ```sql
  CREATE TABLE reviews (
    id, order_id, reviewer_id, reviewee_id,
    rating INTEGER CHECK (1-5),
    comment TEXT, created_at
  );
  ```
- [ ] Implement reviews API
  ```
  POST   /api/reviews/order/:orderId
  GET    /api/reviews/user/:userId
  PATCH  /api/reviews/:id
  DELETE /api/reviews/:id (admin)
  ```
- [ ] Add average rating calculation
- [ ] Prevent duplicate reviews per order

#### Developer 2 (Frontend)
- [ ] Create ReviewForm component
- [ ] Create ReviewDisplay component (star rating + comment)
- [ ] Add reviews section to farmer profile
- [ ] Create review moderation UI (admin)
- [ ] Add rating filter to marketplace

#### Developer 3 (Full-stack)
- [ ] Update order completion flow to prompt review
- [ ] Add "Review this order" button
- [ ] Display farmer average rating on listings
- [ ] Create buyer ratings page (view received reviews)

#### Developer 4 (DevOps/QA)
- [ ] Test review submission flow
- [ ] Test rating calculations
- [ ] Test spam prevention
- [ ] Security audit (prevent rating manipulation)

**Deliverables:**
- ✅ Buyers can review farmers after delivery
- ✅ Farmers can review buyers
- ✅ Average ratings displayed prominently
- ✅ Admin can moderate inappropriate reviews
- ✅ 70% test coverage

**Demo:** Complete order → Leave 5-star review → See rating on profile

---

### **SPRINT 5 (Weeks 9-10): In-App Messaging (Part 1)**
**Goal:** Enable buyer-farmer communication

#### Developer 1 (Backend Lead)
- [ ] Design messaging database schema
  ```sql
  CREATE TABLE conversations (
    id, participant_1_id, participant_2_id,
    last_message_at, created_at
  );
  CREATE TABLE messages (
    id, conversation_id, sender_id,
    content, read, created_at
  );
  ```
- [ ] Implement messaging API
  ```
  POST   /api/conversations/start
  GET    /api/conversations
  GET    /api/conversations/:id/messages
  POST   /api/conversations/:id/messages
  PATCH  /api/messages/:id/read
  ```
- [ ] Add real-time polling (long-polling or SSE)

#### Developer 2 (Frontend)
- [ ] Create Conversations List page
- [ ] Create Chat interface component
- [ ] Add unread message badge
- [ ] Implement message timestamps (relative time)
- [ ] Add "Contact Farmer" button on listings

#### Developer 3 (Full-stack)
- [ ] Create message notification logic
- [ ] Add auto-refresh for conversations
- [ ] Implement message templates
  - "What's the minimum order quantity?"
  - "Is this product organic certified?"
  - "Can you deliver to [region]?"

#### Developer 4 (DevOps/QA)
- [ ] Load testing for messaging
- [ ] Test concurrent conversations
- [ ] Security audit (message encryption at rest)
- [ ] Test message delivery reliability

**Deliverables:**
- ✅ Users can send/receive messages
- ✅ Conversations organized by recency
- ✅ Unread count displayed
- ✅ Message templates available
- ✅ 72% test coverage

**Demo:** Buyer asks farmer question → Farmer replies → Real-time update

---

### **SPRINT 6 (Weeks 11-12): Notifications System**
**Goal:** Keep users informed of important events

#### Developer 1 (Backend Lead)
- [ ] Create notifications database schema
  ```sql
  CREATE TABLE notifications (
    id, user_id, type, title, content,
    read, action_url, created_at
  );
  CREATE TABLE notification_preferences (
    user_id, email_orders, email_messages,
    email_marketing, sms_orders
  );
  ```
- [ ] Implement notifications API
  ```
  GET    /api/notifications
  PATCH  /api/notifications/:id/read
  PATCH  /api/notifications/mark-all-read
  GET    /api/notifications/preferences
  PATCH  /api/notifications/preferences
  ```
- [ ] Create notification triggers
  - Order placed, accepted, shipped, completed
  - New message received
  - Verification status changed
  - Payment received

#### Developer 2 (Frontend)
- [ ] Create Notifications dropdown (header)
- [ ] Create Notifications Center page
- [ ] Add notification preferences page
- [ ] Implement notification badges
- [ ] Add notification sound/browser notification

#### Developer 3 (Full-stack)
- [ ] Implement email notifications
  - Order updates
  - Message notifications (digest)
  - Weekly summary
- [ ] Create email templates (responsive HTML)
- [ ] Add unsubscribe links

#### Developer 4 (DevOps/QA)
- [ ] Test notification delivery reliability
- [ ] Test email deliverability (spam score)
- [ ] Performance testing (10k notifications/min)
- [ ] Test browser notification permissions

**Deliverables:**
- ✅ In-app notification center
- ✅ Email notifications sent
- ✅ User preferences customizable
- ✅ Real-time notification badges
- ✅ 75% test coverage

**Demo:** Place order → See notification → Click to view order

---

### **SPRINT 7 (Weeks 13-14): Payment Integration (Part 1)**
**Goal:** Enable secure payment processing

#### Developer 1 (Backend Lead)
- [ ] Research and select payment provider (Stripe, Flutterwave, M-Pesa)
- [ ] Create payments database schema
  ```sql
  CREATE TABLE payments (
    id, order_id, payer_id, amount,
    payment_method, transaction_id,
    status, created_at
  );
  ```
- [ ] Implement payment API
  ```
  POST   /api/payments/initiate
  POST   /api/payments/verify
  GET    /api/payments/:id
  POST   /api/payments/webhook (provider callback)
  ```
- [ ] Implement escrow logic (hold funds until delivery)

#### Developer 2 (Frontend)
- [ ] Create Payment Methods page
- [ ] Integrate payment provider SDK
- [ ] Add payment form to checkout
- [ ] Create payment success/failure pages
- [ ] Add payment status badges

#### Developer 3 (Full-stack)
- [ ] Implement deposit system (30% upfront, 70% on delivery)
- [ ] Add payment status to order detail page
- [ ] Create payment history page (buyer)
- [ ] Add "Pay Now" button for pending payments

#### Developer 4 (DevOps/QA)
- [ ] Set up payment provider sandbox
- [ ] Test payment flows (success, failure, cancel)
- [ ] Security audit (PCI DSS compliance)
- [ ] Test webhook handling
- [ ] Load testing payment processing

**Deliverables:**
- ✅ Buyers can pay via card/bank transfer
- ✅ Escrow system functional
- ✅ Payment confirmations sent
- ✅ Secure payment handling
- ✅ 78% test coverage

**Demo:** Checkout → Pay 30% deposit → Funds held in escrow

---

### **SPRINT 8 (Weeks 15-16): Payouts & Financial Reporting**
**Goal:** Enable farmer payouts and financial tracking

#### Developer 1 (Backend Lead)
- [ ] Create payouts database schema
  ```sql
  CREATE TABLE payouts (
    id, farmer_id, amount, status,
    bank_account, scheduled_date,
    completed_at, created_at
  );
  ```
- [ ] Implement payouts API
  ```
  POST   /api/payouts/request
  GET    /api/payouts/history
  PATCH  /api/payouts/:id/status (admin)
  GET    /api/payouts/balance
  ```
- [ ] Create automated payout scheduling
- [ ] Add bank account validation

#### Developer 2 (Frontend)
- [ ] Create Payouts page (farmer dashboard)
- [ ] Add bank account management
- [ ] Create payout request form
- [ ] Display payout history table
- [ ] Add revenue analytics charts

#### Developer 3 (Full-stack)
- [ ] Create financial reports
  - Monthly earnings statement
  - Tax documentation (CSV export)
  - Transaction history
- [ ] Implement CSV/PDF export
- [ ] Add invoice generation

#### Developer 4 (DevOps/QA)
- [ ] Test payout calculations
- [ ] Test bank account validation
- [ ] Security audit (financial data encryption)
- [ ] Test report generation performance

**Deliverables:**
- ✅ Farmers can request payouts
- ✅ Automated weekly/monthly payouts
- ✅ Financial reports exportable
- ✅ Bank account management secure
- ✅ 80% test coverage

**Demo:** Farmer completes orders → Requests payout → Receives funds

---

### **SPRINT 9 (Weeks 17-18): Disputes & Claims System**
**Goal:** Handle order conflicts professionally

#### Developer 1 (Backend Lead)
- [ ] Create disputes database schema
  ```sql
  CREATE TABLE disputes (
    id, order_id, raised_by, reason,
    description, status, resolution,
    resolved_by, resolved_at, created_at
  );
  CREATE TABLE dispute_messages (
    id, dispute_id, sender_id, message,
    attachment_url, created_at
  );
  ```
- [ ] Implement disputes API
  ```
  POST   /api/disputes (create)
  GET    /api/disputes/:id
  POST   /api/disputes/:id/messages
  PATCH  /api/disputes/:id/resolve (admin)
  ```

#### Developer 2 (Frontend)
- [ ] Create "Open Dispute" button on orders
- [ ] Create Dispute Form (with file upload)
- [ ] Create Dispute Detail page (chat interface)
- [ ] Create Admin Dispute Resolution UI
- [ ] Add dispute status badges

#### Developer 3 (Full-stack)
- [ ] Implement file upload (evidence photos)
- [ ] Create dispute notification emails
- [ ] Add dispute escalation workflow
- [ ] Create dispute analytics (admin dashboard)

#### Developer 4 (DevOps/QA)
- [ ] Test dispute creation flow
- [ ] Test file upload security
- [ ] Test admin resolution workflow
- [ ] Performance testing

**Deliverables:**
- ✅ Users can open disputes
- ✅ Admin can mediate disputes
- ✅ Evidence upload supported
- ✅ Resolution workflow complete
- ✅ 82% test coverage

**Demo:** Buyer opens dispute → Admin reviews → Resolves with partial refund

---

### **SPRINT 10 (Weeks 19-20): Logistics & Fulfillment**
**Goal:** Complete order lifecycle with delivery tracking

#### Developer 1 (Backend Lead)
- [ ] Create logistics database schema
  ```sql
  CREATE TABLE delivery_options (
    id, listing_id, type, cost,
    estimated_days, available_regions
  );
  CREATE TABLE shipments (
    id, order_id, carrier, tracking_number,
    status, shipped_at, delivered_at
  );
  ```
- [ ] Implement logistics API
  ```
  POST   /api/orders/:id/ship
  GET    /api/orders/:id/tracking
  POST   /api/orders/:id/confirm-delivery
  PATCH  /api/shipments/:id/status
  ```

#### Developer 2 (Frontend)
- [ ] Create Delivery Options form (create listing)
- [ ] Create Shipment Creation form (farmer)
- [ ] Create Tracking page (buyer view)
- [ ] Add delivery timeline component
- [ ] Create "Confirm Delivery" button

#### Developer 3 (Full-stack)
- [ ] Integrate third-party tracking API (optional)
- [ ] Create delivery confirmation emails
- [ ] Add SMS notifications for delivery updates
- [ ] Implement delivery photos upload

#### Developer 4 (DevOps/QA)
- [ ] Test delivery workflow end-to-end
- [ ] Test tracking number validation
- [ ] Test delivery confirmation triggers payment release
- [ ] Load testing

**Deliverables:**
- ✅ Farmers can create shipments
- ✅ Buyers can track deliveries
- ✅ Delivery confirmation releases payment
- ✅ SMS notifications sent
- ✅ 85% test coverage

**Demo:** Farmer ships order → Buyer tracks → Confirms delivery → Payment released

---

### **SPRINT 11 (Weeks 21-22): Admin Dashboard & Analytics**
**Goal:** Platform management and insights

#### Developer 1 (Backend Lead)
- [ ] Create admin analytics endpoints
  ```
  GET /api/admin/stats (users, orders, revenue)
  GET /api/admin/users?filters
  PATCH /api/admin/users/:id (ban, verify)
  GET /api/admin/listings?status=pending
  PATCH /api/admin/listings/:id/approve
  GET /api/admin/disputes
  ```
- [ ] Implement data aggregation cron jobs
- [ ] Add admin activity logging

#### Developer 2 (Frontend)
- [ ] Create Admin Dashboard layout
  - User management table
  - Listing moderation queue
  - Order monitoring
  - Revenue charts (Chart.js)
- [ ] Create admin navigation
- [ ] Add data tables with filters/search
- [ ] Create user ban/verify modals

#### Developer 3 (Full-stack)
- [ ] Create Market Insights page
  - Price trends by category
  - Regional demand heatmaps
  - Seasonal trends
- [ ] Create Seller Performance page
  - Top sellers leaderboard
  - Performance badges
- [ ] Create exportable reports

#### Developer 4 (DevOps/QA)
- [ ] Test admin permissions
- [ ] Security audit (admin access control)
- [ ] Performance testing (large datasets)
- [ ] Test data export functionality

**Deliverables:**
- ✅ Admin can manage users and listings
- ✅ Analytics dashboards functional
- ✅ Market insights available
- ✅ Reports exportable
- ✅ 88% test coverage

**Demo:** Admin logs in → Views platform stats → Approves listing → Bans abusive user

---

### **SPRINT 12 (Weeks 23-24): Polish, Testing & Launch Prep**
**Goal:** Production-ready platform with comprehensive testing

#### Developer 1 (Backend Lead)
- [ ] Final API optimization
- [ ] Database indexing review
- [ ] Implement Redis caching for frequent queries
- [ ] Set up database backups
- [ ] Create API documentation (Swagger/OpenAPI)

#### Developer 2 (Frontend)
- [ ] UI/UX polish (animations, transitions)
- [ ] Create FAQ page
- [ ] Create Help Center/Knowledge Base
- [ ] Final mobile responsiveness fixes
- [ ] Implement PWA features (offline support)

#### Developer 3 (Full-stack)
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Social media sharing (OpenGraph tags)
- [ ] Google Analytics integration
- [ ] Create demo video/screenshots
- [ ] Final bug fixes

#### Developer 4 (DevOps/QA)
- [ ] Comprehensive security audit (OWASP Top 10)
- [ ] Load testing (10,000 concurrent users)
- [ ] Penetration testing
- [ ] Set up production monitoring (Sentry, New Relic)
- [ ] Create runbooks for common issues
- [ ] Final E2E testing suite
- [ ] Performance optimization
- [ ] Set up CDN for images
- [ ] Deploy to production

**Deliverables:**
- ✅ 90%+ test coverage
- ✅ All critical bugs fixed
- ✅ Performance benchmarks met
- ✅ Security audit passed
- ✅ Production deployment successful
- ✅ Monitoring and alerting active

**Demo:** Full platform walkthrough (all user roles)

---

## 📊 Progress Tracking

### Definition of Done (DoD)
A feature is considered "done" when:
- [ ] Code reviewed and approved by at least 1 teammate
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Documented (code comments + README updates)
- [ ] Deployed to staging and tested
- [ ] Product owner accepted
- [ ] Merged to main branch

### Sprint Metrics
Track these KPIs each sprint:
- **Velocity:** Story points completed
- **Burndown:** Remaining work vs. time
- **Bug Count:** New bugs vs. resolved bugs
- **Test Coverage:** Percentage increase
- **Code Review Time:** Average hours to approval
- **Deployment Frequency:** Number of deploys to staging

### Quality Gates
Before each sprint demo:
- [ ] All tests passing
- [ ] No critical/high bugs
- [ ] Test coverage ≥ target %
- [ ] Lighthouse score ≥ 90 (performance)
- [ ] No security vulnerabilities (Snyk/OWASP ZAP)

---

## 🚀 Post-Sprint 12: Launch & Iteration

### Week 25: Soft Launch
- Release to 50 beta users (farmers + buyers)
- Collect feedback via in-app surveys
- Monitor error rates and performance
- Hot-fix critical issues within 24 hours

### Week 26: Public Launch
- Press release and marketing push
- Onboard first 100 farmers
- Social media campaign
- Influencer partnerships (agricultural experts)

### Weeks 27-30: Iteration Based on Feedback
- Prioritize top 10 user-requested features
- Fix usability issues
- Optimize based on real-world data
- Plan Phase 2 features (mobile apps, AI recommendations)

---

## 🛠️ Technical Debt Management

### Continuous Refactoring
Each sprint, allocate 20% time to:
- Code refactoring
- Documentation updates
- Dependency updates
- Performance optimization

### Monthly Reviews
- Architecture review (scaling bottlenecks)
- Security review (CVE scanning)
- Accessibility audit
- Performance benchmarking

---

## 📚 Knowledge Sharing

### Weekly Practices
- **Stand-ups:** Daily (15 min) - blockers, progress, plans
- **Code Reviews:** Within 24 hours
- **Pair Programming:** Complex features
- **Knowledge Sharing:** Friday demos (15 min each developer)

### Documentation
Maintain these living documents:
- API documentation (auto-generated from code)
- Architecture decision records (ADRs)
- Runbooks for production issues
- Onboarding guide for new developers

---

## 🎓 Learning & Growth

### Skill Development
Each developer should:
- Complete 1 online course (React, Node.js, DevOps, Testing)
- Read 1 technical book per quarter
- Contribute to open source (1 PR/month)
- Attend 1 tech conference/year (virtual or in-person)

### Code Quality Standards
- ESLint + Prettier enforced
- TypeScript strict mode
- No `any` types (use `unknown` with type guards)
- 100% type coverage
- Meaningful variable names
- Comments explain "why" not "what"

---

## ⚠️ Risk Mitigation

### Technical Risks
| Risk | Mitigation |
|------|------------|
| Payment integration delays | Start early (Sprint 7), have fallback provider |
| Real-time messaging scalability | Use Socket.io with Redis adapter, implement polling fallback |
| Database performance at scale | Proper indexing from day 1, query optimization |

### Team Risks
| Risk | Mitigation |
|------|------------|
| Developer illness/leave | Cross-training, pair programming, documentation |
| Scope creep | Strict sprint planning, product owner approval required |
| Burnout | Monitor workload, enforce 40-hour weeks, team activities |

---

## 🎉 Celebration Milestones

- **Sprint 3:** First paying customer (simulated)
- **Sprint 6:** 50% feature completion party
- **Sprint 9:** Team outing/dinner
- **Sprint 12:** Launch celebration + bonus
- **Month 7:** 1,000 users milestone celebration

---

## 📞 Support & Escalation

### Issue Severity Levels
- **P0 (Critical):** Platform down, payment failures - Fix within 2 hours
- **P1 (High):** Major feature broken - Fix within 24 hours
- **P2 (Medium):** Minor feature broken - Fix within 3 days
- **P3 (Low):** Enhancement, UX improvement - Next sprint

### On-Call Rotation
- Week 1-2: Developer 1
- Week 3-4: Developer 2
- Week 5-6: Developer 3
- Week 7-8: Developer 4

---

## 📈 Success Metrics (6-Month Targets)

### Platform Metrics
- 500 registered farmers
- 1,000 registered buyers
- 50 field officers
- $100,000 GMV (Gross Merchandise Value)
- 80% order completion rate
- 4.5+ average rating
- 99.9% uptime

### Technical Metrics
- Page load time < 2 seconds
- API response time < 500ms (p95)
- Test coverage ≥ 90%
- Zero critical security vulnerabilities
- Lighthouse score ≥ 90

### Business Metrics
- 70% user retention (month-over-month)
- 20% month-over-month GMV growth
- $500+ average order value
- < 5% dispute rate
- 10,000+ monthly active users

---

**Last Updated:** November 15, 2025  
**Next Review:** End of Sprint 3 (Week 6)  
**Document Owner:** Development Team Lead
