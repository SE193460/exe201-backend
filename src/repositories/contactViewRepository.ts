import { pool } from "../config/db";

export async function getContactViewCredits(userId: string) {
  const result = await pool.query(
    "SELECT remaining_views, used_free_views FROM user_contact_view_credits WHERE user_id = $1",
    [userId]
  );
  if (result.rows.length === 0) {
    await pool.query(
      "INSERT INTO user_contact_view_credits (user_id, remaining_views, used_free_views) VALUES ($1, 3, 0)",
      [userId]
    );
    return { remaining_views: 3, used_free_views: 0 };
  }
  return result.rows[0];
}

export async function deductContactView(userId: string, listingId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query(
      "SELECT remaining_views FROM user_contact_view_credits WHERE user_id = $1 FOR UPDATE",
      [userId]
    );
    if (result.rows.length === 0 || result.rows[0].remaining_views <= 0) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      "UPDATE user_contact_view_credits SET remaining_views = remaining_views - 1, updated_at = NOW() WHERE user_id = $1",
      [userId]
    );
    await client.query(
      "INSERT INTO contact_view_log (user_id, listing_id) VALUES ($1, $2)",
      [userId, listingId]
    );
    await client.query("COMMIT");
    return true;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function addContactViewCredits(userId: string, views: number) {
  const result = await pool.query(
    `INSERT INTO user_contact_view_credits (user_id, remaining_views, used_free_views) 
     VALUES ($1, $2, 0) 
     ON CONFLICT (user_id) 
     DO UPDATE SET remaining_views = user_contact_view_credits.remaining_views + $2, updated_at = NOW()
     RETURNING remaining_views`,
    [userId, views]
  );
  return result.rows[0];
}
