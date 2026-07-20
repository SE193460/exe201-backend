import { pool } from '../config/db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type LifestyleProfileRecord = {
  user_id: string;
  preferred_district: string | null;
  cleanliness: number | null;
  ac_usage: number | null;
  pet_status: number | null;
  smoking_status: number | null;
  cooking: number | null;
  guest: number | null;
  home_frequency: number | null;
  work_schedule: string | null;
  sharing: number | null;
  noise: number | null;
  call_frequency: number | null;
  game_mic: number | null;
  created_at: string;
  updated_at: string;
};

export type RoommatePreferencesRecord = {
  user_id: string;
  pref_cleanliness: number | null;
  pref_ac_usage: number | null;
  pref_cooking: number | null;
  pref_guest: number | null;
  pref_home_frequency: number | null;
  pref_noise: number | null;
  pref_call_frequency: number | null;
  pref_game_mic: number | null;
  pref_pet: string | null;
  pref_smoking: string | null;
  pref_work_schedule: string | null;
  pref_sharing: string | null;
  created_at: string;
  updated_at: string;
};

// ─── Lifestyle Profile ────────────────────────────────────────────────────────

export async function getLifestyleProfile(userId: string): Promise<LifestyleProfileRecord | null> {
  const result = await pool.query<LifestyleProfileRecord>(
    'SELECT * FROM user_lifestyle_profiles WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function upsertLifestyleProfile(
  userId: string,
  data: Partial<Omit<LifestyleProfileRecord, 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<LifestyleProfileRecord> {
  const result = await pool.query<LifestyleProfileRecord>(
    `INSERT INTO user_lifestyle_profiles (
        user_id, preferred_district,
        cleanliness, ac_usage, pet_status, smoking_status,
        cooking, guest, home_frequency, work_schedule,
        sharing, noise, call_frequency, game_mic
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (user_id) DO UPDATE SET
        preferred_district = EXCLUDED.preferred_district,
        cleanliness        = EXCLUDED.cleanliness,
        ac_usage           = EXCLUDED.ac_usage,
        pet_status         = EXCLUDED.pet_status,
        smoking_status     = EXCLUDED.smoking_status,
        cooking            = EXCLUDED.cooking,
        guest              = EXCLUDED.guest,
        home_frequency     = EXCLUDED.home_frequency,
        work_schedule      = EXCLUDED.work_schedule,
        sharing            = EXCLUDED.sharing,
        noise              = EXCLUDED.noise,
        call_frequency     = EXCLUDED.call_frequency,
        game_mic           = EXCLUDED.game_mic,
        updated_at         = NOW()
      RETURNING *`,
    [
      userId,
      data.preferred_district   ?? null,
      data.cleanliness          ?? null,
      data.ac_usage             ?? null,
      data.pet_status           ?? null,
      data.smoking_status       ?? null,
      data.cooking              ?? null,
      data.guest                ?? null,
      data.home_frequency       ?? null,
      data.work_schedule        ?? null,
      data.sharing              ?? null,
      data.noise                ?? null,
      data.call_frequency       ?? null,
      data.game_mic             ?? null,
    ],
  );
  return result.rows[0];
}

// ─── Roommate Preferences ─────────────────────────────────────────────────────

export async function getRoommatePreferences(userId: string): Promise<RoommatePreferencesRecord | null> {
  const result = await pool.query<RoommatePreferencesRecord>(
    'SELECT * FROM user_roommate_preferences WHERE user_id = $1',
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function upsertRoommatePreferences(
  userId: string,
  data: Partial<Omit<RoommatePreferencesRecord, 'user_id' | 'created_at' | 'updated_at'>>,
): Promise<RoommatePreferencesRecord> {
  const result = await pool.query<RoommatePreferencesRecord>(
    `INSERT INTO user_roommate_preferences (
        user_id,
        pref_cleanliness, pref_ac_usage, pref_cooking, pref_guest,
        pref_home_frequency, pref_noise, pref_call_frequency, pref_game_mic,
        pref_pet, pref_smoking, pref_work_schedule, pref_sharing
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT (user_id) DO UPDATE SET
        pref_cleanliness    = EXCLUDED.pref_cleanliness,
        pref_ac_usage       = EXCLUDED.pref_ac_usage,
        pref_cooking        = EXCLUDED.pref_cooking,
        pref_guest          = EXCLUDED.pref_guest,
        pref_home_frequency = EXCLUDED.pref_home_frequency,
        pref_noise          = EXCLUDED.pref_noise,
        pref_call_frequency = EXCLUDED.pref_call_frequency,
        pref_game_mic       = EXCLUDED.pref_game_mic,
        pref_pet            = EXCLUDED.pref_pet,
        pref_smoking        = EXCLUDED.pref_smoking,
        pref_work_schedule  = EXCLUDED.pref_work_schedule,
        pref_sharing        = EXCLUDED.pref_sharing,
        updated_at          = NOW()
      RETURNING *`,
    [
      userId,
      data.pref_cleanliness    ?? null,
      data.pref_ac_usage       ?? null,
      data.pref_cooking        ?? null,
      data.pref_guest          ?? null,
      data.pref_home_frequency ?? null,
      data.pref_noise          ?? null,
      data.pref_call_frequency ?? null,
      data.pref_game_mic       ?? null,
      data.pref_pet            ?? null,
      data.pref_smoking        ?? null,
      data.pref_work_schedule  ?? null,
      data.pref_sharing        ?? null,
    ],
  );
  return result.rows[0];
}

export async function deleteRoommatePreferences(userId: string): Promise<void> {
  await pool.query("DELETE FROM user_roommate_preferences WHERE user_id = $1", [userId]);
}
