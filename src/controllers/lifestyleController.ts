import { Request, Response } from 'express';
import {
  getLifestyleProfile,
  upsertLifestyleProfile,
  getRoommatePreferences,
  upsertRoommatePreferences,
} from '../repositories/lifestyleRepository';

// ─── Lifestyle Profile ────────────────────────────────────────────────────────

export async function getMyLifestyleProfile(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const profile = await getLifestyleProfile(userId);
  return res.json(profile ?? {});
}

export async function updateMyLifestyleProfile(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const {
    preferred_district,
    cleanliness,
    ac_usage,
    pet_status,
    smoking_status,
    cooking,
    guest,
    home_frequency,
    work_schedule,
    sharing,
    noise,
    call_frequency,
    game_mic,
  } = req.body;

  const updated = await upsertLifestyleProfile(userId, {
    preferred_district: preferred_district ?? null,
    cleanliness:        cleanliness        ?? null,
    ac_usage:           ac_usage           ?? null,
    pet_status:         pet_status         ?? null,
    smoking_status:     smoking_status     ?? null,
    cooking:            cooking            ?? null,
    guest:              guest              ?? null,
    home_frequency:     home_frequency     ?? null,
    work_schedule:      work_schedule      ?? null,
    sharing:            sharing            ?? null,
    noise:              noise              ?? null,
    call_frequency:     call_frequency     ?? null,
    game_mic:           game_mic           ?? null,
  });

  return res.json(updated);
}

// ─── Roommate Preferences ─────────────────────────────────────────────────────

export async function getMyRoommatePreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const prefs = await getRoommatePreferences(userId);
  return res.json(prefs ?? {});
}

export async function updateMyRoommatePreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const {
    pref_cleanliness,
    pref_ac_usage,
    pref_cooking,
    pref_guest,
    pref_home_frequency,
    pref_noise,
    pref_call_frequency,
    pref_game_mic,
    pref_pet,
    pref_smoking,
    pref_work_schedule,
    pref_sharing,
  } = req.body;

  const updated = await upsertRoommatePreferences(userId, {
    pref_cleanliness:    pref_cleanliness    ?? null,
    pref_ac_usage:       pref_ac_usage       ?? null,
    pref_cooking:        pref_cooking        ?? null,
    pref_guest:          pref_guest          ?? null,
    pref_home_frequency: pref_home_frequency ?? null,
    pref_noise:          pref_noise          ?? null,
    pref_call_frequency: pref_call_frequency ?? null,
    pref_game_mic:       pref_game_mic       ?? null,
    pref_pet:            pref_pet            ?? null,
    pref_smoking:        pref_smoking        ?? null,
    pref_work_schedule:  pref_work_schedule  ?? null,
    pref_sharing:        pref_sharing        ?? null,
  });

  return res.json(updated);
}
