import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect:  "postgresql",
  schema:   "./src/db/schema/index.ts",
  out:      "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  // Supabase uses the public schema by default
  schemaFilter: ["public"],
  verbose: true,
  strict:  true,
});
