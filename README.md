# 🌾 AgriCompassWeb

> Agricultural Marketplace Platform - Connecting Farmers with Buyers for Seamless Bulk Trading

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Security](#security)

## 🛠 Getting Started & Deployment

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JustAsabre/AgriCompassWeb.git
   cd AgriCompassWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   - Copy `.env.example` to `.env` and fill in required secrets for production:
     ```bash
     cp .env.example .env
     ```
   - **Required for production:**
     - `SESSION_SECRET` (strong random string)
     - `DATABASE_URL` (Postgres connection string)
     - `PAYSTACK_SECRET_KEY` (Paystack secret)
     - `PAYSTACK_WEBHOOK_SECRET` (Paystack webhook secret)
     - `FRONTEND_URL` (e.g., https://agricompass.vercel.app)
     - `REDIS_URL` (optional, for session store)
     - `RESEND_API_KEY` (for email delivery)
     - See [SECURITY.md](SECURITY.md) for full checklist.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

### Production Deployment

- **Frontend:** Deploy to Vercel (set `VITE_API_URL=https://agricompassweb.fly.dev`)
- **Backend:** Deploy to Fly.io (set all secrets in Fly.io dashboard)
- **Database:** Neon PostgreSQL (set `DATABASE_URL`)
- **Session Store:** Upstash Redis (set `REDIS_URL`)
- **Email:** Resend or SMTP fallback (set `RESEND_API_KEY` or SMTP config)
- **CORS:** Backend must allow requests from Vercel frontend and production domains
- **SSL:** Ensure HTTPS is enabled for all endpoints

#### Quick Deployment Steps
1. Push code to GitHub
2. Deploy frontend to Vercel, backend to Fly.io
3. Set all environment variables in Vercel and Fly.io dashboards
4. Run database migrations:
   ```bash
   npm run db:push
   ```
5. Verify API connectivity and CORS headers
6. Run Playwright and manual tests (see below)

### Environment Variables Reference

| Variable | Description | Required | Example |
|----------|-------------|----------|---------|
| SESSION_SECRET | Session encryption key | Yes | longrandomstring |
| CSRF_SECRET | CSRF token encryption key | Optional | longrandomstring (falls back to SESSION_SECRET) |
| DATABASE_URL | Postgres connection | Yes | postgresql://user:pass@host:5432/db |
| PAYSTACK_SECRET_KEY | Paystack API key | Yes (prod) | sk_live_xxx |
| PAYSTACK_WEBHOOK_SECRET | Paystack webhook secret | Yes (prod) | webhook_secret |
| FRONTEND_URL | Frontend URL | Yes (prod) | https://agricompass.vercel.app |
| REDIS_URL | Redis session store | Optional | redis://:pass@host:6379 |
| RESEND_API_KEY | Email delivery | Optional | re_xxx |
| ENABLE_TEST_ENDPOINTS | Enable test-only routes | Dev/test | true |

See [SECURITY.md](SECURITY.md) for full checklist and recommendations.

### Payments & Payouts (Paystack)

- If `PAYSTACK_SECRET_KEY` is not set, app falls back to manual payment records for testing.
- For payouts, set `PAYSTACK_AUTO_PAYOUTS` and `PLATFORM_COMMISSION_PERCENT` as needed.
- See API docs for payout endpoints.

### Test Accounts

The app comes pre-seeded with test accounts:

| Role | Email | Features |
|------|-------|----------|
| Farmer | `farmer1@test.com` | Create listings, manage products |
| Farmer | `farmer2@test.com` | Alternative farmer account |
| Buyer | `buyer@test.com` | Browse, cart, checkout |
| Field Officer | `officer@test.com` | Verify farmers |

*Note: Passwords need to be set during registration or check the code*
### For Farmers
- ✅ Create and manage product listings
- ✅ Set bulk pricing tiers
- ✅ Track orders and sales
- ✅ Manage farm profile

### For Buyers
- ✅ Browse agricultural products
- ✅ Filter by category, location, price
- ✅ Shopping cart functionality
- ✅ Place bulk orders
- ✅ Order history and tracking

### For Field Officers
- ✅ Verify farmer credentials
- ✅ Review product listings
- ✅ Generate verification reports

### For Admins
- ✅ User account management (activate/deactivate)
- ✅ Bulk user operations
- ✅ Platform analytics and monitoring
- ✅ Content moderation tools


## 🧪 Quality Assurance & Testing

### Test Coverage Achievements
- **Overall Coverage**: 52.79% statements, 54.06% lines
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
- See [TESTING_GUIDE.md](TESTING_GUIDE.md) for full step-by-step instructions

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

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for advanced scenarios, troubleshooting, and E2E helpers.

## 🛠 Tech Stack

### Frontend
- **Framework**: React 18.3 with TypeScript
- **Build Tool**: Vite 5.4
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui (Radix UI)
- **Routing**: Wouter 3.3
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js 4.21
- **Authentication**: Express Session + bcrypt
- **Database ORM**: Drizzle ORM
- **Database**: PostgreSQL (Neon) / In-Memory (Dev)
- **Validation**: Zod

### Development Tools
- **Package Manager**: npm
- **TypeScript**: 5.6
- **Linting**: ESLint (coming soon)
- **Code Quality**: TypeScript strict mode

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/JustAsabre/AgriCompassWeb.git
   cd AgriCompassWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional for dev)
   ```bash
   # Create .env file (optional - defaults work for development)
   cp .env.example .env
   ```

### Paystack (Payments)
Add the following env variables to enable Paystack in production:

- `PAYSTACK_SECRET_KEY` - Your Paystack secret (server-side)
- `PAYSTACK_WEBHOOK_SECRET` - Optional webhook secret for validating webhook requests
- `FRONTEND_URL` - The URL of the frontend (e.g., https://app.example.com) to be used as Paystack's callback url

If `PAYSTACK_SECRET_KEY` is not set, the application will fallback to manual payment records for testing.

Payouts & Recipients (Farmer payouts):

- `PAYSTACK_AUTO_PAYOUTS` - If true and `PAYSTACK_SECRET_KEY` is set, the server will automatically attempt to transfer funds to farmers after admin processing
- `PLATFORM_COMMISSION_PERCENT` - Percentage retained by the platform from sales before creating payout records (default 5%)

API endpoints related to payouts and recipients:

- `POST /api/payouts/request` (farmer) — request a payout (amount + mobileNumber, mobileNetwork)
- `POST /api/payouts/process` (admin) — process a payout and optionally transfer funds via Paystack transfer API
- `POST /api/payouts/recipient` (farmer) — create Paystack transfer recipient (mobileNetwork + mobileNumber)
- `GET /api/payouts/recipient/me` (farmer) — fetch your saved recipient code & mobile details (mobileNumber + mobileNetwork)

Notes:
- The server validates amounts server-side, schedules payouts, and uses `PAYSTACK_WEBHOOK_SECRET` to validate incoming webhook events.
- For production, create and save Paystack transfer recipients for farmers to enable automatic transfers.

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:5000
   ```

### Test Accounts

The app comes pre-seeded with test accounts:

| Role | Email | Features |
|------|-------|----------|
| Farmer | `farmer1@test.com` | Create listings, manage products |
| Farmer | `farmer2@test.com` | Alternative farmer account |
| Buyer | `buyer@test.com` | Browse, cart, checkout |
| Field Officer | `officer@test.com` | Verify farmers |

*Note: Passwords need to be set during registration or check the code*

## 🏷️ Using PostgresStorage in Production

This project now supports a Postgres-backed storage layer using Drizzle ORM. To enable it in staging or production:

1. Set `DATABASE_URL` to your Postgres connection string (Neon recommended). Example:
   ```env
   DATABASE_URL=postgresql://user:pass@hostname:5432/agricompass
   ```
2. Apply Drizzle DB migrations to the database:
   ```bash
   npm run db:push
   ```
3. Start the server with `NODE_ENV=production`:
   ```bash
   NODE_ENV=production DATABASE_URL="postgresql://..." npm start
   ```
4. Optionally set `REDIS_URL` for session storage (Upstash recommended). Example:
   ```env
   REDIS_URL=redis://:password@hostname:6379
   ```
5. Ensure `SESSION_SECRET` is a strong, random value in production.

If you want sessions backed by Postgres instead of Redis, set `PG_CONNECTION_STRING` and the server will use `connect-pg-simple`.

Troubleshooting:
- If `npm run db:push` fails, ensure your `DATABASE_URL` is correct and migration tool has access.
- If Postgres storage is used, verify `SERVER` logs show `Storage: PostgresStorage` at startup.

## 🔁 Scaling & Socket.IO (Production)

To scale the real-time layer across multiple server instances (horizontal scaling), you must configure a shared Redis adapter for Socket.IO and centralize session storage (Redis or Postgres). The server will automatically configure the Socket.IO Redis adapter if `REDIS_URL` is set.

Steps:
- Set `REDIS_URL` to your Upstash or Redis connection string (e.g., `redis://:password@hostname:6379`).
- For session persistence, use `REDIS_URL` (Redis sessions) or `PG_CONNECTION_STRING` (Postgres sessions). Set `SESSION_SECRET` to a secure random value.
- If you're using multiple server instances, confirm that logs show `Socket.IO Redis adapter configured` on startup.

Example env variables:
```
REDIS_URL=redis://:yourpassword@your-redis-host:6379
SESSION_SECRET=someLongStrongRandomValue
DATABASE_URL=postgresql://username:password@hostname:5432/agricompass
```

Notes:
- The server connects to Redis using the `redis` client and the `@socket.io/redis-adapter` package.
- If Redis is not present, the server continues to run with an in-memory store; horizontal scaling and session persistence are not enabled in that mode.

## 👥 Team Collaboration Guide

### Initial Setup for Team Members

1. **Clone the repository**
   ```bash
   git clone https://github.com/JustAsabre/AgriCompassWeb.git
   cd AgriCompassWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Git**
   ```bash
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```

4. **Start development**
   ```bash
   npm run dev
   # Open http://localhost:5000
   ```

### Daily Workflow

```bash
# 1. Start of day - get latest code
git checkout main
git pull origin main

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes and test
npm run dev

# 4. Commit your work
git add .
git commit -m "Add: Description of changes"

# 5. Push to GitHub
git push origin feature/your-feature-name

# 6. Create Pull Request on GitHub
# 7. After merge, update local main
git checkout main
git pull origin main
```

### Branch Naming Convention
- `feature/` - New features (`feature/add-payment`)
- `fix/` - Bug fixes (`fix/cart-bug`)
- `improve/` - Improvements (`improve/ui-mobile`)
- `docs/` - Documentation (`docs/update-readme`)

### Commit Message Format
```
Type: Brief description

Examples:
- Add: User authentication system
- Fix: Cart total calculation
- Update: Product schema
- Improve: Search performance
- Docs: API documentation
```

For detailed contribution guidelines, see [CONTRIBUTING.md](CONTRIBUTING.md)

## 📁 Project Structure

```
AgriCompassWeb/
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # shadcn/ui components
│   │   │   ├── header.tsx   # Navigation header
│   │   │   └── theme-*.tsx  # Theme components
│   │   ├── pages/           # Page components
│   │   │   ├── landing.tsx
│   │   │   ├── marketplace.tsx
│   │   │   ├── farmer-dashboard.tsx
│   │   │   ├── buyer-dashboard.tsx
│   │   │   └── ...
│   │   ├── lib/             # Utilities and configs
│   │   │   ├── auth.tsx     # Auth context
│   │   │   ├── queryClient.ts
│   │   │   └── utils.ts
│   │   ├── hooks/           # Custom React hooks
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── public/              # Static assets
│   └── index.html
├── server/                   # Backend Express application
│   ├── index.ts             # Server entry point
│   ├── routes.ts            # API routes
│   ├── auth.ts              # Authentication logic
│   ├── storage.ts           # Data storage layer
│   └── vite.ts              # Vite dev server setup
├── shared/                   # Shared code between client/server
│   └── schema.ts            # Database schema & types
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

## � API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/me` - Get current session

### Listings
- `GET /api/listings` - Get all listings
- `GET /api/listings/:id` - Get listing details
- `POST /api/listings` - Create listing (Farmer)
- `PATCH /api/listings/:id` - Update listing (Farmer)
- `DELETE /api/listings/:id` - Delete listing (Farmer)
- `GET /api/farmer/listings` - Get farmer's listings

### Cart & Orders
- `GET /api/cart` - Get cart items (Buyer)
- `POST /api/cart` - Add to cart (Buyer)
- `DELETE /api/cart/:id` - Remove from cart (Buyer)
- `POST /api/orders/checkout` - Place order (Buyer)
- `GET /api/buyer/orders` - Get buyer orders
- `GET /api/farmer/orders` - Get farmer orders
- `PATCH /api/orders/:id/status` - Update order status (Farmer)

### Field Officer
- `GET /api/officer/farmers` - Get all farmers
- `POST /api/officer/verify/:farmerId` - Verify farmer

### Admin
- `GET /api/admin/users` - Get all users with pagination/filtering (Admin)
- `GET /api/admin/users/:id` - Get user details (Admin)
- `PATCH /api/admin/users/:id/status` - Update user status (Admin)
- `POST /api/admin/users/bulk` - Bulk user operations (Admin)
- `GET /api/admin/stats` - Get platform statistics (Admin)
- `GET /api/admin/revenue` - Get revenue analytics (Admin)
- `GET /api/admin/active-sellers` - Get top active sellers (Admin)

For detailed API request/response schemas, see [server/routes.ts](server/routes.ts).

## �📜 Available Scripts

```bash
npm run dev          # Start development server (port 5000)
npm run build        # Build for production
npm start            # Start production server
npm run check        # Run TypeScript type checking
npm run db:push      # Push schema changes to database
```

## � Security

### Authentication & Authorization
- **Password Hashing**: bcryptjs with SALT_ROUNDS=10
- **Session Management**: HTTP-only cookies, 7-day expiration
- **Role-Based Access Control**: Middleware enforces farmer/buyer/officer roles
- **Ownership Verification**: Server-side checks on all protected routes

### Production Checklist
- [ ] Set strong `SESSION_SECRET` environment variable
- [ ] Replace MemoryStore with persistent session store (Redis/PostgreSQL)
- [ ] Enable HTTPS and secure cookies
- [ ] Add rate limiting to auth endpoints
- [ ] Review CORS settings

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on:
- Code style and standards
- Pull request process
- Testing requirements
- Git workflow

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test thoroughly
4. Commit: `git commit -m "Add: Amazing feature"`
5. Push: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 👨‍💻 Team

Built with ❤️ by a collaborative team of 4 developers.

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details

## � Issues & Support

- **Bug Reports**: [Open an issue](https://github.com/JustAsabre/AgriCompassWeb/issues)
- **Feature Requests**: [Open an issue](https://github.com/JustAsabre/AgriCompassWeb/issues)
- **Questions**: Check documentation or ask in issues

---

**Repository**: https://github.com/JustAsabre/AgriCompassWeb

**Happy coding! 🚀**
