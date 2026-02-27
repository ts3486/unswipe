// Seed loader: populates content table from starter_7d.json on first run.
// getCatalog() returns the static in-memory catalog for UI use.
// No default exports. TypeScript strict mode.

import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Catalog,
  CatalogTrigger,
  CatalogAction,
  CatalogUrgeKind,
  CatalogSpendCategory,
  CatalogSpendItemType,
  CatalogSpendDelayCard,
  CatalogCopy,
  StarterCourse,
  StarterDay,
} from '@/src/domain/types';

// ---------------------------------------------------------------------------
// Raw JSON shapes (camelCase as they appear on disk)
// ---------------------------------------------------------------------------

interface RawTrigger {
  id: string;
  label: string;
  description: string;
}

interface RawUrgeKind {
  id: string;
  label: string;
  help: string;
}

interface RawSpendCategory {
  id: string;
  label: string;
}

interface RawSpendItemType {
  id: string;
  label: string;
}

interface RawAction {
  id: string;
  minutes: number;
  title: string;
  steps: string[];
  tags: string[];
}

interface RawSpendDelayCard {
  id: string;
  title: string;
  body: string;
  ctaActionId: string;
}

interface RawCopy {
  [key: string]: string;
}

interface RawCatalog {
  version: string;
  localeDefault: string;
  triggers: RawTrigger[];
  urgeKinds: RawUrgeKind[];
  spendCategories: RawSpendCategory[];
  spendItemTypes: RawSpendItemType[];
  actions: RawAction[];
  spendDelayCards: RawSpendDelayCard[];
  copy: RawCopy;
  motivation_messages: string[];
}

interface RawStarterDay {
  contentId: string;
  dayIndex: number;
  title: string;
  body: string;
  actionText: string;
  estMinutes: number;
  recommendedActionIds: string[];
  tags: string[];
}

interface RawStarterCourse {
  courseId: string;
  version: string;
  locale: string;
  days: RawStarterDay[];
}

// ---------------------------------------------------------------------------
// Load raw JSON (require for React Native bundler compatibility)
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawCatalog: RawCatalog = require('../../data/seed/catalog.json') as RawCatalog;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const rawStarterCourse: RawStarterCourse = require('../../data/seed/starter_7d.json') as RawStarterCourse;

// ---------------------------------------------------------------------------
// Mapping helpers: raw JSON (camelCase) -> domain types (snake_case)
// ---------------------------------------------------------------------------

function mapTrigger(raw: RawTrigger): CatalogTrigger {
  return { id: raw.id, label: raw.label };
}

function mapAction(raw: RawAction): CatalogAction {
  return {
    id: raw.id,
    action_type: raw.tags[0] ?? 'general',
    title: raw.title,
    body: raw.steps.join('\n'),
    est_seconds: raw.minutes * 60,
  };
}

function mapUrgeKind(raw: RawUrgeKind): CatalogUrgeKind {
  // UrgeKind union is enforced by the domain type; cast is safe given seeded data.
  return { id: raw.id as CatalogUrgeKind['id'], label: raw.label };
}

function mapSpendCategory(raw: RawSpendCategory): CatalogSpendCategory {
  return { id: raw.id as CatalogSpendCategory['id'], label: raw.label };
}

function mapSpendItemType(raw: RawSpendItemType): CatalogSpendItemType {
  return { id: raw.id as CatalogSpendItemType['id'], label: raw.label };
}

function mapSpendDelayCard(raw: RawSpendDelayCard): CatalogSpendDelayCard {
  return {
    id: raw.id,
    action_id: raw.ctaActionId,
    title: raw.title,
    body: raw.body,
  };
}

function mapCopy(raw: RawCopy): CatalogCopy {
  return { ...raw };
}

// ---------------------------------------------------------------------------
// Memoized, mapped catalog
// ---------------------------------------------------------------------------

let _catalog: Catalog | null = null;

/**
 * Returns the typed Catalog object derived from catalog.json.
 * The result is memoized after the first call.
 */
export function getCatalog(): Catalog {
  if (_catalog !== null) {
    return _catalog;
  }

  _catalog = {
    triggers: rawCatalog.triggers.map(mapTrigger),
    actions: rawCatalog.actions.map(mapAction),
    urge_kinds: rawCatalog.urgeKinds.map(mapUrgeKind),
    spend_categories: rawCatalog.spendCategories.map(mapSpendCategory),
    spend_item_types: rawCatalog.spendItemTypes.map(mapSpendItemType),
    spend_delay_cards: rawCatalog.spendDelayCards.map(mapSpendDelayCard),
    copy: mapCopy(rawCatalog.copy),
    motivation_messages: rawCatalog.motivation_messages ?? [],
  };

  return _catalog;
}

/**
 * Returns the typed StarterCourse object derived from starter_7d.json.
 */
export function getStarterCourse(): StarterCourse {
  const days: StarterDay[] = rawStarterCourse.days.map(
    (raw: RawStarterDay): StarterDay => ({
      day_index: raw.dayIndex,
      title: raw.title,
      body: raw.body,
      action_text: raw.actionText,
      est_minutes: raw.estMinutes,
      action_ids: raw.recommendedActionIds,
    }),
  );

  return {
    course_id: rawStarterCourse.courseId,
    days,
  };
}

// ---------------------------------------------------------------------------
// Content seeding
// ---------------------------------------------------------------------------

/**
 * Checks whether the content table is empty. If so, inserts all seven days
 * from starter_7d.json into the content table.
 *
 * Safe to call on every app launch; it is a no-op when content already exists.
 */
export async function seedContentIfEmpty(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM content;',
  );

  if (existing !== null && existing.count > 0) {
    return;
  }

  const course = getStarterCourse();

  for (const day of course.days) {
    // content_id matches the raw contentId from the JSON file to keep IDs stable.
    const rawDay = rawStarterCourse.days.find(
      (r: RawStarterDay) => r.dayIndex === day.day_index,
    );
    const contentId = rawDay?.contentId ?? `starter_7d_day_${day.day_index}`;

    await db.runAsync(
      `INSERT OR IGNORE INTO content
         (content_id, day_index, title, body, action_text, est_minutes)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        contentId,
        day.day_index,
        day.title,
        day.body,
        day.action_text,
        day.est_minutes,
      ],
    );
  }
}
