# AgriCompass AI Context Document

> **Purpose**: This document provides complete context for AI assistants working on the AgriCompass project. Read this first before making any changes.

---

## 🌾 Project Overview

**AgriCompass** is a full-stack agricultural marketplace connecting Ghanaian farmers directly with buyers. It eliminates middlemen, provides fair pricing, and includes escrow-based payment protection.

### Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS + shadcn/ui |
| **Backend** | Node.js + Express + TypeScript |
| **Database** | PostgreSQL (Neon) with Drizzle ORM |
| **Cache/Sessions** | Redis (Upstash) |
| **Payments** | Paystack (GHS mobile money + cards) |
| **Email** | SendGrid API |
| **Real-time** | Socket.IO with Redis adapter |
| **Error Tracking** | Sentry |
| **Hosting** | Vercel (frontend) + Render (backend) |

### Live URLs
- **Frontend**: https://agricompass.vercel.app
- **Backend**: https://agricompassweb.onrender.com
- **API Base**: https://agricompassweb.onrender.com/api

---

## 📁 Project Structure

```
AgriCompassWeb/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components (shadcn/ui based)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities (queryClient, utils)
│   │   ├── pages/          # Route pages
│   │   └── App.tsx         # Main app with routing
│   └── index.html
├── server/                 # Express backend
│   ├── index.ts            # App entry, middleware, error handlers
│   ├── routes.ts           # All API routes (~5000 lines)
│   ├── storage.ts          # Database abstraction layer
│   ├── auth.ts             # Password hashing, session utils
│   ├── email.ts            # Email verification & SMTP check
│   ├── emailQueue.ts       # SendGrid/SMTP email sending
│   ├── socket.ts           # Socket.IO setup
│   ├── session.ts          # Session store (Redis/Postgres)
│   ├── cache.ts            # Redis caching utilities
│   ├── db.ts               # Database connection
│   ├── sentry.ts           # Sentry error tracking
│   └── jobs/               # Background jobs (payouts, expiration)
├── shared/                 # Shared types and schemas
│   └── schema.ts           # Drizzle tables + Zod validation schemas
├── drizzle/                # Database migrations
├── .env                    # Local environment variables
├── vercel.json             # Vercel config (rewrites to Render)
├── package.json            # Dependencies and scripts
└── CHANGELOG.md            # Version history
```

---

## 🔑 Key Files Reference

### Backend Core Files

| File | Purpose | Key Functions/Exports |
|------|---------|----------------------|
| `server/index.ts` | Express app setup, middleware, global error handler | `formatErrorForClient()`, CORS config, CSRF setup |
| `server/routes.ts` | All API endpoints (~150 routes) | `registerRoutes()`, `formatApiError()`, `requireAuth`, `requireRole` |
| `server/storage.ts` | Database operations abstraction | `storage.getUser()`, `storage.createListing()`, etc. |
| `server/emailQueue.ts` | Email sending via SendGrid/SMTP | `enqueueEmail()`, `attemptSend()` |
| `server/socket.ts` | Real-time notifications | `sendNotificationToUser()`, `broadcastNewListing()` |
| `server/session.ts` | Session configuration | Redis or Postgres session store |
| `server/auth.ts` | Authentication utilities | `hashPassword()`, `comparePassword()`, `sanitizeUser()` |

### Frontend Core Files

| File | Purpose |
|------|---------|
| `client/src/App.tsx` | Router setup, auth provider |
| `client/src/lib/queryClient.ts` | TanStack Query config, `apiRequest()`, CSRF handling |
| `client/src/hooks/use-auth.ts` | Authentication hook |
| `client/src/pages/` | All page components |

### Shared Files

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Drizzle table definitions, Zod schemas, TypeScript types |

---

## 👥 User Roles

| Role | Capabilities |
|------|-------------|
| `farmer` | Create listings, manage orders, request withdrawals, view analytics |
| `buyer` | Browse listings, add to cart, checkout, confirm deliveries |
| `field_officer` | Verify farmers, review verification requests |
| `admin` | Full access, user management, content moderation, escrow resolution |

---

## 🔐 Authentication Flow

1. **Registration**: Email + password → email verification required
2. **Email Verification**: Token sent via SendGrid, 24hr expiry
3. **Login**: Session-based auth with Redis/Postgres store
4. **Session**: `req.session.user` contains sanitized user data
5. **CSRF**: Double-submit cookie pattern via `csrf-csrf` library

### Auth Middleware
```typescript
// Require logged-in user
requireAuth(req, res, next)

// Require specific role(s)
requireRole("farmer")(req, res, next)
requireRole("admin", "field_officer")(req, res, next)
```

---

## 💳 Payment Flow (Paystack)

1. **Checkout**: Buyer creates order → payment initiated
2. **Paystack**: Redirect to Paystack checkout
3. **Webhook**: `POST /api/payments/paystack/webhook` receives events
4. **Escrow**: Funds held until buyer confirms delivery
5. **Wallet**: Farmer credited after order completion (minus commission)
6. **Withdrawal**: Farmer requests payout → mobile money transfer

### Key Payment Routes
- `POST /api/orders/checkout` - Create orders and initiate payment
- `POST /api/payments/paystack/webhook` - Handle Paystack events
- `POST /api/wallet/withdraw` - Request withdrawal

---

## 📧 Email Configuration

### SendGrid (Production - Render)
```env
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM=richytech.inc@gmail.com  # Must be verified sender
SENDGRID_FROM_NAME=AgriCompass
```

