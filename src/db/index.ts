import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch for Supabase transaction mode (port 6543)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
export type DB = typeof db;
