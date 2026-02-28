// Unit tests for src/data/repositories/urge-repository.ts.
// The SQLiteDatabase is mocked so tests run in Node without native modules.
// Key focus: UTC date-range logic, SQL correctness, and row mapping.

import {
	countSpendAvoidedByDate,
	countSuccessesByDate,
	createUrgeEvent,
	getSuccessCountInRange,
	getUrgeCountByDayOfWeek,
	getUrgeCountByTimeOfDay,
	getUrgeEventsByDate,
	getUrgeEventsInRange,
	getWeeklySuccessCount,
} from "@/src/data/repositories/urge-repository";
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
// createUrgeEvent
// ---------------------------------------------------------------------------

describe("createUrgeEvent", () => {
	it("calls db.runAsync exactly once", async () => {
		const db = makeMockDb();
		await createUrgeEvent(db, {
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 5,
			protocol_completed: 1,
			urge_kind: "swipe",
			action_type: "calm",
			action_id: "breathing_60",
			outcome: "success",
			trigger_tag: null,
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		});
		expect(db.runAsync).toHaveBeenCalledTimes(1);
	});

	it("uses INSERT INTO urge_event SQL", async () => {
		const db = makeMockDb();
		await createUrgeEvent(db, {
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 7,
			protocol_completed: 1,
			urge_kind: "check",
			action_type: "body",
			action_id: "water_1",
			outcome: "fail",
			trigger_tag: "bored",
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		});
		const [sql] = (db.runAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/INSERT INTO urge_event/i);
	});

	it("returns the event with the generated ID included", async () => {
		const db = makeMockDb();
		const event = {
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 3,
			protocol_completed: 1,
			urge_kind: "spend" as const,
			action_type: "reset",
			action_id: "walk_5",
			outcome: "success" as const,
			trigger_tag: null,
			spend_category: "iap" as const,
			spend_item_type: "boost" as const,
			spend_amount: null,
		};
		const result = await createUrgeEvent(db, event);
		// ID is a generated UUID — verify it is a non-empty string
		expect(typeof result.id).toBe("string");
		expect(result.id.length).toBeGreaterThan(0);
		expect(result.urge_kind).toBe("spend");
		expect(result.outcome).toBe("success");
		expect(result.spend_category).toBe("iap");
	});

	it("passes spend_amount as null to the DB (never stored via panic flow)", async () => {
		const db = makeMockDb();
		await createUrgeEvent(db, {
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 5,
			protocol_completed: 1,
			urge_kind: "spend",
			action_type: "calm",
			action_id: "breathing_60",
			outcome: "success",
			trigger_tag: null,
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		// spend_amount is the last param (index 12, 0-based)
		const spendAmountParam = params[params.length - 1];
		expect(spendAmountParam).toBeNull();
	});

	it("passes trigger_tag correctly when provided", async () => {
		const db = makeMockDb();
		await createUrgeEvent(db, {
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 5,
			protocol_completed: 1,
			urge_kind: "swipe",
			action_type: "calm",
			action_id: "breathing_60",
			outcome: "success",
			trigger_tag: "lonely",
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		});
		const params = (db.runAsync as jest.Mock).mock.calls[0][1] as unknown[];
		expect(params).toContain("lonely");
	});
});

// ---------------------------------------------------------------------------
// getUrgeEventsByDate — UTC range logic
// ---------------------------------------------------------------------------

describe("getUrgeEventsByDate", () => {
	it("calls db.getAllAsync with two UTC ISO-8601 strings", async () => {
		const db = makeMockDb();
		await getUrgeEventsByDate(db, "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		expect(params).toHaveLength(2);
		// Both should parse as valid dates
		expect(isNaN(new Date(params[0]).getTime())).toBe(false);
		expect(isNaN(new Date(params[1]).getTime())).toBe(false);
	});

	it("UTC range spans exactly 24 hours", async () => {
		const db = makeMockDb();
		await getUrgeEventsByDate(db, "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
	});

	it("range start corresponds to midnight local time for the given date", async () => {
		const db = makeMockDb();
		await getUrgeEventsByDate(db, "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		// The start should be the UTC equivalent of local midnight on 2026-02-18
		const expectedStartMs = new Date("2026-02-18T00:00:00").getTime();
		expect(new Date(params[0]).getTime()).toBe(expectedStartMs);
	});

	it("handles month boundary correctly (Jan 31 → Feb 1)", async () => {
		const db = makeMockDb();
		await getUrgeEventsByDate(db, "2026-01-31");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		// End date local time should correspond to Feb 1 midnight
		const expectedEndMs = new Date("2026-02-01T00:00:00").getTime();
		expect(endMs).toBe(expectedEndMs);
		expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
	});

	it("handles year boundary correctly (Dec 31 → Jan 1)", async () => {
		const db = makeMockDb();
		await getUrgeEventsByDate(db, "2025-12-31");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		const expectedEndMs = new Date("2026-01-01T00:00:00").getTime();
		expect(endMs).toBe(expectedEndMs);
		expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
	});

	it("returns empty array when db returns no rows", async () => {
		const db = makeMockDb();
		const result = await getUrgeEventsByDate(db, "2026-02-18");
		expect(result).toEqual([]);
	});

	it("maps rows to UrgeEvent objects correctly", async () => {
		const mockRow = {
			id: "event-1",
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 6,
			protocol_completed: 1,
			urge_kind: "swipe",
			action_type: "calm",
			action_id: "breathing_60",
			outcome: "success",
			trigger_tag: "bored",
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		};
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([mockRow]),
		});
		const result = await getUrgeEventsByDate(db, "2026-02-18");
		expect(result).toHaveLength(1);
		expect(result[0].id).toBe("event-1");
		expect(result[0].urge_kind).toBe("swipe");
		expect(result[0].outcome).toBe("success");
		expect(result[0].trigger_tag).toBe("bored");
	});

	it("maps null action_type to empty string", async () => {
		const mockRow = {
			id: "event-2",
			started_at: "2026-02-18T10:00:00.000Z",
			from_screen: "panic",
			urge_level: 3,
			protocol_completed: 0,
			urge_kind: "check",
			action_type: null,
			action_id: null,
			outcome: null,
			trigger_tag: null,
			spend_category: null,
			spend_item_type: null,
			spend_amount: null,
		};
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([mockRow]),
		});
		const result = await getUrgeEventsByDate(db, "2026-02-18");
		expect(result[0].action_type).toBe("");
		expect(result[0].action_id).toBe("");
		// null outcome defaults to 'ongoing'
		expect(result[0].outcome).toBe("ongoing");
	});
});

// ---------------------------------------------------------------------------
// countSuccessesByDate
// ---------------------------------------------------------------------------

describe("countSuccessesByDate", () => {
	it("returns 0 when db returns null", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(null),
		});
		const count = await countSuccessesByDate(db, "2026-02-18");
		expect(count).toBe(0);
	});

	it("returns the count from the db row", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 3 }),
		});
		const count = await countSuccessesByDate(db, "2026-02-18");
		expect(count).toBe(3);
	});

	it("SQL filters by outcome = success", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await countSuccessesByDate(db, "2026-02-18");
		const [sql] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});

	it("UTC range spans 24 hours", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await countSuccessesByDate(db, "2026-02-18");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
	});
});

