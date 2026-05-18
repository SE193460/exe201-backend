import { pool } from "../config/db";
import { findOrCreateRole } from "./roleRepository";

export type UserRecord = {
  id: string;
  role_id: string | null;
  email: string;
  username: string | null;
  password_hash: string | null;
  full_name: string;
  avatar_url: string | null;
  auth_provider: string;
  google_id: string | null;
  is_email_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export async function findUserByEmail(email: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>("SELECT * FROM users WHERE email = $1", [email]);
  return result.rows[0] || null;
}

export async function findUserByGoogleId(googleId: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>("SELECT * FROM users WHERE google_id = $1", [googleId]);
  return result.rows[0] || null;
}

export async function findUserById(id: string): Promise<UserRecord | null> {
  const result = await pool.query<UserRecord>("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0] || null;
}

export async function findUserWithRoleById(id: string) {
  const result = await pool.query(
    `SELECT users.*, roles.name as role_name
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE users.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createLocalUser(params: {
  email: string;
  passwordHash: string;
  fullName: string;
  username?: string | null;
}): Promise<UserRecord> {
  const roleId = await findOrCreateRole("user");
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (role_id, email, username, password_hash, full_name, auth_provider)
     VALUES ($1, $2, $3, $4, $5, 'local')
     RETURNING *`,
    [roleId, params.email, params.username || null, params.passwordHash, params.fullName]
  );
  return result.rows[0];
}

export async function createGoogleUser(params: {
  email: string;
  fullName: string;
  googleId: string;
  avatarUrl: string | null;
}): Promise<UserRecord> {
  const roleId = await findOrCreateRole("user");
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (role_id, email, full_name, avatar_url, auth_provider, google_id, is_email_verified)
     VALUES ($1, $2, $3, $4, 'google', $5, true)
     RETURNING *`,
    [roleId, params.email, params.fullName, params.avatarUrl, params.googleId]
  );
  return result.rows[0];
}

export async function createAdminUser(params: {
  email: string;
  passwordHash: string;
  fullName: string;
}): Promise<UserRecord> {
  const roleId = await findOrCreateRole("admin");
  const result = await pool.query<UserRecord>(
    `INSERT INTO users (role_id, email, password_hash, full_name, auth_provider, is_email_verified)
     VALUES ($1, $2, $3, $4, 'local', true)
     RETURNING *`,
    [roleId, params.email, params.passwordHash, params.fullName]
  );
  return result.rows[0];
}

export async function markEmailVerified(userId: string): Promise<void> {
  await pool.query("UPDATE users SET is_email_verified = true, updated_at = NOW() WHERE id = $1", [userId]);
}

export async function updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
  await pool.query("UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2", [passwordHash, userId]);
}

export async function updateUserProfile(
  userId: string,
  params: { fullName: string; username: string | null; avatarUrl: string | null }
): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    "UPDATE users SET full_name = $1, username = $2, avatar_url = $3, updated_at = NOW() WHERE id = $4 RETURNING *",
    [params.fullName, params.username, params.avatarUrl, userId]
  );
  return result.rows[0];
}

export async function updateAvatarUrl(userId: string, avatarUrl: string): Promise<UserRecord> {
  const result = await pool.query<UserRecord>(
    "UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [avatarUrl, userId]
  );
  return result.rows[0];
}

export async function linkGoogleAccount(userId: string, googleId: string, avatarUrl: string | null) {
  const result = await pool.query<UserRecord>(
    "UPDATE users SET google_id = $1, avatar_url = COALESCE($2, avatar_url), auth_provider = 'google', updated_at = NOW() WHERE id = $3 RETURNING *",
    [googleId, avatarUrl, userId]
  );
  return result.rows[0];
}

export async function listUsers(params: {
  query?: string;
  status?: "active" | "inactive" | "all";
}) {
  const search = params.query ? `%${params.query.toLowerCase()}%` : null;
  const status = params.status && params.status !== "all" ? params.status : null;
  const result = await pool.query(
    `SELECT users.*, roles.name as role_name
     FROM users
     LEFT JOIN roles ON roles.id = users.role_id
     WHERE ($1::text IS NULL OR LOWER(users.email) LIKE $1 OR LOWER(users.full_name) LIKE $1)
       AND ($2::text IS NULL OR users.is_active = ($2 = 'active'))
     ORDER BY users.created_at DESC`,
    [search, status]
  );
  return result.rows;
}

export async function toggleUserActive(userId: string, isActive: boolean) {
  const result = await pool.query<UserRecord>(
    "UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *",
    [isActive, userId]
  );
  return result.rows[0];
}
