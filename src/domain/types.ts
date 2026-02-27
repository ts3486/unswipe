// Domain type definitions for the Unmatch app.
// All types are derived from the SQLite schema and seed data shapes.
// No default exports. TypeScript strict mode assumed.

// ---------------------------------------------------------------------------
// Primitive union types
// ---------------------------------------------------------------------------

export type GoalType =
  | 'reduce_swipe'
  | 'reduce_open'
  | 'reduce_night_check'
  | 'reduce_spend';

export type NotificationStyle = 'stealth' | 'normal' | 'off';

export type UrgeKind = 'swipe' | 'check' | 'spend';

export type SpendCategory =
  | 'iap'
  | 'date'
  | 'gift'
  | 'tipping'
  | 'transport'
  | 'other';

export type SpendItemType = 'boost' | 'like_pack' | 'premium' | 'other';

export type UrgeOutcome = 'success' | 'fail' | 'ongoing';

export type SpendingLimitMode = 'soft' | 'pledge';

export type SubscriptionStatus = 'active' | 'expired' | 'none' | 'one_time';

export type SubscriptionPeriod = 'monthly' | 'yearly' | 'one_time';

export type PaywallTriggerSource =
  | 'settings'
  | 'panic_limit'
  | 'learn_locked'
  | 'progress_locked'
  | 'onboarding';

// ---------------------------------------------------------------------------
// DB-backed entity interfaces
// ---------------------------------------------------------------------------

/**
 * Mirrors user_profile table.
 * spending_budget_weekly and spending_budget_daily are stored as integer cents
 * (nullable when not set).
 */
export interface UserProfile {
  id: string;
  created_at: string; // ISO-8601 UTC
  locale: string;
  notification_style: NotificationStyle;
  plan_selected: string;
  goal_type: GoalType;
  spending_budget_weekly: number | null;
  spending_budget_daily: number | null;
  spending_limit_mode: SpendingLimitMode | null;
}

/**
 * Mirrors daily_checkin table.
 * date_local is YYYY-MM-DD in the device's local timezone.
 * Numeric mood/fatigue/urge fields are 1-5 Likert scale integers.
 * note is excluded from analytics payloads (private).
 * spent_amount is stored as integer cents; never sent to analytics.
 */
export interface DailyCheckin {
  id: string;
  date_local: string; // YYYY-MM-DD
  mood: number;
  fatigue: number;
  urge: number;
  note: string | null;
  opened_at_night: number | null; // 0 | 1
  spent_today: number | null; // 0 | 1
  spent_amount: number | null; // integer cents, never sent to analytics
}

/**
 * Mirrors urge_event table.
 * spend_amount is integer cents and is never sent to analytics.
 */
export interface UrgeEvent {
  id: string;
  started_at: string; // ISO-8601 UTC
  from_screen: string;
  urge_level: number; // 1-10
  protocol_completed: number; // 0 | 1
  urge_kind: UrgeKind;
  action_type: string;
  action_id: string;
  outcome: UrgeOutcome;
  trigger_tag: string | null;
  spend_category: SpendCategory | null;
  spend_item_type: SpendItemType | null;
  spend_amount: number | null; // integer cents, never sent to analytics
}

/**
 * Mirrors progress table.
 * date_local is the primary key in YYYY-MM-DD format.
 */
export interface Progress {
  date_local: string; // YYYY-MM-DD (PK)
  streak_current: number;
  resist_count_total: number;
  tree_level: number; // 1-30
  last_success_date: string | null; // YYYY-MM-DD
  spend_avoided_count_total: number;
}

/**
 * Mirrors content table.
 * Content items are read-only seed data loaded from starter_7d.json.
 */
export interface Content {
  content_id: string;
  day_index: number;
  title: string;
  body: string;
  action_text: string;
  est_minutes: number;
}

/**
 * Mirrors content_progress table.
 * Tracks per-user completion of content items.
 */
export interface ContentProgress {
  content_id: string; // PK, FK -> content.content_id
  completed_at: string; // ISO-8601 UTC
}

/**
 * Mirrors subscription_state table.
 * is_premium is true for one-time purchases (status === 'one_time') or active subscriptions.
 */
export interface SubscriptionState {
  id: string;
  status: SubscriptionStatus;
  product_id: string;
  period: SubscriptionPeriod;
  started_at: string; // ISO-8601 UTC
  expires_at: string; // ISO-8601 UTC
  is_premium: boolean;
}

// ---------------------------------------------------------------------------
// Seed data shapes (catalog.json)
// ---------------------------------------------------------------------------

/**
 * A preset trigger tag available in the catalog.
 * Users select from these; no custom strings allowed.
 */
export interface CatalogTrigger {
  id: string;
  label: string; // display label (English market)
}

/**
 * A single coping action in the catalog.
 * action_type categorises the action for analytics.
 */
export interface CatalogAction {
  id: string;
  action_type: string;
  title: string;
  body: string;
  est_seconds: number;
}

/**
 * Preset urge kind definition used in catalog metadata.
 */
export interface CatalogUrgeKind {
  id: UrgeKind;
  label: string;
}

/**
 * Preset spend category definition used in catalog metadata.
 */
export interface CatalogSpendCategory {
  id: SpendCategory;
  label: string;
}

/**
 * Preset spend item type definition used in catalog metadata.
 */
export interface CatalogSpendItemType {
  id: SpendItemType;
  label: string;
}

/**
 * A spend-delay card shown during a spend urge protocol.
 * References an action by action_id.
 */
export interface CatalogSpendDelayCard {
  id: string;
  action_id: string;
  title: string;
  body: string;
}

/**
 * Static UI copy strings bundled in the catalog.
 * Keys are dot-separated namespaced identifiers.
 */
export interface CatalogCopy {
  [key: string]: string;
}

/**
 * Root shape of data/seed/catalog.json.
 */
export interface Catalog {
  triggers: CatalogTrigger[];
  actions: CatalogAction[];
  urge_kinds: CatalogUrgeKind[];
  spend_categories: CatalogSpendCategory[];
  spend_item_types: CatalogSpendItemType[];
  spend_delay_cards: CatalogSpendDelayCard[];
  copy: CatalogCopy;
  /** Preset motivational messages for the daily motivation card. */
  motivation_messages: string[];
}

// ---------------------------------------------------------------------------
// Seed data shapes (starter_7d.json)
// ---------------------------------------------------------------------------

/**
 * A single day entry in the starter course.
 * action_ids references CatalogAction.id values.
 */
export interface StarterDay {
  day_index: number; // 1-based
  title: string;
  body: string;
  action_text: string;
  est_minutes: number;
  action_ids: string[];
}

/**
 * Root shape of data/seed/starter_7d.json.
 */
export interface StarterCourse {
  course_id: string;
  days: StarterDay[];
}
