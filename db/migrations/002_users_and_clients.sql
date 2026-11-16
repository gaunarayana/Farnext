-- Tenant tables. Every row belongs to one agency.
--
-- Run after 001, as doadmin (or the local superuser):
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_users_and_clients.sql
--
-- `agency_id` is required, indexed, and a foreign key to agencies.
-- Row-level security is added in 003. Creating the tables first lets you
-- read the shape before the policies are turned on.

\set ON_ERROR_STOP on

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT users_role_check CHECK (role IN ('owner', 'admin', 'staff')),
  CONSTRAINT users_agency_id_email_key UNIQUE (agency_id, email)
);

CREATE INDEX IF NOT EXISTS users_agency_id_idx ON users (agency_id);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies (id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT clients_kind_check CHECK (kind IN ('vendor', 'buyer'))
);

CREATE INDEX IF NOT EXISTS clients_agency_id_idx ON clients (agency_id);

CREATE UNIQUE INDEX IF NOT EXISTS clients_agency_id_email_idx
  ON clients (agency_id, email)
  WHERE email IS NOT NULL;
