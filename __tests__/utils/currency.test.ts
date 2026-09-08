// Unit tests for src/utils/currency.ts.
// Pure unit tests — no database, no async, no network.

import {
	formatSpentAmount,
	getCurrencyCode,
	getCurrencySymbol,
} from "@/src/utils/currency";

// ---------------------------------------------------------------------------
// getCurrencyCode
// ---------------------------------------------------------------------------

describe("getCurrencyCode", () => {
	it("returns USD for en", () => {
		expect(getCurrencyCode("en")).toBe("USD");
	});

	it("returns JPY for ja", () => {
		expect(getCurrencyCode("ja")).toBe("JPY");
	});
});

// ---------------------------------------------------------------------------
// getCurrencySymbol
// ---------------------------------------------------------------------------

describe("getCurrencySymbol", () => {
	it("returns $ for en", () => {
		expect(getCurrencySymbol("en")).toBe("$");
	});

	it("returns ￥ for ja", () => {
		expect(getCurrencySymbol("ja")).toBe("￥");
	});
});

// ---------------------------------------------------------------------------
// formatSpentAmount
// ---------------------------------------------------------------------------

describe("formatSpentAmount", () => {
	it("returns null when amount is null", () => {
		expect(formatSpentAmount(null, "en")).toBeNull();
	});

	it("returns null when amount is zero", () => {
		expect(formatSpentAmount(0, "en")).toBeNull();
	});

	it("formats a USD amount stored as integer cents", () => {
		expect(formatSpentAmount(1250, "en")).toBe("$12.50");
	});

	it("formats a JPY amount stored as integer hundredths", () => {
		expect(formatSpentAmount(150000, "ja")).toBe("￥1,500");
	});

	it("rounds a fractional JPY amount to the nearest yen", () => {
		expect(formatSpentAmount(150030, "ja")).toBe("￥1,500");
	});
});
