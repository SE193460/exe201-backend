import { pool } from "../config/db";

export type ListingImageRecord = {
  id: string;
  listing_id: string;
  image_url: string;
  display_order: number;
  created_at: string;
};

export type ListingRecord = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  rent_price: number;
  city: string | null;
  district: string;
  ward: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  available_from: string | null;
  preferred_gender: string | null;
  room_type: string | null;
  room_area_sqm: number | null;
  max_occupants: number | null;
  current_occupants: number | null;
  smoking_allowed: boolean;
  pet_allowed: boolean;
  status: string;
  rejection_reason: string | null;
  published_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  source?: string | null;
  images: ListingImageRecord[];
  amenities?: { id: string; name: string }[];
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_avatar?: string | null;
  owner_email?: string | null;
  owner_created_at?: string | null;
  owner_last_active?: string | null;
  owner_listings_count?: number | string | null;
  is_saved?: boolean;
};

export async function createListingDraft(params: {
  ownerId: string;
  title: string;
  description: string;
  rentPrice: number;
  city: string | null;
  district: string;
  ward: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  availableFrom?: string | null;
  preferredGender?: string | null;
  roomType?: string | null;
  roomAreaSqm?: number | null;
  maxOccupants?: number | null;
  currentOccupants?: number | null;
  smokingAllowed?: boolean | null;
  petAllowed?: boolean | null;
  expiresAt?: string | null;
  source?: string | null;
}): Promise<ListingRecord> {
  const result = await pool.query<ListingRecord>(
    `INSERT INTO listings (
      owner_id, title, description, rent_price, city, district, ward, address,
      latitude, longitude, available_from, preferred_gender, room_type,
      room_area_sqm, max_occupants, current_occupants, smoking_allowed, pet_allowed, expires_at, source
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
    )
    RETURNING *`,
    [
      params.ownerId,
      params.title,
      params.description,
      params.rentPrice,
      params.city ?? null,
      params.district,
      params.ward ?? null,
      params.address ?? null,
      params.latitude ?? null,
      params.longitude ?? null,
      params.availableFrom ?? null,
      params.preferredGender ?? null,
      params.roomType ?? null,
      params.roomAreaSqm ?? null,
      params.maxOccupants ?? null,
      params.currentOccupants ?? 0,
      params.smokingAllowed ?? false,
      params.petAllowed ?? false,
      params.expiresAt ?? null,
      params.source ?? null,
    ]
  );

  return result.rows[0];
}

export async function listListingsByOwner(ownerId: string): Promise<ListingRecord[]> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.owner_id = $1
     GROUP BY listings.id, users.id
     ORDER BY listings.created_at DESC`,
    [ownerId]
  );

  return result.rows;
}

export async function findListingByIdAndOwner(listingId: string, ownerId: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.id = $1 AND listings.owner_id = $2
     GROUP BY listings.id, users.id`,
    [listingId, ownerId]
  );

  return result.rows[0] || null;
}

