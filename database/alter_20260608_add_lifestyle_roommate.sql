-- Migration: Add lifestyle profiles and roommate preferences tables
-- Date: 2026-06-08

-- Bảng lưu thông tin lối sống cá nhân của user
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
