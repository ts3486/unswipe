# Production Checklist — Unmatch v1.0.0

Status snapshot as of 2026-02-23. Covers every gap between the current codebase and a successful App Store / Google Play submission.

---

## Current State Summary

| Area | Status |
|---|---|
| Routes (10/10) | Done |
| SQLite data layer | Done |
| Domain logic + rules | Done & tested |
| Unit tests (204 passing) | Done |
| Seed data (catalog + 7-day course) | Done |
| Onboarding (5-step) | Done |
| Panic flow state machine | Done |
| Analytics types + privacy | Done (stub adapter) |
| EAS build/submit scripts | Done |
| Push notifications | Plugin configured, no logic |
| In-app purchases / paywall | Screen exists, no SKU logic |
| Crash reporting | Missing |
| Legal docs (privacy policy, ToS) | Missing |
| App Store assets & metadata | Partially done |

---

## Phase 1 — Blocking for Submission

These must be completed before any store review is possible.

### 1.1 Legal Documents
- [ ] Draft a **Privacy Policy** covering:
  - Data collected (mood, urge events, spend flags — all local-only)
  - Analytics events sent (list event names, confirm no PII/notes/amounts)
  - Third-party SDKs used (analytics provider, crash reporter)
  - User rights: export and delete (already implemented in /settings/privacy)
  - No backend / no account — all data stays on device
  - COPPA / age gate statement (13+ or 17+ depending on rating)
- [ ] Draft **Terms of Service** covering:
  - Not medical advice / not therapy / not a cure
  - No guarantee of blocking dating apps
  - Subscription auto-renewal terms (if applicable)
  - Limitation of liability
- [ ] Host both documents at a public URL (e.g. GitHub Pages, Notion public page, or simple static site)
- [ ] Link the URLs in App Store Connect and Google Play Console listing

### 1.2 App Store Connect / Google Play Console Setup
- [ ] Create **App Store Connect** app record
  - Bundle ID: `com.h25ksmwn99.unmatch` (or finalize a production bundle ID)
  - Primary category: **Health & Fitness** (alt: Lifestyle)
  - Content rating questionnaire (no gambling, no medical, no sexual content)
  - Age rating: likely **12+** or **4+** given no explicit content
- [ ] Create **Google Play Console** app record
  - Package: `com.unmatch.app`
  - Content rating (IARC questionnaire)
  - Data safety section (declare: no data shared, local storage only, optional analytics)
- [ ] Prepare **App Store screenshots** (required sizes):
  - iPhone 6.7" (1290×2796) — required
  - iPhone 6.5" (1284×2778) — required
  - iPad 12.9" (2048×2732) — if `supportsTablet: true` stays on
  - Consider setting `supportsTablet: false` if iPad layout is untested
- [ ] Prepare **Google Play screenshots** (min 2, max 8, 16:9 or 9:16)
- [ ] Write **App Store description** (short + long) and **keywords**
- [ ] Write **Google Play description** (short 80 chars + full 4000 chars)
- [ ] Design **feature graphic** for Google Play (1024×500)

### 1.3 Asset Optimization
- [ ] Compress icon images (currently 5-7 MB each — should be <500 KB)
  - `icon.png` → 1024×1024 PNG, no alpha, no rounded corners (Apple adds rounding)
  - `adaptive-icon.png` → 1024×1024 with safe zone for Android masking
  - `splash-icon.png` → compress, verify bg matches `#0B1220`
  - `favicon.png` → 48×48 or 196×196, compress heavily
- [ ] Verify adaptive icon safe zone (foreground must look correct in circle, squircle, and rounded square masks)
- [ ] Test splash screen on multiple device sizes

### 1.4 Bundle ID / Signing
- [ ] Confirm final iOS bundle ID (current: `com.h25ksmwn99.unmatch` — consider a cleaner one)
- [ ] Provision iOS **Distribution Certificate** and **App Store Provisioning Profile** (or let EAS handle via `--auto-submit`)
- [ ] Confirm Android **upload keystore** is configured in EAS credentials
- [ ] Verify `ITSAppUsesNonExemptEncryption: false` is correct (no custom encryption = correct)

---

## Phase 2 — Required Functionality Gaps

Features that are either missing or stub-only. Not all are hard blockers for review, but many are needed for a real product.

### 2.1 In-App Purchases / Subscription (if monetizing at v1)
- [ ] Integrate **RevenueCat** or **expo-in-app-purchases** / StoreKit 2
- [ ] Define product SKUs in App Store Connect and Google Play
- [ ] Wire paywall screen (`/paywall`) to real purchase flow
- [ ] Handle purchase restoration
- [ ] Handle subscription expiry / grace period
- [ ] Add receipt validation (RevenueCat handles this server-side)
- [ ] Test sandbox purchases on both platforms
- [ ] Update `subscription-repository.ts` to track real purchase state

> If v1 ships free with no IAP, skip this phase entirely and remove the paywall route / subscription table.