export async function addListingImages(listingId: string, imageUrls: string[], startOrder = 0) {
  if (imageUrls.length === 0) {
    return [] as ListingImageRecord[];
  }

  const values: string[] = [];
  const params: Array<string | number> = [];

  imageUrls.forEach((url, index) => {
    const baseIndex = index * 3;
    values.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3})`);
    params.push(listingId, url, startOrder + index);
  });

  const result = await pool.query<ListingImageRecord>(
    `INSERT INTO listing_images (listing_id, image_url, display_order)
     VALUES ${values.join(", ")}
     RETURNING *`,
    params
  );

  return result.rows;
}

export async function updateListingByIdAndOwner(params: {
  listingId: string;
  ownerId: string;
  title: string;
  description: string;
  rentPrice: number;
  city: string | null;
  district: string;
  ward: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  availableFrom: string | null;
  preferredGender: string | null;
  roomType: string | null;
  roomAreaSqm: number | null;
  maxOccupants: number | null;
  currentOccupants: number | null;
  smokingAllowed: boolean;
  petAllowed: boolean;
  source?: string | null;
}): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `WITH updated AS (
       UPDATE listings
       SET title = $3,
           description = $4,
           rent_price = $5,
           city = $6,
           district = $7,
           ward = $8,
           address = $9,
           latitude = $10,
           longitude = $11,
           available_from = $12,
           preferred_gender = $13,
           room_type = $14,
           room_area_sqm = $15,
           max_occupants = $16,
           current_occupants = $17,
           smoking_allowed = $18,
           pet_allowed = $19,
           source = $20,
           status = CASE WHEN status = 'APPROVED' THEN 'PENDING' ELSE status END,
           rejection_reason = CASE WHEN status = 'APPROVED' THEN NULL ELSE rejection_reason END,
           published_at = CASE WHEN status = 'APPROVED' THEN NULL ELSE published_at END,
           updated_at = NOW()
       WHERE id = $1 AND owner_id = $2
       RETURNING id
     )
     SELECT listings.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     JOIN updated ON updated.id = listings.id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     GROUP BY listings.id`,
    [
      params.listingId,
      params.ownerId,
      params.title,
      params.description,
      params.rentPrice,
      params.city,
      params.district,
      params.ward,
      params.address,
      params.latitude,
      params.longitude,
      params.availableFrom,
      params.preferredGender,
      params.roomType,
      params.roomAreaSqm,
      params.maxOccupants,
      params.currentOccupants,
      params.smokingAllowed,
      params.petAllowed,
      params.source ?? null,
    ]
  );

  return result.rows[0] || null;
}

export async function submitListingForApproval(listingId: string, ownerId: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `UPDATE listings
     SET status = 'PENDING', updated_at = NOW()
     WHERE id = $1 AND owner_id = $2 AND status IN ('DRAFT', 'REJECTED')
     RETURNING *`,
    [listingId, ownerId]
  );
  if (result.rows.length === 0) return null;
  return findListingByIdAndOwner(listingId, ownerId);
}

export async function expireApprovedImportedListings(days = 30): Promise<number> {
  const result = await pool.query(
    `UPDATE listings
     SET status = 'EXPIRED',
         expires_at = COALESCE(expires_at, NOW()),
         updated_at = NOW()
     WHERE status = 'APPROVED'
       AND source IS NOT NULL
       AND source != ''
       AND published_at IS NOT NULL
       AND published_at <= NOW() - ($1::int * INTERVAL '1 day')`,
    [days]
  );

  return result.rowCount ?? 0;
}

export async function listPublicApprovedListings(currentUserId?: string): Promise<ListingRecord[]> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            users.created_at AS owner_created_at,
            users.last_active_at AS owner_last_active,
            (SELECT COUNT(*) FROM listings l WHERE l.owner_id = users.id AND l.status = 'APPROVED') AS owner_listings_count,
            EXISTS(SELECT 1 FROM saved_listings sl WHERE sl.user_id = $1 AND sl.listing_id = listings.id) AS is_saved,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.status = 'APPROVED'
     GROUP BY listings.id, users.id
     ORDER BY listings.published_at DESC, listings.created_at DESC`,
    [currentUserId || null]
  );
  return result.rows;
}

export async function findPublicApprovedListingById(id: string, currentUserId?: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            users.created_at AS owner_created_at,
            users.last_active_at AS owner_last_active,
            (SELECT COUNT(*) FROM listings l WHERE l.owner_id = users.id AND l.status = 'APPROVED') AS owner_listings_count,
            EXISTS(SELECT 1 FROM saved_listings sl WHERE sl.user_id = $2 AND sl.listing_id = listings.id) AS is_saved,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.id = $1 AND listings.status = 'APPROVED'
     GROUP BY listings.id, users.id`,
    [id, currentUserId || null]
  );
  return result.rows[0] || null;
}

export async function listAllListingsForAdmin(): Promise<ListingRecord[]> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (
              SELECT COALESCE(
                json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
                '[]'::json
              ) FROM listing_amenity la
              JOIN amenities a ON a.id = la.amenity_id
              WHERE la.listing_id = listings.id
            ) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.status != 'DRAFT'
     GROUP BY listings.id, users.id
     ORDER BY
       CASE WHEN listings.status = 'PENDING' THEN 1 ELSE 2 END ASC,
       listings.created_at DESC`
  );
  return result.rows;
}

