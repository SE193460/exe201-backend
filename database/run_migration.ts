import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in environment variables");
  process.exit(1);
}

const needsSsl = databaseUrl.includes("supabase.com");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

async function runMigration() {
  try {
    const migrationPath = path.join(__dirname, "migration.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");
    console.log("Running migration script against database...");
    await pool.query(sql);
    console.log("Migration executed successfully!");
  } catch (error) {
    console.error("Error executing migration:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
