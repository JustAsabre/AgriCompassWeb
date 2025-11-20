# Sprint 4 Planning - Enhanced Features & Missing Functionality
**Sprint Duration:** 2 weeks  
**Sprint Goal:** Complete missing features and enhance existing functionality  
**Version Target:** 0.8.0  
**Date:** November 19, 2025

---

## 📋 Current Status Analysis

### ✅ Already Completed
- Authentication & Security (Sprint 1)
- Bulk Pricing System (Sprint 2)
- Ratings & Reviews System (Sprint 4 - already done)
- Real-time Messaging System (Sprint 2)
- Real-time Notifications (Sprint 2)
- Farmer Verification Workflow (Sprint 2)
- Analytics Dashboards (Sprint 2)
- Order Success & Detail Pages (Sprint 3)
- Session Isolation Security Fixes (Sprint 3.4)

### ❌ Still Missing (From Roadmap)
1. **Password Reset Flow** (Sprint 1)
2. **Email Notifications** (Sprint 3 & 6)
3. **Legal Pages** (Sprint 1)
4. **About/How It Works Page** (Sprint 3)
5. **Contact/Support Page** (Sprint 3)
6. **Enhanced Admin Features**
7. **Payment Integration** (Future)

---

## 🎯 Sprint 4 Goals

### Primary Objectives
1. **Complete Password Reset Functionality**
   - Email service integration
   - Forgot password flow
   - Reset password form
   - Security tokens

2. **Email Notification System**
   - Order confirmations
   - Verification status updates
   - Welcome emails
   - Password reset emails

3. **Legal & Information Pages**
   - Terms of Service
   - Privacy Policy
   - Cookie Policy
   - About Us / How It Works
   - Contact / Support

4. **Enhanced Admin Capabilities**
   - Review moderation UI (currently missing)
   - Platform statistics dashboard
   - User management enhancements

5. **Code Quality & Testing**
   - Set up comprehensive testing
   - Fix any bugs discovered
   - Improve error handling
   - Performance optimization

---

## 📝 Detailed Task Breakdown

### Task 1: Password Reset System
**Priority:** High  
**Estimated Time:** 2 days

#### Backend Tasks
- [ ] Install and configure email service (nodemailer or SendGrid)
- [ ] Create password reset token schema and storage
- [ ] Implement `POST /api/auth/forgot-password` endpoint
  - Generate secure token
  - Store token with expiry (1 hour)
  - Send email with reset link
- [ ] Implement `POST /api/auth/reset-password` endpoint
  - Validate token
  - Update password
  - Invalidate token
  - Send confirmation email
- [ ] Add rate limiting (5 requests per hour per email)

#### Frontend Tasks
- [ ] Create `client/src/pages/forgot-password.tsx`
  - Email input form
  - Success message
  - Error handling
- [ ] Create `client/src/pages/reset-password.tsx`
  - Token validation from URL
  - New password form
  - Confirm password validation
  - Success redirect to login
- [ ] Add "Forgot Password?" link on login page
- [ ] Add routes in App.tsx

#### Testing
- [ ] Test email delivery
- [ ] Test token expiration
- [ ] Test invalid token handling
- [ ] Test rate limiting
- [ ] Test successful password reset flow

---

### Task 2: Email Notification System
**Priority:** High  
**Estimated Time:** 3 days

#### Backend Tasks
- [ ] Set up email service configuration
  - Environment variables (SMTP credentials)
  - Email templates directory
  - HTML email layouts
- [ ] Create email templates
  - `welcome-email.html` (new user registration)
  - `order-confirmation.html` (buyer receives after checkout)
  - `order-received.html` (farmer receives new order)
  - `order-status-update.html` (status changes)
  - `verification-approved.html` (farmer verification approved)
  - `verification-rejected.html` (farmer verification rejected)
  - `password-reset.html` (reset link)
  - `password-changed.html` (confirmation)
- [ ] Create email utility functions in `server/email.ts`
  - `sendWelcomeEmail(user)`
  - `sendOrderConfirmation(order, buyer)`
  - `sendOrderNotificationToFarmer(order, farmer)`
  - `sendVerificationStatusEmail(verification, farmer)`
  - `sendPasswordResetEmail(email, token)`
  - `sendPasswordChangedEmail(email)`
- [ ] Integrate email sending into existing flows
  - User registration → Welcome email
  - Order creation → Confirmation to buyer + notification to farmer
  - Order status change → Update email
  - Verification approval/rejection → Status email
  - Password reset/change → Security emails

#### Frontend Tasks
- [ ] Add loading states to forms during email sending
- [ ] Display success messages after email actions
- [ ] Add email preferences page (future)

