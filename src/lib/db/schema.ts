import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Drizzle mirror of the SQL in `db/migrations`.
 * Apply those files with psql. This module is what the app queries.
 *
 * `agencies` is the tenant directory. It already exists on livestock-db.
 * `users` and `clients` are tenant-owned: every row has a non-null agency_id.
 */

export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    country: char("country", { length: 2 }).notNull(),
    currency: char("currency", { length: 3 }).notNull(),
    timezone: text("timezone").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("agencies_country_check", sql`${table.country} in ('AU', 'NZ')`),
    check(
      "agencies_currency_check",
      sql`${table.currency} in ('AUD', 'NZD')`,
    ),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default("staff"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("users_agency_id_idx").on(table.agencyId),
    uniqueIndex("users_agency_id_email_idx").on(table.agencyId, table.email),
    check("users_role_check", sql`${table.role} in ('owner', 'admin', 'staff')`),
  ],
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    agencyId: uuid("agency_id")
      .notNull()
      .references(() => agencies.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("clients_agency_id_idx").on(table.agencyId),
    uniqueIndex("clients_agency_id_email_idx")
      .on(table.agencyId, table.email)
      .where(sql`${table.email} is not null`),
    check("clients_kind_check", sql`${table.kind} in ('vendor', 'buyer')`),
  ],
);

export type Agency = typeof agencies.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type User = typeof users.$inferSelect;
