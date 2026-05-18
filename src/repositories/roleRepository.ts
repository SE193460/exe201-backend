import { pool } from "../config/db";

export async function findOrCreateRole(name: string): Promise<string> {
  const existing = await pool.query("SELECT id FROM roles WHERE name = $1", [name]);
  if (existing.rowCount) {
    return existing.rows[0].id as string;
  }

  const created = await pool.query(
    "INSERT INTO roles (name) VALUES ($1) RETURNING id",
    [name]
  );
  return created.rows[0].id as string;
}
