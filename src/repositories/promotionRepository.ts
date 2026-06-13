import { pool } from "../config/db";

export type PromotionRecord = {
  id: string;
  listing_id: string;
  package_type: string;
  purchased_at: string;
  expires_at: string;
  created_at: string;
};

export async function createPromotion(params: {
  listingId: string;
  packageType: string;
  expiresAt: Date;
}): Promise<PromotionRecord> {
  const result = await pool.query<PromotionRecord>(
    `INSERT INTO listing_promotions (listing_id, package_type, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [params.listingId, params.packageType, params.expiresAt]
  );
  return result.rows[0];
}

export async function getLatestPromotion(listingId: string): Promise<PromotionRecord | null> {
  const result = await pool.query<PromotionRecord>(
    "SELECT * FROM listing_promotions WHERE listing_id = $1 ORDER BY purchased_at DESC LIMIT 1",
    [listingId]
  );
  return result.rows[0] || null;
}
