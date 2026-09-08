// Unit tests for src/data/repositories/checkin-repository.ts.
// The SQLiteDatabase is mocked so tests run in Node without native modules.

import {
	createCheckin,
	getAllCheckins,
	getCheckinByDate,
	getCheckinsInRange,
} from "@/src/data/repositories/checkin-repository";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// SQLiteDatabase mock factory
// ---------------------------------------------------------------------------

function makeMockDb(
	overrides?: Partial<{
		getFirstAsync: jest.Mock;
		getAllAsync: jest.Mock;
		runAsync: jest.Mock;
	}>,
): SQLiteDatabase {
	return {
		getFirstAsync: jest.fn().mockResolvedValue(null),
		getAllAsync: jest.fn().mockResolvedValue([]),
		runAsync: jest.fn().mockResolvedValue(undefined),
		...overrides,
	} as unknown as SQLiteDatabase;
}

// ---------------------------------------------------------------------------
// createCheckin
// ---------------------------------------------------------------------------

describe("createCheckin", () => {
	it("calls db.runAsync exactly once", async () => {
		const db = makeMockDb();
		await createCheckin(db, {
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 2,
			urge: 4,
			note: null,
			opened_at_night: null,
			spent_today: null,
			spent_amount: null,
		});
		expect(db.runAsync).toHaveBeenCalledTimes(1);
	});

	it("SQL uses INSERT INTO daily_checkin", async () => {
		const db = makeMockDb();
		await createCheckin(db, {
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 2,
			urge: 4,
			note: null,
			opened_at_night: null,
			spent_today: null,
			spent_amount: null,
		});
		const [sql] = (db.runAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/INSERT INTO daily_checkin/i);
	});

	it("returns the inserted checkin with the generated UUID", async () => {
		const db = makeMockDb();
		const input = {
			date_local: "2026-02-18",
			mood: 4,
			fatigue: 2,
			urge: 3,
			note: "Feeling ok",
			opened_at_night: 0 as const,
			spent_today: 0 as const,
			spent_amount: null,
		};
		const result = await createCheckin(db, input);
		// ID is a generated UUID — verify it is a non-empty string
		expect(typeof result.id).toBe("string");
		expect(result.id.length).toBeGreaterThan(0);
		expect(result.date_local).toBe("2026-02-18");
		expect(result.mood).toBe(4);
		expect(result.note).toBe("Feeling ok");
	});

	it("converts null note to null in DB params", async () => {
		const db = makeMockDb();
		await createCheckin(db, {
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 3,
			urge: 3,
			note: null,
			opened_at_night: null,
			spent_today: null,
			spent_amount: null,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		// note is index 5 (id, date_local, mood, fatigue, urge, note, ...)
		const noteParam = params[5];
		expect(noteParam).toBeNull();
	});

	it("stores spent_amount as null (never included in analytics)", async () => {
		const db = makeMockDb();
		await createCheckin(db, {
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 3,
			urge: 3,
			note: null,
			opened_at_night: 0,
			spent_today: 1,
			spent_amount: null,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		// spent_amount is the last param
		expect(params[params.length - 1]).toBeNull();
	});

	it("passes opened_at_night and spent_today as numeric flags", async () => {
		const db = makeMockDb();
		await createCheckin(db, {
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 2,
			urge: 4,
			note: null,
			opened_at_night: 1,
			spent_today: 0,
			spent_amount: null,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain(1); // opened_at_night = 1
		expect(params).toContain(0); // spent_today = 0
	});
});

// ---------------------------------------------------------------------------
// getCheckinByDate
// ---------------------------------------------------------------------------

describe("getCheckinByDate", () => {
	it("returns null when db returns null", async () => {
		const db = makeMockDb();
		const result = await getCheckinByDate(db, "2026-02-18");
		expect(result).toBeNull();
	});

	it("calls db.getFirstAsync with the correct date", async () => {
		const db = makeMockDb();
		await getCheckinByDate(db, "2026-02-18");
		const [sql, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		expect(sql).toMatch(/daily_checkin/i);
		expect(params).toContain("2026-02-18");
	});

	it("maps the row to a DailyCheckin object", async () => {
		const mockRow = {
			id: "ci-1",
			date_local: "2026-02-18",
			mood: 4,
			fatigue: 2,
			urge: 3,
			note: "Test note",
			opened_at_night: 1,
			spent_today: 0,
			spent_amount: null,
		};
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(mockRow),
		});
		const result = await getCheckinByDate(db, "2026-02-18");
		expect(result).not.toBeNull();
		expect(result!.id).toBe("ci-1");
		expect(result!.mood).toBe(4);
		expect(result!.note).toBe("Test note");
		expect(result!.opened_at_night).toBe(1);
	});

	it("preserves null note from the row", async () => {
		const mockRow = {
			id: "ci-2",
			date_local: "2026-02-18",
			mood: 3,
			fatigue: 3,
			urge: 3,
			note: null,
			opened_at_night: null,
			spent_today: null,
			spent_amount: null,
		};
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(mockRow),
		});
		const result = await getCheckinByDate(db, "2026-02-18");
		expect(result!.note).toBeNull();
		expect(result!.opened_at_night).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getCheckinsInRange
// ---------------------------------------------------------------------------

describe("getCheckinsInRange", () => {
	it("returns empty array when db returns no rows", async () => {
		const db = makeMockDb();
		const result = await getCheckinsInRange(db, "2026-02-15", "2026-02-18");
		expect(result).toEqual([]);
	});

	it("calls db.getAllAsync with both date bounds", async () => {
		const db = makeMockDb();
		await getCheckinsInRange(db, "2026-02-15", "2026-02-18");
		const [sql, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		expect(sql).toMatch(/daily_checkin/i);
		expect(params).toContain("2026-02-15");
		expect(params).toContain("2026-02-18");
	});

	it("SQL uses >= and <= for inclusive range", async () => {
		const db = makeMockDb();
		await getCheckinsInRange(db, "2026-02-15", "2026-02-18");
		const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/>=.*AND.*<=/is);
	});

	it("maps multiple rows to DailyCheckin array", async () => {
		const mockRows = [
			{
				id: "ci-a",
				date_local: "2026-02-15",
				mood: 2,
				fatigue: 4,
				urge: 3,
				note: null,
				opened_at_night: null,
				spent_today: null,
				spent_amount: null,
			},
			{
				id: "ci-b",
				date_local: "2026-02-16",
				mood: 4,
				fatigue: 2,
				urge: 2,
				note: "Better day",
				opened_at_night: 0,
				spent_today: 1,
				spent_amount: null,
			},
		];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getCheckinsInRange(db, "2026-02-15", "2026-02-16");
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("ci-a");
		expect(result[1].id).toBe("ci-b");
		expect(result[1].note).toBe("Better day");
	});
});

// ---------------------------------------------------------------------------
// getAllCheckins
// ---------------------------------------------------------------------------

describe("getAllCheckins", () => {
	it("returns empty array when db returns no rows", async () => {
		const db = makeMockDb();
		const result = await getAllCheckins(db);
		expect(result).toEqual([]);
	});

	it("calls db.getAllAsync against daily_checkin ordered by date_local DESC", async () => {
		const db = makeMockDb();
		await getAllCheckins(db);
		const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/daily_checkin/i);
		expect(sql).toMatch(/ORDER BY date_local DESC/i);
	});

	it("maps multiple rows to DailyCheckin array, newest first", async () => {
		const mockRows = [
			{
				id: "ci-b",
				date_local: "2026-02-16",
				mood: 4,
				fatigue: 2,
				urge: 2,
				note: "Better day",
				opened_at_night: 0,
				spent_today: 1,
				spent_amount: null,
			},
			{
				id: "ci-a",
				date_local: "2026-02-15",
				mood: 2,
				fatigue: 4,
				urge: 3,
				note: null,
				opened_at_night: null,
				spent_today: null,
				spent_amount: null,
			},
		];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getAllCheckins(db);
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("ci-b");
		expect(result[1].id).toBe("ci-a");
	});
});
