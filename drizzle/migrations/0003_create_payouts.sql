-- Drizzle/SQL migration: Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
  id varchar PRIMARY KEY,
  farmer_id varchar NOT NULL,
  amount numeric(12,2) NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  bank_account varchar,
  paystack_transfer_id varchar,
  scheduled_date timestamp with time zone,
  created_at timestamp with time zone DEFAULT NOW(),
  updated_at timestamp with time zone DEFAULT NOW(),
  completed_at timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_payouts_farmer_id ON payouts (farmer_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts (status);
