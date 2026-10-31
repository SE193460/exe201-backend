import { NextFunction, Request, Response } from "express";
import { getLocalizedListings, normalizeContentLocale } from "../services/translationService";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_IDS = 20;

function parseIds(input: unknown): string[] {
  return String(input ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => UUID_PATTERN.test(id))
    .slice(0, MAX_IDS);
}

/**
 * GET /api/translations/listings?ids=<uuid,uuid>&locale=en|ja   (public)
 *
 * Returns { locale, translations: { [listingId]: { title, description } } }.
 * Free-text listing content is translated on demand and cached.
 */
export async function getListingTranslations(req: Request, res: Response, next: NextFunction) {
  try {
    const ids = parseIds(req.query.ids);
    const locale = normalizeContentLocale(req.query.locale);
    const translations = await getLocalizedListings(ids, locale);
    return res.json({ locale, translations });
  } catch (error) {
    return next(error);
  }
}
