import { sql, type ExtractTablesWithRelations } from "drizzle-orm";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";

import { getDb } from "./index";
import type * as schema from "./schema";

export type TenantTransaction = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

const AGENCY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function assertAgencyId(agencyId: string): void {
  if (!AGENCY_ID_PATTERN.test(agencyId)) {
    throw new Error("agencyId must be a UUID from the agencies table.");
  }
}

/**
 * Run `fn` inside a transaction whose row-level security setting is this
 * agency. `set_config(..., true)` keeps the value local to the transaction,
 * so the next query on the pooled connection cannot see it.
 *
 * Data-access functions must still filter on `agency_id`. The setting is
 * the database rule. The filter is the second check.
 */
export async function withTenant<T>(
  agencyId: string,
  fn: (tx: TenantTransaction) => Promise<T>,
): Promise<T> {
  assertAgencyId(agencyId);

  return getDb().transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('app.current_agency_id', ${agencyId}, true)`,
    );
    return fn(tx);
  });
}
