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

    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

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

CREATE TABLE user_lifestyle_profiles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- Khu vực mong muốn (chỉ dùng cho user chưa có phòng)
    preferred_district TEXT,

    -- Field 1: Độ sạch sẽ
    -- 1: Rất sạch, 2: Khá sạch, 3: Bình thường, 4: Khá bừa bộn
    cleanliness INTEGER CHECK (cleanliness BETWEEN 1 AND 4),

    -- Field 2: Tần suất sử dụng điều hòa
    -- 1: Hầu như không, 2: Ít, 3: Bình thường, 4: Nhiều, 5: Gần như luôn bật
    ac_usage INTEGER CHECK (ac_usage BETWEEN 1 AND 5),

    -- Field 3: Thú cưng
    -- 0: Không nuôi, 1: Có nuôi
    pet_status INTEGER CHECK (pet_status IN (0, 1)),

    -- Field 4: Hút thuốc
    -- 0: Không hút, 1: Có hút
    smoking_status INTEGER CHECK (smoking_status IN (0, 1)),

    -- Field 5: Nấu ăn
    -- 1: Thường xuyên, 2: Thỉnh thoảng, 3: Hiếm khi
    cooking INTEGER CHECK (cooking BETWEEN 1 AND 3),

    -- Field 6: Bạn bè về phòng
    -- 1: Hiếm khi, 2: Thỉnh thoảng, 3: Thường xuyên
    guest INTEGER CHECK (guest BETWEEN 1 AND 3),

    -- Field 7: Tần suất ở trong phòng
    -- 1: Ít, 2: Bình thường, 3: Thường xuyên
    home_frequency INTEGER CHECK (home_frequency BETWEEN 1 AND 3),

    -- Field 8: Thời gian làm việc
    -- 'DAY': Ban ngày, 'FLEXIBLE': Không cố định, 'NIGHT': Ban đêm
    work_schedule TEXT CHECK (work_schedule IN ('DAY', 'FLEXIBLE', 'NIGHT')),

    -- Field 9: Chia sẻ đồ dùng
    -- 1: Thoải mái, 2: Hỏi trước, 3: Không thích
    sharing INTEGER CHECK (sharing BETWEEN 1 AND 3),

    -- Field 10: Mức độ yên tĩnh
    -- 1: Yên tĩnh, 2: Bình thường, 3: Khá ồn ào
    noise INTEGER CHECK (noise BETWEEN 1 AND 3),

    -- Field 11: Gọi điện/video call
    -- 1: Hiếm khi, 2: Thỉnh thoảng, 3: Khá thường xuyên, 4: Thường xuyên
    call_frequency INTEGER CHECK (call_frequency BETWEEN 1 AND 4),

    -- Field 12: Game voice chat
    -- 1: Hầu như không, 2: Thỉnh thoảng, 3: Khá thường xuyên, 4: Thường xuyên
    game_mic INTEGER CHECK (game_mic BETWEEN 1 AND 4),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bảng lưu tiêu chí tìm kiếm của user trong form lọc mềm
CREATE TABLE user_roommate_preferences (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,

    -- NHÓM 1: LINEAR — NULL = bỏ trống, 99 = cái nào cũng được, 1-n = mức cụ thể
    pref_cleanliness    INTEGER CHECK (pref_cleanliness    IN (1,2,3,4,99)),
    pref_ac_usage       INTEGER CHECK (pref_ac_usage       IN (1,2,3,4,5,99)),
    pref_cooking        INTEGER CHECK (pref_cooking        IN (1,2,3,99)),
    pref_guest          INTEGER CHECK (pref_guest          IN (1,2,3,99)),
    pref_home_frequency INTEGER CHECK (pref_home_frequency IN (1,2,3,99)),
    pref_noise          INTEGER CHECK (pref_noise          IN (1,2,3,99)),
    pref_call_frequency INTEGER CHECK (pref_call_frequency IN (1,2,3,4,99)),
    pref_game_mic       INTEGER CHECK (pref_game_mic       IN (1,2,3,4,99)),

    -- NHÓM 2: NHỊ PHÂN — NULL = bỏ trống, 'ANY' = cái nào cũng được
    pref_pet     TEXT CHECK (pref_pet     IN ('LOVE','ANY','DISLIKE','NEVER')),
    pref_smoking TEXT CHECK (pref_smoking IN ('YES','ANY','DISLIKE','NEVER')),

    -- NHÓM 3: MA TRẬN — NULL = bỏ trống, 'ANY' = cái nào cũng được
    pref_work_schedule TEXT CHECK (pref_work_schedule IN ('DAY','NIGHT','ANY')),
    pref_sharing       TEXT CHECK (pref_sharing       IN ('OPEN','ASK','PRIVATE','ANY')),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sequence for payment transaction codes
CREATE SEQUENCE IF NOT EXISTS payment_code_seq START 1;

-- Create payment_transactions table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    amount INTEGER NOT NULL,
    package_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'COMPLETED',
    code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create saved_listings table
CREATE TABLE IF NOT EXISTS saved_listings (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, listing_id)
);

-- Create listing_reports table
CREATE TABLE IF NOT EXISTS listing_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create listing_promotions table
CREATE TABLE IF NOT EXISTS listing_promotions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    package_type TEXT NOT NULL,
    purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);