// App-wide configuration constants.
// No default exports.

// ---------------------------------------------------------------------------
// Resist Rank (LOCKED)
// ---------------------------------------------------------------------------

/** Starting rank for every new user. */
export const RESIST_RANK_START = 1 as const;

/** Maximum rank a user can reach. */
export const RESIST_RANK_CAP = 30 as const;

/** Number of successful resists required to advance one rank. */
export const RESIST_RANK_RESISTS_PER_LEVEL = 5 as const;

// Life Tree uses the same progression constants as Resist Rank.
export const LIFE_TREE_CAP = RESIST_RANK_CAP;
export const LIFE_TREE_RESISTS_PER_LEVEL = RESIST_RANK_RESISTS_PER_LEVEL;

// ---------------------------------------------------------------------------
// Breathing exercise timings (seconds)
// ---------------------------------------------------------------------------

/** Total duration of one guided breathing session in seconds. */
export const BREATHING_DURATION_SECONDS = 60 as const;

/** Inhale phase duration in seconds (box-breath style). */
export const BREATHING_INHALE = 4 as const;

/** Hold phase duration in seconds. */
export const BREATHING_HOLD = 2 as const;

/** Exhale phase duration in seconds. */
export const BREATHING_EXHALE = 6 as const;

// ---------------------------------------------------------------------------
// Time saved estimation
// ---------------------------------------------------------------------------

/**
 * Estimated minutes saved per successful resist.
 * Based on the average time spent per dating app session.
 */
export const TIME_SAVED_PER_RESIST_MINUTES = 12 as const;
