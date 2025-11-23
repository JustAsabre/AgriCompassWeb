-- Create transactions table for combined payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'transactions'
  ) THEN
    CREATE TABLE transactions (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
      buyer_id varchar NOT NULL REFERENCES users(id),
      total_amount decimal(10,2) NOT NULL,
      payment_method text,
      paystack_reference text,
      status text DEFAULT 'pending',
      created_at timestamp DEFAULT now(),
      completed_at timestamp
    );
  END IF;
END$$;

-- Update payments table to add new columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'transaction_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN transaction_id varchar REFERENCES transactions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'paystack_reference'
  ) THEN
    ALTER TABLE payments ADD COLUMN paystack_reference text;
  END IF;
END$$;

-- Add indexes for performance
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'payments' AND indexname = 'idx_payments_transaction_id'
  ) THEN
    CREATE INDEX idx_payments_transaction_id ON payments(transaction_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'transactions' AND indexname = 'idx_transactions_buyer_id'
  ) THEN
    CREATE INDEX idx_transactions_buyer_id ON transactions(buyer_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'transactions' AND indexname = 'idx_transactions_paystack_reference'
  ) THEN
    CREATE INDEX idx_transactions_paystack_reference ON transactions(paystack_reference);
  END IF;
END$$;