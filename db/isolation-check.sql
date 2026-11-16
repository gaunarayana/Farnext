-- Proves one agency cannot see the other's clients or users.
--
-- Run as farnext_app, after db/seed.sql:
--
--   psql "$APP_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/isolation-check.sql
--
-- APP_DATABASE_URL must use the user farnext_app and sslmode=require
-- on livestock-db. Do not run this as doadmin. doadmin bypasses
-- row-level security, so the check fails on purpose and tells you to
-- reconnect.

\set ON_ERROR_STOP on

DO $$
DECLARE
  bypass boolean;
BEGIN
  SELECT rolsuper OR rolbypassrls
  INTO bypass
  FROM pg_roles
  WHERE rolname = current_user;

  IF bypass THEN
    RAISE EXCEPTION
      'Connected as % which bypasses row-level security. Reconnect as farnext_app.',
      current_user;
  END IF;
END
$$;

DO $$
DECLARE
  visible integer;
BEGIN
  SELECT count(*) INTO visible FROM clients;
  IF visible <> 0 THEN
    RAISE EXCEPTION
      'With no tenant set, expected 0 clients and saw %.',
      visible;
  END IF;

  SELECT count(*) INTO visible FROM users;
  IF visible <> 0 THEN
    RAISE EXCEPTION
      'With no tenant set, expected 0 users and saw %.',
      visible;
  END IF;
END
$$;

DO $$
DECLARE
  agency_id uuid;
  visible integer;
  leaked integer;
BEGIN
  SELECT id INTO agency_id FROM agencies WHERE slug = 'southern-cross';
  IF agency_id IS NULL THEN
    RAISE EXCEPTION 'Agency southern-cross was not found. Run db/seed.sql.';
  END IF;

  PERFORM set_config('app.current_agency_id', agency_id::text, true);

  SELECT count(*) INTO visible
  FROM clients
  WHERE name IN ('Willow Creek Grazing', 'Harbour City Meats');

  SELECT count(*) INTO leaked
  FROM clients
  WHERE name IN ('High Country Station', 'Wellington Butchery Co');

  IF visible <> 2 OR leaked <> 0 THEN
    RAISE EXCEPTION
      'Southern Cross isolation failed. Visible sample clients: %, leaked: %.',
      visible,
      leaked;
  END IF;

  SELECT count(*) INTO leaked
  FROM users
  WHERE email = 'riley.bennett@paddock-co.example';

  IF leaked <> 0 THEN
    RAISE EXCEPTION 'Southern Cross can see a Paddock & Co user.';
  END IF;

  RAISE NOTICE 'southern-cross sees only its own clients and users.';
END
$$;

DO $$
DECLARE
  agency_id uuid;
  visible integer;
  leaked integer;
BEGIN
  SELECT id INTO agency_id FROM agencies WHERE slug = 'paddock-co';
  IF agency_id IS NULL THEN
    RAISE EXCEPTION 'Agency paddock-co was not found. Run db/seed.sql.';
  END IF;

  PERFORM set_config('app.current_agency_id', agency_id::text, true);

  SELECT count(*) INTO visible
  FROM clients
  WHERE name IN ('High Country Station', 'Wellington Butchery Co');

  SELECT count(*) INTO leaked
  FROM clients
  WHERE name IN ('Willow Creek Grazing', 'Harbour City Meats');

  IF visible <> 2 OR leaked <> 0 THEN
    RAISE EXCEPTION
      'Paddock & Co isolation failed. Visible sample clients: %, leaked: %.',
      visible,
      leaked;
  END IF;

  SELECT count(*) INTO leaked
  FROM users
  WHERE email = 'alex.nguyen@southern-cross.example';

  IF leaked <> 0 THEN
    RAISE EXCEPTION 'Paddock & Co can see a Southern Cross user.';
  END IF;

  RAISE NOTICE 'paddock-co sees only its own clients and users.';
END
$$;
