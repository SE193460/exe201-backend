import { pool } from "../config/db";

export async function createEmailVerificationToken(userId: string, token: string, expiresAt: Date) {
  await pool.query(
    "INSERT INTO email_verification_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt]
  );
}

export async function getEmailVerificationToken(token: string) {
  const result = await pool.query(
    "SELECT * FROM email_verification_tokens WHERE token = $1",
    [token]
  );
  return result.rows[0] || null;
}

export async function deleteEmailVerificationToken(token: string) {
  await pool.query("DELETE FROM email_verification_tokens WHERE token = $1", [token]);
}

export async function deleteEmailVerificationTokensForUser(userId: string) {
  await pool.query("DELETE FROM email_verification_tokens WHERE user_id = $1", [userId]);
}

export async function createRefreshToken(userId: string, token: string, expiresAt: Date) {
  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)",
    [userId, token, expiresAt]
  );
}

export async function getRefreshToken(token: string) {
  const result = await pool.query(
    "SELECT * FROM refresh_tokens WHERE token = $1",
    [token]
  );
  return result.rows[0] || null;
}

export async function revokeRefreshToken(token: string) {
  await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [token]);
}
