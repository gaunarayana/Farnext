/**
 * Shows that agency A's database session cannot read agency B's clients.
 *
 * Uses the same withTenant helper as the app, then also reads `clients`
 * with no WHERE clause. Hiding the other agency in that second read is
 * row-level security, not the extra agency_id filter in the query helpers.
 *
 *   DATABASE_URL='postgresql://farnext_app:...@host:25060/defaultdb?sslmode=require' \
 *     npm run test:isolation
 *
 * The URL must be the farnext_app role. doadmin bypasses the policies.
 * A .env.local file is loaded when DATABASE_URL is not already set.
 */
import { readFileSync } from "node:fs";
import { eq, sql } from "drizzle-orm";

import { closeDb, getDb } from "../src/lib/db/index";
import { listClientsForAgency } from "../src/lib/db/queries";
import { clients } from "../src/lib/db/schema";
import { withTenant } from "../src/lib/db/tenant";

const SAMPLES = {
  "southern-cross": {
    visible: ["Willow Creek Grazing", "Harbour City Meats"],
    hidden: ["High Country Station", "Wellington Butchery Co"],
  },
  "paddock-co": {
    visible: ["High Country Station", "Wellington Butchery Co"],
    hidden: ["Willow Creek Grazing", "Harbour City Meats"],
  },
} as const;

function loadEnvFile(path: string) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const separator = trimmed.indexOf("=");
      if (separator === -1) {
        continue;
      }
      const key = trimmed.slice(0, separator).trim();
      let value = trimmed.slice(separator + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    }
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      throw error;
    }
  }
}

function errorText(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const cause = error.cause instanceof Error ? error.cause.message : "";
  return `${error.message}\n${cause}`;
}

function fail(message: string): never {
  console.error(`Isolation check failed: ${message}`);
  process.exitCode = 1;
  throw new Error(message);
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!process.env.DATABASE_URL) {
    fail("DATABASE_URL is not set. Point it at farnext_app, not doadmin.");
  }

  const session = await getDb().execute<{
    current_user: string;
    rolsuper: boolean;
    rolbypassrls: boolean;
  }>(sql`
    select current_user, rolsuper, rolbypassrls
    from pg_roles
    where rolname = current_user
  `);

  const role = session.rows[0];
  if (!role) {
    fail("Could not read the current database role.");
  }

  console.log(
    `Connected as ${role.current_user} (superuser=${role.rolsuper}, bypassrls=${role.rolbypassrls})`,
  );

  if (role.rolsuper || role.rolbypassrls) {
    fail(
      `${role.current_user} bypasses row-level security. Use the farnext_app connection string.`,
    );
  }

  const directory = await getDb().execute<{ id: string; slug: string }>(sql`
    select id, slug
    from agencies
    where slug in ('southern-cross', 'paddock-co')
  `);
  const bySlug = new Map(directory.rows.map((row) => [row.slug, row.id]));

  for (const slug of Object.keys(SAMPLES) as Array<keyof typeof SAMPLES>) {
    const agencyId = bySlug.get(slug);
    const sample = SAMPLES[slug];
    if (!agencyId) {
      fail(`Agency ${slug} is missing. Run db/seed.sql first.`);
    }

    await withTenant(agencyId, async (tx) => {
      const unfiltered = await tx.select().from(clients);
      const names = new Set(unfiltered.map((row) => row.name));

      for (const name of sample.hidden) {
        if (names.has(name)) {
          fail(
            `${slug} can see "${name}", which belongs to the other agency.`,
          );
        }
      }

      for (const name of sample.visible) {
        if (!names.has(name)) {
          fail(
            `${slug} cannot see its own client "${name}". Run db/seed.sql.`,
          );
        }
      }

      for (const row of unfiltered) {
        if (row.agencyId !== agencyId) {
          fail(`${slug} received a client row for agency ${row.agencyId}.`);
        }
      }

      const filtered = await listClientsForAgency(tx, agencyId);
      const filteredIds = filtered.map((row) => row.id).sort().join();
      const unfilteredIds = unfiltered.map((row) => row.id).sort().join();
      if (filteredIds !== unfilteredIds) {
        fail(
          `${slug}: the explicit agency_id filter and row-level security disagree.`,
        );
      }

      console.log(
        `${slug}: ${unfiltered.length} client(s) visible, none from the other agency.`,
      );
    });
  }

  const outside = await getDb().select({ id: clients.id }).from(clients);
  if (outside.length !== 0) {
    fail(
      `With no tenant set, ${outside.length} client row(s) were still visible.`,
    );
  }
  console.log("No tenant set: 0 clients visible.");

  const southernCrossId = bySlug.get("southern-cross");
  const paddockId = bySlug.get("paddock-co");
  if (!southernCrossId || !paddockId) {
    fail("Both agencies are required for the write check.");
  }

  try {
    await withTenant(southernCrossId, async (tx) => {
      await tx.insert(clients).values({
        agencyId: paddockId,
        kind: "buyer",
        name: "Cross tenant insert",
        email: "cross-tenant@example.com",
      });
    });
    fail("A Southern Cross session inserted a Paddock & Co client.");
  } catch (error) {
    if (!errorText(error).toLowerCase().includes("row-level security")) {
      throw error;
    }
    console.log("Cross-agency insert blocked by row-level security.");
  }

  const marker = `isolation-${Date.now()}@example.com`;
  await withTenant(southernCrossId, async (tx) => {
    await tx.insert(clients).values({
      agencyId: southernCrossId,
      kind: "vendor",
      name: "Isolation fixture",
      email: marker,
    });
    await tx.delete(clients).where(eq(clients.email, marker));
  });
  console.log("Same-agency insert and delete succeeded.");
  console.log("Isolation check passed.");
}

main()
  .catch((error: unknown) => {
    if (process.exitCode !== 1) {
      console.error(error);
      process.exitCode = 1;
    }
  })
  .finally(async () => {
    await closeDb();
  });