#### Testing
- [ ] Test all email templates render correctly
- [ ] Test email delivery (use Mailtrap or similar for dev)
- [ ] Test emails with real email clients (Gmail, Outlook)
- [ ] Test email links work correctly
- [ ] Test error handling when email fails

---

### Task 3: Legal & Information Pages
**Priority:** Medium  
**Estimated Time:** 2 days

#### Content Creation
- [ ] Write Terms of Service content
  - User responsibilities
  - Platform rules
  - Payment terms
  - Dispute resolution
  - Liability disclaimers
- [ ] Write Privacy Policy content
  - Data collection practices
  - Data usage and sharing
  - User rights (GDPR compliance)
  - Cookie usage
  - Contact information
- [ ] Write Cookie Policy content
  - Types of cookies used
  - Purpose of cookies
  - How to disable cookies
  - Third-party cookies
- [ ] Write About Us / How It Works content
  - Platform mission and vision
  - How the platform works (buyer flow)
  - How the platform works (farmer flow)
  - Benefits for each user type
  - Success stories (placeholder)
- [ ] Write Contact / Support content
  - Contact form
  - Support email
  - Regional office information
  - Social media links
  - FAQ section

#### Frontend Tasks
- [ ] Create `client/src/pages/terms-of-service.tsx`
- [ ] Create `client/src/pages/privacy-policy.tsx`
- [ ] Create `client/src/pages/cookie-policy.tsx`
- [ ] Create `client/src/pages/about.tsx`
- [ ] Create `client/src/pages/contact.tsx`
- [ ] Create `client/src/components/footer.tsx`
  - Links to all legal pages
  - Copyright notice
  - Social media icons
  - Quick links
- [ ] Add footer to main layout (App.tsx)
- [ ] Add routes for all new pages
- [ ] Create cookie consent banner component
  - Accept/Decline buttons
  - Link to Cookie Policy
  - Store consent in localStorage

#### Styling
- [ ] Consistent typography for legal content
- [ ] Responsive layout for all pages
- [ ] Print-friendly styling for legal pages
- [ ] Accessible navigation

---

### Task 4: Enhanced Admin Features
**Priority:** Medium  
**Estimated Time:** 2 days

#### Review Moderation UI
- [ ] Update `client/src/pages/admin-reviews.tsx`
  - Add tabs (All / Pending / Approved / Rejected)
  - Add approve/reject action buttons
  - Add bulk actions (approve all, delete all)
  - Add review details modal
  - Add filter by rating
  - Add search by user name
- [ ] Test moderation workflow
  - Approve review → Shows on profile
  - Reject review → Hidden from public
  - Delete review → Permanently removed

#### Platform Statistics Dashboard
- [ ] Create `client/src/pages/admin-dashboard.tsx`
  - Total users by role (pie chart)
  - Orders over time (line chart)
  - Revenue over time (line chart)
  - Top farmers by sales (table)
  - Top buyers by spending (table)
  - Active verifications count
  - Recent disputes (if any)
- [ ] Create `GET /api/admin/stats` endpoint
  - User counts by role
  - Order statistics
  - Revenue metrics
  - Listing statistics
  - Verification statistics

#### User Management Enhancements
- [ ] Add user search/filter in admin panel
- [ ] Add user ban/unban functionality
- [ ] Add user verification status toggle
- [ ] Add activity log view for users

---

### Task 5: Code Quality & Testing
**Priority:** High  
**Estimated Time:** 3 days

#### Testing Setup
- [ ] Fix existing test failures (3 client tests)
- [ ] Add tests for password reset flow
- [ ] Add tests for email sending
- [ ] Add tests for new legal pages (rendering)
- [ ] Add tests for admin features
- [ ] Increase test coverage to 75%+

#### Bug Fixes & Improvements
- [ ] Review all console errors in browser
- [ ] Fix any TypeScript errors
- [ ] Improve error messages across the app
- [ ] Add loading skeletons for better UX
- [ ] Optimize images (compress, lazy load)
- [ ] Add meta tags for SEO
- [ ] Improve accessibility (aria labels, keyboard navigation)

#### Performance Optimization
- [ ] Analyze bundle size
- [ ] Code splitting for routes
- [ ] Lazy load heavy components
- [ ] Optimize API queries (add indexes if needed)
- [ ] Add caching headers

#### Documentation
- [ ] Update README with new features
- [ ] Document email configuration in .env.example
- [ ] Update API documentation
- [ ] Add setup guide for email service
- [ ] Update CHANGELOG

---

## 🔄 Daily Breakdown (2 Weeks)

### Week 1

#### Day 1 (Monday)
- Set up email service (nodemailer/SendGrid)
- Create email templates directory structure
- Implement basic email utility functions
- Test email sending in development

#### Day 2 (Tuesday)
- Implement password reset backend endpoints
- Create password reset token storage
- Add rate limiting
- Test backend flow

