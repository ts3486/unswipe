// Unit tests for src/services/data-import.ts.
// TDD: written before the implementation.
// Covers validateImportData and importData.
// Privacy rule: no test forwards note or spend_amount.

import { importData, validateImportData } from "@/src/services/data-import";
import type { ImportEnvelope } from "@/src/services/data-import";

// ---------------------------------------------------------------------------
// Mock DB factory
// ---------------------------------------------------------------------------

function createMockDb() {
	const execCalls: string[] = [];
	const runCalls: Array<{ sql: string; params: unknown[] }> = [];
	return {
		withExclusiveTransactionAsync: jest.fn(
			async (cb: (txn: { runAsync: jest.Mock }) => Promise<void>) => {
				const txn = {
					runAsync: jest.fn(async (sql: string, params: unknown[]) => {
						runCalls.push({ sql, params });
					}),
				};
				await cb(txn);
			},
		),
		_execCalls: execCalls,
		_runCalls: runCalls,
	};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidEnvelope(
	overrides: Partial<ImportEnvelope> = {},
): ImportEnvelope {
	return {
		version: 1,
		exported_at: "2026-02-28T00:00:00.000Z",
		app_version: "1.0.0",
		tables: {
			user_profile: [{ id: "singleton", locale: "en" }],
			urge_events: [
				{ id: "u1", urge_kind: "swipe" },
				{ id: "u2", urge_kind: "check" },
				{ id: "u3", urge_kind: "spend" },
			],
			daily_checkins: [
				{ id: "c1", date_local: "2026-02-27" },
				{ id: "c2", date_local: "2026-02-28" },
			],
			progress: [
				{ date_local: "2026-02-24" },
				{ date_local: "2026-02-25" },
				{ date_local: "2026-02-26" },
				{ date_local: "2026-02-27" },
				{ date_local: "2026-02-28" },
			],
			subscription_state: [{ id: "singleton", status: "active" }],
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// validateImportData — valid data
// ---------------------------------------------------------------------------

describe("validateImportData — valid data", () => {
	it("returns correct table counts for a fully-populated envelope", () => {
		const envelope = makeValidEnvelope();
		const counts = validateImportData(envelope);

		expect(counts).toEqual({
			user_profile: 1,
			urge_events: 3,
			daily_checkins: 2,
			progress: 5,
			subscription_state: 1,
		});
	});

	it("returns zero counts when all tables are empty arrays", () => {
		const envelope = makeValidEnvelope({
			tables: {
				user_profile: [],
				urge_events: [],
				daily_checkins: [],
				progress: [],
				subscription_state: [],
			},
		});
		const counts = validateImportData(envelope);

		expect(counts).toEqual({
			user_profile: 0,
			urge_events: 0,
			daily_checkins: 0,
			progress: 0,
			subscription_state: 0,
		});
	});
});

// ---------------------------------------------------------------------------
// validateImportData — invalid version
// ---------------------------------------------------------------------------

describe("validateImportData — bad version", () => {
	it("throws when version is 0", () => {
		const input: unknown = { ...makeValidEnvelope(), version: 0 };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when version is 2 (unsupported future version)", () => {
		const input: unknown = { ...makeValidEnvelope(), version: 2 };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when version is a string", () => {
		const input: unknown = { ...makeValidEnvelope(), version: "1" };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when version is missing", () => {
		const { version: _v, ...rest } = makeValidEnvelope();
		const input: unknown = rest;
		expect(() => validateImportData(input)).toThrow();
	});

	it("error message mentions version", () => {
		const input: unknown = { ...makeValidEnvelope(), version: 99 };
		expect(() => validateImportData(input)).toThrow(/version/i);
	});
});

// ---------------------------------------------------------------------------
// validateImportData — missing tables key
// ---------------------------------------------------------------------------

describe("validateImportData — missing tables key", () => {
	it("throws when tables key is absent", () => {
		const input: unknown = {
			version: 1,
			exported_at: "2026-02-28T00:00:00.000Z",
			app_version: "1.0.0",
		};
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when tables is null", () => {
		const input: unknown = { ...makeValidEnvelope(), tables: null };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when tables is a string instead of an object", () => {
		const input: unknown = { ...makeValidEnvelope(), tables: "bad" };
		expect(() => validateImportData(input)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// validateImportData — malformed JSON (not an object)
// ---------------------------------------------------------------------------

describe("validateImportData — malformed / non-object input", () => {
	it("throws for null input", () => {
		expect(() => validateImportData(null)).toThrow();
	});

	it("throws for a bare string", () => {
		expect(() => validateImportData("{}")).toThrow();
	});

	it("throws for a number", () => {
		expect(() => validateImportData(42)).toThrow();
	});

	it("throws for an array", () => {
		expect(() => validateImportData([])).toThrow();
	});

	it("throws for undefined", () => {
		expect(() => validateImportData(undefined)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// validateImportData — missing required table keys
// ---------------------------------------------------------------------------

describe("validateImportData — missing required table keys", () => {
	it("throws when user_profile key is absent", () => {
		const { user_profile: _up, ...rest } = makeValidEnvelope().tables;
		const input: unknown = { ...makeValidEnvelope(), tables: rest };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when urge_events key is absent", () => {
		const { urge_events: _ue, ...rest } = makeValidEnvelope().tables;
		const input: unknown = { ...makeValidEnvelope(), tables: rest };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when daily_checkins key is absent", () => {
		const { daily_checkins: _dc, ...rest } = makeValidEnvelope().tables;
		const input: unknown = { ...makeValidEnvelope(), tables: rest };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when progress key is absent", () => {
		const { progress: _p, ...rest } = makeValidEnvelope().tables;
		const input: unknown = { ...makeValidEnvelope(), tables: rest };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when subscription_state key is absent", () => {
		const { subscription_state: _ss, ...rest } = makeValidEnvelope().tables;
		const input: unknown = { ...makeValidEnvelope(), tables: rest };
		expect(() => validateImportData(input)).toThrow();
	});

	it("throws when a table value is not an array", () => {
		const input: unknown = {
			...makeValidEnvelope(),
			tables: {
				...makeValidEnvelope().tables,
				user_profile: { id: "singleton" }, // object, not array
			},
		};
		expect(() => validateImportData(input)).toThrow();
	});
});

// ---------------------------------------------------------------------------
// importData — transaction and DELETE calls
// ---------------------------------------------------------------------------

describe("importData — DELETE inside transaction", () => {
	it("calls withExclusiveTransactionAsync once", async () => {
		const db = createMockDb();
		const envelope = makeValidEnvelope();
		await importData(db as never, envelope);

		expect(db.withExclusiveTransactionAsync).toHaveBeenCalledTimes(1);
	});

	it("issues a DELETE for every table (5 total)", async () => {
		const db = createMockDb();
		const envelope = makeValidEnvelope();
		await importData(db as never, envelope);

		const deleteCalls = db._runCalls.filter((c) =>
			c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(deleteCalls).toHaveLength(5);
	});

	it("deletes the user_profile table", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const found = db._runCalls.some(
			(c) =>
				c.sql.includes("user_profile") &&
				c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(found).toBe(true);
	});

	it("deletes the urge_event table (mapped name)", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const found = db._runCalls.some(
			(c) =>
				c.sql.includes("urge_event") &&
				c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(found).toBe(true);
	});

	it("deletes the daily_checkin table (mapped name)", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const found = db._runCalls.some(
			(c) =>
				c.sql.includes("daily_checkin") &&
				c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(found).toBe(true);
	});

	it("deletes the progress table", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const found = db._runCalls.some(
			(c) =>
				c.sql.includes("progress") &&
				c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(found).toBe(true);
	});

	it("deletes the subscription_state table", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const found = db._runCalls.some(
			(c) =>
				c.sql.includes("subscription_state") &&
				c.sql.trim().toUpperCase().startsWith("DELETE"),
		);
		expect(found).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// importData — INSERT calls
// ---------------------------------------------------------------------------

describe("importData — INSERT rows", () => {
	it("inserts 1 user_profile row", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const inserts = db._runCalls.filter(
			(c) =>
				c.sql.includes("user_profile") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(inserts).toHaveLength(1);
	});

	it("inserts 3 urge_event rows (mapped from urge_events)", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const inserts = db._runCalls.filter(
			(c) =>
				c.sql.includes("urge_event") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(inserts).toHaveLength(3);
	});

	it("inserts 2 daily_checkin rows (mapped from daily_checkins)", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const inserts = db._runCalls.filter(
			(c) =>
				c.sql.includes("daily_checkin") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(inserts).toHaveLength(2);
	});

	it("inserts 5 progress rows", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const inserts = db._runCalls.filter(
			(c) =>
				/\bprogress\b/.test(c.sql) &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(inserts).toHaveLength(5);
	});

	it("inserts 1 subscription_state row", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const inserts = db._runCalls.filter(
			(c) =>
				c.sql.includes("subscription_state") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(inserts).toHaveLength(1);
	});

	it("passes row values as parameterized query params", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		// user_profile has {id: "singleton", locale: "en"} — params must include these values
		const insert = db._runCalls.find(
			(c) =>
				c.sql.includes("user_profile") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(insert).toBeDefined();
		expect(insert!.params).toContain("singleton");
		expect(insert!.params).toContain("en");
	});
});

// ---------------------------------------------------------------------------
// importData — return value
// ---------------------------------------------------------------------------

describe("importData — return value", () => {
	it("returns void (undefined) on success", async () => {
		const db = createMockDb();
		const result = await importData(db as never, makeValidEnvelope());
		expect(result).toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// importData — table name mapping
// ---------------------------------------------------------------------------

describe("importData — table name mapping", () => {
	it("uses DB table name urge_event (not urge_events) for inserts", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		// Every INSERT must reference 'urge_event' not 'urge_events'
		const wrongName = db._runCalls.some(
			(c) =>
				c.sql.includes("urge_events") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(wrongName).toBe(false);
	});

	it("uses DB table name daily_checkin (not daily_checkins) for inserts", async () => {
		const db = createMockDb();
		await importData(db as never, makeValidEnvelope());

		const wrongName = db._runCalls.some(
			(c) =>
				c.sql.includes("daily_checkins") &&
				c.sql.trim().toUpperCase().startsWith("INSERT"),
		);
		expect(wrongName).toBe(false);
	});
});
