// Repository for the subscription_state table.
// There is at most one row; the singleton ID is fixed as 'singleton'.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SubscriptionState } from '@/src/domain/types';
import { FREE_TRIAL_DAYS } from '@/src/constants/config';
import { addDays, differenceInCalendarDays } from 'date-fns';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SINGLETON_ID = 'singleton';

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

interface SubscriptionStateRow {
  id: string;
  status: string;
  product_id: string | null;
  period: string | null;
  started_at: string | null;
  expires_at: string | null;
  is_premium: number | null; // stored as 0 | 1 in SQLite
  trial_started_at: string | null;
  trial_ends_at: string | null;
}

// ---------------------------------------------------------------------------
// Trial info type
// ---------------------------------------------------------------------------

export interface TrialInfo {
  hasStartedTrial: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if the trial end date is in the future.
 * Pure function — no DB calls.
 */
export function isTrialActive(trialEndsAt: string, now: Date = new Date()): boolean {
  if (!trialEndsAt) return false;
  return now < new Date(trialEndsAt);
}

function rowToSubscriptionState(row: SubscriptionStateRow): SubscriptionState {
  const status = row.status as SubscriptionState['status'];
  const trialActive = isTrialActive(row.trial_ends_at ?? '');
  return {
    id: row.id,
    status,
    product_id: row.product_id ?? '',
    period: (row.period ?? 'lifetime') as SubscriptionState['period'],
    started_at: row.started_at ?? '',
    expires_at: row.expires_at ?? '',
    is_premium:
      row.is_premium === 1 ||
      status === 'active' ||
      status === 'lifetime' ||
      (status === 'trial' && trialActive),
    trial_started_at: row.trial_started_at ?? '',
    trial_ends_at: row.trial_ends_at ?? '',
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Returns the subscription state record, or null if it has never been set.
 */
export async function getSubscription(
  db: SQLiteDatabase,
): Promise<SubscriptionState | null> {
  const row = await db.getFirstAsync<SubscriptionStateRow>(
    'SELECT * FROM subscription_state WHERE id = ? LIMIT 1;',
    [SINGLETON_ID],
  );

  return row !== null ? rowToSubscriptionState(row) : null;
}

/**
 * Inserts or replaces the subscription state.
 * Always uses the fixed singleton ID so only one row ever exists.
 */
export async function upsertSubscription(
  db: SQLiteDatabase,
  state: Omit<SubscriptionState, 'id'>,
): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO subscription_state
       (id, status, product_id, period, started_at, expires_at, is_premium, trial_started_at, trial_ends_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      SINGLETON_ID,
      state.status,
      state.product_id,
      state.period,
      state.started_at,
      state.expires_at,
      state.is_premium ? 1 : 0,
      state.trial_started_at,
      state.trial_ends_at,
    ],
  );
}

/**
 * Records a lifetime purchase, setting is_premium = true and status = 'lifetime'.
 * Preserves trial fields from the existing row.
 */
export async function recordLifetimePurchase(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  const existing = await getSubscription(db);
  const now = new Date().toISOString();
  await upsertSubscription(db, {
    status: 'lifetime',
    product_id: productId,
    period: 'lifetime',
    started_at: now,
    expires_at: '',
    is_premium: true,
    trial_started_at: existing?.trial_started_at ?? '',
    trial_ends_at: existing?.trial_ends_at ?? '',
  });
}

/**
 * Records a monthly subscription, setting is_premium = true and status = 'active'.
 * Sets expires_at to 1 month from now. Preserves trial fields.
 */
export async function recordMonthlySubscription(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  const existing = await getSubscription(db);
  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);
  await upsertSubscription(db, {
    status: 'active',
    product_id: productId,
    period: 'monthly',
    started_at: now.toISOString(),
    expires_at: expiresAt.toISOString(),
    is_premium: true,
    trial_started_at: existing?.trial_started_at ?? '',
    trial_ends_at: existing?.trial_ends_at ?? '',
  });
}

/**
 * Returns true if the user has premium access (lifetime, active subscription, or active trial).
 */
export async function getIsPremium(db: SQLiteDatabase): Promise<boolean> {
  const state = await getSubscription(db);
  return state?.is_premium ?? false;
}

/**
 * Records the start of a free trial.
 * Sets status='trial', trial_ends_at to now + FREE_TRIAL_DAYS, is_premium=true.
 */
export async function recordTrialStart(db: SQLiteDatabase): Promise<void> {
  const now = new Date();
  const trialEndsAt = addDays(now, FREE_TRIAL_DAYS);
  await upsertSubscription(db, {
    status: 'trial',
    product_id: '',
    period: 'monthly',
    started_at: now.toISOString(),
    expires_at: '',
    is_premium: true,
    trial_started_at: now.toISOString(),
    trial_ends_at: trialEndsAt.toISOString(),
  });
}

/**
 * Returns trial info for the current user.
 */
export async function getTrialInfo(db: SQLiteDatabase): Promise<TrialInfo> {
  const state = await getSubscription(db);
  if (!state || !state.trial_started_at) {
    return {
      hasStartedTrial: false,
      isTrialActive: false,
      trialDaysRemaining: 0,
      trialEndsAt: '',
    };
  }

  const now = new Date();
  const trialEnd = new Date(state.trial_ends_at);
  const active = isTrialActive(state.trial_ends_at, now);
  const daysRemaining = active
    ? Math.max(0, differenceInCalendarDays(trialEnd, now) + 1)
    : 0;

  return {
    hasStartedTrial: true,
    isTrialActive: active,
    trialDaysRemaining: daysRemaining,
    trialEndsAt: state.trial_ends_at,
  };
}
