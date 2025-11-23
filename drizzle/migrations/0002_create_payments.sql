-- Drizzle/SQL migration: Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id varchar PRIMARY KEY,
  order_id varchar NOT NULL,
  payer_id varchar NOT NULL,
  amount numeric(12,2) NOT NULL,
  payment_method varchar NOT NULL,
  transaction_id varchar UNIQUE,
  status varchar NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments (order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer_id ON payments (payer_id);