// ---------------------------------------------------------------------------
// countSpendAvoidedByDate
// ---------------------------------------------------------------------------

describe("countSpendAvoidedByDate", () => {
	it("returns 0 when db returns null", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(null),
		});
		const count = await countSpendAvoidedByDate(db, "2026-02-18");
		expect(count).toBe(0);
	});

	it("returns the count from the db row", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 2 }),
		});
		const count = await countSpendAvoidedByDate(db, "2026-02-18");
		expect(count).toBe(2);
	});

	it("SQL filters by urge_kind = spend AND outcome = success", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await countSpendAvoidedByDate(db, "2026-02-18");
		const [sql] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/urge_kind\s*=\s*'spend'/i);
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});
});

// ---------------------------------------------------------------------------
// getUrgeEventsInRange
// ---------------------------------------------------------------------------

describe("getUrgeEventsInRange", () => {
	it("returns empty array when db returns no rows", async () => {
		const db = makeMockDb();
		const result = await getUrgeEventsInRange(db, "2026-02-15", "2026-02-18");
		expect(result).toEqual([]);
	});

	it("start of range is midnight local of startDate", async () => {
		const db = makeMockDb();
		await getUrgeEventsInRange(db, "2026-02-15", "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const expectedStart = new Date("2026-02-15T00:00:00").getTime();
		expect(new Date(params[0]).getTime()).toBe(expectedStart);
	});

	it("end of range is midnight local of day AFTER endDate (exclusive)", async () => {
		const db = makeMockDb();
		await getUrgeEventsInRange(db, "2026-02-15", "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const expectedEnd = new Date("2026-02-19T00:00:00").getTime();
		expect(new Date(params[1]).getTime()).toBe(expectedEnd);
	});

	it("a single-day range behaves the same as getUrgeEventsByDate", async () => {
		const db = makeMockDb();
		await getUrgeEventsInRange(db, "2026-02-18", "2026-02-18");
		const [, params] = (db.getAllAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		expect(endMs - startMs).toBe(24 * 60 * 60 * 1000);
	});

	it("maps multiple rows to UrgeEvent array", async () => {
		const mockRows = [
			{
				id: "e1",
				started_at: "2026-02-15T09:00:00.000Z",
				from_screen: "panic",
				urge_level: 5,
				protocol_completed: 1,
				urge_kind: "swipe",
				action_type: "calm",
				action_id: "breathing_60",
				outcome: "success",
				trigger_tag: null,
				spend_category: null,
				spend_item_type: null,
				spend_amount: null,
			},
			{
				id: "e2",
				started_at: "2026-02-17T14:00:00.000Z",
				from_screen: "panic",
				urge_level: 8,
				protocol_completed: 1,
				urge_kind: "spend",
				action_type: "reset",
				action_id: "walk_5",
				outcome: "fail",
				trigger_tag: "anxious",
				spend_category: "iap",
				spend_item_type: "boost",
				spend_amount: null,
			},
		];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getUrgeEventsInRange(db, "2026-02-15", "2026-02-17");
		expect(result).toHaveLength(2);
		expect(result[0].id).toBe("e1");
		expect(result[1].id).toBe("e2");
		expect(result[1].spend_category).toBe("iap");
	});
});

// ---------------------------------------------------------------------------
// getWeeklySuccessCount
// ---------------------------------------------------------------------------

describe("getWeeklySuccessCount", () => {
	it("returns 0 when db returns null", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(null),
		});
		const count = await getWeeklySuccessCount(db, "2026-02-27");
		expect(count).toBe(0);
	});

	it("returns the count from the db row", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 5 }),
		});
		const count = await getWeeklySuccessCount(db, "2026-02-27");
		expect(count).toBe(5);
	});

	it("SQL filters by outcome = success", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getWeeklySuccessCount(db, "2026-02-27");
		const [sql] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});

	it("week start is Monday when today is Friday", async () => {
		// 2026-02-27 is a Friday; Monday of that week is 2026-02-23
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getWeeklySuccessCount(db, "2026-02-27");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const weekStartMs = new Date(params[0]).getTime();
		const expectedMondayMs = new Date("2026-02-23T00:00:00").getTime();
		expect(weekStartMs).toBe(expectedMondayMs);
	});

	it("week start is Monday itself when today is Monday", async () => {
		// 2026-02-23 is a Monday
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getWeeklySuccessCount(db, "2026-02-23");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const weekStartMs = new Date(params[0]).getTime();
		const expectedMondayMs = new Date("2026-02-23T00:00:00").getTime();
		expect(weekStartMs).toBe(expectedMondayMs);
	});

	it("week start is prior Monday when today is Sunday", async () => {
		// 2026-03-01 is a Sunday; prior Monday is 2026-02-23
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getWeeklySuccessCount(db, "2026-03-01");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const weekStartMs = new Date(params[0]).getTime();
		const expectedMondayMs = new Date("2026-02-23T00:00:00").getTime();
		expect(weekStartMs).toBe(expectedMondayMs);
	});

	it("week end is midnight after today (exclusive upper bound)", async () => {
		// 2026-02-27 Friday — end should be 2026-02-28T00:00:00 local
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getWeeklySuccessCount(db, "2026-02-27");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const weekEndMs = new Date(params[1]).getTime();
		const expectedEndMs = new Date("2026-02-28T00:00:00").getTime();
		expect(weekEndMs).toBe(expectedEndMs);
	});
});

