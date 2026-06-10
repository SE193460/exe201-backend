import { Request, Response } from 'express';
import {
  countApprovedListingsByUser,
  findApprovedListingsWithOwnerProfile,
  findNoRoomUsersWithProfile,
  HardFilters,
} from '../repositories/softFilterRepository';
import { getRoommatePreferences } from '../repositories/lifestyleRepository';
import {
  calculateMatchScore,
  LifestyleProfile,
  RoommatePreferences,
} from '../services/matchingService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMatchProfile(raw: Record<string, unknown> | null): LifestyleProfile {
  if (!raw) return {};
  return {
    cleanliness:    raw.cleanliness    as number | null,
    ac_usage:       raw.ac_usage       as number | null,
    pet_status:     raw.pet_status     as number | null,
    smoking_status: raw.smoking_status as number | null,
    cooking:        raw.cooking        as number | null,
    guest:          raw.guest          as number | null,
    home_frequency: raw.home_frequency as number | null,
    work_schedule:  raw.work_schedule  as string | null,
    sharing:        raw.sharing        as number | null,
    noise:          raw.noise          as number | null,
    call_frequency: raw.call_frequency as number | null,
    game_mic:       raw.game_mic       as number | null,
  };
}

function toMatchPreferences(raw: Record<string, unknown> | null): RoommatePreferences {
  if (!raw) return {};
  return {
    pref_cleanliness:    raw.pref_cleanliness    as number | null,
    pref_ac_usage:       raw.pref_ac_usage       as number | null,
    pref_cooking:        raw.pref_cooking        as number | null,
    pref_guest:          raw.pref_guest          as number | null,
    pref_home_frequency: raw.pref_home_frequency as number | null,
    pref_noise:          raw.pref_noise          as number | null,
    pref_call_frequency: raw.pref_call_frequency as number | null,
    pref_game_mic:       raw.pref_game_mic       as number | null,
    pref_pet:            raw.pref_pet            as string | null,
    pref_smoking:        raw.pref_smoking        as string | null,
    pref_work_schedule:  raw.pref_work_schedule  as string | null,
    pref_sharing:        raw.pref_sharing        as string | null,
  };
}

// ─── Controller ───────────────────────────────────────────────────────────────

export async function softFilter(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const { user_type, hard_filters } = req.body as {
    user_type: 'HAS_ROOM' | 'NO_ROOM';
    hard_filters?: HardFilters;
  };

  if (user_type !== 'HAS_ROOM' && user_type !== 'NO_ROOM') {
    return res.status(400).json({ message: 'user_type phải là HAS_ROOM hoặc NO_ROOM' });
  }

  // Lấy preferences của user hiện tại (dùng cho cả 2 mode)
  const prefsRaw = await getRoommatePreferences(userId);
  const myPreferences = toMatchPreferences(prefsRaw as Record<string, unknown> | null);

  const filters: HardFilters = hard_filters ?? {};

  // ── HAS_ROOM mode ──────────────────────────────────────────────────────────
  if (user_type === 'HAS_ROOM') {
    const approvedCount = await countApprovedListingsByUser(userId);
    if (approvedCount !== 1) {
      return res.status(400).json({
        message: 'Bạn chưa có bài đăng hợp lệ. Cần đúng 1 bài đăng đã được duyệt.',
      });
    }

    const users = await findNoRoomUsersWithProfile(filters.district);

    const results = users
      .filter((u) => u.user_id !== userId) // loại chính mình
      .map((u) => {
        const profile = toMatchProfile(u.profile as Record<string, unknown> | null);
        const { total_score, field_scores } = calculateMatchScore(profile, myPreferences);
        return {
          id:          u.user_id,
          full_name:   u.full_name,
          avatar_url:  u.avatar_url,
          email:       u.email,
          phone_number: u.phone_number,
          zalo:        u.zalo,
          total_score,
          field_scores,
        };
      })
      .sort((a, b) => b.total_score - a.total_score);

    return res.json({ results });
  }

  // ── NO_ROOM mode ───────────────────────────────────────────────────────────
  const listings = await findApprovedListingsWithOwnerProfile(filters);

  const results = listings
    .map((l) => {
      const ownerProfile = toMatchProfile(l.profile as Record<string, unknown> | null);
      const { total_score, field_scores } = calculateMatchScore(ownerProfile, myPreferences);
      return {
        id:           l.listing_id,
        title:        l.title,
        rent_price:   l.rent_price,
        district:     l.district,
        room_area_sqm: l.room_area_sqm,
        address:      l.address,
        image_url:    l.image_url,
        owner: {
          id:         l.owner_id,
          name:       l.owner_name,
          avatar_url: l.owner_avatar,
          email:      l.owner_email,
        },
        total_score,
        field_scores,
      };
    })
    .sort((a, b) => b.total_score - a.total_score);

  return res.json({ results });
}
