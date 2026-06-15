import { pool } from "../config/db";

type CreateFeedbackParams = {
  userId: string | null;
  content: string;
};

export async function createFeedback(params: CreateFeedbackParams) {
  const result = await pool.query(
    `INSERT INTO feedbacks (user_id, content)
     VALUES ($1, $2)
     RETURNING
       id,
       user_id as "userId",
       content,
       created_at as "createdAt"`,
    [params.userId, params.content]
  );

  return result.rows[0];
}

export async function listFeedbacksForAdmin() {
  const result = await pool.query(
    `SELECT
      f.id,
      f.content,
      f.user_id as "userId",
      f.created_at as "createdAt",
      u.full_name as "fullName",
      u.email,
      u.phone_number as "phoneNumber",
      r.name as "roleName",
      CASE WHEN f.user_id IS NULL THEN TRUE ELSE FALSE END as "isAnonymous"
    FROM feedbacks f
    LEFT JOIN users u ON u.id = f.user_id
    LEFT JOIN roles r ON r.id = u.role_id
    ORDER BY f.created_at DESC`
  );

  return result.rows.map((row) => ({
    ...row,
    displayName: row.fullName || "Ẩn danh",
  }));
}