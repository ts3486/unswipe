// Unit tests for subscription-repository trial functionality.
// SQLiteDatabase is mocked so tests run in Node without native modules.

import {
	getIsPremium,
	getSubscription,
	getTrialInfo,
	isTrialActive,
	recordMonthlySubscription,
	recordTrialStart,
	upsertSubscription,
} from "@/src/data/repositories/subscription-repository";
import type { SQLiteDatabase } from "expo-sqlite";

// ---------------------------------------------------------------------------
// Mock DB factory
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
// isTrialActive (pure helper)
// ---------------------------------------------------------------------------

describe("isTrialActive", () => {
	it("returns false for empty string", () => {
		expect(isTrialActive("")).toBe(false);
	});

	it("returns true when trial_ends_at is in the future", () => {
		const future = new Date(Date.now() + 86400000).toISOString();
		expect(isTrialActive(future)).toBe(true);
	});

	it("returns false when trial_ends_at is in the past", () => {
		const past = new Date(Date.now() - 86400000).toISOString();
		expect(isTrialActive(past)).toBe(false);
	});

	it("returns false when trial_ends_at is exactly now", () => {
		const now = new Date();
		expect(isTrialActive(now.toISOString(), now)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// recordTrialStart
// ---------------------------------------------------------------------------

describe("recordTrialStart", () => {
	it("calls runAsync with trial status and trial fields", async () => {
		const db = makeMockDb();

		await recordTrialStart(db);

		expect(db.runAsync).toHaveBeenCalledTimes(1);
		const call = (db.runAsync as jest.Mock).mock.calls[0] as [string, unknown[]];
		const params = call[1];

		// params: [id, status, product_id, period, started_at, expires_at, is_premium, trial_started_at, trial_ends_at]
		expect(params[0]).toBe("singleton");
		expect(params[1]).toBe("trial"); // status
		expect(params[2]).toBe(""); // product_id
		expect(params[6]).toBe(1); // is_premium = true
		expect(params[7]).toBeTruthy(); // trial_started_at is set
		expect(params[8]).toBeTruthy(); // trial_ends_at is set

		// trial_ends_at should be ~7 days from now
		const trialEndsAt = new Date(params[8] as string);
		const now = new Date();
		const diffDays = (trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
		expect(diffDays).toBeGreaterThanOrEqual(6.9);
		expect(diffDays).toBeLessThanOrEqual(7.1);
	});
});

// ---------------------------------------------------------------------------
// getTrialInfo
// ---------------------------------------------------------------------------

describe("getTrialInfo", () => {
	it("returns default when no subscription exists", async () => {
		const db = makeMockDb();

		const info = await getTrialInfo(db);

		expect(info.hasStartedTrial).toBe(false);
		expect(info.isTrialActive).toBe(false);
		expect(info.trialDaysRemaining).toBe(0);
		expect(info.trialEndsAt).toBe("");
	});

	it("returns default when subscription has no trial fields", async () => {
		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "none",
				product_id: null,
				period: null,
				started_at: null,
				expires_at: null,
				is_premium: 0,
				trial_started_at: null,
				trial_ends_at: null,
			}),
		});

		const info = await getTrialInfo(db);

		expect(info.hasStartedTrial).toBe(false);
		expect(info.isTrialActive).toBe(false);
	});

	it("returns active trial info when trial is ongoing", async () => {
		const trialStarted = new Date().toISOString();
		const trialEnds = new Date(Date.now() + 5 * 86400000).toISOString(); // 5 days from now

		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "trial",
				product_id: "",
				period: "monthly",
				started_at: trialStarted,
				expires_at: "",
				is_premium: 1,
				trial_started_at: trialStarted,
				trial_ends_at: trialEnds,
			}),
		});

		const info = await getTrialInfo(db);

		expect(info.hasStartedTrial).toBe(true);
		expect(info.isTrialActive).toBe(true);
		expect(info.trialDaysRemaining).toBeGreaterThanOrEqual(5);
		expect(info.trialDaysRemaining).toBeLessThanOrEqual(6);
		expect(info.trialEndsAt).toBe(trialEnds);
	});

	it("returns expired trial info when trial has ended", async () => {
		const trialStarted = new Date(Date.now() - 10 * 86400000).toISOString();
		const trialEnds = new Date(Date.now() - 3 * 86400000).toISOString(); // 3 days ago

		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "trial",
				product_id: "",
				period: "monthly",
				started_at: trialStarted,
				expires_at: "",
				is_premium: 0,
				trial_started_at: trialStarted,
				trial_ends_at: trialEnds,
			}),
		});

		const info = await getTrialInfo(db);

		expect(info.hasStartedTrial).toBe(true);
		expect(info.isTrialActive).toBe(false);
		expect(info.trialDaysRemaining).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// getIsPremium with trial
