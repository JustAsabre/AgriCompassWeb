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
- [Team Collaboration Guide](#team-collaboration-guide)
- [Project Structure](#project-structure)
- [Available Scripts](#available-scripts)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)

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

3. **Set up your Git identity**
   ```bash
   git config user.name "Your Name"
   git config user.email "your.email@example.com"
   ```

### Daily Workflow

#### 1. Start Your Day - Update Your Local Code
```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main
```

#### 2. Create a Feature Branch
**Always create a new branch for your work!**
```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Examples:
git checkout -b feature/add-payment-integration
git checkout -b fix/cart-bug
git checkout -b improve/ui-responsiveness
```

#### 3. Work on Your Feature
```bash
# Start the dev server
npm run dev

# Make your changes...
# Test your changes...
```

#### 4. Commit Your Changes
```bash
# Check what files you've changed
git status

# Add files to staging
git add .
# Or add specific files
git add src/components/NewComponent.tsx

# Commit with a clear message
git commit -m "Add: New payment integration component"

# More commit examples:
git commit -m "Fix: Cart total calculation bug"
git commit -m "Improve: Mobile responsiveness for marketplace"
git commit -m "Update: Product listing schema"
```

#### 5. Push Your Branch to GitHub
```bash
# Push your branch
git push origin feature/your-feature-name
```

#### 6. Create a Pull Request (PR)
1. Go to https://github.com/JustAsabre/AgriCompassWeb
2. Click "Pull requests" → "New pull request"
3. Select your branch
4. Add a clear title and description
5. Request review from team members
6. Click "Create pull request"

#### 7. After PR is Merged
```bash
# Switch back to main
git checkout main

# Pull the updated main branch
git pull origin main

# Delete your local feature branch (optional but recommended)
git branch -d feature/your-feature-name
```

### Handling Merge Conflicts

If you get conflicts when pulling or merging:

```bash
# Pull latest changes
git pull origin main

# If conflicts occur, Git will mark them in files like:
# <<<<<<< HEAD
# Your changes
# =======
# Other person's changes
# >>>>>>> branch-name

# 1. Open the conflicted files
# 2. Resolve conflicts manually
# 3. Remove conflict markers
# 4. Add the resolved files
git add .

# 5. Commit the merge
git commit -m "Resolve merge conflicts"
```

### Best Practices

#### Branch Naming Convention
- `feature/` - New features (e.g., `feature/add-payment`)
- `fix/` - Bug fixes (e.g., `fix/login-error`)
- `improve/` - Improvements (e.g., `improve/performance`)
- `docs/` - Documentation (e.g., `docs/api-guide`)

#### Commit Message Format
```
Type: Brief description

Examples:
- Add: User authentication system
- Fix: Cart total calculation
- Update: Product schema with new fields
- Remove: Deprecated API endpoint
- Improve: Search performance
- Docs: Add API documentation
```

#### Communication
- 💬 Use PR descriptions to explain WHAT and WHY
- 🔍 Review each other's code before merging
- 📢 Notify team before pushing major changes
- ❓ Ask questions in PR comments
- ✅ Test before pushing

### Common Git Commands Cheat Sheet

```bash
# Check current branch and status
git status
git branch

# Create and switch to new branch
git checkout -b branch-name

# Switch between branches
git checkout main
git checkout feature/some-feature

# Pull latest changes
git pull origin main

# Add and commit changes
git add .
git commit -m "Your message"

# Push changes
git push origin branch-name

# View commit history
git log --oneline

# Discard local changes (careful!)
git checkout -- filename
git reset --hard  # Discards ALL local changes

# Stash changes temporarily
git stash
git stash pop

# Update your branch with main
git checkout your-branch
git merge main
```

### Workflow Diagram

```
main (production-ready code)
  ├── feature/add-payment (Developer 1)
  ├── fix/cart-bug (Developer 2)
  ├── improve/ui (Developer 3)
  └── feature/notifications (Developer 4)

Each developer:
1. Creates branch from main
2. Works on their feature
3. Commits regularly
4. Pushes to GitHub
5. Creates Pull Request
6. Team reviews
7. Merges to main
```

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

## 📜 Available Scripts

```bash
# Development
npm run dev          # Start development server (port 5000)

# Building
npm run build        # Build for production

# Production
npm start            # Start production server

# Type Checking
npm run check        # Run TypeScript type checking

# Database
npm run db:push      # Push schema changes to database
```

## 📡 API Documentation

### Authentication Endpoints

#### POST `/api/auth/register`
Register a new user
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "role": "farmer",
  "phone": "+1234567890",
  "region": "North Region"
}
```

#### POST `/api/auth/login`
Login user
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

#### POST `/api/auth/logout`
Logout current user

#### GET `/api/auth/me`
Get current user session

### Listing Endpoints

#### GET `/api/listings`
Get all active listings

#### GET `/api/listings/:id`
Get specific listing with farmer details

#### POST `/api/listings` (Farmer only)
Create new listing
```json
{
  "productName": "Fresh Tomatoes",
  "category": "Vegetables",
  "description": "Organic tomatoes",
  "price": "2.50",
  "unit": "kg",
  "quantityAvailable": 500,
  "minOrderQuantity": 10,
  "location": "North Region"
}
```

#### PATCH `/api/listings/:id` (Farmer only)
Update listing

#### DELETE `/api/listings/:id` (Farmer only)
Delete listing

### Cart Endpoints (Buyer only)

#### GET `/api/cart`
Get buyer's cart items

#### POST `/api/cart`
Add item to cart
```json
{
  "listingId": "listing-id",
  "quantity": 20
}
```

#### DELETE `/api/cart/:id`
Remove item from cart

### Order Endpoints

#### POST `/api/orders/checkout` (Buyer only)
Checkout cart
```json
{
  "deliveryAddress": "123 Main St",
  "notes": "Please deliver in morning"
}
```

#### GET `/api/buyer/orders` (Buyer only)
Get buyer's orders

#### GET `/api/farmer/orders` (Farmer only)
Get farmer's orders

#### PATCH `/api/orders/:id/status` (Farmer only)
Update order status
```json
{
  "status": "accepted"
}
```

### Field Officer Endpoints

#### GET `/api/officer/farmers` (Officer only)
Get all farmers

#### POST `/api/officer/verify/:farmerId` (Officer only)
Verify farmer
```json
{
  "status": "approved",
  "notes": "Verified documents"
}
```

## 🤝 Contributing

### For Team Members

1. **Pick a task** from your project board or discuss with team
2. **Create a branch** following naming conventions
3. **Write clean code** with comments where needed
4. **Test your changes** thoroughly
5. **Commit regularly** with clear messages
6. **Push your branch** and create a PR
7. **Request review** from at least one team member
8. **Address feedback** and update PR
9. **Merge** after approval

### Code Quality Guidelines

- Use TypeScript types properly
- Follow existing code style
- Add comments for complex logic
- Keep functions small and focused
- Use meaningful variable names
- Test edge cases

## 📝 License

MIT License - see LICENSE file for details

## 👨‍💻 Development Team

- Developer 1: [Name] - [GitHub]
- Developer 2: [Name] - [GitHub]
- Developer 3: [Name] - [GitHub]
- Developer 4: [Name] - [GitHub]

## 🐛 Found a Bug?

1. Check if it's already reported in Issues
2. Create a new issue with detailed description
3. Include steps to reproduce
4. Add screenshots if applicable

## 💡 Feature Requests

We welcome feature suggestions! Open an issue with:
- Clear description
- Use case
- Expected behavior

## 📞 Support

For questions or issues:
- Open a GitHub Issue
- Contact team lead
- Check documentation

---

**Built with ❤️ by the AgriCompass Team**
