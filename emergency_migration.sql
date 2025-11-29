-- Emergency migration to add missing wallet_balance column
-- Run this on your Neon database console

ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance VARCHAR DEFAULT '0.00';

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'wallet_balance';
