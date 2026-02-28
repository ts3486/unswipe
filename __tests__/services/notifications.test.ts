// Unit tests for src/services/notifications.ts.
// Tests cover pure scheduling-decision logic only.
// expo-notifications is mocked so no OS permissions are needed.

import type { NotificationStyle } from "@/src/domain/types";
import type { NotificationContent } from "@/src/services/notifications";
import {
	buildCourseUnlockContent,
	buildEveningNudgeContent,
	buildStreakNudgeContent,
	buildWeeklySummaryContent,
	getEveningTriggerHour,
	shouldSendCourseUnlock,
	shouldSendEveningNudge,
	shouldSendStreakNudge,
} from "@/src/services/notifications";

/** Narrows a NotificationContent | null, failing the test if null. */
function requireContent(
	content: NotificationContent | null,
): NotificationContent {
	if (content === null) {
		throw new Error("Expected NotificationContent but received null");
	}
	return content;
}

// ---------------------------------------------------------------------------
// buildEveningNudgeContent
// ---------------------------------------------------------------------------

describe("buildEveningNudgeContent", () => {
	it('returns normal message when style is "normal"', () => {
		const content = requireContent(buildEveningNudgeContent("normal"));
		expect(content.title).toBe("Feeling the urge?");
		expect(content.body).toBe("Open Unmatch for a 60-second reset.");
	});

	it('returns null when style is "off"', () => {
		const content = buildEveningNudgeContent("off");
		expect(content).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// buildStreakNudgeContent
// ---------------------------------------------------------------------------

describe("buildStreakNudgeContent", () => {
	it("returns streak message for 3 days (normal)", () => {
		const content = requireContent(buildStreakNudgeContent(3, "normal"));
		expect(content.title).toContain("3");
		expect(content.body).toContain("alive");
	});

	it("returns streak message for 7 days (normal)", () => {
		const content = requireContent(buildStreakNudgeContent(7, "normal"));
		expect(content.title).toContain("7");
	});

	it("includes the exact streak count in the title (normal)", () => {
		const content = requireContent(buildStreakNudgeContent(14, "normal"));
		expect(content.title).toContain("14");
	});

	it("returns null for streak below 3", () => {
		expect(buildStreakNudgeContent(0, "normal")).toBeNull();
		expect(buildStreakNudgeContent(1, "normal")).toBeNull();
		expect(buildStreakNudgeContent(2, "normal")).toBeNull();
	});

	it("returns content for streak exactly 3", () => {
		expect(buildStreakNudgeContent(3, "normal")).not.toBeNull();
	});

	it("returns null when style is off", () => {
		expect(buildStreakNudgeContent(5, "off")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// buildWeeklySummaryContent
// ---------------------------------------------------------------------------

describe("buildWeeklySummaryContent", () => {
	it("returns content with meditation count (normal)", () => {
		const content = requireContent(buildWeeklySummaryContent(5, 30, "normal"));
		expect(content.title).toBeDefined();
		expect(content.body).toContain("5");
		expect(content.body).toContain("30");
	});

	it("returns content for zero meditations (normal)", () => {
		const content = requireContent(buildWeeklySummaryContent(0, 0, "normal"));
		expect(content.body).toContain("0");
	});

	it("includes a call to action mentioning progress (normal)", () => {
		const content = requireContent(buildWeeklySummaryContent(3, 15, "normal"));
		expect(content.body.toLowerCase()).toContain("progress");
	});

	it("includes minutes saved in body (normal)", () => {
		const content = requireContent(buildWeeklySummaryContent(10, 60, "normal"));
		expect(content.body).toContain("60");
	});

	it("returns null when style is off", () => {
		expect(buildWeeklySummaryContent(5, 30, "off")).toBeNull();
	});
});

// ---------------------------------------------------------------------------
// buildCourseUnlockContent
// ---------------------------------------------------------------------------

describe("buildCourseUnlockContent", () => {
	it('returns message when style is "normal"', () => {
		const content = requireContent(buildCourseUnlockContent("normal"));
		expect(content.title).toBeDefined();
		expect(content.body).toBeDefined();
	});

	it('returns null when style is "off"', () => {
		expect(buildCourseUnlockContent("off")).toBeNull();
	});

	it('normal content mentions "lesson" or "course"', () => {
		const content = requireContent(buildCourseUnlockContent("normal"));
		const combined = `${content.title} ${content.body}`.toLowerCase();
		expect(
			combined.includes("lesson") || combined.includes("course"),
		).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// shouldSendEveningNudge
// ---------------------------------------------------------------------------

describe("shouldSendEveningNudge", () => {
	it("returns true when style is normal and user has NOT opened today", () => {
		expect(shouldSendEveningNudge("normal", false)).toBe(true);
	});

	it("returns false when style is off, regardless of hasOpenedToday", () => {
		expect(shouldSendEveningNudge("off", false)).toBe(false);
		expect(shouldSendEveningNudge("off", true)).toBe(false);
	});

	it("returns false when user HAS opened today (normal style)", () => {
		expect(shouldSendEveningNudge("normal", true)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// shouldSendStreakNudge
// ---------------------------------------------------------------------------

describe("shouldSendStreakNudge", () => {
	it("returns true when streak >= 3 and todaySuccess is false", () => {
		expect(shouldSendStreakNudge(3, false)).toBe(true);
		expect(shouldSendStreakNudge(10, false)).toBe(true);
	});

	it("returns false when streak < 3", () => {
		expect(shouldSendStreakNudge(0, false)).toBe(false);
		expect(shouldSendStreakNudge(2, false)).toBe(false);
	});

	it("returns false when todaySuccess is true (streak already safe today)", () => {
		expect(shouldSendStreakNudge(5, true)).toBe(false);
	});

	it("returns false when streak >= 3 but todaySuccess is true", () => {
		expect(shouldSendStreakNudge(3, true)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// shouldSendCourseUnlock
// ---------------------------------------------------------------------------

describe("shouldSendCourseUnlock", () => {
	it("returns false for currentDayIndex <= 1", () => {
		expect(shouldSendCourseUnlock(0, false)).toBe(false);
		expect(shouldSendCourseUnlock(1, false)).toBe(false);
	});

	it("returns true for days 2–7 when not completed", () => {
		expect(shouldSendCourseUnlock(2, false)).toBe(true);
		expect(shouldSendCourseUnlock(4, false)).toBe(true);
		expect(shouldSendCourseUnlock(7, false)).toBe(true);
	});

	it("returns false when todayContentCompleted is true", () => {
		expect(shouldSendCourseUnlock(3, true)).toBe(false);
		expect(shouldSendCourseUnlock(7, true)).toBe(false);
	});

	it("returns false for currentDayIndex > 7", () => {
		expect(shouldSendCourseUnlock(8, false)).toBe(false);
		expect(shouldSendCourseUnlock(100, false)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// getEveningTriggerHour
// ---------------------------------------------------------------------------

describe("getEveningTriggerHour", () => {
	it("returns a value between 21 and 22 inclusive", () => {
		// The spec says 9-10pm local, meaning hour 21 or a random between 21-22.
		const hour = getEveningTriggerHour();
		expect(hour).toBeGreaterThanOrEqual(21);
		expect(hour).toBeLessThanOrEqual(22);
	});

	it("returns an integer", () => {
		const hour = getEveningTriggerHour();
		expect(Number.isInteger(hour)).toBe(true);
	});
});

// Satisfy TypeScript: NotificationStyle is imported but only used in
// the helper's parameter type above, so we use it explicitly here.
const _styleCheck: NotificationStyle = "normal";
void _styleCheck;
