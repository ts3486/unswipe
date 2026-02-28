# Implementation Gap Analysis & Fix Plan

## Context

The `feature/free-trial-paywall` branch has gaps between SPEC.md and the actual code. The paywall uses a **monthly $4.99 subscription + 7-day free trial** model.

**Subscription model (confirmed):**
- Trial starts → `isPremium = true` (all features unlocked immediately)
- Trial expires + subscription auto-renews → `isPremium` stays `true`
- User cancels / subscription lapses → `isPremium = false` → paywall
- `isPremium` is the **single gate** for all features

The data layer (`subscription-repository.ts`) already implements this correctly — `recordTrialStart()` sets `is_premium: true`, and `rowToSubscriptionState()` recomputes `is_premium` based on trial expiry + subscription status. The `_layout.tsx` guard (`if (!isPremium) → paywall`) is correct.

The main gaps are: purchase flow not wired to RevenueCat, no subscription sync on app foreground, missing UI components, and SPEC out of date.

---

## Critical Issues

### 1. Wire paywall purchase to RevenueCat (`app/paywall.tsx:77-97`)
- **Current**: `handlePurchase` uses `setTimeout` stub — fake purchase
- **Current**: `handleRestore` shows "not available yet"
- **Available**: `subscription-service.ts` has `purchasePackage()`, `restorePurchases()`, `getOfferings()`, `syncSubscriptionToDb()`
- **Fix**:
  - `handlePurchase`: Call `getOfferings()` → `purchasePackage()` → `syncSubscriptionToDb()` → `refreshPremiumStatus()` → navigate
  - `handleRestore`: Call `restorePurchases()` → `syncSubscriptionToDb()` → `refreshPremiumStatus()` → navigate if premium
- Files: `app/paywall.tsx`

### 2. Add RevenueCat sync on app foreground (`app/_layout.tsx`)
- **Problem**: If the subscription renews or expires via the App Store, the local DB `is_premium` is stale until the app checks
- **Fix**: On app foreground (AppState change background → active), call `getCustomerInfo()` → `syncSubscriptionToDb()` → `refreshPremiumStatus()`
- This keeps `isPremium` in sync with the App Store at all times
- Files: `app/_layout.tsx` or `src/contexts/AppStateContext.tsx`

### 3. Fix `dailyTaskCompleted` hardcoded to `false` (`src/contexts/AppStateContext.tsx:136`)
- Learn course completion doesn't count toward daily success
- **Fix**: Query `content_progress` table for today's completions, pass result to `isDaySuccess()`
- Files: `src/contexts/AppStateContext.tsx`, `src/data/repositories/content-repository.ts` (may need new query)

### 4. Update SPEC.md to match confirmed model
- Change one-time $6.99 references → monthly $4.99 + 7-day free trial
- Update "Resist Rank" → "Meditation Rank" throughout
- Remove "1 free panic reset" gating references
- Clarify: `isPremium` is the single gate, covers trial + paid
- Files: `SPEC.md`

---

## Missing Home Screen Features

### 5. Add TimeSaved counter to Home (`app/(tabs)/index.tsx`)
- `src/components/TimeSavedCard.tsx` exists but is NOT rendered
- **Fix**: Import and render in home scroll content
- Needs: weekly meditation count (from `useWeeklySuccessCount` hook)

### 6. Add Daily Motivation card to Home (`app/(tabs)/index.tsx`)
- `src/components/MotivationCard.tsx` exists but is NOT rendered
- **Fix**: Import and render in home scroll content

### 7. Add stat cards (streak, meditation count) to Home (`app/(tabs)/index.tsx`)
- `StatCard` sub-component defined at line 164-188 but never used in render
- **Fix**: Add stat row with streak + meditation count using existing `StatCard`

---

## Missing Settings Features

### 8. Add "Why We Charge" section (`app/(tabs)/settings.tsx`)
- SPEC says: tappable row "Why Unmatch costs money" with explanation
- **Fix**: Add expandable List.Item under Plan section

### 9. Improve Plan section state handling (`app/(tabs)/settings.tsx`)
- Currently shows: trial active OR "Unmatch Unlocked"
- Missing: explicit "Subscribe" CTA for trial users, clearer messaging
- **Fix**: Handle all states clearly (trial active + days remaining, paid/active)

---

## Code Quality / Bugs

### 10. Fix redundant ternary (`app/(tabs)/panic.tsx:275-277`)
- Both branches produce identical text: "Tap to start a guided reset"
- **Fix**: Replace with plain string

### 11. Delete unused LifeTree components
- `src/components/LifeTree.tsx` and `src/components/LifeTreeCompact.tsx` — near-identical clones of MeditationRank, not imported anywhere
- **Fix**: Delete both files

### 12. Clean up unused `StatCard` if used in Issue #7
- If added to render, resolved. If not, remove dead code.

---

## Out of Scope (Not Blocking Launch)
- Firebase analytics integration (NoopAdapter fine for V1)
- Android RevenueCat key (before Android release)
- Audio cues for breathing (post-launch)
- Paywall layout redesign (current layout works, polish later)

---

## Execution Order

1. Wire paywall to RevenueCat (purchase + restore) — **Issue #1**
2. Add RevenueCat sync on app foreground — **Issue #2**
3. Fix `dailyTaskCompleted` in AppStateContext — **Issue #3**
4. Add missing Home components (TimeSaved, Motivation, StatCards) — **Issues #5-7**
5. Update Settings (Why We Charge, plan states) — **Issues #8-9**
6. Fix bugs (ternary, dead code) — **Issues #10-12**
7. Update SPEC.md — **Issue #4**
8. Run `pnpm run preflight` to validate

## Verification
- `pnpm run preflight` (typecheck + lint + test) must pass
- Manual: onboarding → paywall → start trial → `isPremium = true` → all tabs work
- Manual: simulate trial expiry → `isPremium = false` → paywall shown
- Manual: purchase via RevenueCat → `isPremium = true` → all tabs work
- Manual: app backgrounded → foregrounded → premium status synced
- Manual: Learn completion → daily success chip appears
- Manual: Home shows TimeSaved, Motivation, StatCards
