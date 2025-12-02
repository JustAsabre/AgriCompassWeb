-- Fix production database schema issues
-- Run this against the Neon production database

-- Ensure wallet_transactions table has correct columns
-- Note: These might already exist, so we use IF NOT EXISTS where possible

DO $$ 
BEGIN
    -- Add reference_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' AND column_name = 'reference_id'
    ) THEN
        ALTER TABLE wallet_transactions ADD COLUMN reference_id TEXT;
    END IF;

    -- Add reference_type if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' AND column_name = 'reference_type'
    ) THEN
        ALTER TABLE wallet_transactions ADD COLUMN reference_type TEXT;
    END IF;

    -- Add status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallet_transactions' AND column_name = 'status'
    ) THEN
        ALTER TABLE wallet_transactions ADD COLUMN status TEXT DEFAULT 'completed';
    END IF;
END $$;

-- Verify the schema
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'wallet_transactions'
ORDER BY ordinal_position;
