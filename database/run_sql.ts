import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.join(__dirname, "../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not defined in .env");
  process.exit(1);
}

const file = process.argv[2];
if (!file) {
  console.error("Usage: ts-node database/run_sql.ts <file.sql>");
  process.exit(1);
}

const needsSsl = databaseUrl.includes("supabase.com");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

async function run() {
  const filePath = path.isAbsolute(file) ? file : path.join(__dirname, file);
  const sql = fs.readFileSync(filePath, "utf8").trim();
  if (!sql) {
    console.log(`${path.basename(filePath)} is empty, nothing to do.`);
    await pool.end();
    return;
  }
  try {
    await pool.query(sql);
    console.log(`Executed ${path.basename(filePath)} successfully.`);
  } catch (error) {
    console.error("SQL execution failed:", error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

run();
