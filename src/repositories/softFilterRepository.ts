import { pool } from '../config/db';
import type { LifestyleProfileRecord } from './lifestyleRepository';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HardFilters = {
  district?: string | null;
  min_price?: number | null;
  max_price?: number | null;
  min_area?: number | null;
  max_area?: number | null;
};

/**
 * User without a room: users who have 0 APPROVED listings.
 * Brokers (>1 APPROVED listing) are excluded.
 * Returns their lifestyle profile joined.
 */
export async function findNoRoomUsersWithProfile(
  district: string | null | undefined,
): Promise<Array<{
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  phone_number: string | null;
  zalo: string | null;
  preferred_district: string | null;
  profile: LifestyleProfileRecord | null;
}>> {
  const result = await pool.query(
    `SELECT
        u.id          AS user_id,
        u.full_name,
        u.avatar_url,
        u.email,
        u.phone_number,
        u.username AS zalo,
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
        lp.created_at  AS profile_created_at,
        lp.updated_at  AS profile_updated_at
      FROM users u
      LEFT JOIN user_lifestyle_profiles lp ON lp.user_id = u.id
      WHERE
        -- user has NO approved listings
        (
          SELECT COUNT(*) FROM listings l
          WHERE l.owner_id = u.id AND l.status = 'APPROVED'
        ) = 0
        -- exclude brokers: also exclude users with >1 approved listing
        -- (already covered by = 0, but kept explicit for clarity)
        AND (
          $1::text IS NULL
          OR lp.preferred_district = $1
        )
      ORDER BY u.created_at DESC`,
    [district ?? null],
  );

  return result.rows.map((row) => ({
    user_id: row.user_id,
    full_name: row.full_name,
    avatar_url: row.avatar_url,
    email: row.email,
    phone_number: row.phone_number ?? null,
    zalo: row.zalo ?? null,
    preferred_district: row.preferred_district ?? null,
    profile: row.cleanliness != null || row.smoking_status != null
      ? {
          user_id:          row.user_id,
          preferred_district: row.preferred_district ?? null,
          cleanliness:      row.cleanliness,
          ac_usage:         row.ac_usage,
          pet_status:       row.pet_status,
          smoking_status:   row.smoking_status,
          cooking:          row.cooking,
          guest:            row.guest,
          home_frequency:   row.home_frequency,
          work_schedule:    row.work_schedule,
          sharing:          row.sharing,
          noise:            row.noise,
          call_frequency:   row.call_frequency,
          game_mic:         row.game_mic,
          created_at:       row.profile_created_at,
          updated_at:       row.profile_updated_at,
        }
      : null,
  }));
}

/**
 * Listings APPROVED that belong to non-broker owners (exactly 1 APPROVED listing).
 * Joined with owner's lifestyle profile for matching.
 */
export async function findApprovedListingsWithOwnerProfile(
  filters: HardFilters,
): Promise<Array<{
  listing_id: string;
  title: string;
  rent_price: number;
  district: string;
  room_area_sqm: number | null;
  address: string | null;
  image_url: string | null;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
  owner_email: string;
  profile: LifestyleProfileRecord | null;
}>> {
  const result = await pool.query(
    `SELECT
        li.id          AS listing_id,
        li.title,
        li.rent_price,
        li.district,
        li.room_area_sqm,
        li.address,
        (
          SELECT img.image_url FROM listing_images img
          WHERE img.listing_id = li.id
          ORDER BY img.display_order ASC
          LIMIT 1
        ) AS image_url,
        u.id           AS owner_id,
        u.full_name    AS owner_name,
        u.avatar_url   AS owner_avatar,
        u.email        AS owner_email,
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
        lp.created_at  AS profile_created_at,
        lp.updated_at  AS profile_updated_at
      FROM listings li
      JOIN users u ON u.id = li.owner_id
      LEFT JOIN user_lifestyle_profiles lp ON lp.user_id = u.id
      WHERE
        li.status = 'APPROVED'
        -- exclude brokers: owner must have exactly 1 APPROVED listing
        AND (
          SELECT COUNT(*) FROM listings l2
          WHERE l2.owner_id = li.owner_id AND l2.status = 'APPROVED'
        ) = 1
        AND ($1::text IS NULL OR li.district = $1)
        AND ($2::int  IS NULL OR li.rent_price >= $2)
        AND ($3::int  IS NULL OR li.rent_price <= $3)
        AND ($4::int  IS NULL OR li.room_area_sqm >= $4)
        AND ($5::int  IS NULL OR li.room_area_sqm <= $5)
      ORDER BY li.published_at DESC`,
    [
      filters.district  ?? null,
      filters.min_price ?? null,
      filters.max_price ?? null,
      filters.min_area  ?? null,
      filters.max_area  ?? null,
    ],
  );

  return result.rows.map((row) => ({
    listing_id:   row.listing_id,
    title:        row.title,
    rent_price:   row.rent_price,
    district:     row.district,
    room_area_sqm: row.room_area_sqm,
    address:      row.address,
    image_url:    row.image_url ?? null,
    owner_id:     row.owner_id,
    owner_name:   row.owner_name,
    owner_avatar: row.owner_avatar ?? null,
    owner_email:  row.owner_email,
    profile: row.cleanliness != null || row.smoking_status != null
      ? {
          user_id:          row.owner_id,
          preferred_district: row.preferred_district ?? null,
          cleanliness:      row.cleanliness,
          ac_usage:         row.ac_usage,
          pet_status:       row.pet_status,
          smoking_status:   row.smoking_status,
          cooking:          row.cooking,
          guest:            row.guest,
          home_frequency:   row.home_frequency,
          work_schedule:    row.work_schedule,
          sharing:          row.sharing,
          noise:            row.noise,
          call_frequency:   row.call_frequency,
          game_mic:         row.game_mic,
          created_at:       row.profile_created_at,
          updated_at:       row.profile_updated_at,
        }
      : null,
  }));
}

/**
 * Count APPROVED listings of a user (to validate HAS_ROOM requirement).
 */
export async function countApprovedListingsByUser(userId: string): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM listings WHERE owner_id = $1 AND status = 'APPROVED'`,
    [userId],
  );
  return parseInt(result.rows[0].count, 10);
}