// ---------------------------------------------------------------------------
// getUrgeCountByDayOfWeek
// ---------------------------------------------------------------------------

describe("getUrgeCountByDayOfWeek", () => {
	it("returns 7 entries (one per day-of-week) even with no data", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByDayOfWeek(db);
		expect(result).toHaveLength(7);
	});

	it("all counts are 0 when there are no events", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByDayOfWeek(db);
		expect(result.every((r) => r.count === 0)).toBe(true);
	});

	it("SQL filters by outcome = success", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		await getUrgeCountByDayOfWeek(db);
		const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});

	it("groups events by day-of-week correctly", async () => {
		// 2026-02-23 is Monday (dayOfWeek=1), 2026-02-25 is Wednesday (dayOfWeek=3)
		const mockRows = [
			{ started_at: "2026-02-23T10:00:00.000Z" }, // Monday
			{ started_at: "2026-02-23T14:00:00.000Z" }, // Monday
			{ started_at: "2026-02-25T09:00:00.000Z" }, // Wednesday
		];
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue(mockRows),
		});
		const result = await getUrgeCountByDayOfWeek(db);
		// day 1 = Monday should have count 2
		const monday = result.find((r) => r.dayOfWeek === 1);
		const wednesday = result.find((r) => r.dayOfWeek === 3);
		expect(monday?.count).toBe(2);
		expect(wednesday?.count).toBe(1);
	});

	it("returns dayOfWeek values 0 through 6", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByDayOfWeek(db);
		const dows = result.map((r) => r.dayOfWeek).sort((a, b) => a - b);
		expect(dows).toEqual([0, 1, 2, 3, 4, 5, 6]);
	});
});

