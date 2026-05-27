-- ============================================================
-- Trading Platform — Clean Schema Migration
-- Run this in your Supabase SQL editor to reset all trading data.
-- ============================================================

-- Step 1: Drop old tables
DROP TABLE IF EXISTS trade_journal CASCADE;
DROP TABLE IF EXISTS orders        CASCADE;
DROP TABLE IF EXISTS portfolios    CASCADE;
DROP TABLE IF EXISTS bots          CASCADE;

-- Step 2: Create new tables

-- accounts: one row per (user_id, mode), holds the user's cash balance
CREATE TABLE accounts (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  mode          TEXT          NOT NULL DEFAULT 'demo' CHECK (mode IN ('demo', 'real')),
  cash_balance  NUMERIC(15,2) NOT NULL DEFAULT 100000.00,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  UNIQUE(user_id, mode)
);

-- positions: one row per open position (closed positions are deleted)
CREATE TABLE positions (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  mode          TEXT          NOT NULL DEFAULT 'demo',
  symbol        TEXT          NOT NULL,
  side          TEXT          NOT NULL CHECK (side IN ('long', 'short')),
  quantity      NUMERIC(18,8) NOT NULL,
  avg_price     NUMERIC(18,8) NOT NULL,
  leverage      INTEGER       NOT NULL DEFAULT 1,
  margin        NUMERIC(15,2) NOT NULL,   -- cash locked = notional / leverage
  take_profit   NUMERIC(18,8),
  stop_loss     NUMERIC(18,8),
  opened_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- orders: immutable log of every order placed (market open + market close)
CREATE TABLE orders (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  mode          TEXT          NOT NULL DEFAULT 'demo',
  symbol        TEXT          NOT NULL,
  side          TEXT          NOT NULL CHECK (side IN ('buy', 'sell')),
  type          TEXT          NOT NULL DEFAULT 'market',
  status        TEXT          NOT NULL DEFAULT 'filled' CHECK (status IN ('filled', 'rejected')),
  quantity      NUMERIC(18,8) NOT NULL,
  fill_price    NUMERIC(18,8),
  commission    NUMERIC(15,8) NOT NULL DEFAULT 0,
  leverage      INTEGER       NOT NULL DEFAULT 1,
  take_profit   NUMERIC(18,8),
  stop_loss     NUMERIC(18,8),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- trades: immutable log of every closed position
CREATE TABLE trades (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  mode          TEXT          NOT NULL DEFAULT 'demo',
  symbol        TEXT          NOT NULL,
  side          TEXT          NOT NULL CHECK (side IN ('long', 'short')),
  quantity      NUMERIC(18,8) NOT NULL,
  entry_price   NUMERIC(18,8) NOT NULL,
  exit_price    NUMERIC(18,8) NOT NULL,
  leverage      INTEGER       NOT NULL DEFAULT 1,
  pnl           NUMERIC(15,2) NOT NULL,  -- gross P&L before commission
  commission    NUMERIC(15,8) NOT NULL DEFAULT 0,
  net_pnl       NUMERIC(15,2) NOT NULL,  -- pnl - commission
  opened_at     TIMESTAMPTZ   NOT NULL,
  closed_at     TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_accounts_user  ON accounts (user_id, mode);
CREATE INDEX idx_positions_user ON positions(user_id, mode);
CREATE INDEX idx_orders_user    ON orders   (user_id, mode, created_at DESC);
CREATE INDEX idx_trades_user    ON trades   (user_id, mode, closed_at  DESC);
