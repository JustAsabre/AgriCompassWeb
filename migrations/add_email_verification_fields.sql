-- Migration: Add email verification fields to users table
-- Date: 2025-01-17

-- Add email verification fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expiry TIMESTAMP;

-- Set existing users as email verified (they were already using the platform)
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;
