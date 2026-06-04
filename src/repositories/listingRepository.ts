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
  images: ListingImageRecord[];
  amenities?: { id: string; name: string }[];
  owner_name?: string | null;
  owner_phone?: string | null;
  owner_avatar?: string | null;
  owner_email?: string | null;
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
}): Promise<ListingRecord> {
  const result = await pool.query<ListingRecord>(
    `INSERT INTO listings (
      owner_id, title, description, rent_price, city, district, ward, address,
      latitude, longitude, available_from, preferred_gender, room_type,
      room_area_sqm, max_occupants, current_occupants, smoking_allowed, pet_allowed, expires_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18, $19
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

export async function listPublicApprovedListings(): Promise<ListingRecord[]> {
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
     WHERE listings.status = 'APPROVED'
     GROUP BY listings.id, users.id
     ORDER BY listings.published_at DESC, listings.created_at DESC`
  );
  return result.rows;
}

export async function findPublicApprovedListingById(id: string): Promise<ListingRecord | null> {
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
     WHERE listings.id = $1 AND listings.status = 'APPROVED'
     GROUP BY listings.id, users.id`,
    [id]
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
