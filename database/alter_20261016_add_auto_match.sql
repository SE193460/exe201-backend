-- Add the auto-match preference to the lifestyle profile.
-- Users can disable automatic compatibility scoring from their profile.
ALTER TABLE user_lifestyle_profiles
    ADD COLUMN IF NOT EXISTS auto_match_enabled BOOLEAN NOT NULL DEFAULT TRUE;
