import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;

let pool: Pool | undefined;
let database: Database | undefined;

/**
 * DigitalOcean connection strings use `sslmode=require`, which in libpq
 * means "encrypt the connection" and does not need a CA file.
 * Current node-postgres treats `require` like `verify-full` unless
 * `uselibpqcompat=true` is set. Add that flag without rewriting the
 * password, so the env value can stay the string copied from the
 * cluster's connection details.
 *
 * `sslmode=verify-full` and `sslmode=disable` are left unchanged.
 */
export function databaseUrlForPg(connectionString: string): string {
  const requiresEncryption = /(?:\?|&)sslmode=require(?:&|$)/i.test(
    connectionString,
  );
  const alreadyCompatible = /(?:\?|&)uselibpqcompat=/i.test(connectionString);

  if (!requiresEncryption || alreadyCompatible) {
    return connectionString;
  }

  const joiner = connectionString.includes("?") ? "&" : "?";
  return `${connectionString}${joiner}uselibpqcompat=true`;
}

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and use the farnext_app connection string.",
    );
  }
  return url;
}

export function getDb(): Database {
  if (!database) {
    pool = new Pool({
      connectionString: databaseUrlForPg(getDatabaseUrl()),
      max: 10,
    });
    database = drizzle(pool, { schema });
  }
  return database;
}

export async function closeDb(): Promise<void> {
  await pool?.end();
  pool = undefined;
  database = undefined;
}
