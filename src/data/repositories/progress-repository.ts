// Repository for the progress table.
// date_local (YYYY-MM-DD) is the primary key.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { Progress } from "@/src/domain/types";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

interface ProgressRow {
	date_local: string;
	streak_current: number;
	resist_count_total: number;
	tree_level: number;
	last_success_date: string | null;
	spend_avoided_count_total: number;
}

function rowToProgress(row: ProgressRow): Progress {
	return {
		date_local: row.date_local,
		streak_current: row.streak_current,
		meditation_count_total: row.resist_count_total,
		tree_level: row.tree_level,
		last_success_date: row.last_success_date,
		spend_avoided_count_total: row.spend_avoided_count_total,
	};
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Returns the progress record for the given local date, or null if it does
 * not exist yet.
 */
export async function getProgress(
	db: SQLiteDatabase,
	dateLocal: string,
): Promise<Progress | null> {
	const row = await db.getFirstAsync<ProgressRow>(
		"SELECT * FROM progress WHERE date_local = ?;",
		[dateLocal],
	);

	return row !== null ? rowToProgress(row) : null;
}

/**
 * Returns the most recently dated progress record, or null if the table is
 * empty.
 */
export async function getLatestProgress(
	db: SQLiteDatabase,
): Promise<Progress | null> {
	const row = await db.getFirstAsync<ProgressRow>(
		"SELECT * FROM progress ORDER BY date_local DESC LIMIT 1;",
	);

	return row !== null ? rowToProgress(row) : null;
}

/**
 * Inserts or replaces the progress record for progress.date_local.
 * Uses INSERT OR REPLACE so callers do not need to distinguish create vs update.
 */
export async function upsertProgress(
	db: SQLiteDatabase,
	progress: Progress,
): Promise<void> {
	await db.runAsync(
		`INSERT OR REPLACE INTO progress
       (date_local, streak_current, resist_count_total, tree_level,
        last_success_date, spend_avoided_count_total)
     VALUES (?, ?, ?, ?, ?, ?);`,
		[
			progress.date_local,
			progress.streak_current,
			progress.meditation_count_total,
			progress.tree_level,
			progress.last_success_date ?? null,
			progress.spend_avoided_count_total,
		],
	);
}

/**
 * Returns all date_local values present in the progress table in ascending
 * chronological order.
 */
export async function getAllProgressDates(
	db: SQLiteDatabase,
): Promise<string[]> {
	const rows = await db.getAllAsync<{ date_local: string }>(
		"SELECT date_local FROM progress ORDER BY date_local ASC;",
	);

	return rows.map((r) => r.date_local);
}
