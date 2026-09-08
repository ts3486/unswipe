// Data export service for the Unmatch app.
//
// Produces a versioned JSON backup of all user data from the local SQLite
// database.  Unlike the analytics layer, this export is a personal backup and
// intentionally includes ALL fields — including `note` and `spend_amount` —
// because the data never leaves the device without explicit user action.
//
// No default exports. TypeScript strict mode.

import * as FileSystem from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Versioned envelope wrapping all exported table data.
 *
 * `tables` key names match the logical domain names used in the app rather
 * than the raw SQLite table names (e.g. `urge_events` not `urge_event`), so
 * the export format remains stable if table names change.
 */
export interface ExportEnvelope {
	/** Schema version — always 1 for V1 exports. */
	version: number;
	/** ISO-8601 UTC timestamp of when the export was generated. */
	exported_at: string;
	/** Semver string matching the app release that produced this backup. */
	app_version: string;
	tables: {
		user_profile: unknown[];
		urge_events: unknown[];
		daily_checkins: unknown[];
		progress: unknown[];
		subscription_state: unknown[];
	};
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const APP_VERSION = "1.0.0";
const BACKUP_FILENAME = "unmatch-backup.json";

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * Reads all rows from every user table and returns a versioned export
 * envelope.
 *
 * All fields are included — this is a personal backup, not an analytics
 * payload.  The `note` and `spend_amount` fields that are excluded from
 * analytics events are intentionally present here.
 *
 * @param db - The initialized SQLiteDatabase instance.
 * @returns A fully populated ExportEnvelope.
 */
export async function gatherExportData(
	db: SQLiteDatabase,
): Promise<ExportEnvelope> {
	const [userProfile, dailyCheckins, urgeEvents, progress, subscriptionState] =
		await Promise.all([
			db.getAllAsync("SELECT * FROM user_profile"),
			db.getAllAsync("SELECT * FROM daily_checkin"),
			db.getAllAsync("SELECT * FROM urge_event"),
			db.getAllAsync("SELECT * FROM progress"),
			db.getAllAsync("SELECT * FROM subscription_state"),
		]);

	return {
		version: 1,
		exported_at: new Date().toISOString(),
		app_version: APP_VERSION,
		tables: {
			user_profile: userProfile,
			urge_events: urgeEvents,
			daily_checkins: dailyCheckins,
			progress: progress,
			subscription_state: subscriptionState,
		},
	};
}

/**
 * Gathers all export data and writes it as JSON to a file in the app's cache
 * directory.
 *
 * The file is suitable for sharing via the native share sheet or saving to
 * Files / Drive.  It is written to `cacheDirectory` rather than
 * `documentDirectory` because the caller is expected to share or copy the
 * file immediately — the cache may be cleared by the OS at any time.
 *
 * @param db - The initialized SQLiteDatabase instance.
 * @returns The URI of the written file (suitable for passing to expo-sharing).
 */
export async function exportToFile(db: SQLiteDatabase): Promise<string> {
	const envelope = await gatherExportData(db);
	const json = JSON.stringify(envelope, null, 2);
	const uri = `${FileSystem.cacheDirectory}${BACKUP_FILENAME}`;
	await FileSystem.writeAsStringAsync(uri, json);
	return uri;
}
