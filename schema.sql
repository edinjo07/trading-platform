-- ============================================================
-- TradeX Pro - Supabase Schema
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql
-- ============================================================

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID          PRIMARY KEY,
  email         TEXT          UNIQUE NOT NULL,
  username      TEXT          NOT NULL,
  password_hash TEXT          NOT NULL,
  balance       NUMERIC       NOT NULL DEFAULT 100000,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id               UUID          PRIMARY KEY,
  user_id          UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  symbol           TEXT          NOT NULL,
  side             TEXT          NOT NULL CHECK (side IN ('buy','sell')),
  type             TEXT          NOT NULL,
  status           TEXT          NOT NULL,
  quantity         NUMERIC       NOT NULL,
  price            NUMERIC,
  stop_price       NUMERIC,
  filled_quantity  NUMERIC       NOT NULL DEFAULT 0,
  avg_fill_price   NUMERIC,
  commission       NUMERIC       NOT NULL DEFAULT 0,
  slippage         NUMERIC       NOT NULL DEFAULT 0,
  leverage         NUMERIC       NOT NULL DEFAULT 1,
  take_profit      NUMERIC,
  stop_loss        NUMERIC,
  trailing_offset  NUMERIC,
  time_in_force    TEXT          NOT NULL DEFAULT 'GTC',
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  filled_at        TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status);

-- ── Portfolios ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS portfolios (
  user_id             UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  cash_balance        NUMERIC     NOT NULL DEFAULT 100000,
  total_market_value  NUMERIC     NOT NULL DEFAULT 0,
  total_equity        NUMERIC     NOT NULL DEFAULT 100000,
  unrealized_pnl      NUMERIC     NOT NULL DEFAULT 0,
  realized_pnl        NUMERIC     NOT NULL DEFAULT 0,
  today_pnl           NUMERIC     NOT NULL DEFAULT 0,
  peak_equity         NUMERIC     NOT NULL DEFAULT 100000,
  drawdown            NUMERIC     NOT NULL DEFAULT 0,
  positions           JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Trade Journal ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trade_journal (
  id                UUID          PRIMARY KEY,
  user_id           UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id          UUID,
  symbol            TEXT          NOT NULL,
  side              TEXT          NOT NULL CHECK (side IN ('buy','sell')),
  quantity          NUMERIC       NOT NULL,
  entry_price       NUMERIC       NOT NULL,
  exit_price        NUMERIC,
  pnl               NUMERIC,
  net_pnl           NUMERIC,
  pnl_percent       NUMERIC,
  commission        NUMERIC       NOT NULL DEFAULT 0,
  opened_at         TIMESTAMPTZ   NOT NULL,
  closed_at         TIMESTAMPTZ,
  holding_period_ms BIGINT,
  asset_class       TEXT
);

CREATE INDEX IF NOT EXISTS idx_journal_user_id ON trade_journal(user_id);

-- ── Bots ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bots (
  id                    UUID        PRIMARY KEY,
  user_id               UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT        NOT NULL,
  symbol                TEXT        NOT NULL,
  strategy              TEXT        NOT NULL,
  params                JSONB       NOT NULL DEFAULT '{}',
  status                TEXT        NOT NULL DEFAULT 'idle',
  position              TEXT        NOT NULL DEFAULT 'none',
  trades                INT         NOT NULL DEFAULT 0,
  wins                  INT         NOT NULL DEFAULT 0,
  losses                INT         NOT NULL DEFAULT 0,
  pnl                   NUMERIC     NOT NULL DEFAULT 0,
  peak_pnl              NUMERIC     NOT NULL DEFAULT 0,
  max_drawdown          NUMERIC     NOT NULL DEFAULT 0,
  equity_curve          JSONB       NOT NULL DEFAULT '[]'::jsonb,
  daily_trades          INT         NOT NULL DEFAULT 0,
  daily_loss            NUMERIC     NOT NULL DEFAULT 0,
  daily_reset_date      TEXT        NOT NULL DEFAULT '',
  warmup_bars_needed    INT         NOT NULL DEFAULT 0,
  warmup_bars_current   INT         NOT NULL DEFAULT 0,
  logs                  JSONB       NOT NULL DEFAULT '[]'::jsonb,
  risk_accepted         BOOLEAN,
  risk_accepted_at      TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at            TIMESTAMPTZ,
  stopped_at            TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bots_user_id ON bots(user_id);

-- ── Transactions (Deposits & Withdrawals) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID          PRIMARY KEY,
  user_id       UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type          TEXT          NOT NULL CHECK (type IN ('deposit','withdraw')),
  amount        NUMERIC       NOT NULL,
  currency      TEXT          NOT NULL DEFAULT 'EUR',
  method        TEXT,
  gateway       TEXT,
  status        TEXT          NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed','rejected')),
  tx_ref        TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type    ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status  ON transactions(status);

-- ── Row Level Security (optional - disable for server-side service role) ──
-- The server uses the service_role key which bypasses RLS automatically.
-- Enable RLS if you also expose Supabase directly to the client:
-- ALTER TABLE users        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE portfolios   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trade_journal ENABLE ROW LEVEL SECURITY;
