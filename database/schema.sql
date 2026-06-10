-- Schema snapshot for Roommate Finder Platform
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    role_id UUID REFERENCES roles(id),

    email TEXT NOT NULL UNIQUE,

    username TEXT UNIQUE,

    password_hash TEXT,

    full_name TEXT NOT NULL,

    phone_number TEXT,

    avatar_url TEXT,

    auth_provider TEXT NOT NULL DEFAULT 'local',

    google_id TEXT UNIQUE,

    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,

    is_active BOOLEAN NOT NULL DEFAULT TRUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    source VARCHAR(2048) NULL,

    title TEXT NOT NULL,

    description TEXT NOT NULL,

    rent_price INTEGER NOT NULL,

    city TEXT,

    district TEXT NOT NULL,

    ward TEXT,

    address TEXT,

    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,

    available_from DATE,

    preferred_gender TEXT,

    room_type TEXT,

    room_area_sqm INTEGER,

    max_occupants INTEGER,

    current_occupants INTEGER DEFAULT 0,

    smoking_allowed BOOLEAN DEFAULT FALSE,

    pet_allowed BOOLEAN DEFAULT FALSE,

    status TEXT NOT NULL DEFAULT 'DRAFT',

    rejection_reason TEXT,

    published_at TIMESTAMPTZ,

    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT listings_status_check CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'))
);

CREATE TABLE listing_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    image_url TEXT NOT NULL,

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL UNIQUE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE listing_amenity (
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,

    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE RESTRICT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (listing_id, amenity_id)
);

CREATE TABLE reports (

    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    reporter_id UUID REFERENCES users(id),

    listing_id UUID REFERENCES listings(id),

    reason TEXT NOT NULL,

    status VARCHAR(20) DEFAULT 'PENDING',

    created_at TIMESTAMP DEFAULT NOW()

);