// ---------------------------------------------------------------------------
// getUrgeCountByTimeOfDay
// ---------------------------------------------------------------------------

describe("getUrgeCountByTimeOfDay", () => {
	it("returns exactly 3 buckets", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByTimeOfDay(db);
		expect(result).toHaveLength(3);
	});

	it("buckets are morning, afternoon, evening", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByTimeOfDay(db);
		const buckets = result.map((r) => r.bucket);
		expect(buckets).toContain("morning");
		expect(buckets).toContain("afternoon");
		expect(buckets).toContain("evening");
	});

	it("SQL filters by outcome = success", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		await getUrgeCountByTimeOfDay(db);
		const [sql] = (db.getAllAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});

	it("all counts are 0 when there are no events", async () => {
		const db = makeMockDb({
			getAllAsync: jest.fn().mockResolvedValue([]),
		});
		const result = await getUrgeCountByTimeOfDay(db);
		expect(result.every((r) => r.count === 0)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// getSuccessCountInRange
// ---------------------------------------------------------------------------

describe("getSuccessCountInRange", () => {
	it("returns 0 when db returns null", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue(null),
		});
		const count = await getSuccessCountInRange(db, "2026-02-15", "2026-02-21");
		expect(count).toBe(0);
	});

	it("returns the count from the db row", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 4 }),
		});
		const count = await getSuccessCountInRange(db, "2026-02-15", "2026-02-21");
		expect(count).toBe(4);
	});

	it("SQL filters by outcome = success", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getSuccessCountInRange(db, "2026-02-15", "2026-02-21");
		const [sql] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [string];
		expect(sql).toMatch(/outcome\s*=\s*'success'/i);
	});

	it("UTC range covers full startDate and endDate (inclusive)", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({ count: 0 }),
		});
		await getSuccessCountInRange(db, "2026-02-15", "2026-02-21");
		const [, params] = (db.getFirstAsync as jest.Mock).mock.calls[0] as [
			string,
			string[],
		];
		const startMs = new Date(params[0]).getTime();
		const endMs = new Date(params[1]).getTime();
		// Should cover exactly 7 days (15,16,17,18,19,20,21)
		expect(endMs - startMs).toBe(7 * 24 * 60 * 60 * 1000);
	});
});
