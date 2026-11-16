-- Agencies table for Farnext.
--
-- livestock-db already has this table, with Southern Cross Livestock and
-- Paddock & Co Agency loaded. `CREATE TABLE IF NOT EXISTS` leaves that
-- table alone. On a brand-new database this file creates the same shape.
--
-- Run as doadmin (or the local superuser), from the repo root:
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_agencies.sql
--
-- This file does not insert rows. Sample rows are in db/seed.sql.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS agencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  country CHAR(2) NOT NULL,
  currency CHAR(3) NOT NULL,
  timezone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT agencies_country_check CHECK (country IN ('AU', 'NZ')),
  CONSTRAINT agencies_currency_check CHECK (currency IN ('AUD', 'NZD'))
);
