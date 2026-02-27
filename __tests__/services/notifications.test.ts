// Unit tests for src/services/notifications.ts.
// Tests cover pure scheduling-decision logic only.
// expo-notifications is mocked so no OS permissions are needed.

import type { NotificationStyle } from "@/src/domain/types";
import type { NotificationContent } from "@/src/services/notifications";
import {
	buildEveningNudgeContent,
	buildStreakNudgeContent,
	buildWeeklySummaryContent,
	getEveningTriggerHour,
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

	it('returns stealth message when style is "stealth"', () => {
		const content = requireContent(buildEveningNudgeContent("stealth"));
		expect(content.title).toBe("Take a moment for yourself");
		expect(content.body).toBe("");
	});

	it('returns null when style is "off"', () => {
		const content = buildEveningNudgeContent("off");
		expect(content).toBeNull();
	});

	it("stealth title does not contain app name", () => {
		const content = requireContent(buildEveningNudgeContent("stealth"));
		expect(content.title.toLowerCase()).not.toContain("unmatch");
		expect(content.body.toLowerCase()).not.toContain("unmatch");
	});

	it("stealth body does not mention dating apps", () => {
		const content = requireContent(buildEveningNudgeContent("stealth"));
		expect(content.body.toLowerCase()).not.toContain("dating");
		expect(content.body.toLowerCase()).not.toContain("swipe");
	});
});

// ---------------------------------------------------------------------------
// buildStreakNudgeContent
// ---------------------------------------------------------------------------

describe("buildStreakNudgeContent", () => {
	it("returns streak message for 3 days", () => {
		const content = requireContent(buildStreakNudgeContent(3));
		expect(content.title).toContain("3");
		expect(content.body).toContain("alive");
	});

	it("returns streak message for 7 days", () => {
		const content = requireContent(buildStreakNudgeContent(7));
		expect(content.title).toContain("7");
	});

	it("includes the exact streak count in the title", () => {
		const content = requireContent(buildStreakNudgeContent(14));
		expect(content.title).toContain("14");
	});

	it("returns null for streak below 3", () => {
		expect(buildStreakNudgeContent(0)).toBeNull();
		expect(buildStreakNudgeContent(1)).toBeNull();
		expect(buildStreakNudgeContent(2)).toBeNull();
	});

	it("returns content for streak exactly 3", () => {
		expect(buildStreakNudgeContent(3)).not.toBeNull();
	});
});

// ---------------------------------------------------------------------------
// buildWeeklySummaryContent
// ---------------------------------------------------------------------------

describe("buildWeeklySummaryContent", () => {
	it("returns content with resist count", () => {
		const content = buildWeeklySummaryContent(5, 30);
		expect(content.title).toBeDefined();
		expect(content.body).toContain("5");
		expect(content.body).toContain("30");
	});

	it("returns content for zero resists", () => {
		const content = buildWeeklySummaryContent(0, 0);
		expect(content.body).toContain("0");
	});

	it("includes a call to action mentioning progress", () => {
		const content = buildWeeklySummaryContent(3, 15);
		expect(content.body.toLowerCase()).toContain("progress");
	});

	it("includes minutes saved in body", () => {
		const content = buildWeeklySummaryContent(10, 60);
		expect(content.body).toContain("60");
	});
});

// ---------------------------------------------------------------------------
// shouldSendEveningNudge
// ---------------------------------------------------------------------------

describe("shouldSendEveningNudge", () => {
	it("returns true when style is normal and user has NOT opened today", () => {
		expect(shouldSendEveningNudge("normal", false)).toBe(true);
	});

	it("returns true when style is stealth and user has NOT opened today", () => {
		expect(shouldSendEveningNudge("stealth", false)).toBe(true);
	});

	it("returns false when style is off, regardless of hasOpenedToday", () => {
		expect(shouldSendEveningNudge("off", false)).toBe(false);
		expect(shouldSendEveningNudge("off", true)).toBe(false);
	});

	it("returns false when user HAS opened today (normal style)", () => {
		expect(shouldSendEveningNudge("normal", true)).toBe(false);
	});

	it("returns false when user HAS opened today (stealth style)", () => {
		expect(shouldSendEveningNudge("stealth", true)).toBe(false);
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
