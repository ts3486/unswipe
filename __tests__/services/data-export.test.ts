// Unit tests for src/services/data-export.ts.
// TDD: these tests define the expected behaviour before the implementation.
//
// The data export is a personal backup — it intentionally includes ALL fields,
// including `note` and `spend_amount`, unlike the analytics layer which
// structurally excludes those fields for privacy reasons.

import { exportToFile, gatherExportData } from "@/src/services/data-export";
import type { ExportEnvelope } from "@/src/services/data-export";
import * as FileSystem from "expo-file-system/legacy";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

function createMockDb(): Pick<SQLiteDatabase, "getAllAsync"> {
	return {
		getAllAsync: jest.fn().mockResolvedValue([]),
	};
}

// ---------------------------------------------------------------------------
// gatherExportData — envelope shape
// ---------------------------------------------------------------------------

describe("gatherExportData() — envelope shape", () => {
	it("returns an envelope with version = 1", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(envelope.version).toBe(1);
	});

	it("returns an envelope with exported_at as an ISO-8601 string", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const before = new Date().toISOString();
		const envelope = await gatherExportData(db);
		const after = new Date().toISOString();

		// Must be parseable as a date.
		const parsed = new Date(envelope.exported_at);
		expect(Number.isNaN(parsed.getTime())).toBe(false);

		// Must be within the test window.
		expect(envelope.exported_at >= before).toBe(true);
		expect(envelope.exported_at <= after).toBe(true);
	});

	it("returns an envelope with app_version = '1.0.0'", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(envelope.app_version).toBe("1.0.0");
	});

	it("returns a tables key containing all 5 expected table names", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		const tableKeys = Object.keys(envelope.tables).sort();
		expect(tableKeys).toEqual([
			"daily_checkins",
			"progress",
			"subscription_state",
			"urge_events",
			"user_profile",
		]);
	});

	it("tables.user_profile is an array", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(Array.isArray(envelope.tables.user_profile)).toBe(true);
	});

	it("tables.urge_events is an array", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(Array.isArray(envelope.tables.urge_events)).toBe(true);
	});

	it("tables.daily_checkins is an array", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(Array.isArray(envelope.tables.daily_checkins)).toBe(true);
	});

	it("tables.progress is an array", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(Array.isArray(envelope.tables.progress)).toBe(true);
	});

	it("tables.subscription_state is an array", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(Array.isArray(envelope.tables.subscription_state)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// gatherExportData — DB queries
// ---------------------------------------------------------------------------

describe("gatherExportData() — database queries", () => {
	it("calls db.getAllAsync exactly 5 times (one per table)", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		expect(db.getAllAsync).toHaveBeenCalledTimes(5);
	});

	it("queries SELECT * FROM user_profile", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		const calls = (db.getAllAsync as jest.Mock).mock.calls as [string][];
		const sqls = calls.map(([sql]) => sql);
		expect(sqls.some((s) => /SELECT \* FROM user_profile/i.test(s))).toBe(true);
	});

	it("queries SELECT * FROM daily_checkin", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		const calls = (db.getAllAsync as jest.Mock).mock.calls as [string][];
		const sqls = calls.map(([sql]) => sql);
		expect(sqls.some((s) => /SELECT \* FROM daily_checkin/i.test(s))).toBe(
			true,
		);
	});

	it("queries SELECT * FROM urge_event", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		const calls = (db.getAllAsync as jest.Mock).mock.calls as [string][];
		const sqls = calls.map(([sql]) => sql);
		expect(sqls.some((s) => /SELECT \* FROM urge_event/i.test(s))).toBe(true);
	});

	it("queries SELECT * FROM progress", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		const calls = (db.getAllAsync as jest.Mock).mock.calls as [string][];
		const sqls = calls.map(([sql]) => sql);
		expect(sqls.some((s) => /SELECT \* FROM progress/i.test(s))).toBe(true);
	});

	it("queries SELECT * FROM subscription_state", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await gatherExportData(db);
		const calls = (db.getAllAsync as jest.Mock).mock.calls as [string][];
		const sqls = calls.map(([sql]) => sql);
		expect(sqls.some((s) => /SELECT \* FROM subscription_state/i.test(s))).toBe(
			true,
		);
	});
});

// ---------------------------------------------------------------------------
// gatherExportData — all fields included (personal backup, unlike analytics)
// ---------------------------------------------------------------------------

