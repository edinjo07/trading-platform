-- Deposits & withdrawals ledger for the superadmin approval workflow.
-- Run this in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS transactions (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT          NOT NULL,
  type        TEXT          NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount      NUMERIC(15,2) NOT NULL,
  currency    TEXT          NOT NULL DEFAULT 'USD',
  method      TEXT,
  status      TEXT          NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  details     JSONB,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type   ON transactions(type);

-- Service role (server) has full access; no public policies needed.
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
