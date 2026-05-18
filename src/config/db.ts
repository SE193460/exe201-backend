import { Pool } from "pg";
import { env } from "./env";

const needsSsl = env.databaseUrl.includes("supabase.com");

export const pool = new Pool({
  connectionString: env.databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});
