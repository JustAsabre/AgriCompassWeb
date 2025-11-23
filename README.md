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
- [Contributing](#contributing)
- [Team](#team)
- [📚 Documentation](#-documentation)

---

## 📚 Documentation

**Comprehensive project documentation for funding and development:**

### **For Stakeholders & Investors**
- 📊 **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Executive summary, funding readiness, success metrics
- 📋 **[PRD.md](PRD.md)** - Product Requirements Document with complete feature specifications
- 📅 **[ROADMAP.md](ROADMAP.md)** - 24-week sprint-by-sprint implementation plan

### **For Developers**
- 🏗️ **[ARCHITECTURE.md](ARCHITECTURE.md)** - Technical architecture, database schema, API specs
- 📝 **[CHANGELOG.md](CHANGELOG.md)** - Version history and release notes
- 🤝 **[CONTRIBUTING.md](CONTRIBUTING.md)** - Code standards and contribution workflow

### **Quick Facts**
- **Current Status:** 65% MVP Complete
- **Timeline:** 24 weeks to production launch
- **Team Size:** 4 developers
- **Tech Stack:** React + TypeScript + Express + PostgreSQL

---

## 🎯 Overview

AgriCompassWeb is a comprehensive agricultural marketplace platform that facilitates direct connections between farmers and buyers. The platform enables farmers to list their products, buyers to browse and purchase in bulk, and field officers to verify farmer credentials.

### Key Roles

- **👨‍🌾 Farmers**: Create product listings, manage inventory, handle orders
- **🏢 Buyers**: Browse marketplace, add to cart, place bulk orders
- **🔍 Field Officers**: Verify farmer credentials and listings
- **👑 Admin**: Manage platform operations (future feature)

## ✨ Features

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

- `POST /api/payouts/request` (farmer) — request a payout (amount + bankAccount)
- `POST /api/payouts/process` (admin) — process a payout and optionally transfer funds via Paystack transfer API
- `POST /api/payouts/recipient` (farmer) — create Paystack transfer recipient (bank code + account)
- `GET /api/payouts/recipient/me` (farmer) — fetch your saved recipient code & bank account

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
