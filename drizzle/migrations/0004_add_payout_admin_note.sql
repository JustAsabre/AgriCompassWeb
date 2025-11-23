-- Drizzle/SQL migration: add admin_note column to payouts
ALTER TABLE payouts
  ADD COLUMN IF NOT EXISTS admin_note text;