#### Day 3 (Wednesday)
- Create forgot password frontend page
- Create reset password frontend page
- Add routes and navigation
- Test complete password reset flow

#### Day 4 (Thursday)
- Create all HTML email templates
- Integrate emails into existing flows
- Test email delivery
- Test email rendering

#### Day 5 (Friday)
- Create Terms of Service page
- Create Privacy Policy page
- Create Cookie Policy page
- Create Footer component
- Sprint review & retrospective prep

### Week 2

#### Day 6 (Monday)
- Create About Us / How It Works page
- Create Contact / Support page
- Add cookie consent banner
- Test all legal pages

#### Day 7 (Tuesday)
- Enhance admin reviews page (moderation UI)
- Add approve/reject actions
- Add bulk actions
- Test moderation workflow

#### Day 8 (Wednesday)
- Create admin statistics dashboard
- Implement admin stats API endpoint
- Add charts and metrics
- Test admin dashboard

#### Day 9 (Thursday)
- Fix existing test failures
- Add new tests for Sprint 4 features
- Improve test coverage
- Run full test suite

#### Day 10 (Friday)
- Bug fixes from testing
- Performance optimization
- Documentation updates
- Final testing
- **Sprint Demo & Review**

---

## ✅ Definition of Done

A task is considered complete when:
- [ ] Code implemented and working
- [ ] No TypeScript errors
- [ ] No console errors/warnings
- [ ] Tests written and passing
- [ ] Code reviewed (self-review at minimum)
- [ ] Documentation updated
- [ ] Tested in multiple browsers
- [ ] Responsive on mobile
- [ ] Accessible (WCAG AA)
- [ ] Committed to git with clear message

---

## 📊 Success Metrics

### Functional Metrics
- [ ] Password reset works end-to-end
- [ ] All emails deliver successfully
- [ ] All legal pages accessible and readable
- [ ] Admin can moderate reviews
- [ ] Admin dashboard shows accurate stats
- [ ] Zero critical bugs

### Technical Metrics
- [ ] Test coverage ≥ 75%
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score ≥ 85
- [ ] Zero TypeScript errors
- [ ] Zero high-severity vulnerabilities

### User Experience Metrics
- [ ] Email templates render correctly in Gmail, Outlook, Apple Mail
- [ ] Legal pages are readable and printable
- [ ] Admin UI is intuitive
- [ ] All forms have proper validation
- [ ] Error messages are helpful

---

## 🎯 Sprint Demo Checklist

Prepare to demonstrate:
1. **Password Reset Flow**
   - Forgot password form
   - Email received with reset link
   - Reset password form
   - Successful login with new password

2. **Email Notifications**
   - Registration → Welcome email
   - Order placement → Confirmation emails
   - Verification approval → Status email

3. **Legal Pages Tour**
   - Footer with all legal links
   - Terms of Service
   - Privacy Policy
   - About Us / How It Works
   - Contact page

4. **Admin Features**
   - Review moderation (approve/reject)
   - Platform statistics dashboard
   - User management

5. **Code Quality**
   - Test coverage report
   - Performance metrics
   - Browser console (no errors)

---

## 🚧 Potential Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Email service setup issues | High | Use nodemailer with Gmail first, then migrate to SendGrid |
| Email deliverability (spam) | High | Use reputable SMTP, add SPF/DKIM records, test thoroughly |
| Legal content accuracy | Medium | Use templates from established platforms, add disclaimer |
| Testing takes longer than expected | Medium | Prioritize critical paths, automate where possible |

---

## 📦 Dependencies

### New npm Packages
```json
{
  "nodemailer": "^6.9.7",
  "@types/nodemailer": "^6.4.14",
  "handlebars": "^4.7.8",
  "juice": "^10.0.0" // Inline CSS for emails
}
```

### Environment Variables (.env)
```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=AgriCompass <noreply@agricompass.com>

# Frontend URL (for email links)
FRONTEND_URL=http://localhost:5000
```

---

## 📝 Notes

- Email templates should be responsive (mobile-friendly)
- Use inline CSS for email compatibility
- Test emails with real email clients
- Legal pages should be version-controlled (date + version number)
- Admin features require proper role checks (isAdmin)
- All new routes need to be protected appropriately

---

## 🎉 Sprint 4 Completion Criteria

Sprint is complete when:
- ✅ All tasks marked as done
- ✅ Demo successfully presented
- ✅ All tests passing
- ✅ Documentation updated
- ✅ Code pushed to GitHub
- ✅ CHANGELOG updated
- ✅ Team retrospective completed

**Expected Completion Date:** December 3, 2025  
**Next Sprint:** Sprint 5 - Payment Integration & Advanced Features

---

**Document Created:** November 19, 2025  
**Sprint Owner:** Development Team  
**Status:** Planning Phase
