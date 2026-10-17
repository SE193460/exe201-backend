-- Cache of AI-translated free-text listing content (title / description) per locale.
-- Translations are produced on demand by the translation service and reused until
-- the source text changes (tracked by source_hash).
CREATE TABLE IF NOT EXISTS listing_translations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    locale TEXT NOT NULL,
    field TEXT NOT NULL,
    source_hash TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT listing_translations_field_check CHECK (field IN ('title', 'description')),
    CONSTRAINT listing_translations_locale_check CHECK (locale IN ('en', 'ja')),
    CONSTRAINT listing_translations_unique UNIQUE (listing_id, locale, field)
);

CREATE INDEX IF NOT EXISTS idx_listing_translations_listing_locale
    ON listing_translations (listing_id, locale);
