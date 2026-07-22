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
  try {
    const existingView = await pool.query(
      "SELECT 1 FROM contact_view_log WHERE user_id = $1 AND listing_id = $2 LIMIT 1",
      [userId, listingId]
    );
    if (existingView.rows.length > 0) return true;

    const updateRes = await pool.query(
      `UPDATE user_contact_view_credits
       SET remaining_views = remaining_views - 1, updated_at = NOW()
       WHERE user_id = $1 AND remaining_views > 0
       RETURNING remaining_views`,
      [userId]
    );
    if (updateRes.rows.length === 0) return false;

    await pool.query(
      "INSERT INTO contact_view_log (user_id, listing_id) VALUES ($1, $2)",
      [userId, listingId]
    );
    return true;
  } catch (e) {
    throw e;
  }
}

export async function hasViewedListing(userId: string, listingId: string): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM contact_view_log WHERE user_id = $1 AND listing_id = $2 LIMIT 1",
    [userId, listingId]
  );
  return result.rows.length > 0;
}

export async function revealOwnerLifestyleProfile(userId: string, listingId: string) {
  const existingView = await pool.query(
    "SELECT 1 FROM contact_view_log WHERE user_id = $1 AND listing_id = $2 LIMIT 1",
    [userId, listingId]
  );
  const alreadyViewed = existingView.rows.length > 0;

  if (!alreadyViewed) {
    const deducted = await deductContactView(userId, listingId);
    if (!deducted) return { insufficientViews: true, alreadyViewed: false, profile: null, remainingViews: 0 };
  }

  const result = await pool.query(
    `SELECT
       l.owner_id,
       lp.preferred_district,
       lp.cleanliness,
       lp.ac_usage,
       lp.pet_status,
       lp.smoking_status,
       lp.cooking,
       lp.guest,
       lp.home_frequency,
       lp.work_schedule,
       lp.sharing,
       lp.noise,
       lp.call_frequency,
       lp.game_mic,
       lp.created_at,
       lp.updated_at
     FROM listings l
     LEFT JOIN user_lifestyle_profiles lp ON lp.user_id = l.owner_id
     WHERE l.id = $1`,
    [listingId]
  );
  if (result.rows.length === 0) return { insufficientViews: false, alreadyViewed, profile: null, remainingViews: null };

  const credits = await getContactViewCredits(userId);
  const row = result.rows[0];
  const hasProfile = Object.entries(row).some(([key, value]) =>
    !["owner_id", "created_at", "updated_at"].includes(key) && value !== null && value !== undefined
  );

  return {
    insufficientViews: false,
    alreadyViewed,
    remainingViews: Number(credits.remaining_views),
    profile: hasProfile ? {
      user_id: row.owner_id,
      preferred_district: row.preferred_district,
      cleanliness: row.cleanliness,
      ac_usage: row.ac_usage,
      pet_status: row.pet_status,
      smoking_status: row.smoking_status,
      cooking: row.cooking,
      guest: row.guest,
      home_frequency: row.home_frequency,
      work_schedule: row.work_schedule,
      sharing: row.sharing,
      noise: row.noise,
      call_frequency: row.call_frequency,
      game_mic: row.game_mic,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } : null,
  };
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
