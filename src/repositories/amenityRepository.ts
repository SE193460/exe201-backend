import { pool } from "../config/db";

export type AmenityRecord = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export async function listAmenities(): Promise<AmenityRecord[]> {
  const result = await pool.query<AmenityRecord>("SELECT * FROM amenities ORDER BY name ASC");
  return result.rows;
}

export async function findAmenityByName(name: string): Promise<AmenityRecord | null> {
  const result = await pool.query<AmenityRecord>(
    "SELECT * FROM amenities WHERE LOWER(name) = LOWER($1) LIMIT 1",
    [name]
  );
  return result.rows[0] || null;
}

export async function createAmenity(name: string): Promise<AmenityRecord> {
  const result = await pool.query<AmenityRecord>(
    "INSERT INTO amenities (name) VALUES ($1) RETURNING *",
    [name]
  );
  return result.rows[0];
}

export async function updateAmenity(id: string, name: string): Promise<AmenityRecord | null> {
  const result = await pool.query<AmenityRecord>(
    "UPDATE amenities SET name = $2, updated_at = NOW() WHERE id = $1 RETURNING *",
    [id, name]
  );
  return result.rows[0] || null;
}

export async function listAmenitiesByIds(ids: string[]): Promise<AmenityRecord[]> {
  if (ids.length === 0) return [];
  const result = await pool.query<AmenityRecord>(
    "SELECT * FROM amenities WHERE id = ANY($1)",
    [ids]
  );
  return result.rows;
}

export async function addAmenitiesToListing(listingId: string, amenityIds: string[]) {
  if (amenityIds.length === 0) return;

  const values: string[] = [];
  const params: string[] = [];

  amenityIds.forEach((amenityId, index) => {
    const baseIndex = index * 2;
    values.push(`($${baseIndex + 1}, $${baseIndex + 2})`);
    params.push(listingId, amenityId);
  });

  await pool.query(
    `INSERT INTO listing_amenity (listing_id, amenity_id)
     VALUES ${values.join(", ")}
     ON CONFLICT DO NOTHING`,
    params
  );
}

export async function setListingAmenities(listingId: string, amenityIds: string[]) {
  await pool.query("DELETE FROM listing_amenity WHERE listing_id = $1", [listingId]);
  if (amenityIds.length > 0) {
    await addAmenitiesToListing(listingId, amenityIds);
  }
}

export async function deleteAmenityById(id: string): Promise<{ deleted: boolean; inUse: boolean }> {
  const inUse = await pool.query("SELECT 1 FROM listing_amenity WHERE amenity_id = $1 LIMIT 1", [id]);
  if (inUse.rows.length > 0) {
    return { deleted: false, inUse: true };
  }

  const result = await pool.query("DELETE FROM amenities WHERE id = $1", [id]);
  return { deleted: (result.rowCount ?? 0) > 0, inUse: false };
}
