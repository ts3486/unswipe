// Repository for the user_profile table.
// All functions accept a SQLiteDatabase instance directly so they remain
// testable and framework-agnostic.
// No default exports. TypeScript strict mode.

import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from '@/src/utils/uuid';
import type { UserProfile } from '@/src/domain/types';

// ---------------------------------------------------------------------------
// Row shape returned by SQLite (all values are primitives)
// ---------------------------------------------------------------------------

interface UserProfileRow {
  id: string;
  created_at: string;
  locale: string;
  notification_style: string;
  plan_selected: string | null;
  goal_type: string | null;
  spending_budget_weekly: number | null;
  spending_budget_daily: number | null;
  spending_limit_mode: string | null;
}

function rowToUserProfile(row: UserProfileRow): UserProfile {
  return {
    id: row.id,
    created_at: row.created_at,
    locale: row.locale,
    notification_style: row.notification_style as UserProfile['notification_style'],
    plan_selected: row.plan_selected ?? '',
    goal_type: (row.goal_type ?? 'reduce_swipe') as UserProfile['goal_type'],
    spending_budget_weekly: row.spending_budget_weekly,
    spending_budget_daily: row.spending_budget_daily,
    spending_limit_mode:
      row.spending_limit_mode !== null
        ? (row.spending_limit_mode as UserProfile['spending_limit_mode'])
        : null,
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Fetches the single user profile record.
 * Returns null if no profile exists yet (first launch before onboarding).
 */
export async function getUserProfile(
  db: SQLiteDatabase,
): Promise<UserProfile | null> {
  const row = await db.getFirstAsync<UserProfileRow>(
    'SELECT * FROM user_profile LIMIT 1;',
  );
  return row !== null ? rowToUserProfile(row) : null;
}

/**
 * Inserts a new user profile.
 * Generates a UUID and sets created_at to the current UTC ISO-8601 timestamp.
 * Returns the full inserted profile.
 */
export async function createUserProfile(
  db: SQLiteDatabase,
  profile: Omit<UserProfile, 'id' | 'created_at'>,
): Promise<UserProfile> {
  const id = randomUUID();
  const created_at = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO user_profile
       (id, created_at, locale, notification_style,
        plan_selected, goal_type, spending_budget_weekly,
        spending_budget_daily, spending_limit_mode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      created_at,
      profile.locale,
      profile.notification_style,
      profile.plan_selected,
      profile.goal_type,
      profile.spending_budget_weekly ?? null,
      profile.spending_budget_daily ?? null,
      profile.spending_limit_mode ?? null,
    ],
  );

  return { id, created_at, ...profile };
}

/**
 * Updates one or more fields on the user profile identified by id.
 * Only the provided keys are changed; unspecified fields are untouched.
 */
export async function updateUserProfile(
  db: SQLiteDatabase,
  id: string,
  updates: Partial<UserProfile>,
): Promise<void> {
  const entries = Object.entries(updates).filter(([key]) => key !== 'id');

  if (entries.length === 0) {
    return;
  }

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([, value]) => value ?? null);

  await db.runAsync(
    `UPDATE user_profile SET ${setClauses} WHERE id = ?;`,
    [...values, id],
  );
}
