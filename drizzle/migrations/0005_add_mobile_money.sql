-- Add mobile money columns to users and payouts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE users ADD COLUMN mobile_number text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'mobile_network'
  ) THEN
    ALTER TABLE users ADD COLUMN mobile_network text;
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payouts' AND column_name = 'mobile_number'
  ) THEN
    ALTER TABLE payouts ADD COLUMN mobile_number text;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payouts' AND column_name = 'mobile_network'
  ) THEN
    ALTER TABLE payouts ADD COLUMN mobile_network text;
  END IF;
END$$;
-- Drizzle/SQL migration: Add mobile money fields to users and payouts
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS mobile_network text;

ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS mobile_number text,
  ADD COLUMN IF NOT EXISTS mobile_network text;

-- Optional: For backwards compatibility, keep bank_account column
-- No migration for dropping bank_account is done here to preserve data.
