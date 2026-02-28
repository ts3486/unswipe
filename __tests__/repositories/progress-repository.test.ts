// Unit tests for src/data/repositories/progress-repository.ts.
// The SQLiteDatabase is mocked so tests run in Node without native modules.

import {
	getAllProgressDates,
	getLatestProgress,
	getProgress,
	upsertProgress,
} from "@/src/data/repositories/progress-repository";
import type { Progress } from "@/src/domain/types";
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

const BASE_PROGRESS: Progress = {
	date_local: "2026-02-18",
	streak_current: 3,
	meditation_count_total: 10,
	tree_level: 3,
	last_success_date: "2026-02-18",
	spend_avoided_count_total: 2,
};

// ---------------------------------------------------------------------------
// getProgress
// ---------------------------------------------------------------------------

describe("getProgress", () => {
	it("returns null when db returns null", async () => {
		const db = makeMockDb();
		const result = await getProgress(db, "2026-02-18");
		expect(result).toBeNull();
	});

	it("calls db.getFirstAsync with the correct date", async () => {
		const db = makeMockDb();
		await getProgress(db, "2026-02-18");
		const [sql, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		expect(sql).toMatch(/progress/i);
		expect(params).toContain("2026-02-18");
	});

	it("maps the row to a Progress object", async () => {
		const mockRow = {
			date_local: "2026-02-18",
			streak_current: 5,
			resist_count_total: 20,
			tree_level: 5,
			last_success_date: "2026-02-18",
			spend_avoided_count_total: 3,
		};
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(mockRow),
		});
		const result = await getProgress(db, "2026-02-18");
		expect(result).not.toBeNull();
		expect(result!.date_local).toBe("2026-02-18");
		expect(result!.streak_current).toBe(5);
		expect(result!.meditation_count_total).toBe(20);
		expect(result!.tree_level).toBe(5);
		expect(result!.last_success_date).toBe("2026-02-18");
		expect(result!.spend_avoided_count_total).toBe(3);
	});

	it("preserves null last_success_date from row", async () => {
		const mockRow = {
			date_local: "2026-02-18",
			streak_current: 0,
			resist_count_total: 0,
			tree_level: 1,
			last_success_date: null,
			spend_avoided_count_total: 0,
		};
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(mockRow),
		});
		const result = await getProgress(db, "2026-02-18");
		expect(result!.last_success_date).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// getLatestProgress
// ---------------------------------------------------------------------------

describe("getLatestProgress", () => {
	it("returns null when db returns null (empty table)", async () => {
		const db = makeMockDb();
		const result = await getLatestProgress(db);
		expect(result).toBeNull();
	});

	it("calls db.getFirstAsync (no additional params needed)", async () => {
		const db = makeMockDb();
		await getLatestProgress(db);
		expect(db.getFirstAsync).toHaveBeenCalledTimes(1);
	});

	it("SQL orders by date_local DESC and limits to 1", async () => {
		const db = makeMockDb();
		await getLatestProgress(db);
		const [sql] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/ORDER BY date_local DESC/i);
		expect(sql).toMatch(/LIMIT 1/i);
	});

	it("returns the mapped Progress when db returns a row", async () => {
		const mockRow = {
			date_local: "2026-02-18",
			streak_current: 7,
			resist_count_total: 30,
			tree_level: 7,
			last_success_date: "2026-02-18",
			spend_avoided_count_total: 5,
		};
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(mockRow),
		});
		const result = await getLatestProgress(db);
		expect(result).not.toBeNull();
		expect(result!.streak_current).toBe(7);
		expect(result!.tree_level).toBe(7);
	});
});

// ---------------------------------------------------------------------------
// upsertProgress
// ---------------------------------------------------------------------------

describe("upsertProgress", () => {
	it("calls db.runAsync exactly once", async () => {
		const db = makeMockDb();
		await upsertProgress(db, BASE_PROGRESS);
		expect(db.runAsync).toHaveBeenCalledTimes(1);
	});

	it("SQL uses INSERT OR REPLACE", async () => {
		const db = makeMockDb();
		await upsertProgress(db, BASE_PROGRESS);
		const [sql] = (db.runAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/INSERT OR REPLACE/i);
		expect(sql).toMatch(/progress/i);
	});

	it("passes all progress fields as params", async () => {
		const db = makeMockDb();
		await upsertProgress(db, BASE_PROGRESS);
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain("2026-02-18");
		expect(params).toContain(3); // streak_current
		expect(params).toContain(10); // meditation_count_total
		expect(params).toContain(3); // tree_level
		expect(params).toContain(2); // spend_avoided_count_total
	});

	it("uses null for last_success_date when not provided", async () => {
		const db = makeMockDb();
		await upsertProgress(db, { ...BASE_PROGRESS, last_success_date: null });
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain(null);
	});

	it("accepts tree_level at the cap (30)", async () => {
		const db = makeMockDb();
		await upsertProgress(db, { ...BASE_PROGRESS, tree_level: 30 });
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain(30);
	});

	it("accepts tree_level at the start (1)", async () => {
		const db = makeMockDb();
		await upsertProgress(db, {
			...BASE_PROGRESS,
			tree_level: 1,
			meditation_count_total: 0,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain(1);
	});
});

// ---------------------------------------------------------------------------
// getAllProgressDates
// ---------------------------------------------------------------------------

describe("getAllProgressDates", () => {
	it("returns empty array when db returns no rows", async () => {
		const db = makeMockDb();
		const result = await getAllProgressDates(db);
		expect(result).toEqual([]);
	});

	it("SQL orders by date_local ASC", async () => {
		const db = makeMockDb();
		await getAllProgressDates(db);
		const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/ORDER BY date_local ASC/i);
	});

	it("returns date strings in the order returned by db", async () => {
		const mockRows = [
			{ date_local: "2026-02-15" },
			{ date_local: "2026-02-16" },
			{ date_local: "2026-02-18" },
		];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getAllProgressDates(db);
		expect(result).toEqual(["2026-02-15", "2026-02-16", "2026-02-18"]);
	});

	it("returns an array of strings (not objects)", async () => {
		const mockRows = [{ date_local: "2026-02-18" }];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getAllProgressDates(db);
		expect(typeof result[0]).toBe("string");
	});
});