// ---------------------------------------------------------------------------

describe("getIsPremium with trial", () => {
	it("returns true during active trial", async () => {
		const trialEnds = new Date(Date.now() + 5 * 86400000).toISOString();

		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "trial",
				product_id: "",
				period: "monthly",
				started_at: new Date().toISOString(),
				expires_at: "",
				is_premium: 1,
				trial_started_at: new Date().toISOString(),
				trial_ends_at: trialEnds,
			}),
		});

		const result = await getIsPremium(db);

		expect(result).toBe(true);
	});

	it("returns false when trial has expired", async () => {
		const trialEnds = new Date(Date.now() - 86400000).toISOString();

		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "trial",
				product_id: "",
				period: "monthly",
				started_at: new Date().toISOString(),
				expires_at: "",
				is_premium: 0,
				trial_started_at: new Date().toISOString(),
				trial_ends_at: trialEnds,
			}),
		});

		const result = await getIsPremium(db);

		expect(result).toBe(false);
	});

	it("returns false when no subscription exists", async () => {
		const db = makeMockDb();

		const result = await getIsPremium(db);

		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// upsertSubscription includes trial fields
// ---------------------------------------------------------------------------

describe("upsertSubscription with trial fields", () => {
	it("passes trial fields to SQL", async () => {
		const db = makeMockDb();

		await upsertSubscription(db, {
			status: "trial",
			product_id: "",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: "",
			is_premium: true,
			trial_started_at: "2025-01-01T00:00:00Z",
			trial_ends_at: "2025-01-08T00:00:00Z",
		});

		expect(db.runAsync).toHaveBeenCalledTimes(1);
		const call = (db.runAsync as jest.Mock).mock.calls[0] as [string, unknown[]];
		const params = call[1];
		expect(params[7]).toBe("2025-01-01T00:00:00Z"); // trial_started_at
		expect(params[8]).toBe("2025-01-08T00:00:00Z"); // trial_ends_at
	});
});

// ---------------------------------------------------------------------------
// recordMonthlySubscription preserves trial fields
// ---------------------------------------------------------------------------

describe("recordMonthlySubscription preserves trial fields", () => {
	it("carries forward trial_started_at and trial_ends_at", async () => {
		const trialStarted = "2025-01-01T00:00:00Z";
		const trialEnds = "2025-01-08T00:00:00Z";

		const db = makeMockDb({
			getFirstAsync: jest.fn().mockResolvedValue({
				id: "singleton",
				status: "trial",
				product_id: "",
				period: "monthly",
				started_at: trialStarted,
				expires_at: "",
				is_premium: 1,
				trial_started_at: trialStarted,
				trial_ends_at: trialEnds,
			}),
		});

		await recordMonthlySubscription(db, "unmatch_monthly_499");

		// runAsync is called by upsertSubscription
		const call = (db.runAsync as jest.Mock).mock.calls[0] as [string, unknown[]];
		const params = call[1];
		expect(params[1]).toBe("active"); // status upgraded
		expect(params[7]).toBe(trialStarted); // trial_started_at preserved
		expect(params[8]).toBe(trialEnds); // trial_ends_at preserved
	});
});
