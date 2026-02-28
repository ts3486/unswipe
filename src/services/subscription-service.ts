// Subscription service — wraps RevenueCat SDK for IAP operations.
// All functions are individually exported (matches codebase service pattern).
// No default exports. TypeScript strict mode.

import {
	RC_ENTITLEMENT_ID,
	REVENUECAT_API_KEY_ANDROID,
	REVENUECAT_API_KEY_IOS,
} from "@/src/constants/config";
import { getSubscription, upsertSubscription } from "@/src/data/repositories/subscription-repository";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";
import Purchases from "react-native-purchases";
import type {
	PurchasesOffering,
	PurchasesPackage,
} from "react-native-purchases";

// ---------------------------------------------------------------------------
// Types re-exported for consumers
// ---------------------------------------------------------------------------

/** Shape of RevenueCat CustomerInfo entitlement entry. */
interface EntitlementInfo {
	productIdentifier: string;
	expirationDate: string | null;
}

/** Minimal CustomerInfo shape used by this service. */
export interface CustomerInfo {
	entitlements: {
		active: Record<string, EntitlementInfo>;
	};
}

// ---------------------------------------------------------------------------
// SDK lifecycle
// ---------------------------------------------------------------------------

/**
 * Configures the RevenueCat SDK with the platform-appropriate API key.
 * Must be called once on app launch before any other RC operations.
 */
export async function initPurchases(): Promise<void> {
	const apiKey =
		Platform.OS === "ios" ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;

	await Purchases.configure({ apiKey });
}

// ---------------------------------------------------------------------------
// Offerings
// ---------------------------------------------------------------------------

/**
 * Returns the current RevenueCat offering, or null if unavailable.
 */
export async function getOfferings(): Promise<PurchasesOffering | null> {
	const offerings = await Purchases.getOfferings();
	return offerings.current ?? null;
}

// ---------------------------------------------------------------------------
// Purchase operations
// ---------------------------------------------------------------------------

/**
 * Initiates a purchase for the given package and returns updated CustomerInfo.
 */
export async function purchasePackage(
	pkg: PurchasesPackage,
): Promise<CustomerInfo> {
	const result = await Purchases.purchasePackage(pkg);
	return result.customerInfo as unknown as CustomerInfo;
}

/**
 * Restores previous purchases and returns updated CustomerInfo.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
	return (await Purchases.restorePurchases()) as CustomerInfo;
}

/**
 * Fetches current CustomerInfo (silent restore — no UI).
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
	return (await Purchases.getCustomerInfo()) as CustomerInfo;
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * Returns true if CustomerInfo contains an active premium entitlement.
 * Pure function — no SDK calls.
 */
export function isPremiumFromCustomerInfo(info: CustomerInfo): boolean {
	return RC_ENTITLEMENT_ID in info.entitlements.active;
}

// ---------------------------------------------------------------------------
// DB sync
// ---------------------------------------------------------------------------

/**
 * Maps RevenueCat CustomerInfo to the local subscription_state table.
 * Uses the existing upsertSubscription from subscription-repository.
 *
 * - Active entitlement with 'lifetime' in product ID → status=lifetime, period=lifetime
 * - Active entitlement otherwise → status=active, period=monthly
 * - No entitlement → status=none, is_premium=false
 */
export async function syncSubscriptionToDb(
	db: SQLiteDatabase,
	info: CustomerInfo,
): Promise<void> {
	const existing = await getSubscription(db);
	const trialStartedAt = existing?.trial_started_at ?? "";
	const trialEndsAt = existing?.trial_ends_at ?? "";

	const entitlement = info.entitlements.active[RC_ENTITLEMENT_ID];

	if (!entitlement) {
		await upsertSubscription(db, {
			status: "none",
			product_id: "",
			period: "lifetime",
			started_at: "",
			expires_at: "",
			is_premium: false,
			trial_started_at: trialStartedAt,
			trial_ends_at: trialEndsAt,
		});
		return;
	}

	const productId = entitlement.productIdentifier;
	const isLifetime = productId.includes("lifetime");

	await upsertSubscription(db, {
		status: isLifetime ? "lifetime" : "active",
		product_id: productId,
		period: isLifetime ? "lifetime" : "monthly",
		started_at: new Date().toISOString(),
		expires_at: entitlement.expirationDate ?? "",
		is_premium: true,
		trial_started_at: trialStartedAt,
		trial_ends_at: trialEndsAt,
	});
}
