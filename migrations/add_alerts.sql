-- Migration: price_alerts (server-monitored price alerts)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql

CREATE TABLE IF NOT EXISTS price_alerts (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT          NOT NULL,
  symbol        TEXT          NOT NULL,
  condition     TEXT          NOT NULL CHECK (condition IN ('above', 'below')),
  target_price  NUMERIC(18,8) NOT NULL,
  note          TEXT          NOT NULL DEFAULT '',
  status        TEXT          NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'triggered', 'dismissed')),
  current_price NUMERIC(18,8),
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT now(),
  triggered_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS price_alerts_user_idx   ON price_alerts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS price_alerts_active_idx ON price_alerts (status) WHERE status = 'active';

-- Server reads/writes with the service-role key (bypasses RLS); enabling RLS with
-- no policies blocks any direct client access.
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
