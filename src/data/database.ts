// Database initialization module.
// Opens the database using expo-sqlite v16 API and runs all table creation SQL.
// No default exports. TypeScript strict mode.

import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

const CREATE_USER_PROFILE = `
CREATE TABLE IF NOT EXISTS user_profile (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  notification_style TEXT NOT NULL DEFAULT 'normal',
  plan_selected TEXT,
  goal_type TEXT,
  spending_budget_weekly INTEGER,
  spending_budget_daily INTEGER,
  spending_limit_mode TEXT
);
`.trim();

const CREATE_DAILY_CHECKIN = `
CREATE TABLE IF NOT EXISTS daily_checkin (
  id TEXT PRIMARY KEY,
  date_local TEXT NOT NULL,
  mood INTEGER NOT NULL,
  fatigue INTEGER NOT NULL,
  urge INTEGER NOT NULL,
  note TEXT,
  opened_at_night INTEGER,
  spent_today INTEGER,
  spent_amount INTEGER
);
`.trim();

const CREATE_URGE_EVENT = `
CREATE TABLE IF NOT EXISTS urge_event (
  id TEXT PRIMARY KEY,
  started_at TEXT NOT NULL,
  from_screen TEXT NOT NULL,
  urge_level INTEGER NOT NULL,
  protocol_completed INTEGER NOT NULL DEFAULT 0,
  urge_kind TEXT NOT NULL,
  action_type TEXT,
  action_id TEXT,
  outcome TEXT,
  trigger_tag TEXT,
  spend_category TEXT,
  spend_item_type TEXT,
  spend_amount INTEGER
);
`.trim();

const CREATE_PROGRESS = `
CREATE TABLE IF NOT EXISTS progress (
  date_local TEXT PRIMARY KEY,
  streak_current INTEGER NOT NULL DEFAULT 0,
  resist_count_total INTEGER NOT NULL DEFAULT 0,
  tree_level INTEGER NOT NULL DEFAULT 1,
  last_success_date TEXT,
  spend_avoided_count_total INTEGER NOT NULL DEFAULT 0
);
`.trim();

const CREATE_CONTENT = `
CREATE TABLE IF NOT EXISTS content (
  content_id TEXT PRIMARY KEY,
  day_index INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_text TEXT NOT NULL,
  est_minutes INTEGER NOT NULL
);
`.trim();

const CREATE_CONTENT_PROGRESS = `
CREATE TABLE IF NOT EXISTS content_progress (
  content_id TEXT PRIMARY KEY,
  completed_at TEXT NOT NULL
);
`.trim();

const CREATE_SUBSCRIPTION_STATE = `
CREATE TABLE IF NOT EXISTS subscription_state (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'none',
  product_id TEXT,
  period TEXT,
  started_at TEXT,
  expires_at TEXT,
  is_premium INTEGER NOT NULL DEFAULT 0
);
`.trim();

// Migration: add is_premium column to existing subscription_state tables.
const MIGRATE_SUBSCRIPTION_IS_PREMIUM = `
ALTER TABLE subscription_state ADD COLUMN is_premium INTEGER NOT NULL DEFAULT 0;
`.trim();

/**
 * Opens the database, enables WAL mode, and creates all tables.
 * Must be called once at app startup before any repository is used.
 * Returns the initialized SQLiteDatabase instance.
 */
export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('app.db');

  // Enable WAL mode for better write concurrency.
  await db.execAsync('PRAGMA journal_mode = WAL;');

  // Create all tables in a single transaction.
  await db.execAsync(`
    ${CREATE_USER_PROFILE}
    ${CREATE_DAILY_CHECKIN}
    ${CREATE_URGE_EVENT}
    ${CREATE_PROGRESS}
    ${CREATE_CONTENT}
    ${CREATE_CONTENT_PROGRESS}
    ${CREATE_SUBSCRIPTION_STATE}
  `);

  // Run additive migrations that are safe to run multiple times.
  // ALTER TABLE ... ADD COLUMN fails silently if column already exists on older SQLite,
  // but expo-sqlite wraps errors — so we catch and ignore duplicate column errors.
  try {
    await db.execAsync(MIGRATE_SUBSCRIPTION_IS_PREMIUM);
  } catch {
    // Column already exists — safe to ignore.
  }

  _db = db;
  return db;
}

/**
 * Returns the initialized database instance.
 * Throws if initDatabase() has not been called yet.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (_db === null) {
    throw new Error(
      'Database has not been initialized. Call initDatabase() before getDatabase().',
    );
  }
  return _db;
}
