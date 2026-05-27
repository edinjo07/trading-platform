-- Migration: add currency column to accounts table
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql

-- Step 1: Add currency column (existing rows default to 'USD')
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD'
  CHECK (currency IN ('USD', 'EUR', 'GBP'));

-- Step 2: Drop the old unique constraint (user_id, mode)
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_mode_key;

-- Step 3: Add new unique constraint (user_id, mode, currency)
ALTER TABLE accounts
  ADD CONSTRAINT accounts_user_id_mode_currency_key UNIQUE (user_id, mode, currency);

-- Step 4: Replace the index
DROP INDEX IF EXISTS idx_accounts_user;
CREATE INDEX idx_accounts_user ON accounts (user_id, mode, currency);
