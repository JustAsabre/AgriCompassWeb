# AgriCompass Technical Architecture
**Version:** 1.0.0  
**Last Updated:** November 15, 2025  
**Status:** Active Development

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Technology Stack](#technology-stack)
4. [Database Schema](#database-schema)
5. [API Specifications](#api-specifications)
6. [Authentication & Security](#authentication--security)
7. [Frontend Architecture](#frontend-architecture)
8. [Backend Architecture](#backend-architecture)
9. [Deployment Strategy](#deployment-strategy)
10. [Performance Considerations](#performance-considerations)

---

## System Overview

AgriCompass is a full-stack web application built with a modern JavaScript/TypeScript ecosystem. The architecture follows a client-server model with clear separation of concerns.

### High-Level Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React 18.3 + TypeScript 5.6 + Vite 5.4                │ │
│  │  - Component-based UI (shadcn/ui)                      │ │
│  │  - Client-side routing (Wouter)                        │ │
│  │  - State management (TanStack Query)                   │ │
│  │  - Form handling (React Hook Form + Zod)               │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕ HTTP/HTTPS
┌─────────────────────────────────────────────────────────────┐
│                        SERVER TIER                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Express.js 4.21 + TypeScript                          │ │
│  │  - RESTful API endpoints                               │ │
│  │  - Session-based authentication                        │ │
│  │  - Role-based authorization (RBAC)                     │ │
│  │  - Middleware pipeline                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│                      DATA TIER                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Drizzle ORM + PostgreSQL                              │ │
│  │  - In-memory storage (development)                     │ │
│  │  - Neon Serverless Postgres (production)               │ │
│  │  - Type-safe database queries                          │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Request Flow
```
User Browser
    ↓
1. User visits /marketplace
    ↓
2. React Router (Wouter) matches route → Marketplace component
    ↓
3. Component mounts → TanStack Query triggers API call
    ↓
4. GET /api/listings → Express server
    ↓
5. requireAuth middleware → checks session
    ↓
6. Route handler → storage.getAllListingsWithFarmer()
    ↓
7. In-memory storage or PostgreSQL query
    ↓
8. JSON response → TanStack Query cache
    ↓
9. React re-renders with data → User sees listings
```

---

## Architecture Diagram

### Complete System Architecture (Production)
```
┌─────────────────────────────────────────────────────────────────────┐
│                           USERS                                      │
│  Farmers    │    Buyers    │  Field Officers  │    Admins           │
└──────┬──────┴──────┬───────┴────────┬─────────┴────────┬────────────┘
       │             │                │                  │
       └─────────────┴────────────────┴──────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE CDN (Optional)                         │
│  - DDoS protection                                                   │
│  - SSL/TLS termination                                               │
│  - Static asset caching                                              │
└────────────────────────────────┬─────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    LOAD BALANCER (Future)                            │
│  - Nginx or AWS ALB                                                  │
│  - Round-robin distribution                                          │
│  - Health checks                                                     │
└────────────────┬─────────────────────────────┬───────────────────────┘
                 ↓                             ↓
┌────────────────────────┐        ┌────────────────────────┐
│   WEB SERVER 1         │        │   WEB SERVER 2         │
│  Express.js + Vite     │        │  Express.js + Vite     │
│  Port: 5000            │        │  Port: 5000            │
└───────┬────────────────┘        └────────────┬───────────┘
        │                                      │
        └──────────────┬───────────────────────┘
                       ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    SESSION STORE                                     │
│  - Redis (production) or MemoryStore (dev)                           │
│  - Shared sessions across servers                                    │
└────────────────────────────────┬─────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    POSTGRESQL DATABASE                               │
│  - Neon Serverless Postgres (production)                             │
│  - Connection pooling                                                │
│  - Read replicas (future)                                            │
└────────────────────────────────┬─────────────────────────────────────┘
                                 ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  SendGrid    │  │   Stripe/    │  │  Cloudinary  │               │
│  │  (Email)     │  │  Flutterwave │  │  (Images)    │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Twilio     │  │   Socket.io  │  │   Sentry     │               │
│  │   (SMS)      │  │   (Real-time)│  │   (Errors)   │               │
│  └──────────────┘  └──────────────┘  └──────────────┘               │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend (Client Tier)
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI component framework |
| TypeScript | 5.6.3 | Type-safe JavaScript |
| Vite | 5.4.11 | Build tool and dev server |
| Wouter | 3.3.5 | Lightweight client-side router |
| TanStack Query | 5.62.2 | Data fetching and caching |
| React Hook Form | 7.53.2 | Form state management |
| Zod | 3.23.8 | Schema validation |
| Tailwind CSS | 3.4.15 | Utility-first CSS framework |
| shadcn/ui | Latest | Pre-built accessible components |
| Framer Motion | 11.11.17 | Animation library |
| Recharts | 2.15.0 | Charts and visualizations |
| Lucide React | 0.454.0 | Icon library |

### Backend (Server Tier)
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| Express.js | 4.21.1 | Web application framework |
| TypeScript | 5.6.3 | Type-safe JavaScript |
| Drizzle ORM | 0.36.4 | Type-safe ORM |
| PostgreSQL | 14+ | Relational database |
| express-session | 1.18.1 | Session management |
| bcryptjs | 2.4.3 | Password hashing |
| connect-pg-simple | 10.0.0 | PostgreSQL session store |

### Development Tools
| Tool | Purpose |
|------|---------|
| tsx | TypeScript execution |
| ESLint | Code linting |
| Prettier | Code formatting |
| Jest | Unit testing (future) |
| React Testing Library | Component testing (future) |
| Playwright | E2E testing (future) |

### Production Infrastructure (Planned)
| Service | Provider | Purpose |
|---------|----------|---------|
| Hosting | Vercel/Railway | Web server hosting |
| Database | Neon | Serverless PostgreSQL |
| CDN | Cloudflare | Static asset delivery |
| Email | SendGrid | Transactional emails |
| SMS | Twilio | Notifications |
| Payments | Stripe/Flutterwave | Payment processing |
| Images | Cloudinary | Image hosting & optimization |
| Monitoring | Sentry | Error tracking |
| Analytics | Google Analytics | User behavior tracking |

---

## Database Schema

### Current Tables (Implemented)

#### **users**
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL, -- bcrypt hashed
  full_name TEXT NOT NULL,
  role TEXT NOT NULL, -- 'farmer' | 'buyer' | 'field_officer' | 'admin'
  phone TEXT,
  region TEXT,
  verified BOOLEAN DEFAULT FALSE,
  business_name TEXT, -- for buyers
  farm_size TEXT, -- for farmers
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_verified ON users(verified);
```

#### **listings**
```sql
CREATE TABLE listings (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  unit TEXT NOT NULL, -- 'kg', 'tons', 'boxes'
  quantity_available INTEGER NOT NULL,
  min_order_quantity INTEGER NOT NULL,
  harvest_date TEXT,
  location TEXT NOT NULL,
  image_url TEXT,
  status TEXT DEFAULT 'active', -- 'active' | 'sold_out' | 'inactive'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_listings_farmer_id ON listings(farmer_id);
CREATE INDEX idx_listings_category ON listings(category);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_location ON listings(location);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
```

#### **pricing_tiers**
```sql
CREATE TABLE pricing_tiers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id VARCHAR NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  min_quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

-- Indexes
CREATE INDEX idx_pricing_tiers_listing_id ON pricing_tiers(listing_id);
CREATE UNIQUE INDEX idx_pricing_tiers_listing_qty ON pricing_tiers(listing_id, min_quantity);
```

#### **orders**
```sql
CREATE TABLE orders (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id VARCHAR NOT NULL REFERENCES users(id),
  farmer_id VARCHAR NOT NULL REFERENCES users(id),
  listing_id VARCHAR NOT NULL REFERENCES listings(id),
  quantity INTEGER NOT NULL,
  total_price DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled'
  delivery_address TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_orders_buyer_id ON orders(buyer_id);
CREATE INDEX idx_orders_farmer_id ON orders(farmer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
```

#### **cart_items**
```sql
CREATE TABLE cart_items (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  listing_id VARCHAR NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cart_items_buyer_id ON cart_items(buyer_id);
CREATE UNIQUE INDEX idx_cart_items_buyer_listing ON cart_items(buyer_id, listing_id);
```

#### **verifications**
```sql
CREATE TABLE verifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id VARCHAR NOT NULL REFERENCES users(id),
  officer_id VARCHAR NOT NULL REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  notes TEXT,
  document_url TEXT,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_verifications_farmer_id ON verifications(farmer_id);
CREATE INDEX idx_verifications_officer_id ON verifications(officer_id);
CREATE INDEX idx_verifications_status ON verifications(status);
```

### Future Tables (Planned)

#### **reviews** (Sprint 4)
```sql
CREATE TABLE reviews (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id),
  reviewer_id VARCHAR NOT NULL REFERENCES users(id),
  reviewee_id VARCHAR NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(order_id, reviewer_id)
);

CREATE INDEX idx_reviews_reviewee ON reviews(reviewee_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

#### **conversations** & **messages** (Sprint 5)
```sql
CREATE TABLE conversations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1_id VARCHAR NOT NULL REFERENCES users(id),
  participant_2_id VARCHAR NOT NULL REFERENCES users(id),
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(participant_1_id, participant_2_id)
);

CREATE TABLE messages (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id VARCHAR NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_unread ON messages(read) WHERE read = FALSE;
```

#### **notifications** (Sprint 6)
```sql
CREATE TABLE notifications (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR NOT NULL, -- 'order' | 'message' | 'verification' | 'payment'
  title VARCHAR NOT NULL,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
```

#### **payments** (Sprint 7)
```sql
CREATE TABLE payments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id),
  payer_id VARCHAR NOT NULL REFERENCES users(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR, -- 'card' | 'bank_transfer' | 'mobile_money'
  transaction_id VARCHAR, -- Provider transaction ID
  status VARCHAR DEFAULT 'pending', -- 'pending' | 'completed' | 'failed' | 'refunded'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);
```

#### **disputes** (Sprint 9)
```sql
CREATE TABLE disputes (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR NOT NULL REFERENCES orders(id),
  raised_by VARCHAR NOT NULL REFERENCES users(id),
  reason VARCHAR NOT NULL,
  description TEXT,
  status VARCHAR DEFAULT 'open', -- 'open' | 'investigating' | 'resolved' | 'escalated'
  resolution TEXT,
  resolved_by VARCHAR REFERENCES users(id),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_disputes_status ON disputes(status);
```

---

## API Specifications

### Authentication Endpoints

#### POST /api/auth/register
**Description:** Create new user account  
**Access:** Public  
**Request Body:**
```json
{
  "email": "farmer@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe",
  "role": "farmer",
  "phone": "+1234567890",
  "region": "Central Region",
  "farmSize": "5 acres"
}
```
**Response (201 Created):**
```json
{
  "user": {
    "id": "uuid",
    "email": "farmer@example.com",
    "fullName": "John Doe",
    "role": "farmer",
    "verified": false
  }
}
```
**Errors:**
- 400 Bad Request: Invalid input or email already exists
- 500 Internal Server Error

---

#### POST /api/auth/login
**Description:** Authenticate user and create session  
**Access:** Public  
**Request Body:**
```json
{
  "email": "farmer@example.com",
  "password": "SecurePassword123!"
}
```
**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "farmer@example.com",
    "fullName": "John Doe",
    "role": "farmer",
    "verified": true
  }
}
```
**Errors:**
- 401 Unauthorized: Invalid credentials
- 500 Internal Server Error

---

#### POST /api/auth/logout
**Description:** Destroy user session  
**Access:** Authenticated  
**Response (200 OK):**
```json
{
  "success": true
}
```

---

#### GET /api/auth/me
**Description:** Get current authenticated user  
**Access:** Authenticated  
**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "email": "farmer@example.com",
    "fullName": "John Doe",
    "role": "farmer",
    "verified": true
  }
}
```
**Errors:**
- 401 Unauthorized: Not authenticated

---

### Listing Endpoints

#### GET /api/listings
**Description:** Get all product listings  
**Access:** Public  
**Query Parameters:**
- `category` (optional): Filter by category
- `region` (optional): Filter by location
- `verified` (optional): Filter by farmer verification status

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "productName": "Organic Tomatoes",
    "category": "Vegetables",
    "price": "2.50",
    "unit": "kg",
    "quantityAvailable": 500,
    "location": "Central Region",
    "farmer": {
      "id": "uuid",
      "fullName": "John Doe",
      "verified": true
    }
  }
]
```

---

#### GET /api/listings/:id
**Description:** Get single listing with farmer details  
**Access:** Public  
**Response (200 OK):**
```json
{
  "id": "uuid",
  "productName": "Organic Tomatoes",
  "category": "Vegetables",
  "description": "Fresh organic tomatoes...",
  "price": "2.50",
  "unit": "kg",
  "quantityAvailable": 500,
  "minOrderQuantity": 50,
  "harvestDate": "2025-11-10",
  "location": "Central Region",
  "imageUrl": "https://...",
  "status": "active",
  "farmer": {
    "id": "uuid",
    "fullName": "John Doe",
    "verified": true,
    "region": "Central Region"
  },
  "pricingTiers": [
    {"minQuantity": 100, "price": "2.30"},
    {"minQuantity": 200, "price": "2.10"}
  ]
}
```
**Errors:**
- 404 Not Found: Listing doesn't exist

---

#### POST /api/listings
**Description:** Create new product listing  
**Access:** Farmer only  
**Request Body:**
```json
{
  "productName": "Organic Tomatoes",
  "category": "Vegetables",
  "description": "Fresh organic tomatoes grown without pesticides",
  "price": "2.50",
  "unit": "kg",
  "quantityAvailable": 500,
  "minOrderQuantity": 50,
  "harvestDate": "2025-11-10",
  "location": "Central Region",
  "imageUrl": "https://..."
}
```
**Response (201 Created):**
```json
{
  "id": "uuid",
  "productName": "Organic Tomatoes",
  ...
}
```
**Errors:**
- 401 Unauthorized: Not logged in
- 403 Forbidden: Not a farmer
- 400 Bad Request: Invalid input

---

### Order Endpoints

#### POST /api/orders/checkout
**Description:** Convert cart items to orders  
**Access:** Buyer only  
**Request Body:**
```json
{
  "deliveryAddress": "123 Main St, City",
  "notes": "Please deliver between 9-5pm"
}
```
**Response (200 OK):**
```json
{
  "orders": [
    {
      "id": "uuid",
      "listingId": "uuid",
      "quantity": 100,
      "totalPrice": "250.00",
      "status": "pending"
    }
  ]
}
```

---

#### PATCH /api/orders/:id/status
**Description:** Update order status (farmer only)  
**Access:** Farmer (order owner)  
**Request Body:**
```json
{
  "status": "accepted"
}
```
**Response (200 OK):**
```json
{
  "id": "uuid",
  "status": "accepted",
  "updatedAt": "2025-11-15T12:00:00Z"
}
```

---

### Complete API Route Map

```
Authentication
├── POST   /api/auth/register
├── POST   /api/auth/login
├── POST   /api/auth/logout
└── GET    /api/auth/me

Listings
├── GET    /api/listings
├── GET    /api/listings/:id
├── POST   /api/listings (farmer)
├── PATCH  /api/listings/:id (farmer)
└── DELETE /api/listings/:id (farmer)

Farmer Routes
├── GET    /api/farmer/listings
└── GET    /api/farmer/orders

Buyer Routes
├── GET    /api/buyer/orders

Cart
├── GET    /api/cart (buyer)
├── POST   /api/cart (buyer)
└── DELETE /api/cart/:id (buyer)

Orders
├── POST   /api/orders/checkout (buyer)
└── PATCH  /api/orders/:id/status (farmer)

Field Officer
├── GET    /api/officer/farmers
└── POST   /api/officer/verify/:farmerId

User
└── GET    /api/user/:id

Future Endpoints (Planned)
├── POST   /api/listings/:id/pricing-tiers
├── GET    /api/reviews/user/:userId
├── POST   /api/conversations/start
├── GET    /api/notifications
├── POST   /api/payments/initiate
├── POST   /api/disputes
└── GET    /api/admin/stats
```

---

## Authentication & Security

### Session-Based Authentication
```typescript
// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // Prevents XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in prod
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    sameSite: 'lax' // CSRF protection
  },
  store: new MemoryStore() // Use Redis in production
}));
```

### Password Security
- **Hashing Algorithm:** bcrypt
- **Salt Rounds:** 10
- **Minimum Password Length:** 8 characters (enforced client-side)
- **Password Complexity:** Recommended (uppercase, lowercase, number, special char)

```typescript
// Password hashing
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Password verification
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

### Authorization Middleware
```typescript
// Require authentication
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
}

// Require specific role
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.session.user || !roles.includes(req.session.user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }
    next();
  };
}
```

### Security Headers (Future)
```typescript
// Helmet.js configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Rate Limiting (Planned - Sprint 1)
```typescript
import rateLimit from 'express-rate-limit';

// Login rate limiting
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later'
});

app.post('/api/auth/login', loginLimiter, async (req, res) => {
  // Login logic
});
```

---

## Frontend Architecture

### Component Structure
```
src/
├── components/
│   ├── ui/ (shadcn/ui components)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── form.tsx
│   │   └── ... (40+ components)
│   ├── header.tsx (Navigation)
│   ├── theme-provider.tsx
│   └── theme-toggle.tsx
├── pages/ (Route components)
│   ├── landing.tsx
│   ├── login.tsx
│   ├── register.tsx
│   ├── marketplace.tsx
│   ├── product-detail.tsx
│   ├── farmer-dashboard.tsx
│   ├── buyer-dashboard.tsx
│   ├── officer-dashboard.tsx
│   ├── create-listing.tsx
│   ├── cart.tsx
│   ├── profile.tsx
│   └── not-found.tsx
├── hooks/
│   ├── use-mobile.tsx
│   └── use-toast.ts
├── lib/
│   ├── auth.tsx (AuthContext)
│   ├── queryClient.ts (TanStack Query config)
│   └── utils.ts (Helper functions)
├── App.tsx (Main app component)
└── main.tsx (Entry point)
```

### State Management Strategy

#### Server State (TanStack Query)
- API data fetching
- Automatic caching
- Background refetching
- Optimistic updates

```typescript
// Example: Fetching listings
const { data: listings, isLoading } = useQuery<Listing[]>({
  queryKey: ["/api/listings"],
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

#### Client State (React Context)
- Authentication state
- Theme preferences
- UI state (modals, toasts)

```typescript
// Auth context
const { user, login, logout } = useAuth();
```

#### Form State (React Hook Form)
- Form validation
- Error handling
- Submit state

```typescript
const form = useForm<FormData>({
  resolver: zodResolver(formSchema),
  defaultValues: { ... }
});
```

### Routing Strategy
```typescript
// Wouter-based routing
<Route path="/" component={Landing} />
<Route path="/login" component={Login} />
<Route path="/marketplace" component={Marketplace} />
<Route path="/farmer/dashboard">
  {() => <ProtectedRoute component={FarmerDashboard} allowedRoles={["farmer"]} />}
</Route>
```

---

## Backend Architecture

### Middleware Pipeline
```
Request → Session middleware → CORS → JSON parser → Routes → Error handler → Response
```

```typescript
// Middleware stack
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ ... }));
app.use(routes);
app.use(errorHandler);
```

### Storage Layer (Abstract Interface)
```typescript
interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Listings
  getAllListings(): Promise<Listing[]>;
  createListing(listing: InsertListing): Promise<Listing>;
  
  // Orders, Cart, Verifications, etc.
  ...
}
```

### Current Implementation: MemStorage
- In-memory Map-based storage
- Pre-seeded test data
- Fast for development
- Data lost on server restart

### Production Implementation: PostgresStorage (Future)
- Drizzle ORM queries
- Connection pooling
- Transactions for data integrity
- Persistent storage

---

## Deployment Strategy

### Development
```bash
# Start dev server
npm run dev

# Server: http://localhost:5000
# Vite HMR: Automatic reload
```

### Staging (Future)
```bash
# Build production assets
npm run build

# Run with production database
NODE_ENV=production npm start
```

### Production (Recommended Stack)
```yaml
Hosting: Vercel or Railway
Database: Neon Serverless Postgres
CDN: Cloudflare
Email: SendGrid
Monitoring: Sentry
```

#### Environment Variables
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-64-char-string>
SENDGRID_API_KEY=<key>
STRIPE_SECRET_KEY=<key>
CLOUDINARY_URL=<url>
```

---

## Performance Considerations

### Database Optimization
- Indexes on foreign keys and frequently queried columns
- Connection pooling (pg-pool)
- Query result caching (Redis)
- Pagination for large datasets

### Frontend Optimization
- Code splitting (Vite automatic)
- Lazy loading routes
- Image optimization (Cloudinary)
- Service worker caching (PWA)

### Monitoring & Observability
- Error tracking (Sentry)
- Performance monitoring (New Relic or Datadog)
- Log aggregation (Logtail or CloudWatch)
- Uptime monitoring (UptimeRobot)

---

**Document Maintained By:** Development Team  
**Last Updated:** November 15, 2025  
**Next Review:** End of Sprint 3
