-- Migration: add account_number (globally unique) and account_type to accounts
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql

-- Step 1: Create a global sequence for account numbers
CREATE SEQUENCE IF NOT EXISTS account_number_seq
  START WITH 10000001
  INCREMENT BY 1
  NO CYCLE;

-- Step 2: Add account_number — auto-assigned from sequence, globally unique
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_number BIGINT
    NOT NULL DEFAULT nextval('account_number_seq');

-- Step 3: Add account_type
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS account_type TEXT
    NOT NULL DEFAULT 'raw_spread'
    CHECK (account_type IN ('raw_spread', 'ctrader', 'standard'));

-- Step 4: Unique index on account_number (used by support/admin lookups)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_account_number
  ON accounts(account_number);
