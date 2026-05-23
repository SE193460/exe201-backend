-- Indexes for Roommate Finder Platform

CREATE INDEX IF NOT EXISTS idx_listings_owner_id ON listings(owner_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at);
CREATE INDEX IF NOT EXISTS idx_listings_published_at ON listings(published_at);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district);
CREATE INDEX IF NOT EXISTS idx_listings_ward ON listings(ward);
CREATE INDEX IF NOT EXISTS idx_listings_rent_price ON listings(rent_price);
CREATE INDEX IF NOT EXISTS idx_listings_city_district_ward ON listings(city, district, ward);
CREATE INDEX IF NOT EXISTS idx_listing_images_listing_id ON listing_images(listing_id);
