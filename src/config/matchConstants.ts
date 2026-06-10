export const PREF = {
  ANY_INT: 99,
  ANY_TEXT: 'ANY',
  PET: { LOVE: 'LOVE', ANY: 'ANY', DISLIKE: 'DISLIKE', NEVER: 'NEVER' },
  SMOKING: { YES: 'YES', ANY: 'ANY', DISLIKE: 'DISLIKE', NEVER: 'NEVER' },
  WORK_SCHEDULE: { DAY: 'DAY', NIGHT: 'NIGHT', FLEXIBLE: 'FLEXIBLE', ANY: 'ANY' },
  SHARING: { OPEN: 'OPEN', ASK: 'ASK', PRIVATE: 'PRIVATE', ANY: 'ANY' },
} as const;

export const FIELD_WEIGHTS = {
  smoking:        2.0,
  pet:            2.0,
  cleanliness:    1.5,
  noise:          1.0,
  ac_usage:       1.0,
  work_schedule:  1.0,
  guest:          1.0,
  sharing:        1.0,
  cooking:        0.5,
  home_frequency: 0.5,
  call_frequency: 0.5,
  game_mic:       0.5,
} as const;

export const TOTAL_WEIGHT = Object.values(FIELD_WEIGHTS).reduce((a, b) => a + b, 0);
// TOTAL_WEIGHT = 12.5

// Maximum scale level per linear field (for distance normalisation)
export const LINEAR_MAX_LEVEL: Record<string, number> = {
  cleanliness:    4,
  ac_usage:       5,
  cooking:        3,
  guest:          3,
  home_frequency: 3,
  noise:          3,
  call_frequency: 4,
  game_mic:       4,
};
