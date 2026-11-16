# Farnext

Farnext is a starter for a multi-tenant livestock sales processing app. Each livestock agency is a tenant. Southern Cross Livestock in Australia and Paddock & Co Agency in New Zealand are already in the `livestock-db` database. The app must never show one agency the other agency's clients or staff.

The database is a DigitalOcean managed PostgreSQL 18 cluster named `livestock-db`, database `defaultdb`. Connections use SSL (`sslmode=require`).

## What you need

- Node.js 20.9 or newer, and npm. Check with `node -v`.
- The `farnext_app` database password, stored in a password manager. It does not belong in git.
- For the website on your laptop: this repo, and a `DATABASE_URL` that your laptop is allowed to use.
- For changing `livestock-db`: a DigitalOcean Droplet that is a trusted source of the database. You open that Droplet in the browser. The work laptop does not need `psql` installed.

## Run the website locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your local env file. This file is gitignored.

   ```bash
   cp .env.example .env.local
   ```

3. Open `.env.local` and set `DATABASE_URL` to the **farnext_app** connection string. The shape is in `.env.example`. Use database `defaultdb` and keep `sslmode=require`.

   Do not use the `doadmin` string. `doadmin` bypasses row-level security, so the tenant rules would not apply.

4. Your laptop can reach the managed database only if its IP address is a trusted source. In the DigitalOcean control panel open **Databases → livestock-db → Network Access** (trusted sources) and add your current IP. The steps are in [How to Secure PostgreSQL Managed Database Clusters](https://docs.digitalocean.com/products/databases/postgresql/how-to/secure/).

   If you cannot add the laptop, skip to the Droplet section, run the migrations there, and point `.env.local` at a Postgres you run yourself using the same SQL files.

5. Start the site:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000). You should see both agencies. Open `/southern-cross` or `/paddock-co` for that agency's name, country, and currency.

`npm run build` and `npm run lint` do not need a database. The pages wait until a real request before they connect.

## Environment variables

| Name | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes, at runtime | Connection string for user `farnext_app`, database `defaultdb`, with `sslmode=require`. Read this from the environment. Never commit the real value. |

Copy the string from **Databases → livestock-db → Overview → Connection details**. Choose the user `farnext_app` and the database `defaultdb`. DigitalOcean documents this screen in [How to Connect to PostgreSQL Database Clusters](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/).

`sslmode=require` encrypts the connection and, on DigitalOcean, does not need a CA file. The app adds `uselibpqcompat=true` for that mode so Node's `pg` driver matches that meaning. Leave `sslmode=verify-full` alone if you switch the cluster to full certificate checks later.

There is no other env var. The role password used while creating `farnext_app` is passed to `psql` with `-v app_password=...` and is not an application setting.

## How tenancy works

1. The address `/southern-cross/...` is the agency slug. `src/proxy.ts` copies that slug onto a request header. `src/app/[agency]/layout.tsx` loads the agency row.

   **TODO(auth):** that slug is only a routing hint. When sign-in exists, the tenant must come from the authenticated session, and the request must be rejected when the session's agency does not match the slug. The comment in the layout says the same thing. Do not treat the URL as login.

2. `withTenant(agencyId, fn)` in `src/lib/db/tenant.ts` opens a transaction and runs `SELECT set_config('app.current_agency_id', <id>, true)`. The third argument keeps the setting inside that transaction, so a later query on the same pooled connection does not keep the agency.

3. Queries for clients and users go through that transaction and also add `WHERE agency_id = ...`. The database policy is the rule. The `WHERE` clause is a second check.

4. PostgreSQL row-level security is turned on for `users` and `clients`, with `FORCE ROW LEVEL SECURITY`. The policy keeps a row only when `agency_id` equals `current_setting('app.current_agency_id', true)::uuid`. A session with no setting sees no tenant rows.

5. **The app must connect as `farnext_app`, not as `doadmin`.** `doadmin` is the cluster owner and bypasses row-level security even when `FORCE` is set. Superusers and roles with `BYPASSRLS` always bypass. `farnext_app` is a normal login with `NOBYPASSRLS`, so the policies apply to it. It can read the agency directory and can read or write only the current tenant's users and clients.

`agencies` has no `agency_id` and no row-level security. The home page lists every active agency. That list is the directory, not a tenant's private data.

## Run the migrations on livestock-db

