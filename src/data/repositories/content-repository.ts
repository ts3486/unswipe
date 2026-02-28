// Repository for the content and content_progress tables.
// Content rows are inserted once via seedContentIfEmpty(); they are read-only
// at runtime. content_progress tracks per-user completion.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { Content, ContentProgress } from "@/src/domain/types";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Row shapes
// ---------------------------------------------------------------------------

interface ContentRow {
	content_id: string;
	day_index: number;
	title: string;
	body: string;
	action_text: string;
	est_minutes: number;
}

interface ContentProgressRow {
	content_id: string;
	completed_at: string;
}

function rowToContent(row: ContentRow): Content {
	return {
		content_id: row.content_id,
		day_index: row.day_index,
		title: row.title,
		body: row.body,
		action_text: row.action_text,
		est_minutes: row.est_minutes,
	};
}

function rowToContentProgress(row: ContentProgressRow): ContentProgress {
	return {
		content_id: row.content_id,
		completed_at: row.completed_at,
	};
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Returns all content items ordered by day_index ascending.
 */
export async function getAllContent(db: SQLiteDatabase): Promise<Content[]> {
	const rows = await db.getAllAsync<ContentRow>(
		"SELECT * FROM content ORDER BY day_index ASC;",
	);

	return rows.map(rowToContent);
}

/**
 * Returns the content item for the given day_index, or null if not found.
 */
export async function getContentByDay(
	db: SQLiteDatabase,
	dayIndex: number,
): Promise<Content | null> {
	const row = await db.getFirstAsync<ContentRow>(
		"SELECT * FROM content WHERE day_index = ? LIMIT 1;",
		[dayIndex],
	);

	return row !== null ? rowToContent(row) : null;
}

/**
 * Records that the user completed the content item identified by contentId.
 * Uses INSERT OR IGNORE so calling this multiple times is idempotent.
 * completed_at is set to the current UTC ISO-8601 timestamp.
 */
export async function markContentCompleted(
	db: SQLiteDatabase,
	contentId: string,
): Promise<void> {
	const completed_at = new Date().toISOString();

	await db.runAsync(
		`INSERT OR IGNORE INTO content_progress (content_id, completed_at)
     VALUES (?, ?);`,
		[contentId, completed_at],
	);
}

/**
 * Returns all content_progress rows (completed content items) ordered by
 * completed_at ascending.
 */
export async function getContentProgress(
	db: SQLiteDatabase,
): Promise<ContentProgress[]> {
	const rows = await db.getAllAsync<ContentProgressRow>(
		"SELECT * FROM content_progress ORDER BY completed_at ASC;",
	);

	return rows.map(rowToContentProgress);
}

/**
 * Returns true if any content item was completed on the given local date
 * (YYYY-MM-DD). Used to derive dailyTaskCompleted for day-success calculation.
 */
export async function hasContentCompletedOnDate(
	db: SQLiteDatabase,
	dateLocal: string,
): Promise<boolean> {
	const row = await db.getFirstAsync<{ count: number }>(
		"SELECT COUNT(*) AS count FROM content_progress WHERE DATE(completed_at) = ?;",
		[dateLocal],
	);
	return (row?.count ?? 0) > 0;
}

/**
 * Returns true if the given content item has been marked as completed.
 */
export async function isContentCompleted(
	db: SQLiteDatabase,
	contentId: string,
): Promise<boolean> {
	const row = await db.getFirstAsync<{ count: number }>(
		"SELECT COUNT(*) AS count FROM content_progress WHERE content_id = ?;",
		[contentId],
	);

	return (row?.count ?? 0) > 0;
}
