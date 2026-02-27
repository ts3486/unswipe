# Plan: In-App Purchases / Subscription (Phase 2.1)

## Decision Gate

> If v1 ships free with no IAP, skip this phase entirely and remove the paywall route (`/paywall`), `subscription_state` table, and related types.

If monetizing at v1, proceed below.

---

## Current State

| Layer | Status | Notes |
|-------|--------|-------|
| Domain types | Done | `SubscriptionStatus`, `SubscriptionPeriod`, `SubscriptionState` in `src/domain/types.ts` |
| DB schema | Done | `subscription_state` table (singleton row) in `src/data/database.ts` |
| Repository | Done (stub) | `getSubscription()` / `upsertSubscription()` in `src/data/repositories/subscription-repository.ts` — reads/writes DB but has no link to real purchases |
| Paywall UI | Done (stub) | `app/paywall.tsx` — hardcoded $4.99/month, $29.99/year, subscribe button shows placeholder alert |
| IAP SDK | Not installed | No RevenueCat, `expo-in-app-purchases`, or StoreKit 2 package |
| Context/hooks | Missing | No `SubscriptionContext` or `useSubscription()` hook |
| Analytics | Partial | `paywall_viewed` event fires; no purchase/restore/expiry events yet |
| Tests | Missing | No unit tests for subscription logic |

---

## Provider Choice: RevenueCat (Recommended)

**Why RevenueCat over raw StoreKit/BillingClient:**

- Server-side receipt validation out of the box (no custom backend needed — aligns with "no backend in V1")
- Handles cross-platform entitlements, grace periods, billing retry
- `react-native-purchases` SDK has first-class Expo support
- Free tier covers up to $2.5k MTR

---

## Implementation Plan

### Step 1 — App Store Connect & Google Play Setup

1. Create subscription products in App Store Connect:
   - `unmatch_monthly` — $4.99/month auto-renewable
   - `unmatch_yearly` — $29.99/year auto-renewable
2. Create matching products in Google Play Console (same product IDs)
3. Create a RevenueCat project, link both stores
4. Define an entitlement `premium` and attach both products to an offering `default`
5. Record the RevenueCat **public API key** (iOS + Android) for client-side init

### Step 2 — Install & Configure RevenueCat SDK

```bash
pnpm add react-native-purchases
npx expo prebuild --clean   # native module requires prebuild
```

**Files to create/modify:**

| File | Action |
|------|--------|
| `src/services/subscription-service.ts` | **New** — wraps RevenueCat SDK |
| `src/contexts/SubscriptionContext.tsx` | **New** — React context + `useSubscription()` hook |
| `app/_layout.tsx` | **Modify** — init RevenueCat on app start, wrap tree with `SubscriptionProvider` |
| `app.json` | **Modify** — add RevenueCat plugin if needed |

**`subscription-service.ts` responsibilities:**

- `initPurchases()` — call `Purchases.configure({ apiKey })` on app start
- `getOfferings()` — fetch current offerings (products + pricing)
- `purchasePackage(pkg)` — initiate purchase flow, return `CustomerInfo`
- `restorePurchases()` — call `Purchases.restorePurchases()`
- `getCustomerInfo()` — check current entitlement status
- `isPremium(info: CustomerInfo): boolean` — check if `premium` entitlement is active

### Step 3 — SubscriptionContext + Hook

```
src/contexts/SubscriptionContext.tsx
```

- On mount: call `getCustomerInfo()`, sync state to context
- Listen to `Purchases.addCustomerInfoUpdateListener` for real-time updates (renewal, expiry, grace period)
- Expose:
  - `isPremium: boolean`
  - `offerings: PurchasesOffering | null`
  - `purchase(pkg): Promise<void>`
  - `restore(): Promise<void>`
  - `loading: boolean`

### Step 4 — Wire Paywall Screen to Real Purchases

**Modify `app/paywall.tsx`:**

1. Replace hardcoded prices with `offerings.current.availablePackages` (dynamic pricing from store)
2. Subscribe button → call `purchase(selectedPackage)` from context
3. Restore button → call `restore()` from context
4. Handle error states: user cancelled, payment failed, network error
5. On successful purchase → navigate back, show success feedback
6. Fire analytics events:
   - `subscription_started` (product_id, period)
   - `subscription_restored`
   - `subscription_failed` (error_code) — no PII

### Step 5 — Sync Purchase State to Local DB

**Modify `subscription-repository.ts`:**

- Add `syncFromCustomerInfo(db, info: CustomerInfo)` function
- Map RevenueCat entitlement to local `subscription_state` row:
  - `status`: `active` if entitlement is active, `expired` if expired, `none` if never purchased
  - `product_id`: from entitlement
  - `period`: derive from product ID
  - `started_at`: original purchase date
  - `expires_at`: expiration date
- Call this function whenever `CustomerInfo` updates (listener + app foreground)

**Why keep local DB in sync?** Offline access — the app can check `isPremium` from SQLite without network.

### Step 6 — Gate Premium Features

Add checks in relevant screens/hooks:

- Extended courses → check `isPremium` before unlocking
- Detailed analytics → check `isPremium`
- Smart reminders → check `isPremium`
- Data export → check `isPremium`

Show paywall prompt when a non-premium user taps a gated feature.

### Step 7 — Handle Edge Cases

| Scenario | Handling |
|----------|----------|
| Subscription expires | `CustomerInfo` listener fires → update DB → UI reflects free tier |
| Grace period (billing retry) | RevenueCat keeps entitlement active during grace → no action needed |
| Refund | RevenueCat revokes entitlement → listener fires → update DB |
| Family sharing | RevenueCat handles automatically |
| App reinstall | `restorePurchases()` on first launch (or user taps Restore) |
| Offline purchase check | Read from local `subscription_state` table |
| Sandbox testing | Use RevenueCat sandbox mode + App Store sandbox accounts |

### Step 8 — Tests

**Unit tests (`__tests__/services/subscription-service.test.ts`):**

- Mock `react-native-purchases` module
- Test `isPremium()` returns correct boolean for active/expired/none
- Test `syncFromCustomerInfo()` maps entitlement to correct DB fields
- Test purchase error handling (cancelled, failed)

**Integration tests:**

- Sandbox purchase on iOS simulator (App Store sandbox account)
- Sandbox purchase on Android emulator (license testing account)
- Restore flow after app reinstall
- Subscription expiry simulation

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/subscription-service.ts` | Create | RevenueCat SDK wrapper |
| `src/contexts/SubscriptionContext.tsx` | Create | React context + hook |
| `src/data/repositories/subscription-repository.ts` | Modify | Add `syncFromCustomerInfo()` |
| `app/paywall.tsx` | Modify | Wire to real purchase flow |
| `app/_layout.tsx` | Modify | Init RevenueCat, add provider |
| `__tests__/services/subscription-service.test.ts` | Create | Unit tests |
| `package.json` | Modify | Add `react-native-purchases` |

---

## Risks & Open Questions

1. **RevenueCat free tier limit** — $2.5k MTR; if exceeded, need paid plan or alternative
2. **Expo managed workflow** — `react-native-purchases` requires native modules → must use `npx expo prebuild` (already the case for this project)
3. **Product ID naming** — Confirm final IDs with App Store Connect before hardcoding
4. **Pricing localization** — RevenueCat returns localized prices from stores; UI should display these, not hardcoded USD values
5. **Skip-if-free decision** — Must be finalized before starting this work; if free, remove paywall route, subscription table, and related code
