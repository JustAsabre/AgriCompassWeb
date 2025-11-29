-- COMPLETE DATABASE MIGRATION FOR PRODUCTION (Neon DB)
-- Run this entire script in your Neon SQL Editor

-- Step 1: Add wallet_balance column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_balance DECIMAL(10,2) DEFAULT 0.00;

-- Step 2: Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'credit' or 'debit'
    description TEXT NOT NULL,
    reference_id TEXT, -- orderId or withdrawalId
    reference_type TEXT, -- 'order' or 'withdrawal'
    created_at TIMESTAMP DEFAULT NOW()
);

-- Step 3: Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    recipient_code TEXT,
    mobile_number TEXT,
    mobile_network TEXT,
    transaction_id TEXT, -- Paystack transfer code
    note TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP
);

-- Step 4: Create escrow table (if not exists)
CREATE TABLE IF NOT EXISTS escrow (
    id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id VARCHAR NOT NULL REFERENCES orders(id),
    buyer_id VARCHAR NOT NULL REFERENCES users(id),
    farmer_id VARCHAR NOT NULL REFERENCES users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'held', -- held, released, refunded, dispute
    upfront_payment_id VARCHAR REFERENCES payments(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Step 5: Add transaction reference to payments (if not exists)
ALTER TABLE payments ADD COLUMN IF NOT EXISTS transaction_id VARCHAR REFERENCES transactions(id);

-- Step 6: Verify all changes
SELECT 
    'users.wallet_balance' as check_item,
    CASE WHEN column_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END as status
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'wallet_balance'

UNION ALL

SELECT 
    'wallet_transactions table',
    CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM information_schema.tables 
WHERE table_name = 'wallet_transactions'

UNION ALL

SELECT 
    'withdrawals table',
    CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM information_schema.tables 
WHERE table_name = 'withdrawals'

UNION ALL

SELECT 
    'escrow table',
    CASE WHEN table_name IS NOT NULL THEN '✓ EXISTS' ELSE '✗ MISSING' END
FROM information_schema.tables 
WHERE table_name = 'escrow';

-- SUCCESS MESSAGE
SELECT '🎉 Migration complete! All schema changes applied.' as result;
