// Manual mock for react-native-purchases.
// Used in Jest (Node environment) so subscription-service logic can be tested
// without native IAP modules.

// ---------------------------------------------------------------------------
// Error codes enum mock
// ---------------------------------------------------------------------------

export const PURCHASES_ERROR_CODE = {
	PURCHASE_CANCELLED_ERROR: 1,
	STORE_PROBLEM_ERROR: 2,
	PURCHASE_NOT_ALLOWED_ERROR: 3,
	PURCHASE_INVALID_ERROR: 4,
	PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR: 5,
	PRODUCT_ALREADY_PURCHASED_ERROR: 6,
	RECEIPT_ALREADY_IN_USE_ERROR: 7,
	INVALID_RECEIPT_ERROR: 8,
	MISSING_RECEIPT_FILE_ERROR: 9,
	NETWORK_ERROR: 10,
	INVALID_CREDENTIALS_ERROR: 11,
	UNEXPECTED_BACKEND_RESPONSE_ERROR: 12,
	INVALID_APP_USER_ID_ERROR: 14,
	OPERATION_ALREADY_IN_PROGRESS_ERROR: 15,
	UNKNOWN_BACKEND_ERROR: 16,
} as const;

// ---------------------------------------------------------------------------
// Default empty CustomerInfo shape
// ---------------------------------------------------------------------------

export function makeEmptyCustomerInfo() {
	return {
		entitlements: {
			active: {} as Record<
				string,
				{ productIdentifier: string; expirationDate: string | null }
			>,
			all: {},
		},
		activeSubscriptions: [] as string[],
		allPurchasedProductIdentifiers: [] as string[],
		latestExpirationDate: null as string | null,
		firstSeen: "2025-01-01T00:00:00Z",
		originalAppUserId: "mock-user",
		requestDate: "2025-01-01T00:00:00Z",
		originalApplicationVersion: null,
		originalPurchaseDate: null,
		managementURL: null,
	};
}

// ---------------------------------------------------------------------------
// SDK method mocks
// ---------------------------------------------------------------------------

const Purchases = {
	configure: jest.fn().mockResolvedValue(undefined),
	getOfferings: jest.fn().mockResolvedValue({ current: null }),
	getCustomerInfo: jest.fn().mockResolvedValue(makeEmptyCustomerInfo()),
	purchasePackage: jest
		.fn()
		.mockResolvedValue({ customerInfo: makeEmptyCustomerInfo() }),
	restorePurchases: jest.fn().mockResolvedValue(makeEmptyCustomerInfo()),
	addCustomerInfoUpdateListener: jest.fn(),
	removeCustomerInfoUpdateListener: jest.fn().mockReturnValue(true),
};

export default Purchases;