export async function updateListingStatusByAdmin(
  id: string,
  status: string,
  rejectionReason: string | null
): Promise<ListingRecord | null> {
  const queryStr = `
    UPDATE listings
    SET status = $2,
        rejection_reason = $3,
        published_at = CASE WHEN $2 = 'APPROVED' THEN NOW() ELSE published_at END,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query<ListingRecord>(queryStr, [id, status, rejectionReason]);
  if (result.rows.length === 0) return null;

  const fullResult = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (
              SELECT COALESCE(
                json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
                '[]'::json
              ) FROM listing_amenity la
              JOIN amenities a ON a.id = la.amenity_id
              WHERE la.listing_id = listings.id
            ) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.id = $1
     GROUP BY listings.id, users.id`,
    [id]
  );
  return fullResult.rows[0] || null;
}

export async function deleteListingImageById(imageId: string, listingId: string): Promise<boolean> {
  const result = await pool.query(
    "DELETE FROM listing_images WHERE id = $1 AND listing_id = $2 RETURNING *",
    [imageId, listingId]
  );
  return (result.rowCount ?? 0) > 0;
}

// --- Admin-imported listings ---

export async function createAdminImportedListing(params: {
  ownerId: string;
  title: string;
  description: string;
  rentPrice: number;
  city: string | null;
  district: string;
  ward: string | null;
  address?: string | null;
  availableFrom?: string | null;
  preferredGender?: string | null;
  roomType?: string | null;
  roomAreaSqm?: number | null;
  maxOccupants?: number | null;
  currentOccupants?: number | null;
  smokingAllowed?: boolean;
  petAllowed?: boolean;
  source: string;
}): Promise<ListingRecord> {
  return createListingDraft({ ...params, source: params.source });
}

export async function listAdminImportedListings(): Promise<ListingRecord[]> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.source IS NOT NULL AND listings.source != ''
     GROUP BY listings.id, users.id
     ORDER BY listings.created_at DESC`
  );
  return result.rows;
}

export async function findAdminImportedListingById(id: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.id = $1 AND listings.source IS NOT NULL
     GROUP BY listings.id, users.id`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateAdminImportedListing(params: {
  listingId: string;
  title: string;
  description: string;
  rentPrice: number;
  city: string | null;
  district: string;
  ward: string | null;
  address: string | null;
  availableFrom: string | null;
  preferredGender: string | null;
  roomType: string | null;
  roomAreaSqm: number | null;
  maxOccupants: number | null;
  currentOccupants: number | null;
  smokingAllowed: boolean;
  petAllowed: boolean;
  source: string;
}): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `UPDATE listings
     SET title = $2, description = $3, rent_price = $4, city = $5,
         district = $6, ward = $7, address = $8,
         available_from = $9, preferred_gender = $10, room_type = $11,
         room_area_sqm = $12, max_occupants = $13, current_occupants = $14,
         smoking_allowed = $15, pet_allowed = $16, source = $17,
         updated_at = NOW()
     WHERE id = $1 AND source IS NOT NULL
     RETURNING *`,
    [
      params.listingId, params.title, params.description, params.rentPrice,
      params.city, params.district, params.ward, params.address,
      params.availableFrom, params.preferredGender, params.roomType,
      params.roomAreaSqm, params.maxOccupants, params.currentOccupants,
      params.smokingAllowed, params.petAllowed, params.source,
    ]
  );
  if (result.rows.length === 0) return null;
  return findAdminImportedListingById(params.listingId);
}

