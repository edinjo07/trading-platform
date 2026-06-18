-- Migration: KYC / identity verification
-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tkplwifmstnkecevgbyi/sql
--
-- One row per user. Stores document *metadata* (type + filename) and per-document
-- review status. Document images are NOT stored here — this is a trading simulator,
-- so only the verification state is persisted.

CREATE TABLE IF NOT EXISTS kyc_submissions (
  user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'unverified'          -- overall: unverified | pending | verified | rejected
                  CHECK (status IN ('unverified','pending','verified','rejected')),
  id_type       TEXT,                                             -- passport | national_id | drivers_license
  id_doc_name   TEXT,
  id_status     TEXT        NOT NULL DEFAULT 'empty'
                  CHECK (id_status IN ('empty','pending','verified','rejected')),
  poa_type      TEXT,                                             -- utility_bill | bank_statement | government_letter
  poa_doc_name  TEXT,
  poa_status    TEXT        NOT NULL DEFAULT 'empty'
                  CHECK (poa_status IN ('empty','pending','verified','rejected')),
  reject_reason TEXT,
  submitted_at  TIMESTAMPTZ,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
