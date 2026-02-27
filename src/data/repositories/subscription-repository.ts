// Repository for the subscription_state table.
// There is at most one row; the singleton ID is fixed as 'singleton'.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { SQLiteDatabase } from 'expo-sqlite';
import type { SubscriptionState } from '@/src/domain/types';

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
}

function rowToSubscriptionState(row: SubscriptionStateRow): SubscriptionState {
  const status = row.status as SubscriptionState['status'];
  return {
    id: row.id,
    status,
    product_id: row.product_id ?? '',
    period: (row.period ?? 'one_time') as SubscriptionState['period'],
    started_at: row.started_at ?? '',
    expires_at: row.expires_at ?? '',
    is_premium: row.is_premium === 1 || status === 'active' || status === 'one_time',
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
       (id, status, product_id, period, started_at, expires_at, is_premium)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      SINGLETON_ID,
      state.status,
      state.product_id,
      state.period,
      state.started_at,
      state.expires_at,
      state.is_premium ? 1 : 0,
    ],
  );
}

/**
 * Records a one-time purchase, setting is_premium = true and status = 'one_time'.
 */
export async function recordOneTimePurchase(
  db: SQLiteDatabase,
  productId: string,
): Promise<void> {
  const now = new Date().toISOString();
  await upsertSubscription(db, {
    status: 'one_time',
    product_id: productId,
    period: 'one_time',
    started_at: now,
    expires_at: '',
    is_premium: true,
  });
}

/**
 * Returns true if the user has premium access (one-time purchase or active subscription).
 */
export async function getIsPremium(db: SQLiteDatabase): Promise<boolean> {
  const state = await getSubscription(db);
  return state?.is_premium ?? false;
}