export async function publishAdminImportedListing(id: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `UPDATE listings
     SET status = 'APPROVED', published_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND source IS NOT NULL AND status IN ('DRAFT', 'REJECTED')
     RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return findAdminImportedListingById(id);
}

export async function unpublishAdminImportedListing(id: string): Promise<ListingRecord | null> {
  const result = await pool.query<ListingRecord>(
    `UPDATE listings
     SET status = 'DRAFT', updated_at = NOW()
     WHERE id = $1 AND source IS NOT NULL AND status = 'APPROVED'
     RETURNING *`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return findAdminImportedListingById(id);
}

// --- Saved Listings ---

export async function toggleSaveListing(userId: string, listingId: string): Promise<{ isSaved: boolean }> {
  // Check if saved
  const checkRes = await pool.query(
    "SELECT 1 FROM saved_listings WHERE user_id = $1 AND listing_id = $2",
    [userId, listingId]
  );

  if (checkRes.rowCount && checkRes.rowCount > 0) {
    // Already saved, so delete
    await pool.query(
      "DELETE FROM saved_listings WHERE user_id = $1 AND listing_id = $2",
      [userId, listingId]
    );
    return { isSaved: false };
  } else {
    // Not saved, so insert
    await pool.query(
      "INSERT INTO saved_listings (user_id, listing_id) VALUES ($1, $2)",
      [userId, listingId]
    );
    return { isSaved: true };
  }
}

export async function listSavedListings(userId: string): Promise<ListingRecord[]> {
  const result = await pool.query<ListingRecord>(
    `SELECT listings.*,
            users.full_name AS owner_name,
            users.phone_number AS owner_phone,
            users.avatar_url AS owner_avatar,
            users.email AS owner_email,
            users.created_at AS owner_created_at,
            users.last_active_at AS owner_last_active,
            (SELECT COUNT(*) FROM listings l WHERE l.owner_id = users.id AND l.status = 'APPROVED') AS owner_listings_count,
            true AS is_saved,
            COALESCE(
              json_agg(
                json_build_object(
                  'id', listing_images.id,
                  'listing_id', listing_images.listing_id,
                  'image_url', listing_images.image_url,
                  'display_order', listing_images.display_order,
                  'created_at', listing_images.created_at
                ) ORDER BY listing_images.display_order
              ) FILTER (WHERE listing_images.id IS NOT NULL),
              '[]'
            ) AS images,
            (SELECT COALESCE(
              json_agg(json_build_object('id', a.id, 'name', a.name) ORDER BY a.name),
              '[]'::json
            ) FROM listing_amenity la
             JOIN amenities a ON a.id = la.amenity_id
             WHERE la.listing_id = listings.id) AS amenities
     FROM listings
     JOIN saved_listings sl ON sl.listing_id = listings.id AND sl.user_id = $1
     LEFT JOIN users ON users.id = listings.owner_id
     LEFT JOIN listing_images ON listing_images.listing_id = listings.id
     WHERE listings.status = 'APPROVED'
     GROUP BY listings.id, users.id, sl.created_at
     ORDER BY sl.created_at DESC`,
    [userId]
  );
  return result.rows;
}

// --- Listing Reports ---

export type ListingReportRecord = {
  id: string;
  reporter_id: string | null;
  listing_id: string;
  reason: string;
  description: string | null;
  status: string;
  created_at: string;
  listing_title?: string;
  reporter_name?: string | null;
  reporter_email?: string | null;
};

export async function createReport(params: {
  reporterId: string | null;
  listingId: string;
  reason: string;
  description: string | null;
}): Promise<ListingReportRecord> {
  const result = await pool.query<ListingReportRecord>(
    `INSERT INTO listing_reports (reporter_id, listing_id, reason, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [params.reporterId, params.listingId, params.reason, params.description]
  );
  return result.rows[0];
}

export async function listAllReports(): Promise<ListingReportRecord[]> {
  const result = await pool.query<ListingReportRecord>(
    `SELECT lr.*, l.title AS listing_title, u.full_name AS reporter_name, u.email AS reporter_email
     FROM listing_reports lr
     JOIN listings l ON l.id = lr.listing_id
     LEFT JOIN users u ON u.id = lr.reporter_id
     ORDER BY lr.created_at DESC`
  );
  return result.rows;
}

export async function resolveReport(reportId: string): Promise<boolean> {
  const result = await pool.query(
    "UPDATE listing_reports SET status = 'RESOLVED' WHERE id = $1 RETURNING *",
    [reportId]
  );
  return (result.rowCount ?? 0) > 0;
}

