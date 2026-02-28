// Tests for subscription-service.
// TDD: written before the implementation.

import { RC_ENTITLEMENT_ID } from "@/src/constants/config";
import {
	enforceSubscriptionExpiry,
	getCustomerInfo,
	initPurchases,
	isPremiumFromCustomerInfo,
	restorePurchases,
	syncSubscriptionToDb,
} from "@/src/services/subscription-service";
import Purchases from "react-native-purchases";
import { makeEmptyCustomerInfo } from "../../__mocks__/react-native-purchases";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePremiumCustomerInfo(
	productIdentifier: string,
	expirationDate: string | null = "2099-01-01T00:00:00Z",
) {
	const info = makeEmptyCustomerInfo();
	info.entitlements.active[RC_ENTITLEMENT_ID] = {
		productIdentifier,
		expirationDate,
	};
	return info;
}

// Minimal mock DB that records upsertSubscription calls.
function createMockDb() {
	const calls: unknown[][] = [];
	return {
		runAsync: jest.fn(async (_sql: string, params: unknown[]) => {
			calls.push(params);
		}),
		getFirstAsync: jest.fn().mockResolvedValue(null),
		_calls: calls,
	};
}

// ---------------------------------------------------------------------------
// isPremiumFromCustomerInfo
// ---------------------------------------------------------------------------

describe("isPremiumFromCustomerInfo", () => {
	it("returns true when premium entitlement is active", () => {
		const info = makePremiumCustomerInfo("unmatch_monthly_499");
		expect(isPremiumFromCustomerInfo(info)).toBe(true);
	});

	it("returns false when entitlements are empty", () => {
		const info = makeEmptyCustomerInfo();
		expect(isPremiumFromCustomerInfo(info)).toBe(false);
	});

	it("returns true for lifetime (no expiration)", () => {
		const info = makePremiumCustomerInfo("unmatch_lifetime_2999", null);
		expect(isPremiumFromCustomerInfo(info)).toBe(true);
	});

	it("returns false when a different entitlement is active", () => {
		const info = makeEmptyCustomerInfo();
		info.entitlements.active.other_entitlement = {
			productIdentifier: "other_product",
			expirationDate: "2099-01-01T00:00:00Z",
		};
		expect(isPremiumFromCustomerInfo(info)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// syncSubscriptionToDb
// ---------------------------------------------------------------------------

describe("syncSubscriptionToDb", () => {
	it("writes active monthly subscription", async () => {
		const info = makePremiumCustomerInfo(
			"unmatch_monthly_499",
			"2099-06-01T00:00:00Z",
		);
		const db = createMockDb();

		await syncSubscriptionToDb(db as never, info);

		// First call is getFirstAsync (reading existing), second is runAsync (upsert)
		expect(db.runAsync).toHaveBeenCalledTimes(1);
		const params = db._calls[0];
		// params: [id, status, product_id, period, started_at, expires_at, is_premium, trial_started_at, trial_ends_at]
		expect(params[0]).toBe("singleton");
		expect(params[1]).toBe("active"); // status
		expect(params[2]).toBe("unmatch_monthly_499"); // product_id
		expect(params[3]).toBe("monthly"); // period
		expect(params[5]).toBe("2099-06-01T00:00:00Z"); // expires_at
		expect(params[6]).toBe(1); // is_premium
		expect(params[7]).toBe(""); // trial_started_at preserved (empty)
		expect(params[8]).toBe(""); // trial_ends_at preserved (empty)
	});

	it("writes lifetime purchase", async () => {
		const info = makePremiumCustomerInfo("unmatch_lifetime_2999", null);
		const db = createMockDb();

		await syncSubscriptionToDb(db as never, info);

		const params = db._calls[0];
		expect(params[1]).toBe("lifetime");
		expect(params[2]).toBe("unmatch_lifetime_2999");
		expect(params[3]).toBe("lifetime");
		expect(params[5]).toBe(""); // no expiration
		expect(params[6]).toBe(1);
	});

	it("writes none when no entitlement", async () => {
		const info = makeEmptyCustomerInfo();
		const db = createMockDb();

		await syncSubscriptionToDb(db as never, info);

		const params = db._calls[0];
		expect(params[1]).toBe("none");
		expect(params[2]).toBe("");
		expect(params[3]).toBe("lifetime"); // default period
		expect(params[6]).toBe(0); // is_premium = false
	});

	it("writes expired when no entitlement and local expires_at is past", async () => {
		const info = makeEmptyCustomerInfo();
		const db = createMockDb();
		// Existing row was an active subscription that has since expired
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "active",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: "2025-02-01T00:00:00Z", // past
			is_premium: 1,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await syncSubscriptionToDb(db as never, info);

		const params = db._calls[0];
		expect(params[1]).toBe("expired"); // status should be expired, not none
		expect(params[6]).toBe(0); // is_premium = false
	});

	it("preserves trial fields from existing subscription", async () => {
		const info = makePremiumCustomerInfo(
			"unmatch_monthly_499",
			"2099-06-01T00:00:00Z",
		);
		const db = createMockDb();
		// Simulate existing row with trial fields
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "trial",
			product_id: "",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: "",
			is_premium: 1,
			trial_started_at: "2025-01-01T00:00:00Z",
			trial_ends_at: "2025-01-08T00:00:00Z",
		});

		await syncSubscriptionToDb(db as never, info);

		const params = db._calls[0];
		expect(params[7]).toBe("2025-01-01T00:00:00Z"); // trial_started_at preserved
		expect(params[8]).toBe("2025-01-08T00:00:00Z"); // trial_ends_at preserved
	});
});

// ---------------------------------------------------------------------------
// initPurchases
// ---------------------------------------------------------------------------

describe("initPurchases", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("calls Purchases.configure with an apiKey", async () => {
		await initPurchases();
		expect(Purchases.configure).toHaveBeenCalledTimes(1);
		expect(Purchases.configure).toHaveBeenCalledWith(
			expect.objectContaining({ apiKey: expect.any(String) }),
		);
	});
});

// ---------------------------------------------------------------------------
// getCustomerInfo
// ---------------------------------------------------------------------------

describe("getCustomerInfo", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("delegates to Purchases.getCustomerInfo", async () => {
		const expected = makePremiumCustomerInfo("unmatch_monthly_499");
		(Purchases.getCustomerInfo as jest.Mock).mockResolvedValueOnce(expected);

		const result = await getCustomerInfo();
		expect(Purchases.getCustomerInfo).toHaveBeenCalledTimes(1);
		expect(result).toBe(expected);
	});
});

// ---------------------------------------------------------------------------
// restorePurchases
// ---------------------------------------------------------------------------

describe("restorePurchases", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("delegates to Purchases.restorePurchases", async () => {
		const expected = makePremiumCustomerInfo("unmatch_lifetime_2999", null);
		(Purchases.restorePurchases as jest.Mock).mockResolvedValueOnce(expected);

		const result = await restorePurchases();
		expect(Purchases.restorePurchases).toHaveBeenCalledTimes(1);
		expect(result).toBe(expected);
	});
});

