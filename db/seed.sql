-- Sample clients for the two agencies already on livestock-db.
-- Safe to run more than once.
--
--   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
--
-- Each block sets app.current_agency_id for that transaction, so the
-- inserts also succeed when you are connected as farnext_app.
-- doadmin bypasses row-level security; the setting is still set so the
-- same file works for both roles.
--
-- The agency inserts matter on a fresh local database. On livestock-db
-- the slugs already exist and the insert does nothing.

\set ON_ERROR_STOP on

INSERT INTO agencies (name, slug, country, currency, timezone)
VALUES
  ('Southern Cross Livestock', 'southern-cross', 'AU', 'AUD', 'Australia/Sydney'),
  ('Paddock & Co Agency', 'paddock-co', 'NZ', 'NZD', 'Pacific/Auckland')
ON CONFLICT (slug) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE slug = 'southern-cross') THEN
    RAISE EXCEPTION 'Missing agency slug southern-cross.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE slug = 'paddock-co') THEN
    RAISE EXCEPTION 'Missing agency slug paddock-co.';
  END IF;
END
$$;

BEGIN;

SELECT set_config(
  'app.current_agency_id',
  (SELECT id::text FROM agencies WHERE slug = 'southern-cross'),
  true
);

INSERT INTO users (agency_id, email, name, role)
SELECT id, 'alex.nguyen@southern-cross.example', 'Alex Nguyen', 'staff'
FROM agencies
WHERE slug = 'southern-cross'
ON CONFLICT (agency_id, email) DO NOTHING;

INSERT INTO clients (agency_id, kind, name, email, phone)
SELECT id, 'vendor', 'Willow Creek Grazing', 'office@willowcreek.example', '+61 2 5550 0142'
FROM agencies
WHERE slug = 'southern-cross'
ON CONFLICT (agency_id, email) WHERE email IS NOT NULL DO NOTHING;

INSERT INTO clients (agency_id, kind, name, email, phone)
SELECT id, 'buyer', 'Harbour City Meats', 'buying@harbourcity.example', '+61 2 5550 0188'
FROM agencies
WHERE slug = 'southern-cross'
ON CONFLICT (agency_id, email) WHERE email IS NOT NULL DO NOTHING;

COMMIT;

BEGIN;

SELECT set_config(
  'app.current_agency_id',
  (SELECT id::text FROM agencies WHERE slug = 'paddock-co'),
  true
);

INSERT INTO users (agency_id, email, name, role)
SELECT id, 'riley.bennett@paddock-co.example', 'Riley Bennett', 'staff'
FROM agencies
WHERE slug = 'paddock-co'
ON CONFLICT (agency_id, email) DO NOTHING;

INSERT INTO clients (agency_id, kind, name, email, phone)
SELECT id, 'vendor', 'High Country Station', 'stock@highcountry.example', '+64 3 555 0142'
FROM agencies
WHERE slug = 'paddock-co'
ON CONFLICT (agency_id, email) WHERE email IS NOT NULL DO NOTHING;

INSERT INTO clients (agency_id, kind, name, email, phone)
SELECT id, 'buyer', 'Wellington Butchery Co', 'orders@wellingtonbutchery.example', '+64 4 555 0190'
FROM agencies
WHERE slug = 'paddock-co'
ON CONFLICT (agency_id, email) WHERE email IS NOT NULL DO NOTHING;

COMMIT;
