-- Drizzle/SQL migration: Create core application tables (users, listings, orders, cart_items, notifications, messages, reviews, payouts, escrow, transactions)
-- This migration ensures the users table exists (fixes registration "relation \"users\" does not exist\")

CREATE TABLE IF NOT EXISTS users (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL,
  phone text,
  region text,
  mobile_number text,
  mobile_network text,
  paystack_recipient_code text,
  failed_login_attempts integer DEFAULT 0,
  locked_until timestamp,
  verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  business_name text,
  farm_size text,
  reset_token text,
  reset_token_expiry timestamp,
  created_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- Minimal versions of related tables referenced by other migrations
CREATE TABLE IF NOT EXISTS listings (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id varchar NOT NULL REFERENCES users(id),
  product_name text NOT NULL,
  category text NOT NULL,
  subcategory text,
  description text NOT NULL,
  price numeric(12,2) NOT NULL,
  unit text NOT NULL,
  quantity_available integer NOT NULL,
  min_order_quantity integer NOT NULL,
  harvest_date text,
  location text NOT NULL,
  image_url text,
  status text DEFAULT 'active',
  moderated boolean DEFAULT false,
  moderation_status text DEFAULT 'pending',
  moderation_reason text,
  moderated_at timestamp,
  moderated_by varchar REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar NOT NULL REFERENCES users(id),
  farmer_id varchar NOT NULL REFERENCES users(id),
  listing_id varchar NOT NULL REFERENCES listings(id),
  quantity integer NOT NULL,
  total_price numeric(12,2) NOT NULL,
  status text DEFAULT 'pending',
  delivery_address text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cart_items (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar NOT NULL REFERENCES users(id),
  listing_id varchar NOT NULL REFERENCES listings(id),
  quantity integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  related_id varchar,
  related_type text,
  read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id varchar NOT NULL REFERENCES users(id),
  receiver_id varchar NOT NULL REFERENCES users(id),
  listing_id varchar REFERENCES listings(id),
  content text NOT NULL,
  read boolean DEFAULT false,
  moderated boolean DEFAULT false,
  moderation_status text DEFAULT 'approved',
  moderation_reason text,
  moderated_at timestamp,
  moderated_by varchar REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES orders(id),
  reviewer_id varchar NOT NULL REFERENCES users(id),
  reviewee_id varchar NOT NULL REFERENCES users(id),
  rating integer NOT NULL,
  comment text,
  approved boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now()
);

-- Ensure payouts exists (some migrations reference it)
CREATE TABLE IF NOT EXISTS payouts (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id varchar NOT NULL REFERENCES users(id),
  amount numeric(12,2) NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  bank_account text,
  mobile_number text,
  mobile_network text,
  scheduled_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS escrow (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id varchar NOT NULL REFERENCES orders(id) UNIQUE,
  buyer_id varchar NOT NULL REFERENCES users(id),
  farmer_id varchar NOT NULL REFERENCES users(id),
  total_amount numeric(12,2) NOT NULL,
  upfront_amount numeric(12,2) NOT NULL,
  remaining_amount numeric(12,2) NOT NULL,
  upfront_payment_id varchar REFERENCES payments(id),
  remaining_payment_id varchar REFERENCES payments(id),
  status text DEFAULT 'pending',
  upfront_held_at timestamp,
  remaining_released_at timestamp,
  disputed_at timestamp,
  dispute_reason text,
  dispute_resolved_at timestamp,
  dispute_resolution text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE IF NOT EXISTS transactions (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar NOT NULL REFERENCES users(id),
  total_amount numeric(12,2) NOT NULL,
  payment_method text,
  paystack_reference text,
  status text DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- End of core tables migration
