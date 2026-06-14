import { pool } from "../config/db";

export type PaymentTransactionRecord = {
  id: string;
  user_id: string;
  listing_id: string | null;
  amount: number;
  package_name: string;
  status: string;
  code: string | null;
  created_at: string;
  listing_title?: string | null;
  user_name?: string | null;
  user_email?: string | null;
};

export async function createTransaction(params: {
  userId: string;
  listingId: string | null;
  amount: number;
  packageName: string;
  status?: string;
}): Promise<PaymentTransactionRecord> {
  const result = await pool.query<PaymentTransactionRecord>(
    `INSERT INTO payment_transactions (user_id, listing_id, amount, package_name, status, code)
     VALUES ($1, $2, $3, $4, $5, 'RM' || TO_CHAR(NOW(), 'YY') || LPAD(nextval('payment_code_seq')::TEXT, 4, '0'))
     RETURNING *`,
    [
      params.userId,
      params.listingId,
      params.amount,
      params.packageName,
      params.status ?? "COMPLETED",
    ]
  );
  return result.rows[0];
}

export async function listTransactionsByUser(
  userId: string
) {

  const result = await pool.query(

    `
    SELECT

    pt.id,
    pt.listing_id as "listingId",
    pt.amount,
    pt.package_name as "packageName",
    pt.status,
    pt.code,
    pt.created_at,

    l.title as "listingTitle",

    u.full_name as "userName",
    u.email as "userEmail"

    FROM payment_transactions pt

    LEFT JOIN listings l
    ON l.id=pt.listing_id

    LEFT JOIN users u
    ON u.id=pt.user_id

    WHERE pt.user_id=$1
    AND pt.status IN ('PENDING', 'COMPLETED')

    ORDER BY pt.created_at DESC

    `,
    [userId]

  );

  return result.rows;

}

export async function listPendingTransactions() {
  const result = await pool.query(
    `SELECT
      pt.id,
      pt.listing_id as "listingId",
      pt.amount,
      pt.package_name as "packageName",
      pt.status,
      pt.code,
      pt.created_at,
      l.title as "listingTitle",
      u.full_name as "userName",
      u.email as "userEmail",
      pt.listing_id,
      pt.user_id
     FROM payment_transactions pt
     LEFT JOIN listings l ON l.id = pt.listing_id
     LEFT JOIN users u ON u.id = pt.user_id
     WHERE pt.status = 'PENDING'
     ORDER BY pt.created_at DESC`
  );
  return result.rows;
}

export async function listAllTransactions() {

  const result = await pool.query(

        `
    SELECT

    pt.id,
    pt.listing_id as "listingId",
    pt.amount,
    pt.package_name as "packageName",
    pt.status,
    pt.code,
    pt.created_at,

    l.title as "listingTitle",

    u.full_name as "userName",
    u.email as "userEmail"

    FROM payment_transactions pt

    LEFT JOIN listings l
    ON l.id=pt.listing_id

    LEFT JOIN users u
    ON u.id=pt.user_id

    WHERE pt.status IN ('PENDING', 'COMPLETED')
    ORDER BY pt.created_at DESC
    `

  );

  return result.rows;

}
