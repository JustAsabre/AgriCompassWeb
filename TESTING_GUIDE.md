# Testing Guide - Sprint 6: Comprehensive Test Coverage Complete


## Comprehensive Testing Guide (Updated Nov 27, 2025)

### Coverage Metrics
- **Overall Coverage**: 52.79% statements, 54.06% lines
- **routes.ts**: 50.14% statements, 51.82% lines
- **Total Tests**: 195 tests passing across 25 test files
- **Test Categories**: Verification, Messaging, Notifications, Analytics, Reviews, Payments, Payouts, Admin

### Testing Workflow

#### 1. TypeScript & Dependency Checks
```bash
npm run check      # TypeScript type checking
npm audit          # Check for vulnerabilities
```

#### 2. Playwright E2E Tests
```bash
npx playwright test --workers=1
```
*Set `ENABLE_TEST_ENDPOINTS=true` for test-only routes.*

#### 3. Manual Testing (Production)
- Register, login, create listings, place orders, verify payments, test all roles
- Use browser dev tools to confirm API calls go to backend (Fly.io)
- Check CORS headers and session cookies

#### 4. API Connectivity & CORS
- Confirm frontend (Vercel) targets backend (Fly.io)
- Test cross-origin requests, session persistence, and authentication

#### 5. Email & Webhook Testing
- Register and verify email delivery (Resend/SMTP)
- Simulate Paystack webhook events using scripts/simulate-paystack-webhook.mjs

#### 6. Admin & Security Testing
- Test admin endpoints, role-based access, and security features
- Run security checklist from [SECURITY.md](SECURITY.md)

#### 7. Production Readiness
- Run all tests, verify environment variables, check deployment logs
- See [README.md](README.md) and [SECURITY.md](SECURITY.md) for full checklist

### Common Issues & Troubleshooting
- CORS errors: Check backend CORS config and allowed origins
- Session/auth errors: Confirm cookies are set and sent with requests
- API connectivity: Ensure VITE_API_URL is set correctly in frontend
- Email not sending: Check RESEND_API_KEY or SMTP config
- Playwright failures: Enable test endpoints and check logs

### Success Criteria
- All tests pass (Playwright, manual, integration)
- No TypeScript errors
- No critical vulnerabilities
- All emails and webhooks work in production
- API connectivity and CORS verified

### E2E Helpers & Advanced Scenarios
- Test-only endpoints available when `ENABLE_TEST_ENDPOINTS=true`:
  - `POST /__test/seed-account` — Create deterministic test accounts
  - `POST /__test/get-reset-token` — Get password reset token for UI tests
  - `POST /__test/mark-verified` — Mark user as verified for UI tests
- Use scripts/simulate-paystack-webhook.mjs for webhook simulation

### Production Readiness Checklist
- All environment variables set in Vercel and Fly.io dashboards
- SSL/HTTPS enabled for all endpoints
- CORS, session, and webhook security verified
- Playwright and manual tests pass
- Monitoring and alerting configured (Sentry, UptimeRobot)

### Admin Endpoints Testing
- Use admin account to test reporting, revenue, and active seller endpoints
- See README.md and ARCHITECTURE.md for endpoint details

---

Happy Testing! 🚀
