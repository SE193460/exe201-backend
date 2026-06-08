import { FIELD_WEIGHTS, LINEAR_MAX_LEVEL, PREF } from '../config/matchConstants';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LifestyleProfile = {
  cleanliness?:    number | null;
  ac_usage?:       number | null;
  pet_status?:     number | null; // 0 = no pet, 1 = has pet
  smoking_status?: number | null; // 0 = non-smoker, 1 = smoker
  cooking?:        number | null;
  guest?:          number | null;
  home_frequency?: number | null;
  work_schedule?:  string | null; // 'DAY' | 'FLEXIBLE' | 'NIGHT'
  sharing?:        number | null;
  noise?:          number | null;
  call_frequency?: number | null;
  game_mic?:       number | null;
};

export type RoommatePreferences = {
  pref_cleanliness?:    number | null;
  pref_ac_usage?:       number | null;
  pref_cooking?:        number | null;
  pref_guest?:          number | null;
  pref_home_frequency?: number | null;
  pref_noise?:          number | null;
  pref_call_frequency?: number | null;
  pref_game_mic?:       number | null;
  pref_pet?:            string | null;
  pref_smoking?:        string | null;
  pref_work_schedule?:  string | null;
  pref_sharing?:        string | null;
};

export type FieldScore = {
  score: number;
  label: string;
  profile_value: string;
  pref_value: string;
};

export type MatchResult = {
  total_score: number;
  field_scores: Record<string, FieldScore>;
};

// ─── Label helpers ────────────────────────────────────────────────────────────

function scoreLabel(score: number, isPrefAny: boolean): string {
  if (isPrefAny) return 'Bạn chấp nhận tất cả';
  if (score === 1.0) return 'Phù hợp hoàn toàn';
  if (score >= 0.5)  return 'Khá phù hợp';
  if (score > 0.0)   return 'Ít phù hợp';
  return 'Không phù hợp';
}

// ─── Profile value display labels ────────────────────────────────────────────

const CLEANLINESS_LABELS: Record<number, string> = {
  1: 'Rất sạch', 2: 'Khá sạch', 3: 'Bình thường', 4: 'Khá bừa bộn',
};
const AC_USAGE_LABELS: Record<number, string> = {
  1: 'Hầu như không', 2: 'Ít', 3: 'Bình thường', 4: 'Nhiều', 5: 'Gần như luôn bật',
};
const COOKING_LABELS: Record<number, string> = {
  1: 'Thường xuyên', 2: 'Thỉnh thoảng', 3: 'Hiếm khi',
};
const GUEST_LABELS: Record<number, string> = {
  1: 'Hiếm khi', 2: 'Thỉnh thoảng', 3: 'Thường xuyên',
};
const HOME_FREQ_LABELS: Record<number, string> = {
  1: 'Ít', 2: 'Bình thường', 3: 'Thường xuyên',
};
const NOISE_LABELS: Record<number, string> = {
  1: 'Yên tĩnh', 2: 'Bình thường', 3: 'Khá ồn ào',
};
const CALL_FREQ_LABELS: Record<number, string> = {
  1: 'Hiếm khi', 2: 'Thỉnh thoảng', 3: 'Khá thường xuyên', 4: 'Thường xuyên',
};
const GAME_MIC_LABELS: Record<number, string> = {
  1: 'Hầu như không', 2: 'Thỉnh thoảng', 3: 'Khá thường xuyên', 4: 'Thường xuyên',
};
const WORK_SCHEDULE_LABELS: Record<string, string> = {
  DAY: 'Ban ngày', FLEXIBLE: 'Không cố định', NIGHT: 'Ban đêm',
};
const SHARING_LABELS: Record<number, string> = {
  1: 'Thoải mái', 2: 'Hỏi trước', 3: 'Không thích',
};

function linearProfileLabel(field: string, value: number | null | undefined): string {
  if (value == null) return 'Chưa điền';
  const maps: Record<string, Record<number, string>> = {
    cleanliness: CLEANLINESS_LABELS,
    ac_usage: AC_USAGE_LABELS,
    cooking: COOKING_LABELS,
    guest: GUEST_LABELS,
    home_frequency: HOME_FREQ_LABELS,
    noise: NOISE_LABELS,
    call_frequency: CALL_FREQ_LABELS,
    game_mic: GAME_MIC_LABELS,
    sharing: SHARING_LABELS,
  };
  return maps[field]?.[value] ?? String(value);
}

function linearPrefLabel(field: string, pref: number): string {
  if (pref === PREF.ANY_INT) return 'Cái nào cũng được';
  return linearProfileLabel(field, pref);
}

// ─── Scoring functions ────────────────────────────────────────────────────────

