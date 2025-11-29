-- FIX TRANSACTIONS TABLE SCHEMA
-- Run this in Neon SQL Editor

-- Add reference column if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS reference TEXT UNIQUE;

-- Add metadata column if missing
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata TEXT;

-- Add status column if missing (just in case)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Add amount column if missing (just in case)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);

-- Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions';
