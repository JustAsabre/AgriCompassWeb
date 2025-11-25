# Testing Guide - Sprint 4 Email System

## Prerequisites

Before testing, you need to set up your email service:

### 1. Get Your Free Resend API Key (5 minutes)

1. Go to **https://resend.com**
2. Click "Get Started" → Sign up (no credit card needed)
3. Verify your email
4. Go to **API Keys** section
5. Click **"Create API Key"**
6. Give it a name like "AgriCompass Dev"
7. Copy the key (starts with `re_`)

### 2. Configure Your Environment

1. Create a `.env` file in the project root (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Resend API key:
   ```bash
   # Email Configuration
   RESEND_API_KEY=re_your_actual_api_key_here
   EMAIL_FROM=AgriCompass <onboarding@resend.dev>
   
   # Other settings
   SESSION_SECRET=agricompass-dev-secret-change-in-production
   PORT=5000
   FRONTEND_URL=http://localhost:5000
   ```

3. Save the file

---

## Quick Start Testing

### Start the Server

```bash
# Install dependencies (if you haven't already)
npm install

# Start the development server
npm run dev
```

You should see:
```
Server running on port 5000
```

---

## Test Plan

### ✅ Test 1: Welcome Email (Registration)

**What it tests**: New user registration sends a welcome email

**Steps**:
1. Open browser: **http://localhost:5000**
2. Click **"Get Started"** or **"Sign Up"**
3. Fill in registration form:
   - **Full Name**: Test Farmer
   - **Email**: `your-actual-email@gmail.com` (use your real email!)
   - **Password**: Test123!
   - **Role**: Farmer
4. Click **"Register"**
5. **Check your email inbox** (may take 5-30 seconds)

**Expected Result**:
- ✅ Registration succeeds
- ✅ You're redirected to farmer dashboard
- ✅ You receive a welcome email with:
  - Subject: "Welcome to AgriCompass!"
  - Personalized greeting with your name
  - Role-specific getting started tips
  - "Go to Dashboard" button

**Verify in Terminal**:
```
Email sent via Resend to your-actual-email@gmail.com
```

**Troubleshooting**:
- Email not received? Check spam folder
- Check terminal for errors
- Verify `RESEND_API_KEY` is set in `.env`

---

### ✅ Test 2: Password Reset Request

**What it tests**: Forgotten password sends reset link

**Steps**:
1. Go to login page: **http://localhost:5000/login**
2. Click **"Forgot password?"**
3. Enter your email: `your-actual-email@gmail.com`
4. Click **"Send Reset Link"**
5. **Check your email inbox**

**Expected Result**:
- ✅ Success message: "Password reset link sent to your email"
- ✅ You receive an email with:
  - Subject: "Reset Your Password - AgriCompass"
  - **"Reset Password"** button with unique token
  - Link expires in 1 hour warning

**Verify in Terminal**:
```
Email sent via Resend to your-actual-email@gmail.com
```

**Note**: The reset link will look like:
```
http://localhost:5000/reset-password?token=abc123...
```

---

### ✅ Test 3: Password Reset Completion

**What it tests**: Using the reset link updates password and sends confirmation

**Steps**:
1. **Click the reset link** from the email (or copy/paste in browser)
2. You'll see the reset password page
3. Enter new password: `NewTest123!`
4. Confirm password: `NewTest123!`
5. Click **"Reset Password"**
6. **Check your email inbox again**

**Expected Result**:
- ✅ Success message: "Password reset successfully"
- ✅ Redirected to login page
- ✅ You receive a confirmation email:
  - Subject: "Your Password Was Changed - AgriCompass"
  - Security alert if you didn't make the change
  - Security tips

**Verify in Terminal**:
```
Email sent via Resend to your-actual-email@gmail.com
```

**Test Login**:
1. Log in with your email and **new password**: `NewTest123!`
2. ✅ Should work!

---

### ✅ Test 4: Order Confirmation Emails

**What it tests**: Placing an order sends emails to both buyer and farmer

**Setup**:
1. **Create a farmer account** (if you haven't):
   - Register as "Farmer One" with `farmer@test.com`
   - Log in

2. **Create a product listing**:
   - Go to Farmer Dashboard → **"Create New Listing"**
   - Product: Tomatoes
   - Price: $5/kg
   - Quantity: 100 kg
   - Category: Vegetables
   - Upload an image (optional)
   - Click **"Create Listing"**

3. **Logout** and **create a buyer account**:
   - Register as "Buyer One" with `buyer@test.com`
   - Log in

**Test Steps**:
1. Go to **Marketplace** (http://localhost:5000/marketplace)
2. Find the "Tomatoes" listing
3. Click **"Add to Cart"**
4. Enter quantity: 10 kg
5. Click **"Add to Cart"**
6. Click **Cart icon** (top right)
7. Click **"Checkout"**
8. Fill in delivery address: "123 Main St, City"
9. Click **"Place Order"**
10. **Check BOTH email inboxes** (farmer@test.com and buyer@test.com)

**Expected Result**:

**Buyer Email** (buyer@test.com):
- ✅ Subject: "Order Confirmed #1 - AgriCompass"
- ✅ Order details: Product, Quantity, Total Price
- ✅ Farmer name
- ✅ "View Order Details" button
- ✅ "What's Next?" instructions

**Farmer Email** (farmer@test.com):
- ✅ Subject: "New Order Received #1 - AgriCompass"
- ✅ Order details: Product, Quantity, Earnings
- ✅ Buyer name
- ✅ "Action Required" alert
- ✅ "View & Manage Order" button
- ✅ Next steps instructions

**Verify in Terminal**:
```
Email sent via Resend to buyer@test.com
Email sent via Resend to farmer@test.com
```

---

### ✅ Test 5: Verification Status Emails

**What it tests**: Field officer approval/rejection sends email to farmer

**Setup**:
1. **Create a field officer account**:
   - Register as "Officer One" with `officer@test.com`
   - Role: Field Officer
   - Log in

2. **As Farmer**, request verification:
   - Log in as farmer (`farmer@test.com`)
   - Go to Profile → **"Request Verification"**
   - Fill in farm details
   - Submit request

**Test Steps (Approval)**:
1. **Log in as Field Officer** (`officer@test.com`)
2. Go to **Officer Dashboard**
3. Find the pending verification request
4. Click **"Review"**
5. Select **"Approve"**
6. Add notes: "All documents verified"
7. Click **"Submit Review"**
8. **Check farmer's email** (farmer@test.com)

**Expected Result (Approval)**:
- ✅ Subject: "✅ Verification Approved - AgriCompass"
- ✅ Congratulations message
- ✅ Benefits listed (verified badge, priority, etc.)
- ✅ "Go to Dashboard" button
- ✅ Next steps

**Verify in Terminal**:
```
Email sent via Resend to farmer@test.com
```

**Test Steps (Rejection)**:
1. **Create another farmer** or repeat verification
2. As Officer, **reject** the verification
3. Add notes: "Please provide clearer farm documentation"
4. Submit review
5. **Check farmer's email**

**Expected Result (Rejection)**:
- ✅ Subject: "❌ Verification Update - AgriCompass"
- ✅ Polite rejection message
- ✅ Rejection reason displayed
- ✅ What you can do next
- ✅ Support contact

---

## Advanced Testing

### Test Email Fallback (SMTP)

**Purpose**: Verify SMTP backup works if Resend fails

**Steps**:
1. **Temporarily break** Resend by changing API key in `.env`:
   ```bash
   RESEND_API_KEY=re_invalid_key_for_testing
   ```

2. **Configure SMTP** (use Gmail):
   ```bash
   # Add to .env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-app-password  # See https://support.google.com/accounts/answer/185833
   SMTP_FROM="AgriCompass" <noreply@agricompass.com>
   ```

3. **Restart server**: `npm run dev`

4. **Test registration** (Test 1)

**Expected Result**:
```
Resend failed, trying SMTP fallback: Invalid API key
Email sent via SMTP to your-actual-email@gmail.com
```

✅ Email still arrives via SMTP!

### Test No Email Service Configured

**Purpose**: App should still work without email

**Steps**:
1. **Comment out** all email config in `.env`:
   ```bash
   # RESEND_API_KEY=re_...
   # SMTP_HOST=...
   ```

2. **Restart server**

3. **Test registration**

**Expected Result**:
```
No email service configured, email not sent
```

✅ Registration still succeeds  
✅ User can log in  
✅ App doesn't crash  

---

## Monitoring & Debugging

### Check Email Delivery Status

1. Go to **Resend Dashboard**: https://resend.com/emails
2. See all sent emails
3. Check delivery status
4. View email content
5. See open/click rates

### Terminal Logs

**Successful Email**:
```
Email sent via Resend to user@example.com
```

**Resend Failed, SMTP Success**:
```
Resend failed, trying SMTP fallback: [error message]
Email sent via SMTP to user@example.com
```

**No Email Service**:
```
No email service configured, email not sent
```

**Email Function Error**:
```
Failed to send order confirmation email: [error details]
```

### Common Issues

| Issue | Solution |
|-------|----------|
| "Invalid API key" | Check `RESEND_API_KEY` in `.env` |
| Email not received | Check spam folder, verify email address |
| "No email service configured" | Add `RESEND_API_KEY` to `.env` |
| Server won't start | Check `.env` syntax, restart terminal |
| TypeScript errors | Run `npm install`, check imports |

---

## Performance Testing

### Email Sending Should Be Non-Blocking

**Test**:
1. Place an order
2. Time the response

**Expected**:
- ✅ Order creation responds in < 500ms
- ✅ Emails are sent asynchronously (don't block response)
- ✅ Even if email fails, order succeeds

**Verify in Code**:
```typescript
// Email is sent with .catch() - won't block response
sendOrderConfirmationEmail(...).catch(err => console.error('...'));
```

### Load Testing

**Test sending multiple emails**:
```bash
# Register 10 users quickly
for i in {1..10}; do
  curl -X POST http://localhost:5000/api/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"fullName\":\"Test User $i\",\"password\":\"Test123!\",\"role\":\"farmer\"}"
done
```

**Expected**:
- ✅ All registrations succeed
- ✅ All emails queued
- ✅ Server remains responsive

**Check Resend Dashboard**:
- ✅ All 10 emails sent
- ✅ No rate limit errors (free tier: 100/day)

---

## Security Testing

### ✅ Test Token Expiry

**Steps**:
1. Request password reset
2. Get the token from email
3. **Wait 61 minutes** (or manually expire in DB)
4. Try to use the reset link

**Expected**:
- ❌ "Invalid or expired reset token"
- ✅ Must request new reset link

### ✅ Test Token Reuse

**Steps**:
1. Request password reset
2. Use token to reset password (succeeds)
3. Try to use **same token again**

**Expected**:
- ❌ "Invalid or expired reset token"
- ✅ Token is single-use only

### ✅ Test Email Injection

**Steps**:
1. Try to register with email:
   ```
   test@example.com<script>alert('xss')</script>
   ```

**Expected**:
- ✅ Email validation rejects it
- ✅ Or it's sanitized before sending

---

## Production Readiness Checklist

Before deploying to production:

- [ ] **Environment Variables**
  - [ ] `RESEND_API_KEY` set in production env
  - [ ] `FRONTEND_URL` set to production domain
  - [ ] `SESSION_SECRET` changed from default
  - [ ] SMTP configured as fallback (optional)

- [ ] **Email Configuration**
  - [ ] Verify custom domain in Resend (optional but recommended)
  - [ ] Add SPF/DKIM records to DNS
  - [ ] Update `EMAIL_FROM` to use your domain
  - [ ] Test all email templates in production

- [ ] **Monitoring**
  - [ ] Set up Resend webhook for delivery tracking
  - [ ] Add error logging for failed emails
  - [ ] Monitor email delivery rates
  - [ ] Set up alerts for email service downtime

- [ ] **Testing**
  - [ ] All 5 test scenarios pass
  - [ ] Email fallback works
  - [ ] No email service configured doesn't break app
  - [ ] Security tests pass

---

## Success Criteria

✅ **All emails are sent successfully**  
✅ **Email templates are professional and branded**  
✅ **Fallback to SMTP works**  
✅ **App works without email configured**  
✅ **Emails don't block API responses**  
✅ **No TypeScript errors**  
✅ **Security features work (token expiry, single-use)**  

---

## Need Help?
## E2E Test Helpers

To improve E2E test reliability and avoid email delivery dependencies during local or CI runs, the server exposes a set of test-only endpoints gated by an environment variable. These endpoints are ONLY available when `ENABLE_TEST_ENDPOINTS=true`.

Available endpoints (test-only, do NOT enable in production):
- `POST /__test/seed-account` - Create or return deterministic seeded accounts for each role (role param required: 'farmer'|'buyer'|'field_officer'). Returns JSON: { email, password, user }.
- `POST /__test/get-reset-token` - Return the currently stored password reset token for a given email (useful for UI tests needing token without email delivery).
- `POST /__test/mark-verified` - Mark a given userId as verified and emit socket updates for UI testing.

How to run E2E tests locally with test helpers enabled:

```powershell
$env:ENABLE_TEST_ENDPOINTS='true'; npx playwright test --workers=1
```

Notes:
- Set `--workers=1` to avoid testing rate limits from your local or CI environment.
- These endpoints are for testing only and should never be enabled in production environments. When running CI (GitHub Actions), the workflows are already configured to set `ENABLE_TEST_ENDPOINTS: 'true'` for e2e jobs.

### Paystack Webhook Local Testing

1. Ensure you set `PAYSTACK_WEBHOOK_SECRET` when using webhook verification locally:
```powershell
$env:PAYSTACK_WEBHOOK_SECRET='test-paystack-secret'
```
2. Start the server and use the helper script to simulate a webhook:
```powershell
node ./scripts/simulate-paystack-webhook.mjs --url http://localhost:5000/api/payments/paystack/webhook --reference ref-test-001 --event charge.success
```
3. Verify `Payment` records change status to `completed` and orders update accordingly with server logs and via the API.



- **Resend Docs**: https://resend.com/docs
- **Email not sending?** Check terminal logs and Resend dashboard
- **SMTP issues?** Verify Gmail app password setup
- **Code errors?** Check `server/email.ts` and `server/routes.ts`

---
## Admin Endpoints Testing

These admin-only endpoints provide reporting, revenue metrics, and active seller listings. They are intended for admin dashboards and monitoring.

Prerequisite: create an admin account if you don't have one locally.

Example curl-based workflow (Windows PowerShell):

```powershell
# Create admin user
curl -X POST http://localhost:5000/api/auth/register -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123","fullName":"Admin","role":"admin"}'

# Login and capture cookie to cookiejar.txt
curl -c cookiejar.txt -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@test.com","password":"password123"}'

# Admin stats
curl -b cookiejar.txt http://localhost:5000/api/admin/stats

# Revenue and monthly breakdown
curl -b cookiejar.txt http://localhost:5000/api/admin/revenue

# Top active sellers (top 10)
curl -b cookiejar.txt "http://localhost:5000/api/admin/active-sellers?top=10"
```

Basic load test to simulate concurrency (PowerShell loop):

```powershell
# Example: Launch 50 background requests
for ($i = 0; $i -lt 50; $i++) { Invoke-WebRequest -UseBasicParsing -Uri http://localhost:5000/api/admin/revenue -WebSession (Get-Content cookiejar.txt -Raw) & }
```

Notes:
- These endpoints are `admin`-only; ensure your testing session is an admin.
- The in-memory `MemStorage` is used locally; production storage may require pagination or more complex aggregation queries.

---

## Next Steps

After email testing is complete:

1. ✅ **Create Legal Pages** (Terms, Privacy, Cookie Policy)
2. ✅ **Build Admin Dashboard** (User management, stats)
3. ✅ **Write Tests** (Unit tests for email functions)
4. ✅ **Update Documentation** (README, CHANGELOG)
5. ✅ **Deploy to Production**

Happy Testing! 🚀