describe("gatherExportData() — all fields included in backup", () => {
	it("includes note field from daily_checkin rows", async () => {
		const mockRow = {
			id: "ci-1",
			date_local: "2026-02-28",
			mood: 3,
			fatigue: 2,
			urge: 4,
			note: "Feeling tempted today",
			opened_at_night: 0,
			spent_today: 0,
			spent_amount: null,
		};
		const db = {
			getAllAsync: jest.fn().mockImplementation((sql: string) => {
				if (/daily_checkin/i.test(sql)) {
					return Promise.resolve([mockRow]);
				}
				return Promise.resolve([]);
			}),
		} as unknown as SQLiteDatabase;

		const envelope = await gatherExportData(db);
		const rows = envelope.tables.daily_checkins as (typeof mockRow)[];
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveProperty("note", "Feeling tempted today");
	});

	it("includes spend_amount field from daily_checkin rows", async () => {
		const mockRow = {
			id: "ci-2",
			date_local: "2026-02-28",
			mood: 2,
			fatigue: 3,
			urge: 5,
			note: null,
			opened_at_night: 1,
			spent_today: 1,
			spend_amount: 2500,
		};
		const db = {
			getAllAsync: jest.fn().mockImplementation((sql: string) => {
				if (/daily_checkin/i.test(sql)) {
					return Promise.resolve([mockRow]);
				}
				return Promise.resolve([]);
			}),
		} as unknown as SQLiteDatabase;

		const envelope = await gatherExportData(db);
		const rows = envelope.tables.daily_checkins as (typeof mockRow)[];
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveProperty("spend_amount", 2500);
	});

	it("includes spend_amount field from urge_event rows", async () => {
		const mockRow = {
			id: "ue-1",
			started_at: "2026-02-28T10:00:00Z",
			from_screen: "home",
			urge_level: 4,
			protocol_completed: 1,
			urge_kind: "spend",
			action_type: "breathing",
			action_id: "breathing_60",
			outcome: "success",
			trigger_tag: "bored",
			spend_category: "iap",
			spend_item_type: "gems",
			spend_amount: 999,
		};
		const db = {
			getAllAsync: jest.fn().mockImplementation((sql: string) => {
				if (/urge_event/i.test(sql)) {
					return Promise.resolve([mockRow]);
				}
				return Promise.resolve([]);
			}),
		} as unknown as SQLiteDatabase;

		const envelope = await gatherExportData(db);
		const rows = envelope.tables.urge_events as (typeof mockRow)[];
		expect(rows).toHaveLength(1);
		expect(rows[0]).toHaveProperty("spend_amount", 999);
	});
});

// ---------------------------------------------------------------------------
// gatherExportData — row passthrough (rows returned as-is from DB)
// ---------------------------------------------------------------------------

describe("gatherExportData() — row passthrough", () => {
	it("passes user_profile rows through unchanged", async () => {
		const mockRow = {
			id: "profile-1",
			created_at: "2026-01-01T00:00:00Z",
			locale: "en",
			notification_style: "normal",
			plan_selected: null,
			goal_type: "reduce_swipe",
			spending_budget_weekly: null,
			spending_budget_daily: null,
			spending_limit_mode: null,
		};
		const db = {
			getAllAsync: jest.fn().mockImplementation((sql: string) => {
				if (/user_profile/i.test(sql)) {
					return Promise.resolve([mockRow]);
				}
				return Promise.resolve([]);
			}),
		} as unknown as SQLiteDatabase;

		const envelope = await gatherExportData(db);
		expect(envelope.tables.user_profile).toEqual([mockRow]);
	});

	it("passes progress rows through unchanged", async () => {
		const mockRow = {
			date_local: "2026-02-28",
			streak_current: 5,
			resist_count_total: 12,
			tree_level: 3,
			last_success_date: "2026-02-27",
			spend_avoided_count_total: 4,
		};
		const db = {
			getAllAsync: jest.fn().mockImplementation((sql: string) => {
				if (/FROM progress/i.test(sql)) {
					return Promise.resolve([mockRow]);
				}
				return Promise.resolve([]);
			}),
		} as unknown as SQLiteDatabase;

		const envelope = await gatherExportData(db);
		expect(envelope.tables.progress).toEqual([mockRow]);
	});

	it("returns empty arrays when tables have no rows", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		expect(envelope.tables.user_profile).toEqual([]);
		expect(envelope.tables.urge_events).toEqual([]);
		expect(envelope.tables.daily_checkins).toEqual([]);
		expect(envelope.tables.progress).toEqual([]);
		expect(envelope.tables.subscription_state).toEqual([]);
	});
});

// ---------------------------------------------------------------------------
// ExportEnvelope type — structural check
// ---------------------------------------------------------------------------

describe("ExportEnvelope type", () => {
	it("is assignable from a valid object", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const envelope = await gatherExportData(db);
		// TypeScript type assignment check — if this compiles, the shape is correct.
		const typed: ExportEnvelope = envelope;
		expect(typed).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// exportToFile — writes JSON and returns a URI
// ---------------------------------------------------------------------------

describe("exportToFile()", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("calls FileSystem.writeAsStringAsync exactly once", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		expect(FileSystem.writeAsStringAsync).toHaveBeenCalledTimes(1);
	});

	it("writes to a path under cacheDirectory", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		const [uri] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		expect(uri).toContain(FileSystem.cacheDirectory);
	});

	it("returns the file URI that was written to", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		const result = await exportToFile(db);
		const [uri] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		expect(result).toBe(uri);
	});

	it("writes valid JSON content", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		const [, content] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		expect(() => JSON.parse(content)).not.toThrow();
	});

	it("written JSON parses to an object with version = 1", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		const [, content] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		const parsed = JSON.parse(content) as ExportEnvelope;
		expect(parsed.version).toBe(1);
	});

	it("written JSON includes all 5 table keys", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		const [, content] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		const parsed = JSON.parse(content) as ExportEnvelope;
		const keys = Object.keys(parsed.tables).sort();
		expect(keys).toEqual([
			"daily_checkins",
			"progress",
			"subscription_state",
			"urge_events",
			"user_profile",
		]);
	});

	it("uses the filename 'unmatch-backup.json'", async () => {
		const db = createMockDb() as unknown as SQLiteDatabase;
		await exportToFile(db);
		const [uri] = (FileSystem.writeAsStringAsync as jest.Mock).mock
			.calls[0] as [string, string];
		expect(uri).toMatch(/unmatch-backup\.json$/);
	});
});