### 2.2 Push Notifications
- [ ] Request notification permissions (respect user's `notification_style` choice from onboarding)
- [ ] Implement **local scheduled notifications** for:
  - Daily check-in reminder (morning)
  - Streak encouragement (evening if no check-in yet)
  - Course day unlocks
- [ ] Handle `stealth` mode (neutral wording, no app name in notification body)
- [ ] Handle `off` mode (no notifications scheduled)
- [ ] Test notification behavior when app is backgrounded / killed

### 2.3 Crash Reporting
- [ ] Add **Sentry** (`@sentry/react-native` + `sentry-expo`) or equivalent
- [ ] Configure source maps upload in EAS build
- [ ] Add global **ErrorBoundary** component wrapping the root layout
- [ ] Verify no PII (notes, spend amounts) leaks into crash reports

### 2.5 Analytics Provider
- [ ] Choose provider: **PostHog**, **Mixpanel**, **Amplitude**, or **Firebase Analytics**
- [ ] Implement the `AnalyticsAdapter` interface in `src/services/analytics.ts`
- [ ] Wire the real adapter into `AnalyticsContext`
- [ ] Verify event payloads in provider dashboard match spec
- [ ] Confirm `note` and `spend_amount` never appear in any event

---

## Phase 3 — Quality & Polish

### 3.1 Testing
- [ ] Run full unit test suite — confirm 204/204 pass: `npm test`
- [ ] Run TypeScript check: `npm run typecheck`
- [ ] Run linter: `npm run lint`
- [ ] Run Maestro E2E flows on a real device / simulator:
  - `01-onboarding.yaml`
  - `02-panic-swipe.yaml`
  - `03-panic-spend.yaml`
  - `04-settings.yaml`
  - `05-export-delete.yaml`
- [ ] **Ship checklist tests** (per CLAUDE.md):
  - [ ] Airplane mode: full panic flow works offline
  - [ ] Local midnight boundary: day rolls over correctly at device midnight
  - [ ] Export/delete: data export produces valid JSON, delete wipes DB
  - [ ] Forbidden wording scan: no cure/treatment/sexual/coaching language
  - [ ] Analytics payload review: no PII in any event

### 3.2 Accessibility
- [ ] Add `accessibilityLabel` to all icon-only buttons (tab bar icons, close buttons)
- [ ] Add `testID` props to key interactive elements (for E2E and a11y testing)
- [ ] Test full flows with **VoiceOver** (iOS) and **TalkBack** (Android)
- [ ] Verify color contrast meets WCAG AA (especially muted text `#A7B3C7` on `#121C2E`)
- [ ] Ensure touch targets are at least 44×44pt

### 3.3 Performance
- [ ] Profile app startup time — target <2s to interactive on mid-range device
- [ ] Verify SQLite queries don't block the UI thread (all async via expo-sqlite v16)
- [ ] Check Reanimated animations run on the UI thread (no JS thread jank)
- [ ] Test with 90+ days of data (progress calendar, streaks)

### 3.4 Edge Cases
- [ ] Device timezone change mid-day — streak and day boundary stay consistent
- [ ] Very long onboarding (user kills app mid-onboarding, reopens)
- [ ] Database corruption recovery (SQLite WAL mode helps, but test)
- [ ] Low disk space behavior
- [ ] Background app refresh / state restoration

### 3.5 UI Polish
- [ ] Review all screens on small devices (iPhone SE / 4" Android)
- [ ] Review all screens on large devices (iPhone 15 Pro Max / tablet if `supportsTablet: true`)
- [ ] Verify keyboard avoidance on check-in form and budget input
- [ ] Confirm safe area insets on notched devices and dynamic island
- [ ] Dark mode consistency — no white flashes, all Paper components use theme

---

## Phase 4 — Build, Test, Submit

### 4.1 Production Build
- [ ] Run production build: `npm run build:ios` and `npm run build:android`
- [ ] Install production build on a real device (not simulator)
- [ ] Full manual QA pass on production build:
  - Onboarding → Home → Panic flow → Check-in → Progress → Learn → Settings
  - Data export and delete
  - Notification toggle

### 4.2 App Store Submission (iOS)
- [ ] Upload build via EAS: `npm run submit:ios`
- [ ] Fill out App Store Connect metadata:
  - Description, keywords, category, screenshots, privacy policy URL
  - App Review notes (explain the app's purpose, provide test account if needed)
  - Content rating
- [ ] Submit for review
- [ ] Common rejection reasons to pre-check:
  - [ ] App must have enough content/features to be useful (not a "demo")
  - [ ] Privacy policy URL must be accessible and accurate
  - [ ] If IAP exists, restore purchases must work
  - [ ] No placeholder content or lorem ipsum
  - [ ] `supportsTablet: true` means iPad must actually work

### 4.3 Google Play Submission (Android)
- [ ] Upload build via EAS: `npm run submit:android`
- [ ] Fill out Play Console metadata:
  - Description, screenshots, feature graphic, category
  - Data safety declaration
  - Content rating (IARC)
  - Privacy policy URL
- [ ] Target API level must meet Google's current minimum (API 34+ as of 2026)
- [ ] Submit for review

---

## Phase 5 — Post-Launch

### 5.1 Monitoring
- [ ] Monitor crash reports in Sentry / chosen provider
- [ ] Monitor analytics for drop-off points (onboarding completion rate, panic flow completion)
- [ ] Monitor App Store / Play Store reviews
- [ ] Set up alerts for crash rate spikes

### 5.2 Quick-Follow Updates
- [ ] Address any App Store review feedback
- [ ] Fix any crash clusters from first users
- [ ] Collect user feedback for v1.1 priorities

---

## Decision Log

| Decision | Options | Recommendation |
|---|---|---|
| Monetization at v1? | Free / Freemium / Paid | Ship free to validate. Add paywall later when retention data proves value. Removes IAP review complexity. |
| iPad support? | Yes / No | Set `supportsTablet: false` unless iPad layout is tested. Avoids rejection for broken tablet UI. |
| Analytics provider | PostHog / Mixpanel / Amplitude / Firebase | PostHog (open-source, privacy-friendly, generous free tier). |
| Crash reporter | Sentry / Bugsnag / Firebase Crashlytics | Sentry (best Expo support, free tier sufficient for launch). |
| Bundle ID | `com.h25ksmwn99.unmatch` / custom | Keep current if already provisioned, otherwise pick a cleaner one. Cannot change after first submission. |
