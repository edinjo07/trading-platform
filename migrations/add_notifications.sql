-- Migration: notifications inbox (account/trading event notifications)
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID         PRIMARY KEY,
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        TEXT         NOT NULL,                       -- margin_warning | margin_closeout | position_closed | order_filled | sl_hit | tp_hit | deposit | withdrawal | bot | alert | info
  severity    TEXT         NOT NULL DEFAULT 'info'         -- info | success | warning | critical
                CHECK (severity IN ('info','success','warning','critical')),
  title       TEXT         NOT NULL,
  message     TEXT         NOT NULL,
  metadata    JSONB        NOT NULL DEFAULT '{}'::jsonb,
  read        BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON notifications (user_id, created_at DESC);