// ---------------------------------------------------------------------------
// enforceSubscriptionExpiry (offline fallback)
// ---------------------------------------------------------------------------

describe("enforceSubscriptionExpiry", () => {
	it("does nothing when no subscription exists", async () => {
		const db = createMockDb();

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});

	it("does nothing for lifetime subscriptions", async () => {
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "lifetime",
			product_id: "unmatch_lifetime_2999",
			period: "lifetime",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: "",
			is_premium: 1,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});

	it("does nothing when expires_at is empty", async () => {
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "active",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: "",
			is_premium: 1,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});

	it("does nothing when subscription is still within grace period", async () => {
		// Expired 1 day ago — within the 3-day grace period
		const expiredRecently = new Date(
			Date.now() - 1 * 24 * 60 * 60 * 1000,
		).toISOString();
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "active",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: expiredRecently,
			is_premium: 1,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});

	it("marks subscription expired when past grace period", async () => {
		// Expired 4 days ago — past the 3-day grace period
		const expiredLongAgo = new Date(
			Date.now() - 4 * 24 * 60 * 60 * 1000,
		).toISOString();
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "active",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: expiredLongAgo,
			is_premium: 1,
			trial_started_at: "2025-01-01T00:00:00Z",
			trial_ends_at: "2025-01-08T00:00:00Z",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).toHaveBeenCalledTimes(1);
		const params = db._calls[0];
		expect(params[1]).toBe("expired"); // status
		expect(params[6]).toBe(0); // is_premium = false
		expect(params[7]).toBe("2025-01-01T00:00:00Z"); // trial_started_at preserved
		expect(params[8]).toBe("2025-01-08T00:00:00Z"); // trial_ends_at preserved
	});

	it("does nothing when subscription is not yet expired", async () => {
		const futureDate = new Date(
			Date.now() + 10 * 24 * 60 * 60 * 1000,
		).toISOString();
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "active",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: futureDate,
			is_premium: 1,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});

	it("does nothing for already-expired records (status=expired)", async () => {
		const expiredLongAgo = new Date(
			Date.now() - 10 * 24 * 60 * 60 * 1000,
		).toISOString();
		const db = createMockDb();
		(db.getFirstAsync as jest.Mock).mockResolvedValue({
			id: "singleton",
			status: "expired",
			product_id: "unmatch_monthly_499",
			period: "monthly",
			started_at: "2025-01-01T00:00:00Z",
			expires_at: expiredLongAgo,
			is_premium: 0,
			trial_started_at: "",
			trial_ends_at: "",
		});

		await enforceSubscriptionExpiry(db as never);

		expect(db.runAsync).not.toHaveBeenCalled();
	});
});