function scoreLinear(
  profileVal: number | null | undefined,
  prefVal: number,
  maxLevel: number,
): number {
  if (prefVal === PREF.ANY_INT) return 1.0;
  if (profileVal == null)       return 0.5;
  return 1 - Math.abs(profileVal - prefVal) / (maxLevel - 1);
}

function scoreSmoking(
  profileVal: number | null | undefined,
  prefVal: string,
): number {
  if (profileVal == null) return 0.5;
  const smokes = profileVal === 1;
  if (smokes) {
    if (prefVal === PREF.SMOKING.YES)     return 1.0;
    if (prefVal === PREF.SMOKING.ANY)     return 1.0;
    if (prefVal === PREF.SMOKING.DISLIKE) return 0.5;
    if (prefVal === PREF.SMOKING.NEVER)   return 0.0;
  } else {
    if (prefVal === PREF.SMOKING.YES)     return 0.5;
    if (prefVal === PREF.SMOKING.ANY)     return 1.0;
    if (prefVal === PREF.SMOKING.DISLIKE) return 1.0;
    if (prefVal === PREF.SMOKING.NEVER)   return 1.0;
  }
  return 0.5;
}

function scorePet(
  profileVal: number | null | undefined,
  prefVal: string,
): number {
  if (profileVal == null) return 0.5;
  const hasPet = profileVal === 1;
  if (hasPet) {
    if (prefVal === PREF.PET.LOVE)    return 1.0;
    if (prefVal === PREF.PET.ANY)     return 1.0;
    if (prefVal === PREF.PET.DISLIKE) return 0.5;
    if (prefVal === PREF.PET.NEVER)   return 0.0;
  } else {
    if (prefVal === PREF.PET.LOVE)    return 0.5;
    if (prefVal === PREF.PET.ANY)     return 1.0;
    if (prefVal === PREF.PET.DISLIKE) return 1.0;
    if (prefVal === PREF.PET.NEVER)   return 1.0;
  }
  return 0.5;
}

function scoreWorkSchedule(
  profileVal: string | null | undefined,
  prefVal: string,
): number {
  if (prefVal === PREF.WORK_SCHEDULE.ANY) return 1.0;
  if (profileVal == null) return 0.5;
  if (profileVal === 'DAY') {
    if (prefVal === 'DAY')   return 1.0;
    if (prefVal === 'NIGHT') return 0.0;
  }
  if (profileVal === 'FLEXIBLE') {
    if (prefVal === 'DAY')   return 0.5;
    if (prefVal === 'NIGHT') return 0.5;
  }
  if (profileVal === 'NIGHT') {
    if (prefVal === 'DAY')   return 0.0;
    if (prefVal === 'NIGHT') return 1.0;
  }
  return 0.5;
}

// sharing: profile stored as integer (1=OPEN, 2=ASK, 3=PRIVATE), pref as text
const SHARING_INT_TO_TEXT: Record<number, string> = { 1: 'OPEN', 2: 'ASK', 3: 'PRIVATE' };

