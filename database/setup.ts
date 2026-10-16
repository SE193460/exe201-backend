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

const dbDir = __dirname;

// Order matters. Runs bottom-up against a fresh database.
// alter_20260608 (lifestyle/roommate) is intentionally excluded because
// schema.sql already creates those tables without IF NOT EXISTS.
const SQL_FILES = [
  "schema.sql",
  "indexes.sql",
  "migration.sql",
  "alter_20260523_add_location_area_phone.sql",
  "alter_20260606_add_source.sql",
  "alter_20260614_add_payment_code.sql",
  "alter_20260615_add_feedback.sql",
  "alter_20261016_add_indexes.sql",
  "seed.sql",
];

async function runSetup() {
  try {
    const { rowCount } = await pool.query(
      "SELECT 1 AS ok FROM pg_catalog.pg_tables WHERE schemaname = 'public' LIMIT 1"
    );
    const hasTables = (rowCount ?? 0) > 0;
    if (hasTables) {
      console.log("Database already has tables. Skipping schema setup.");
      await pool.end();
      return;
    }

    for (const file of SQL_FILES) {
      const filePath = path.join(dbDir, file);
      const sql = fs.readFileSync(filePath, "utf8").trim();
      if (!sql) {
        console.log(`- ${file}: empty, skipped`);
        continue;
      }
      await pool.query(sql);
      console.log(`- ${file}: OK`);
    }

    console.log("Database setup completed successfully!");
  } catch (error) {
    console.error("Error during database setup:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runSetup();