import { pool } from "../config/db";

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  listing_id: string | null;
  is_read: boolean;
  created_at: string;
};

export async function createNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  listingId?: string | null;
}): Promise<NotificationRecord> {
  const result = await pool.query<NotificationRecord>(
    `INSERT INTO notifications (user_id, type, title, message, listing_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [params.userId, params.type, params.title, params.message, params.listingId ?? null]
  );
  return result.rows[0];
}

export async function notifyAllAdmins(params: {
  type: string;
  title: string;
  message: string;
  listingId?: string | null;
}): Promise<void> {
  const adminRes = await pool.query(
    `SELECT users.id FROM users
     JOIN roles ON roles.id = users.role_id
     WHERE roles.name = 'admin'`
  );
  for (const row of adminRes.rows) {
    await createNotification({
      userId: row.id,
      type: params.type,
      title: params.title,
      message: params.message,
      listingId: params.listingId,
    });
  }
}

export async function listNotificationsByUser(userId: string): Promise<NotificationRecord[]> {
  const result = await pool.query<NotificationRecord>(
    "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [userId]
  );
  return result.rows;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE id = $1", [notificationId]);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await pool.query("UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE", [userId]);
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const result = await pool.query(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
    [userId]
  );
  return Number(result.rows[0].count);
}
