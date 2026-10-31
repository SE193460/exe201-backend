import { pool } from "../config/db";

export type ListingSourceContent = {
  id: string;
  title: string;
  description: string | null;
};

export type TranslationField = "title" | "description";

export type StoredTranslation = {
  listing_id: string;
  field: TranslationField;
  source_hash: string;
  translated_text: string;
};

/** Only public (APPROVED) listings are eligible for on-demand translation. */
export async function getListingSourceContent(ids: string[]): Promise<ListingSourceContent[]> {
  if (ids.length === 0) return [];
  const result = await pool.query(
    `SELECT id, title, description
       FROM listings
      WHERE id = ANY($1::uuid[]) AND status = 'APPROVED'`,
    [ids]
  );
  return result.rows as ListingSourceContent[];
}

export async function getStoredTranslations(
  ids: string[],
  locale: string
): Promise<StoredTranslation[]> {
  if (ids.length === 0) return [];
  const result = await pool.query(
    `SELECT listing_id, field, source_hash, translated_text
       FROM listing_translations
      WHERE locale = $1 AND listing_id = ANY($2::uuid[])`,
    [locale, ids]
  );
  return result.rows as StoredTranslation[];
}

export async function upsertTranslation(
  listingId: string,
  locale: string,
  field: TranslationField,
  sourceHash: string,
  translatedText: string
): Promise<void> {
  await pool.query(
    `INSERT INTO listing_translations (listing_id, locale, field, source_hash, translated_text, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (listing_id, locale, field)
     DO UPDATE SET source_hash = EXCLUDED.source_hash,
                   translated_text = EXCLUDED.translated_text,
                   updated_at = NOW()`,
    [listingId, locale, field, sourceHash, translatedText]
  );
}
