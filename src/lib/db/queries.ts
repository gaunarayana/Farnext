import { and, eq } from "drizzle-orm";

import { isAgencySlug } from "../agency-slug";
import { getDb } from "./index";
import { agencies, clients, users } from "./schema";
import { assertAgencyId, type TenantTransaction } from "./tenant";

/**
 * The agency directory is shared. It has no `agency_id` column and no
 * row-level security policy. Tenant pages call this to turn a URL slug
 * into an id, then pass that id to `withTenant`.
 */
export async function listAgencies() {
  return getDb()
    .select()
    .from(agencies)
    .where(eq(agencies.isActive, true))
    .orderBy(agencies.name);
}

export async function getAgencyBySlug(slug: string) {
  if (!isAgencySlug(slug)) {
    return null;
  }

  const rows = await getDb()
    .select()
    .from(agencies)
    .where(and(eq(agencies.slug, slug), eq(agencies.isActive, true)))
    .limit(1);

  return rows[0] ?? null;
}

export async function listClientsForAgency(
  tx: TenantTransaction,
  agencyId: string,
) {
  assertAgencyId(agencyId);

  return tx
    .select()
    .from(clients)
    .where(eq(clients.agencyId, agencyId))
    .orderBy(clients.name);
}

export async function listUsersForAgency(
  tx: TenantTransaction,
  agencyId: string,
) {
  assertAgencyId(agencyId);

  return tx
    .select()
    .from(users)
    .where(eq(users.agencyId, agencyId))
    .orderBy(users.name);
}
