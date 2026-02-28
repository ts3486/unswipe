// Unit tests for src/domain/progress-rules.ts.
// Pure logic tests — no database, no async, no side effects.

import {
	calculateMeditationRank,
	calculateStreak,
	isDaySuccess,
	shouldIncrementMeditation,
	shouldIncrementSpendAvoided,
} from "@/src/domain/progress-rules";

// ---------------------------------------------------------------------------
// calculateMeditationRank
// ---------------------------------------------------------------------------

describe("calculateMeditationRank", () => {
	it("returns level 1 when meditation count is 0", () => {
		expect(calculateMeditationRank(0)).toBe(1);
	});

	it("returns level 1 when meditation count is 4 (not yet enough for level 2)", () => {
		expect(calculateMeditationRank(4)).toBe(1);
	});

	it("returns level 2 when meditation count is exactly 5", () => {
		expect(calculateMeditationRank(5)).toBe(2);
	});

	it("returns level 3 when meditation count is 10", () => {
		expect(calculateMeditationRank(10)).toBe(3);
	});

	it("returns level 5 when meditation count is 24", () => {
		// floor(24 / 5) + 1 = 4 + 1 = 5
		expect(calculateMeditationRank(24)).toBe(5);
	});

	it("returns level 6 when meditation count is 25", () => {
		// floor(25 / 5) + 1 = 5 + 1 = 6
		expect(calculateMeditationRank(25)).toBe(6);
	});

	it("returns capped level 30 when meditation count is 145", () => {
		// floor(145 / 5) + 1 = 29 + 1 = 30 (exactly at cap)
		expect(calculateMeditationRank(145)).toBe(30);
	});

	it("returns capped level 30 when meditation count exceeds cap threshold (200)", () => {
		// floor(200 / 5) + 1 = 40 + 1 = 41, capped to 30
		expect(calculateMeditationRank(200)).toBe(30);
	});

	it("returns level 1 for negative meditation count (guard clause)", () => {
		expect(calculateMeditationRank(-1)).toBe(1);
		expect(calculateMeditationRank(-100)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// isDaySuccess
// ---------------------------------------------------------------------------

describe("isDaySuccess", () => {
	it("returns true when panic success count >= 1 and daily task is not completed", () => {
		expect(isDaySuccess(1, false)).toBe(true);
		expect(isDaySuccess(3, false)).toBe(true);
	});

	it("returns true when panic success count is 0 and daily task is completed", () => {
		expect(isDaySuccess(0, true)).toBe(true);
	});

	it("returns true when both panic successes and daily task are present", () => {
		expect(isDaySuccess(2, true)).toBe(true);
	});

	it("returns false when panic success count is 0 and daily task is not completed", () => {
		expect(isDaySuccess(0, false)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// calculateStreak
// ---------------------------------------------------------------------------

describe("calculateStreak", () => {
	it("returns 0 when no success dates are provided", () => {
		expect(calculateStreak([], "2026-02-18")).toBe(0);
	});

	it("returns 0 when today is not in the success dates", () => {
		expect(calculateStreak(["2026-02-17", "2026-02-16"], "2026-02-18")).toBe(0);
	});

	it("returns 1 when only today is a success day", () => {
		expect(calculateStreak(["2026-02-18"], "2026-02-18")).toBe(1);
	});

	it("returns 2 when yesterday and today are both success days", () => {
		expect(calculateStreak(["2026-02-17", "2026-02-18"], "2026-02-18")).toBe(2);
	});

	it("counts consecutive days ending today correctly", () => {
		const dates = [
			"2026-02-14",
			"2026-02-15",
			"2026-02-16",
			"2026-02-17",
			"2026-02-18",
		];
		expect(calculateStreak(dates, "2026-02-18")).toBe(5);
	});

	it("stops counting at a gap in the middle", () => {
		// Gap on 2026-02-16 — streak should only count from 2026-02-17 onward.
		const dates = ["2026-02-14", "2026-02-15", "2026-02-17", "2026-02-18"];
		expect(calculateStreak(dates, "2026-02-18")).toBe(2);
	});

	it("ignores duplicate dates", () => {
		const dates = ["2026-02-18", "2026-02-18", "2026-02-17", "2026-02-17"];
		expect(calculateStreak(dates, "2026-02-18")).toBe(2);
	});

	it("handles unsorted input correctly", () => {
		const dates = ["2026-02-18", "2026-02-16", "2026-02-17"];
		expect(calculateStreak(dates, "2026-02-18")).toBe(3);
	});

	it("correctly crosses a month boundary", () => {
		// Jan 31 -> Feb 1 boundary
		const dates = ["2026-01-30", "2026-01-31", "2026-02-01"];
		expect(calculateStreak(dates, "2026-02-01")).toBe(3);
	});

	it("correctly crosses a year boundary", () => {
		const dates = ["2025-12-31", "2026-01-01"];
		expect(calculateStreak(dates, "2026-01-01")).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// shouldIncrementMeditation
// ---------------------------------------------------------------------------

describe("shouldIncrementMeditation", () => {
	it('returns true for outcome "success"', () => {
		expect(shouldIncrementMeditation("success")).toBe(true);
	});

	it('returns false for outcome "fail"', () => {
		expect(shouldIncrementMeditation("fail")).toBe(false);
	});

	it('returns false for outcome "ongoing"', () => {
		expect(shouldIncrementMeditation("ongoing")).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// shouldIncrementSpendAvoided
// ---------------------------------------------------------------------------

describe("shouldIncrementSpendAvoided", () => {
	it("returns true for spend urge with success outcome", () => {
		expect(shouldIncrementSpendAvoided("spend", "success")).toBe(true);
	});

	it("returns false for spend urge with fail outcome", () => {
		expect(shouldIncrementSpendAvoided("spend", "fail")).toBe(false);
	});

	it("returns false for spend urge with ongoing outcome", () => {
		expect(shouldIncrementSpendAvoided("spend", "ongoing")).toBe(false);
	});

	it("returns false for swipe urge with success outcome", () => {
		expect(shouldIncrementSpendAvoided("swipe", "success")).toBe(false);
	});

	it("returns false for check urge with success outcome", () => {
		expect(shouldIncrementSpendAvoided("check", "success")).toBe(false);
	});

	it("returns false for swipe urge with fail outcome", () => {
		expect(shouldIncrementSpendAvoided("swipe", "fail")).toBe(false);
	});
});
