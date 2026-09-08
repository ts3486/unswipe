// data-import.ts — validates and imports a JSON export envelope into SQLite.
//
// ATOMICITY: all writes happen inside a single withExclusiveTransactionAsync
// call so a partial import is never left in the database.
//
// TABLE NAME MAPPING:
//   envelope key "urge_events"    → DB table "urge_event"
//   envelope key "daily_checkins" → DB table "daily_checkin"
//   all others match directly.
//
// No default exports. TypeScript strict mode.

import type { SQLiteBindValue, SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The keys that must be present in the envelope's tables object. */
const REQUIRED_TABLE_KEYS = [
	"user_profile",
	"urge_events",
	"daily_checkins",
	"progress",
	"subscription_state",
] as const;

type RequiredTableKey = (typeof REQUIRED_TABLE_KEYS)[number];

/**
 * The import envelope produced by the data-export service.
 * Defined locally to avoid a circular dependency; must stay in sync with
 * the export service's ExportEnvelope shape.
 */
export interface ImportEnvelope {
	version: number;
	exported_at: string;
	app_version: string;
	tables: Record<RequiredTableKey, unknown[]>;
}

/**
 * Row counts per table returned by validateImportData.
 * Used by confirmation UI to show the user what will be imported.
 */
export interface ImportTableCounts {
	user_profile: number;
	urge_events: number;
	daily_checkins: number;
	progress: number;
	subscription_state: number;
}

// ---------------------------------------------------------------------------
// Table name mapping: envelope key → DB table name
// ---------------------------------------------------------------------------

const TABLE_NAME_MAP: Record<RequiredTableKey, string> = {
	user_profile: "user_profile",
	urge_events: "urge_event",
	daily_checkins: "daily_checkin",
	progress: "progress",
	subscription_state: "subscription_state",
};

// ---------------------------------------------------------------------------
// validateImportData
// ---------------------------------------------------------------------------

/**
 * Validates that `json` is a well-formed import envelope.
 *
 * Checks:
 *   1. Must be a plain object (not null, array, string, etc.)
 *   2. `version` must be exactly 1
 *   3. `tables` key must be present and be a plain object
 *   4. All 5 required table keys must be present and each value must be an array
 *
 * @param json - The parsed (or unparsed) value from the import file.
 * @returns Counts of rows per table, suitable for a confirmation UI.
 * @throws Error with a descriptive message for any validation failure.
 */
export function validateImportData(json: unknown): ImportTableCounts {
	// 1. Must be a plain, non-null, non-array object.
	if (
		json === null ||
		json === undefined ||
		typeof json !== "object" ||
		Array.isArray(json)
	) {
		throw new Error(
			"Import failed: data must be a JSON object, got " +
				(json === null ? "null" : Array.isArray(json) ? "array" : typeof json),
		);
	}

	const obj = json as Record<string, unknown>;

	// 2. version must be exactly 1.
	if (!("version" in obj)) {
		throw new Error(
			'Import failed: missing required field "version". Is this a valid Unmatch export?',
		);
	}
	if (obj["version"] !== 1) {
		throw new Error(
			`Import failed: unsupported version "${String(obj["version"])}". ` +
				"Only version 1 exports can be imported by this app.",
		);
	}

	// 3. tables must be present and be a plain object.
	if (!("tables" in obj)) {
		throw new Error(
			'Import failed: missing required field "tables". Is this a valid Unmatch export?',
		);
	}
	const tables = obj["tables"];
	if (
		tables === null ||
		tables === undefined ||
		typeof tables !== "object" ||
		Array.isArray(tables)
	) {
		throw new Error(
			'Import failed: "tables" must be an object, got ' +
				(tables === null
					? "null"
					: Array.isArray(tables)
						? "array"
						: typeof tables),
		);
	}

	const tablesObj = tables as Record<string, unknown>;

	// 4. All 5 required keys must be present and must be arrays.
	for (const key of REQUIRED_TABLE_KEYS) {
		if (!(key in tablesObj)) {
			throw new Error(
				`Import failed: missing required table key "${key}" in the export file.`,
			);
		}
		if (!Array.isArray(tablesObj[key])) {
			throw new Error(
				`Import failed: table "${key}" must be an array, ` +
					`got ${typeof tablesObj[key]}.`,
			);
		}
	}

	// All checks passed — build and return the count map.
	return {
		user_profile: (tablesObj["user_profile"] as unknown[]).length,
		urge_events: (tablesObj["urge_events"] as unknown[]).length,
		daily_checkins: (tablesObj["daily_checkins"] as unknown[]).length,
		progress: (tablesObj["progress"] as unknown[]).length,
		subscription_state: (tablesObj["subscription_state"] as unknown[]).length,
	};
}

// ---------------------------------------------------------------------------
// importData
// ---------------------------------------------------------------------------

/**
 * Replaces all local data with the contents of `envelope`, atomically.
 *
 * The operation runs inside `db.withExclusiveTransactionAsync` so that a
 * crash or error mid-import leaves the database in its original state rather
 * than partially overwritten.
 *
 * Steps (inside the transaction):
 *   1. DELETE all rows from every table.
 *   2. INSERT all rows from each table in the envelope using parameterized queries.
 *
 * @param db       - The open SQLiteDatabase instance.
 * @param envelope - A validated ImportEnvelope (call validateImportData first).
 * @returns void on success; throws if the transaction fails.
 */
export async function importData(
	db: SQLiteDatabase,
	envelope: ImportEnvelope,
): Promise<void> {
	await db.withExclusiveTransactionAsync(async (txn) => {
		// Step 1: delete all rows from every table.
		// We iterate in a fixed order so the sequence is deterministic.
		for (const envelopeKey of REQUIRED_TABLE_KEYS) {
			const dbTable = TABLE_NAME_MAP[envelopeKey];
			await txn.runAsync(`DELETE FROM ${dbTable}`, []);
		}

		// Step 2: insert rows from each table.
		for (const envelopeKey of REQUIRED_TABLE_KEYS) {
			const dbTable = TABLE_NAME_MAP[envelopeKey];
			const rows = envelope.tables[envelopeKey];

			// Skip empty tables — no INSERT needed.
			if (rows.length === 0) {
				continue;
			}

			// Build INSERT SQL from the first row's keys.
			// All rows in a table must share the same schema, which is guaranteed
			// by the export service.
			const firstRow = rows[0];
			if (
				firstRow === null ||
				typeof firstRow !== "object" ||
				Array.isArray(firstRow)
			) {
				throw new Error(
					`Import failed: row in "${envelopeKey}" is not a plain object.`,
				);
			}

			const columns = Object.keys(firstRow as Record<string, unknown>);
			const placeholders = columns.map(() => "?").join(", ");
			const columnList = columns.join(", ");
			const sql = `INSERT OR REPLACE INTO ${dbTable} (${columnList}) VALUES (${placeholders})`;

			for (const row of rows) {
				if (row === null || typeof row !== "object" || Array.isArray(row)) {
					throw new Error(
						`Import failed: encountered a non-object row in "${envelopeKey}".`,
					);
				}
				const rowObj = row as Record<string, unknown>;
				// Cast each column value to SQLiteBindValue.
				// Export rows only ever contain primitives (string | number | null |
				// boolean) — complex objects are not stored in the DB schema.
				const params = columns.map(
					(col) => (rowObj[col] ?? null) as SQLiteBindValue,
				);
				await txn.runAsync(sql, params);
			}
		}
	});
}
