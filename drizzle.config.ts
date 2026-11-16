import { defineConfig } from "drizzle-kit";

/**
 * The SQL you run by hand lives in `db/migrations`.
 * This config lets drizzle-kit read the same schema later.
 * It is not used by `npm run build`.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./db/drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://farnext_app:password@localhost:5432/defaultdb?sslmode=disable",
  },
});
