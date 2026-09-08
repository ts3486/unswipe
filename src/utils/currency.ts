// Currency utility functions for displaying locally-stored spend amounts.
// spent_amount is always stored as an integer — the entered value times 100
// (e.g. "$12.50" -> 1250, "¥1,500" -> 150000) — regardless of currency.
// No default exports. TypeScript strict mode.

import type { SupportedLocale } from "@/src/i18n";

const CURRENCY_BY_LOCALE: Record<SupportedLocale, string> = {
	en: "USD",
	ja: "JPY",
};

const INTL_LOCALE_BY_LOCALE: Record<SupportedLocale, string> = {
	en: "en-US",
	ja: "ja-JP",
};

/** Returns the ISO 4217 currency code associated with a supported locale. */
export function getCurrencyCode(locale: SupportedLocale): string {
	return CURRENCY_BY_LOCALE[locale];
}

/** Returns the currency symbol (e.g. "$", "¥") for a supported locale. */
export function getCurrencySymbol(locale: SupportedLocale): string {
	const formatted = new Intl.NumberFormat(INTL_LOCALE_BY_LOCALE[locale], {
		style: "currency",
		currency: CURRENCY_BY_LOCALE[locale],
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(0);

	return formatted.replace(/[\d.,\s]/g, "");
}

/**
 * Formats a spend amount (stored as an integer, entered value × 100) as a
 * locale-appropriate currency string. Returns null for null/zero amounts,
 * matching the "optional" nature of the field.
 */
export function formatSpentAmount(
	amountCents: number | null,
	locale: SupportedLocale,
): string | null {
	if (amountCents === null || amountCents === 0) {
		return null;
	}

	return new Intl.NumberFormat(INTL_LOCALE_BY_LOCALE[locale], {
		style: "currency",
		currency: CURRENCY_BY_LOCALE[locale],
	}).format(amountCents / 100);
}