function scoreSharingMatrix(
  profileVal: number | null | undefined,
  prefVal: string,
): number {
  if (prefVal === PREF.SHARING.ANY) return 1.0;
  if (profileVal == null) return 0.5;
  const p = SHARING_INT_TO_TEXT[profileVal];
  if (!p) return 0.5;

  const matrix: Record<string, Record<string, number>> = {
    OPEN:    { OPEN: 1.0, ASK: 0.75, PRIVATE: 0.5  },
    ASK:     { OPEN: 0.75, ASK: 1.0, PRIVATE: 0.75 },
    PRIVATE: { OPEN: 0.5, ASK: 0.75, PRIVATE: 1.0  },
  };
  return matrix[p]?.[prefVal] ?? 0.5;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function calculateMatchScore(
  profile: LifestyleProfile,
  preferences: RoommatePreferences,
): MatchResult {
  let weightedSum = 0;
  let activeWeight = 0;
  const field_scores: Record<string, FieldScore> = {};

  // Helper to register a field result
  const register = (
    field: keyof typeof FIELD_WEIGHTS,
    score: number,
    isPrefAny: boolean,
    profileDisplay: string,
    prefDisplay: string,
  ) => {
    const w = FIELD_WEIGHTS[field];
    weightedSum  += score * w;
    activeWeight += w;
    field_scores[field] = {
      score,
      label: scoreLabel(score, isPrefAny),
      profile_value: profileDisplay,
      pref_value: prefDisplay,
    };
  };

  // ── Nhóm 1: Linear fields ────────────────────────────────────────────────
  const linearFields: Array<{
    field: keyof typeof FIELD_WEIGHTS;
    profileKey: keyof LifestyleProfile;
    prefKey: keyof RoommatePreferences;
  }> = [
    { field: 'cleanliness',    profileKey: 'cleanliness',    prefKey: 'pref_cleanliness'    },
    { field: 'ac_usage',       profileKey: 'ac_usage',       prefKey: 'pref_ac_usage'       },
    { field: 'cooking',        profileKey: 'cooking',        prefKey: 'pref_cooking'        },
    { field: 'guest',          profileKey: 'guest',          prefKey: 'pref_guest'          },
    { field: 'home_frequency', profileKey: 'home_frequency', prefKey: 'pref_home_frequency' },
    { field: 'noise',          profileKey: 'noise',          prefKey: 'pref_noise'          },
    { field: 'call_frequency', profileKey: 'call_frequency', prefKey: 'pref_call_frequency' },
    { field: 'game_mic',       profileKey: 'game_mic',       prefKey: 'pref_game_mic'       },
  ];

  for (const { field, profileKey, prefKey } of linearFields) {
    const pref = preferences[prefKey] as number | null | undefined;
    if (pref == null) continue; // bỏ qua

    const prof = profile[profileKey] as number | null | undefined;
    const maxLevel = LINEAR_MAX_LEVEL[field]!;
    const score = scoreLinear(prof, pref, maxLevel);
    const isPrefAny = pref === PREF.ANY_INT;

    register(
      field,
      score,
      isPrefAny,
      linearProfileLabel(field, prof),
      linearPrefLabel(field, pref),
    );
  }

  // ── Nhóm 2: Binary fields ─────────────────────────────────────────────────
  if (preferences.pref_smoking != null) {
    const pref = preferences.pref_smoking;
    const score = scoreSmoking(profile.smoking_status, pref);
    const isPrefAny = pref === PREF.SMOKING.ANY;
    register(
      'smoking',
      score,
      isPrefAny,
      profile.smoking_status == null ? 'Chưa điền' : profile.smoking_status === 1 ? 'Có hút thuốc' : 'Không hút thuốc',
      pref === PREF.SMOKING.YES ? 'Có hút thuốc'
        : pref === PREF.SMOKING.ANY ? 'Cái nào cũng được'
        : pref === PREF.SMOKING.DISLIKE ? 'Không thích hút thuốc'
        : 'Bắt buộc không hút',
    );
  }

  if (preferences.pref_pet != null) {
    const pref = preferences.pref_pet;
    const score = scorePet(profile.pet_status, pref);
    const isPrefAny = pref === PREF.PET.ANY;
    register(
      'pet',
      score,
      isPrefAny,
      profile.pet_status == null ? 'Chưa điền' : profile.pet_status === 1 ? 'Có nuôi thú cưng' : 'Không nuôi thú cưng',
      pref === PREF.PET.LOVE ? 'Thích có thú cưng'
        : pref === PREF.PET.ANY ? 'Cái nào cũng được'
        : pref === PREF.PET.DISLIKE ? 'Không thích thú cưng'
        : 'Bắt buộc không có thú cưng',
    );
  }

  // ── Nhóm 3: Matrix fields ─────────────────────────────────────────────────
  if (preferences.pref_work_schedule != null) {
    const pref = preferences.pref_work_schedule;
    const score = scoreWorkSchedule(profile.work_schedule, pref);
    const isPrefAny = pref === PREF.WORK_SCHEDULE.ANY;
    register(
      'work_schedule',
      score,
      isPrefAny,
      profile.work_schedule != null ? (WORK_SCHEDULE_LABELS[profile.work_schedule] ?? profile.work_schedule) : 'Chưa điền',
      isPrefAny ? 'Cái nào cũng được' : (WORK_SCHEDULE_LABELS[pref] ?? pref),
    );
  }

  if (preferences.pref_sharing != null) {
    const pref = preferences.pref_sharing;
    const score = scoreSharingMatrix(profile.sharing, pref);
    const isPrefAny = pref === PREF.SHARING.ANY;
    const sharingDisplayMap: Record<string, string> = {
      OPEN: 'Thoải mái chia sẻ', ASK: 'Hỏi trước', PRIVATE: 'Không thích chia sẻ', ANY: 'Cái nào cũng được',
    };
    register(
      'sharing',
      score,
      isPrefAny,
      profile.sharing != null ? (SHARING_LABELS[profile.sharing] ?? String(profile.sharing)) : 'Chưa điền',
      sharingDisplayMap[pref] ?? pref,
    );
  }

  // ── Final score ───────────────────────────────────────────────────────────
  const total_score = activeWeight > 0
    ? Math.round((weightedSum / activeWeight) * 100 * 10) / 10  // 1 decimal place
    : 0;

  return { total_score, field_scores };
}
