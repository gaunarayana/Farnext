-- App role and row-level security.
--
-- Run as the table owner (doadmin on livestock-db), never as farnext_app:
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_row_level_security.sql
--
-- Create the login first so the password is not stored in git.
--
--   DigitalOcean control panel or CLI (preferred on livestock-db):
--     doctl databases user create <cluster-id> farnext_app
--     See https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-users-and-databases/
--
--   Local Postgres, or when the role does not exist yet:
--     psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v app_password='choose-a-long-password' -f db/migrations/003_row_level_security.sql
--
-- The policy compares agency_id with the transaction setting
-- app.current_agency_id. The Next.js helper withTenant sets that value.
-- FORCE ROW LEVEL SECURITY applies the policy to the table owner as well.
-- It does not apply to superusers or to roles with BYPASSRLS.
-- doadmin is one of those roles, so the app must connect as farnext_app.
--
-- A missing or blank setting does not match any row. An empty string is
-- turned into NULL before the uuid cast so a query without a tenant
-- returns nothing instead of throwing.

\set ON_ERROR_STOP on

SELECT CASE
  WHEN EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farnext_app')
  THEN 'true'
  ELSE 'false'
END AS farnext_role_exists \gset

\if :farnext_role_exists
  \echo 'Role farnext_app already exists. Password left unchanged.'
\else
  \if :{?app_password}
    CREATE ROLE farnext_app
      WITH LOGIN
      PASSWORD :'app_password'
      NOSUPERUSER
      NOCREATEDB
      NOCREATEROLE
      NOINHERIT
      NOBYPASSRLS;
    \echo 'Created role farnext_app.'
  \else
    \echo 'farnext_app does not exist.'
    \echo 'Create it in the DigitalOcean control panel, or re-run with -v app_password=...'
    \quit 1
  \endif
\endif

ALTER ROLE farnext_app
  WITH NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOBYPASSRLS
  LOGIN;

DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO farnext_app',
    current_database()
  );
END
$$;

GRANT USAGE ON SCHEMA public TO farnext_app;
GRANT SELECT ON TABLE agencies TO farnext_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE users TO farnext_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE clients TO farnext_app;

REVOKE ALL ON TABLE users FROM PUBLIC;
REVOKE ALL ON TABLE clients FROM PUBLIC;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agency_isolation ON users;
CREATE POLICY agency_isolation ON users
  FOR ALL
  TO farnext_app
  USING (
    agency_id = NULLIF(current_setting('app.current_agency_id', true), '')::uuid
  )
  WITH CHECK (
    agency_id = NULLIF(current_setting('app.current_agency_id', true), '')::uuid
  );

DROP POLICY IF EXISTS agency_isolation ON clients;
CREATE POLICY agency_isolation ON clients
  FOR ALL
  TO farnext_app
  USING (
    agency_id = NULLIF(current_setting('app.current_agency_id', true), '')::uuid
  )
  WITH CHECK (
    agency_id = NULLIF(current_setting('app.current_agency_id', true), '')::uuid
  );