Use a Droplet console in the browser so the work laptop does not need PostgreSQL installed. [How to Connect to Droplets with the Droplet Console](https://docs.digitalocean.com/products/droplets/how-to/connect-with-console/) is the official guide. Private Droplets have no web console; use a Droplet with a public IP, or a bastion.

1. In the control panel, open **Databases → livestock-db → Network Access** and add the Droplet as a trusted source. If the Droplet and the database are in the same VPC, you can use the private hostname from the connection details. Otherwise use the public hostname. Both are described in the [connect guide](https://docs.digitalocean.com/products/databases/postgresql/how-to/connect/).

2. Open the Droplet and click **Web Console**.

3. Install the Postgres client and git on the Droplet (this does not install them on the laptop):

   ```bash
   sudo apt update
   sudo apt install -y postgresql-client git
   ```

4. Clone this repository. If it is private, GitHub will ask you to sign in.

   ```bash
   git clone https://github.com/gaunarayana/Farnext.git
   cd Farnext
   ```

5. Create the app user **before** you paste any password into a file. On DigitalOcean the supported place is the cluster's user list. The docs are [How to Manage PostgreSQL Users and Databases](https://docs.digitalocean.com/products/databases/postgresql/how-to/manage-users-and-databases/). Name the user `farnext_app`. Put the password in a password manager.

   From a machine that already has `doctl` signed in, the same step is:

   ```bash
   doctl databases user create <cluster-id> farnext_app
   ```

   You can instead let the SQL create the role. Do that only in the shell, with a variable, so the password is not saved in the repo:

   ```bash
   read -s FARNEXT_APP_PASSWORD
   ```

6. In **Connection details**, show the `doadmin` connection string for database `defaultdb` with `sslmode=require`. In the Droplet console, put it in a shell variable. Do not write it into a file in the repo.

   ```bash
   read -s ADMIN_DATABASE_URL
   echo
   ```

   Paste the string, then press Enter. `read -s` hides it.

7. Apply the three SQL files in order. They are plain SQL and are safe to run again.

   ```bash
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001_agencies.sql
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/002_users_and_clients.sql
   ```

   If `farnext_app` already exists (the usual DigitalOcean path), run:

   ```bash
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/003_row_level_security.sql
   ```

   If the role does not exist yet and you chose the shell password instead of the control panel:

   ```bash
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -v app_password="$FARNEXT_APP_PASSWORD" -f db/migrations/003_row_level_security.sql
   ```

   `001` does nothing when `agencies` is already there. It does not modify the two existing agency rows. `003` grants `farnext_app` access and turns on the policies.

8. Load sample clients (and one staff user) for each agency:

   ```bash
   psql "$ADMIN_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/seed.sql
   ```

9. Check isolation as **farnext_app**, not as `doadmin`. Build that URL from the connection details by switching the user to `farnext_app` and keeping `sslmode=require`.

   ```bash
   read -s APP_DATABASE_URL
   echo
   psql "$APP_DATABASE_URL" -v ON_ERROR_STOP=1 -f db/isolation-check.sql
   ```

   A passing run prints two notices, one per agency. If you run it as `doadmin`, it stops and tells you to reconnect as `farnext_app`.

10. Clear the shell variables when you are done:

    ```bash
    unset ADMIN_DATABASE_URL APP_DATABASE_URL FARNEXT_APP_PASSWORD
    ```

The same `psql` commands work on a laptop that already has `psql`. The Droplet path is there so a locked-down work laptop can still migrate `livestock-db`.

## Run the isolation check from the app

After `.env.local` contains the `farnext_app` URL:

```bash
npm run test:isolation
```

The script calls `withTenant` for Southern Cross and then reads clients with no `WHERE` clause. Paddock & Co's clients must be absent. It repeats the check the other way, checks that a session with no tenant sees no clients, and checks that a cross-agency insert is rejected.

## Project map

- `src/app/page.tsx` lists agencies.
- `src/app/[agency]/page.tsx` is the agency dashboard.
- `src/proxy.ts` reads the slug from the path.
- `src/lib/db/schema.ts` is the Drizzle schema (`agencies`, `users`, `clients`).
- `src/lib/db/tenant.ts` is `withTenant`.
- `src/lib/db/queries.ts` filters tenant rows by `agency_id`.
- `db/migrations/*.sql` is what you run with `psql`.
- `db/seed.sql` and `db/isolation-check.sql` are the sample data and the SQL proof.
- `scripts/isolation-check.ts` is the same proof through the app helper.

`drizzle.config.ts` points Drizzle Kit at the schema. Day-to-day changes on `livestock-db` go through the SQL files so they can be run by hand.

## Deploy to DigitalOcean App Platform later

Do this when you are ready to host the site. It can create billable resources. The product docs are:

- [Sample App for Next.js](https://docs.digitalocean.com/products/app-platform/getting-started/sample-apps/next.js/)
- [How to Manage Databases in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/manage-databases/)
- [How to Use Environment Variables in App Platform](https://docs.digitalocean.com/products/app-platform/how-to/use-environment-variables/)

1. Push this repository to GitHub. `package-lock.json` has to be in the repo. The Node.js buildpack uses it.

2. In the control panel, open **Apps → Create App**. Choose GitHub, this repository, and the `main` branch. Turn on autodeploy if you want each push to `main` to deploy.

3. Use the Node.js buildpack. Build command: `npm run build`. Run command: `npm start`. Do not add `-p 3000`. App Platform sets `PORT`, and `next start` listens on it.

4. Attach the database you already have. **Add components → Create or attach database → Attach existing DigitalOcean database**, and choose `livestock-db`. Attaching the app adds it as a trusted source when trusted sources are enabled. Do not create a second dev database for production.

5. Set the app's `DATABASE_URL` to the **farnext_app** string, scope **Run time**, and turn on **Encrypt**. If attaching the database injects a `doadmin` URL, replace that value. In an app spec the database block should name the app user:

   ```yaml
   databases:
     - name: livestock-db
       engine: PG
       production: true
       cluster_name: livestock-db
       db_name: defaultdb
       db_user: farnext_app
   ```

   Bindable names such as `${livestock-db.DATABASE_URL}` are documented on the environment-variables page. The default bind is the public URL. When the app and the database are in the same VPC, use the private URL (`DATABASE_PRIVATE_URL`) and keep `sslmode=require`. Pick the app region that can reach the database's datacenter. The mapping is in [How to Enable App Platform VPC](https://docs.digitalocean.com/products/app-platform/how-to/enable-vpc/).

6. Deploy, open the live URL, and confirm `/` lists both agencies and each dashboard shows only that agency's clients.

Migrations stay a manual `psql` step from the Droplet. The running app does not apply them on boot.

## Suggested next step

Add real sign-in. Store the signed-in user's `agency_id` on the session, call `withTenant` with that id, and reject the page when the session agency and the URL slug differ. Remove the preview banner in `src/app/[agency]/layout.tsx` only after that check exists. New tables such as sales, lots, and invoices need the same non-null indexed `agency_id` and the same row-level security policy.
