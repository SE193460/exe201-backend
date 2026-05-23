-- Add user phone number
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add listing location hierarchy and room area
ALTER TABLE listings ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS ward TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS room_area_sqm INTEGER;
