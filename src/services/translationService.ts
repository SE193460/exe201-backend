import { createHash } from "crypto";
import { env } from "../config/env";
import {
  getListingSourceContent,
  getStoredTranslations,
  upsertTranslation,
  type TranslationField,
} from "../repositories/translationRepository";

export type ContentLocale = "vi" | "en" | "ja";

export type LocalizedListing = {
  title: string;
  description: string | null;
};

/** Locales that need runtime translation (vi is the source language). */
const TRANSLATABLE: ContentLocale[] = ["en", "ja"];

const MAX_IDS = 20;
const MAX_TEXTS_PER_REQUEST = 10;

export function normalizeContentLocale(value: unknown): ContentLocale {
  if (typeof value !== "string") return "vi";
  const normalized = value.trim().toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("ja") || normalized.startsWith("jp")) return "ja";
  return "vi";
}

export function isContentTranslationEnabled(): boolean {
  return Boolean(env.assistantApiKey);
}

function hashText(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function extractJsonObject(content: string): unknown {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(content.slice(start, end + 1));
  } catch {
    return null;
  }
}

async function translateWithLlm(
  items: { key: string; text: string }[],
  locale: "en" | "ja"
): Promise<Record<string, string>> {
  if (!env.assistantApiKey || items.length === 0) return {};
  const language = locale === "ja" ? "Japanese" : "English";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${env.assistantApiBaseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.assistantApiKey}`,
        "HTTP-Referer": env.frontendUrl,
        "X-Title": "Roomie",
      },
      body: JSON.stringify({
        model: env.assistantModel,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You translate text from a Vietnamese roommate-finding website. " +
              `Translate every value into ${language}, keeping numbers, units and meaning; be concise and natural. ` +
              'Reply with ONLY a JSON object of the form {"translations":{"<key>":"<translated>"}} ' +
              "reusing the exact keys provided. Do not add commentary.",
          },
          { role: "user", content: JSON.stringify(items) },
        ],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`LLM responded with ${response.status}`);

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = extractJsonObject(data.choices?.[0]?.message?.content ?? "") as
      | { translations?: Record<string, unknown> }
      | null;
    const translations = parsed?.translations;
    if (!translations || typeof translations !== "object") return {};

    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(translations)) {
      if (typeof value === "string" && value.trim()) out[key] = value.trim();
    }
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Return the title/description of the given listings translated into `locale`.
 *
 * Translations are produced on demand by the configured LLM and cached in the
 * database for reuse. When no LLM is configured (or the LLM fails) the original
 * Vietnamese text is returned, so callers always get usable content.
 */
export async function getLocalizedListings(
  ids: string[],
  locale: ContentLocale
): Promise<Record<string, LocalizedListing>> {
  const unique = [...new Set(ids)].slice(0, MAX_IDS);
  const result: Record<string, LocalizedListing> = {};
  if (unique.length === 0) return result;

  const sources = await getListingSourceContent(unique);
  for (const source of sources) {
    result[source.id] = { title: source.title, description: source.description };
  }

  if (sources.length === 0 || !TRANSLATABLE.includes(locale)) return result;

  const stored = await getStoredTranslations(unique, locale);
  const cached = new Map(stored.map((row) => [`${row.listing_id}|${row.field}`, row]));

  const fields: TranslationField[] = ["title", "description"];
  const pending: { id: string; field: TranslationField; text: string; hash: string }[] = [];

  for (const source of sources) {
    for (const field of fields) {
      const text = source[field];
      if (!text) continue;
      const hash = hashText(text);
      const hit = cached.get(`${source.id}|${field}`);
      if (hit && hit.source_hash === hash) {
        result[source.id][field] = hit.translated_text;
      } else {
        pending.push({ id: source.id, field, text, hash });
      }
    }
  }

  if (pending.length === 0 || !env.assistantApiKey) return result;

  for (let index = 0; index < pending.length; index += MAX_TEXTS_PER_REQUEST) {
    const chunk = pending.slice(index, index + MAX_TEXTS_PER_REQUEST);
    try {
      const translations = await translateWithLlm(
        chunk.map((item) => ({ key: `${item.id}|${item.field}`, text: item.text })),
        locale as "en" | "ja"
      );
      await Promise.all(
        chunk.map(async (item) => {
          const translated = translations[`${item.id}|${item.field}`];
          if (!translated) return;
          result[item.id][item.field] = translated;
          try {
            await upsertTranslation(item.id, locale, item.field, item.hash, translated);
          } catch (error) {
            console.error("Failed to cache listing translation:", error);
          }
        })
      );
    } catch (error) {
      console.error("Listing translation failed:", error);
    }
  }

  return result;
}
