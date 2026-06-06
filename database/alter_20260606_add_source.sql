-- Add source column to listings table for imported listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS source VARCHAR(2048) NULL;
