// Repository for the daily_checkin table.
// All functions accept a SQLiteDatabase instance directly.
// No default exports. TypeScript strict mode.

import type { DailyCheckin } from "@/src/domain/types";
import { randomUUID } from "@/src/utils/uuid";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Row shape
// ---------------------------------------------------------------------------

interface DailyCheckinRow {
	id: string;
	date_local: string;
	mood: number;
	fatigue: number;
	urge: number;
	note: string | null;
	opened_at_night: number | null;
	spent_today: number | null;
	spent_amount: number | null;
}

function rowToCheckin(row: DailyCheckinRow): DailyCheckin {
	return {
		id: row.id,
		date_local: row.date_local,
		mood: row.mood,
		fatigue: row.fatigue,
		urge: row.urge,
		note: row.note,
		opened_at_night: row.opened_at_night,
		spent_today: row.spent_today,
		spent_amount: row.spent_amount,
	};
}

// ---------------------------------------------------------------------------
// Repository functions
// ---------------------------------------------------------------------------

/**
 * Inserts a new daily check-in.
 * Generates a UUID automatically.
 * Returns the full inserted record.
 */
export async function createCheckin(
	db: SQLiteDatabase,
	checkin: Omit<DailyCheckin, "id">,
): Promise<DailyCheckin> {
	const id = randomUUID();

	await db.runAsync(
		`INSERT INTO daily_checkin
       (id, date_local, mood, fatigue, urge, note,
        opened_at_night, spent_today, spent_amount)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
		[
			id,
			checkin.date_local,
			checkin.mood,
			checkin.fatigue,
			checkin.urge,
			checkin.note ?? null,
			checkin.opened_at_night ?? null,
			checkin.spent_today ?? null,
			checkin.spent_amount ?? null,
		],
	);

	return { id, ...checkin };
}

/**
 * Returns the check-in for the given local date (YYYY-MM-DD), or null if
 * none exists.
 */
export async function getCheckinByDate(
	db: SQLiteDatabase,
	dateLocal: string,
): Promise<DailyCheckin | null> {
	const row = await db.getFirstAsync<DailyCheckinRow>(
		"SELECT * FROM daily_checkin WHERE date_local = ? LIMIT 1;",
		[dateLocal],
	);

	return row !== null ? rowToCheckin(row) : null;
}

/**
 * Returns all check-ins within an inclusive local date range [startDate, endDate],
 * ordered by date_local ascending.
 */
export async function getCheckinsInRange(
	db: SQLiteDatabase,
	startDate: string,
	endDate: string,
): Promise<DailyCheckin[]> {
	const rows = await db.getAllAsync<DailyCheckinRow>(
		`SELECT * FROM daily_checkin
     WHERE date_local >= ? AND date_local <= ?
     ORDER BY date_local ASC;`,
		[startDate, endDate],
	);

	return rows.map(rowToCheckin);
}

/**
 * Returns all check-ins ordered by date_local descending (newest first).
 * Used to power the check-in history list.
 */
export async function getAllCheckins(
	db: SQLiteDatabase,
): Promise<DailyCheckin[]> {
	const rows = await db.getAllAsync<DailyCheckinRow>(
		"SELECT * FROM daily_checkin ORDER BY date_local DESC;",
	);

	return rows.map(rowToCheckin);
}

/**
 * Returns all distinct date_local values from the daily_checkin table,
 * ordered ascending. Used for streak calculation based on check-ins.
 */
export async function getAllCheckinDates(
	db: SQLiteDatabase,
): Promise<string[]> {
	const rows = await db.getAllAsync<{ date_local: string }>(
		"SELECT DISTINCT date_local FROM daily_checkin ORDER BY date_local ASC;",
	);

	return rows.map((r) => r.date_local);
}
