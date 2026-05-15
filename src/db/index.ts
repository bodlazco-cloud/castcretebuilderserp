import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch for Supabase transaction mode (port 6543).
// statement_timeout kills any query that runs longer than 5 s so hanging
// queries never exhaust the connection pool.
const client = postgres(connectionString, {
  prepare: false,
  connection: { statement_timeout: 5000 },
});

export const db = drizzle(client, { schema });
export type DB = typeof db;