### SMTP (Development - Gmail)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your@gmail.com
SMTP_PASS=app-password
SMTP_FROM="AgriCompass" <your@gmail.com>
```

**Important**: When SendGrid API key is set, it takes priority. `SENDGRID_FROM` is used (not `SMTP_FROM`).

---

## 🌍 Environment Variables

### Required for Production (Render)
```env
DATABASE_URL=postgresql://...          # Neon PostgreSQL
REDIS_URL=rediss://...                  # Upstash Redis
SESSION_SECRET=xxx                      # Random 64+ chars
CSRF_SECRET=xxx                         # Random 32+ chars
NODE_ENV=production
FRONTEND_URL=https://agricompass.vercel.app
CORS_ALLOWED_ORIGINS=https://agricompass.vercel.app
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM=richytech.inc@gmail.com
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYSTACK_PUBLIC_KEY=pk_live_xxx
SENTRY_DSN=https://xxx@sentry.io/xxx
```

### Optional
```env
PLATFORM_COMMISSION_PERCENT=5           # Platform fee percentage
PAYSTACK_AUTO_PAYOUTS=false             # Auto-payout on completion
ENABLE_TEST_ENDPOINTS=true              # Enable /__test/* routes
```

---

## 🚨 Critical Rules & Conventions

### DO NOT
1. ❌ Expose raw error messages to clients (use `formatApiError()`)
2. ❌ Log passwords or sensitive data in production
3. ❌ Skip CSRF protection on state-changing routes
4. ❌ Use `error.message` directly in API responses
5. ❌ Delete or modify session/CSRF secret in production
6. ❌ Commit `.env` file or secrets to git

### ALWAYS
1. ✅ Use `formatApiError(error)` in catch blocks
2. ✅ Use `requireAuth` or `requireRole()` middleware for protected routes
3. ✅ Validate input with Zod schemas from `shared/schema.ts`
4. ✅ Invalidate caches after mutations (`invalidateListingCaches()`, etc.)
5. ✅ Test locally before pushing (Render auto-deploys from main)
6. ✅ Update CHANGELOG.md for significant changes

---

## 🧪 Development Commands

```bash
# Start development server (frontend + backend)
npm run dev

# Build for production
npm run build

# Run tests
npm run test
npm run test:e2e

# Database operations
npm run db:push          # Push schema changes
npm run db:generate      # Generate migrations
```

---

## 🐛 Common Issues & Solutions

### Issue: SendGrid "from address does not match verified Sender Identity"
**Solution**: Ensure `SENDGRID_FROM` is set to your verified sender email in SendGrid Single Sender Verification.

### Issue: Raw JSON in error toasts
**Solution**: Use `formatApiError(error)` instead of `error.message` in catch blocks.

### Issue: CORS errors
**Solution**: Add frontend URL to `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` in Render.

### Issue: Sessions not persisting
**Solution**: Check `REDIS_URL` or `DATABASE_URL` is correctly set. Verify session cookie settings match environment (secure, sameSite).

### Issue: Render cold starts
**Solution**: Set up UptimeRobot or cron-job.org to ping `/api/health` every 10 minutes.

---

## 📊 Database Schema (Key Tables)

```typescript
users          // All users (farmers, buyers, officers, admins)
listings       // Product listings from farmers
orders         // Purchase orders
cart_items     // Buyer shopping carts
payments       // Payment records
transactions   // Combined payment transactions
escrow         // Escrow holdings
wallet_transactions  // Wallet credits/debits
withdrawals    // Payout requests
verifications  // Farmer verification requests
messages       // Direct messages
notifications  // User notifications
reviews        // Order reviews
pricing_tiers  // Bulk pricing tiers for listings
```

---

## 🔄 Recent Changes (January 2026)

### v1.10.2 - SendGrid Fix
- Fixed email sender identity error by prioritizing `SENDGRID_FROM`

### v1.10.1 - Security: Error Sanitization
- Added `formatErrorForClient()` and `formatApiError()`
- No more raw Zod JSON in UI error messages

### v1.10.0 - Fly.io → Render Migration
- Backend moved from Fly.io to Render.com
- Added SendGrid API support (Render blocks SMTP)
- Updated all documentation

---

## 📝 Files to Check When Starting

1. **CHANGELOG.md** - Recent changes and version history
2. **package.json** - Available scripts and dependencies
3. **server/routes.ts** - API patterns and middleware usage
4. **shared/schema.ts** - Database types and validation schemas
5. **server/storage.ts** - Data operations interface
6. **client/src/lib/queryClient.ts** - Frontend API client

---

## 🎯 Current Production State (January 31, 2026)

| Component | Status | Notes |
|-----------|--------|-------|
| Frontend (Vercel) | ✅ Live | Auto-deploys from main |
| Backend (Render) | ✅ Live | Auto-deploys from main |
| Database (Neon) | ✅ Connected | PostgreSQL |
| Redis (Upstash) | ✅ Connected | Sessions + cache |
| Email (SendGrid) | ✅ Working | From: richytech.inc@gmail.com |
| Payments (Paystack) | ✅ Configured | Live keys active |
| Sentry | ✅ Active | Error tracking enabled |

---

## 🚀 Deployment

### Backend (Render)
- **Auto-deploy**: Pushes to `main` branch trigger deployment
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Health Check**: `/api/health`

### Frontend (Vercel)
- **Auto-deploy**: Pushes to `main` branch trigger deployment
- **API Proxy**: `vercel.json` rewrites `/api/*` to Render backend

---

## 📞 Support Contacts

- **GitHub Repo**: https://github.com/JustAsabre/AgriCompassWeb
- **Render Dashboard**: https://dashboard.render.com
- **Vercel Dashboard**: https://vercel.com
- **SendGrid**: https://app.sendgrid.com
- **Paystack Dashboard**: https://dashboard.paystack.com
- **Neon Console**: https://console.neon.tech
- **Upstash Console**: https://console.upstash.com

---

*Last Updated: January 31, 2026*
