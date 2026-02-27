// Repository for the urge_event table.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { SQLiteDatabase } from 'expo-sqlite';
import { randomUUID } from '@/src/utils/uuid';
import type { UrgeEvent } from '@/src/domain/types';

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

interface UrgeEventRow {
  id: string;
  started_at: string;
  from_screen: string;
  urge_level: number;
  protocol_completed: number;
  urge_kind: string;
  action_type: string | null;
  action_id: string | null;
  outcome: string | null;
  trigger_tag: string | null;
  spend_category: string | null;
  spend_item_type: string | null;
  spend_amount: number | null;
}

function rowToUrgeEvent(row: UrgeEventRow): UrgeEvent {
  return {
    id: row.id,
    started_at: row.started_at,
    from_screen: row.from_screen,
    urge_level: row.urge_level,
    protocol_completed: row.protocol_completed,
    urge_kind: row.urge_kind as UrgeEvent['urge_kind'],
    action_type: row.action_type ?? '',
    action_id: row.action_id ?? '',
    outcome: (row.outcome ?? 'ongoing') as UrgeEvent['outcome'],
    trigger_tag: row.trigger_tag,
    spend_category:
      row.spend_category !== null
        ? (row.spend_category as UrgeEvent['spend_category'])
        : null,
    spend_item_type:
      row.spend_item_type !== null
        ? (row.spend_item_type as UrgeEvent['spend_item_type'])
        : null,
    spend_amount: row.spend_amount,
  };
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

/**
 * Returns the UTC ISO-8601 range that covers the given local date string
 * (YYYY-MM-DD) in the device timezone.
 *
 * Because SQLite stores started_at as UTC ISO-8601, we convert local date
 * boundaries to UTC for comparison. We use JavaScript's Date parsing:
 * "2024-01-15" interpreted as midnight local time.
 */
function localDateToUtcRange(dateLocal: string): { start: string; end: string } {
  const startMs = new Date(`${dateLocal}T00:00:00`).getTime();
  const endMs = startMs + 24 * 60 * 60 * 1000;
  return {
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Inserts a new urge event.
 * Generates a UUID automatically.
 * Returns the full inserted event.
 */
export async function createUrgeEvent(
  db: SQLiteDatabase,
  event: Omit<UrgeEvent, 'id'>,
): Promise<UrgeEvent> {
  const id = randomUUID();

  await db.runAsync(
    `INSERT INTO urge_event
       (id, started_at, from_screen, urge_level, protocol_completed,
        urge_kind, action_type, action_id, outcome, trigger_tag,
        spend_category, spend_item_type, spend_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      id,
      event.started_at,
      event.from_screen,
      event.urge_level,
      event.protocol_completed,
      event.urge_kind,
      event.action_type,
      event.action_id,
      event.outcome,
      event.trigger_tag ?? null,
      event.spend_category ?? null,
      event.spend_item_type ?? null,
      event.spend_amount ?? null,
    ],
  );

  return { id, ...event };
}

/**
 * Returns all urge events whose started_at falls within the given local date
 * (device timezone), ordered by started_at ascending.
 */
export async function getUrgeEventsByDate(
  db: SQLiteDatabase,
  dateLocal: string,
): Promise<UrgeEvent[]> {
  const { start, end } = localDateToUtcRange(dateLocal);

  const rows = await db.getAllAsync<UrgeEventRow>(
    `SELECT * FROM urge_event
     WHERE started_at >= ? AND started_at < ?
     ORDER BY started_at ASC;`,
    [start, end],
  );

  return rows.map(rowToUrgeEvent);
}

/**
 * Counts urge events on a given local date where outcome = 'success'.
 * Used to determine whether that day is a "success day".
 */
export async function countSuccessesByDate(
  db: SQLiteDatabase,
  dateLocal: string,
): Promise<number> {
  const { start, end } = localDateToUtcRange(dateLocal);

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM urge_event
     WHERE started_at >= ? AND started_at < ?
       AND outcome = 'success';`,
    [start, end],
  );

  return row?.count ?? 0;
}

/**
 * Counts urge events on a given local date where urge_kind = 'spend'
 * and outcome = 'success' (spend avoided).
 */
export async function countSpendAvoidedByDate(
  db: SQLiteDatabase,
  dateLocal: string,
): Promise<number> {
  const { start, end } = localDateToUtcRange(dateLocal);

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM urge_event
     WHERE started_at >= ? AND started_at < ?
       AND urge_kind = 'spend'
       AND outcome = 'success';`,
    [start, end],
  );

  return row?.count ?? 0;
}

/**
 * Counts urge events with outcome = 'success' within the current calendar week
 * (Monday to today, inclusive) in the device's local timezone.
 *
 * The week start is the most recent Monday (or today if today is Monday).
 * Returns 0 if db returns null.
 */
export async function getWeeklySuccessCount(
  db: SQLiteDatabase,
  todayLocal: string,
): Promise<number> {
  // Compute Monday of the current week in local time.
  const todayDate = new Date(`${todayLocal}T00:00:00`);
  const dayOfWeek = todayDate.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  // Days since Monday: Sun→6, Mon→0, Tue→1, …, Sat→5
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayMs = todayDate.getTime() - daysSinceMonday * 24 * 60 * 60 * 1000;

  const weekStart = new Date(mondayMs).toISOString();
  const weekEnd = new Date(`${todayLocal}T00:00:00`).getTime() + 24 * 60 * 60 * 1000;
  const weekEndIso = new Date(weekEnd).toISOString();

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM urge_event
     WHERE started_at >= ? AND started_at < ?
       AND outcome = 'success';`,
    [weekStart, weekEndIso],
  );

  return row?.count ?? 0;
}

/**
 * Returns all urge events within an inclusive local date range [startDate, endDate],
 * ordered by started_at ascending.
 */
export async function getUrgeEventsInRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<UrgeEvent[]> {
  const rangeStart = localDateToUtcRange(startDate).start;
  const rangeEnd = localDateToUtcRange(endDate).end;

  const rows = await db.getAllAsync<UrgeEventRow>(
    `SELECT * FROM urge_event
     WHERE started_at >= ? AND started_at < ?
     ORDER BY started_at ASC;`,
    [rangeStart, rangeEnd],
  );

  return rows.map(rowToUrgeEvent);
}

// ---------------------------------------------------------------------------
// Aggregation types
// ---------------------------------------------------------------------------

export interface DayOfWeekCount {
  /** 0 = Sunday, 1 = Monday, …, 6 = Saturday */
  dayOfWeek: number;
  count: number;
}

export interface TimeOfDayCount {
  /** 'morning' = 05:00–11:59, 'afternoon' = 12:00–17:59, 'evening' = 18:00–04:59 */
  bucket: 'morning' | 'afternoon' | 'evening';
  count: number;
}

// ---------------------------------------------------------------------------
// Aggregation query helpers
// ---------------------------------------------------------------------------

/**
 * Classifies a UTC ISO-8601 timestamp into a local time-of-day bucket.
 * morning:   local 05:00 – 11:59
 * afternoon: local 12:00 – 17:59
 * evening:   local 18:00 – 04:59 (next day)
 */
function getTimeOfDayBucket(utcIso: string): 'morning' | 'afternoon' | 'evening' {
  const d = new Date(utcIso);
  const hour = d.getHours(); // local hours
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}

/**
 * Returns the count of successful urge events grouped by local day-of-week.
 * Scans all events in DB — intended for lifetime aggregation.
 * Result has exactly 7 entries, one per day-of-week (0=Sun…6=Sat).
 */
export async function getUrgeCountByDayOfWeek(
  db: SQLiteDatabase,
): Promise<DayOfWeekCount[]> {
  const rows = await db.getAllAsync<{ started_at: string }>(
    `SELECT started_at FROM urge_event WHERE outcome = 'success' ORDER BY started_at ASC;`,
    [],
  );

  const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const row of rows) {
    const dow = new Date(row.started_at).getDay(); // 0=Sun..6=Sat
    counts[dow] = (counts[dow] ?? 0) + 1;
  }

  return [0, 1, 2, 3, 4, 5, 6].map((dow) => ({
    dayOfWeek: dow,
    count: counts[dow] ?? 0,
  }));
}

/**
 * Returns the count of successful urge events grouped by local time-of-day bucket.
 * morning / afternoon / evening — see getTimeOfDayBucket for boundaries.
 */
export async function getUrgeCountByTimeOfDay(
  db: SQLiteDatabase,
): Promise<TimeOfDayCount[]> {
  const rows = await db.getAllAsync<{ started_at: string }>(
    `SELECT started_at FROM urge_event WHERE outcome = 'success' ORDER BY started_at ASC;`,
    [],
  );

  const counts: Record<string, number> = { morning: 0, afternoon: 0, evening: 0 };
  for (const row of rows) {
    const bucket = getTimeOfDayBucket(row.started_at);
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }

  return (['morning', 'afternoon', 'evening'] as const).map((bucket) => ({
    bucket,
    count: counts[bucket] ?? 0,
  }));
}

/**
 * Counts the total number of completed panic sessions (protocol_completed = 1).
 * Used to determine how many free resets the user has used.
 * Free tier: 1 reset allowed; 2nd+ reset requires premium.
 */
export async function countCompletedPanicSessions(
  db: SQLiteDatabase,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM urge_event WHERE protocol_completed = 1;`,
    [],
  );
  return row?.count ?? 0;
}

/**
 * Returns the count of successful urge events for the given date range.
 * Used for weekly comparison (this week vs last week).
 */
export async function getSuccessCountInRange(
  db: SQLiteDatabase,
  startDate: string,
  endDate: string,
): Promise<number> {
  const rangeStart = localDateToUtcRange(startDate).start;
  const rangeEnd = localDateToUtcRange(endDate).end;

  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM urge_event
     WHERE started_at >= ? AND started_at < ?
       AND outcome = 'success';`,
    [rangeStart, rangeEnd],
  );

  return row?.count ?? 0;
}
