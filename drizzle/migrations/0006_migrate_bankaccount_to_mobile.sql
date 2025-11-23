-- 0006_migrate_bankaccount_to_mobile.sql
-- Migration: Copy bank_account values to mobile_number when bank_account looks like Ghana mobile numbers
-- Note: Bank account fields often contain non-phone data. This migration only updates mobile_number
-- when bank_account matches a Ghana mobile number pattern (either +233XXXXXXXXX or 0XXXXXXXXX).

DO $$
BEGIN
  -- Only run if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='bank_account')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='mobile_number') THEN
    UPDATE users
    SET mobile_number = CASE
      WHEN bank_account ~ '^\\+233[0-9]{9}$' THEN bank_account
      WHEN bank_account ~ '^0[0-9]{9}$' THEN '+233' || substring(bank_account from 2)
      ELSE mobile_number
    END
    WHERE mobile_number IS NULL AND (bank_account ~ '^\\+233[0-9]{9}$' OR bank_account ~ '^0[0-9]{9}$');
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='bank_account')
  AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='payouts' AND column_name='mobile_number') THEN
    UPDATE payouts
    SET mobile_number = CASE
      WHEN bank_account ~ '^\\+233[0-9]{9}$' THEN bank_account
      WHEN bank_account ~ '^0[0-9]{9}$' THEN '+233' || substring(bank_account from 2)
      ELSE mobile_number
    END
    WHERE mobile_number IS NULL AND (bank_account ~ '^\\+233[0-9]{9}$' OR bank_account ~ '^0[0-9]{9}$');
  END IF;
END$$;

-- It's advised to review the rows updated and backup data prior to running this in production.
-- This migration assumes that a bank_account that matches the Ghana number pattern is indeed a mobile number; otherwise, such rows are not updated.
