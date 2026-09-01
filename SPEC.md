# SPEC.md — Unmatch App Specification

This document tracks feature-level requirements, screen specs, and implementation status. Updated at the start of each implementation cycle.

## Screens

### /onboarding
- Streamlined 4-step flow: Welcome → Personalize → Features → Ready → Home (app is free — no paywall step)
- **Personalize** — goal selection (single scrollable screen); Continue disabled until a goal is selected
- **Features** — value proposition showcase with 4 feature cards (guided exercises, smart reminders, progress tracking, 7-day course); each card has a color-coded icon, title, and description
- **Ready** — personalized "You're all set" screen with goal affirmation and course/notification preview; CTA: "Start my pause"
- Back navigation on steps 2–4; progress dots across all steps
- Goal requires explicit tap (no pre-selection); Continue disabled until selected
- Budget setup deferred to post-onboarding (Settings or first spend-urge panic); notification preference defaults to "on" (changeable in Settings)
- Notification permission requested silently after Ready CTA tap (no alert on denial)

### /(tabs)/home
- Logo + "Today done" chip
- Inline daily check-in
- Today's course card
- Meditation Rank display (rank level + meditation count)
- Privacy Badge — shield icon + "100% offline" label
- Sticky bottom "Reset" CTA

### /(tabs)/panic
- State machine: select_urge → breathing → select_action → spend_delay (if spend) → log_outcome → complete
- Haptic feedback — light pulses on inhale/exhale start (expo-haptics)
- Visual breathing guide — expanding/contracting circle animation (4s inhale, 2s hold, 6s exhale), blue gradient #4C8DFF → #7AA7FF
- Outcome screen — confetti animation on success, Meditation Rank level-up display, "Share your streak" button

### /(tabs)/progress
- Monthly calendar with success-day highlighting
- Weekly comparison card
- Panic session stats
- Personal Best highlight — animate calendar on longest streak, show "New personal best: X days" card
- Weekly Insight Cards — "You resist urges most on [weekday]", "Your strongest time is [morning/afternoon/evening]", "Check urges are down X% this week"

### /(tabs)/history
- Daily check-in history: scrollable list of past check-ins, newest first
- Each row shows date, mood/fatigue/urge levels, and night-open/spend flags
- Tapping a row opens `/progress/day/[date]` for the full detail view
- Empty state before the user's first check-in

### /(tabs)/settings
- Notification style toggle
- Language toggle — English / 日本語, persists to `user_profile.locale`
- Blocker guide link
- Privacy/data export link
- No "Why We Charge" / "Unlock Unmatch" rows — app is free, no upsell surface in Settings

### /paywall
- App is currently free — this route is dormant/unreached (not linked from onboarding or the tab gate) but kept in place along with the RevenueCat plumbing (`subscription-service.ts`, `subscription-repository.ts`, `subscription_state` table, `isPremium` context) for a future freemium feature
- Screen content unchanged for now (two modes: trial offer vs. trial expired) — will be redesigned when freemium gating is defined

### /settings/blocker-guide
- Device blocker setup guide (unchanged)

### /settings/privacy
- Data export/delete controls (unchanged)

### /progress/day/[date]
- Timeline of urge events for that day (chronological, with outcome chips, trigger tags, coping actions)
- Check-in display if completed — mood/fatigue/urge level shown as the selected qualitative option (e.g. "Great", "Tired", "Calm"), not a numeric score or dots; plus night-open flag, spend flag

## Domain Rules
- Meditation Rank: starts 1, +1 per 5 meditations, never decreases, cap 30
- Day boundary: device local timezone midnight
- Day success: panic_success_count >= 1 OR daily_task_completed (daily_task_completed = today's daily check-in exists)
- Once success that day, later fails don't remove it
- Urge kinds: swipe, check, spend
- Spend categories: iap, date, gift, tipping, transport, other
- App access: free for all users. The `(tabs)` navigator no longer gates on `isPremium` — no redirect to paywall.
- Streak: current streak (`calculateStreak`) counts consecutive check-in dates ending on today (0 if today has no check-in yet); best/personal-best streak (`calculateLongestStreak`) is the longest consecutive run anywhere in check-in history. Both live in `src/domain/progress-rules.ts` and are the single source of truth — the Home badge, the Progress tab's streak ring/personal-best card, and the streak-nudge notification all read from the same two functions.

## Localization
- Supported locales: `en` (default), `ja`
- Library: `react-i18next` + `i18next`; device locale detected via `expo-localization`
- Resolution order: `user_profile.locale` (persisted, set by explicit Settings toggle) → device locale (`expo-localization`) → `en` fallback
- UI strings extracted to `src/i18n/locales/en.json` / `src/i18n/locales/ja.json`, accessed via `useTranslation()` / `t()` — no more inline English literals in screens/components
- Seed content: parallel Japanese seed file `data/seed/catalog.ja.json`, mirroring the English structure exactly (same IDs, same shape); the seed loader picks the file matching the active locale
- Date formatting: `date-fns/locale/ja` wired into the two locale-sensitive `format()` calls (`app/progress/day/[date].tsx`) via the active locale
- Notification copy (`src/constants/notification-content.ts`) localized through the same `t()` keys
- `__tests__/wording/forbidden-wording.test.ts` extended with Japanese-equivalent patterns for the same 5 banned categories (sexual wording, cure/treatment claims, perfect-blocking claims, relationship/dating coaching, forced/involuntary lockout), run against both seed locale variants
- Translations are machine-generated for this pass; flagged for a native-speaker pass before shipping, especially `/settings/privacy` (legal copy) and any claims-adjacent seed content

## Data
- Seed: `data/seed/catalog.json` / `data/seed/catalog.ja.json` (triggers, actions, spend delay cards)
- Storage: expo-sqlite, local only, no backend

## Services
- Lock/screen time guidance (no forced lockouts)
- Local notifications (style: `normal` | `off` — stealth mode removed)
  - Smart evening nudge (9-10pm, if no app open that day)
  - Streak preservation nudge (8pm, if 3+ day streak at risk)
  - Weekly summary (Sunday evening)
- Analytics (no free-text, no spend_amount, no notes)
- Subscription/paywall (IAP via RevenueCat) — dormant. App is free; RC SDK is not initialized on launch and the tab navigator no longer gates on `isPremium`. Service/repository/DB table/paywall screen are kept in place, unused, for a future freemium feature.
- Share service — generate shareable streak card image via native share sheet

## Accessibility
- VoiceOver/TalkBack labels on all interactive elements
- Audio cues for breathing exercise
- Reduced motion support — respect prefers-reduced-motion, text-based countdown alternative, disable confetti
- Gender-neutral, inclusive language (maintained)

## Changelog
- 2026-09-01: Unified streak calculation — added `calculateLongestStreak` to `src/domain/progress-rules.ts` and switched the Progress tab's `loadBestStreak` to reuse it plus the existing `calculateStreak`, replacing a duplicated, untested inline algorithm that used slightly different (grace-period) semantics than the Home badge and streak notifications. Also simplified the day-detail check-in display to show the selected option label (e.g. "Great") instead of a numeric score with dots, and removed the meditated/did-not-meditate/ongoing summary badges from that screen as no longer necessary.
- 2026-09-01: Removed the Learn tab and 7-day starter course entirely — deleted the `content`/`content_progress` tables, `content-repository.ts`, `useContent` hook, `starter_7d.json`/`.ja.json` seed files, the course-unlock notification, and the `content_viewed`/`content_completed` analytics events. Added a `/(tabs)/history` tab showing a scrollable list of past daily check-ins (linking into the existing `/progress/day/[date]` detail screen). Redefined `daily_task_completed` to mean "today's daily check-in exists" instead of "today's course content completed."
- 2026-08-01: Made the app completely free — removed the `isPremium` gate from `(tabs)/_layout.tsx`, dropped the onboarding→paywall redirect (Ready CTA now goes straight to Home), removed the "Unlock Unmatch"/"Why We Charge" rows from Settings, and stopped RevenueCat SDK init/foreground sync on app launch. Kept `/paywall` screen, `subscription-service.ts`, `subscription-repository.ts`, and the `subscription_state` table in place, unused, for a future freemium feature.
- 2026-02-28: Removed MotivationCard, TimeSavedCard, and useWeeklySuccessCount from Home screen; removed TIME_SAVED_PER_MEDITATION_MINUTES constant; cleaned up [NEW]/[DONE] status tags — all items now reflect implemented state; updated day detail spec to match implementation (summary badges, full check-in fields, timeline with coping actions); removed daily motivation messages from Data section
- 2026-02-28: Replaced onboarding breathing demo with value proposition showcase; new flow: Welcome → Personalize → Features (4 value-prop cards) → Ready (personalized CTA); removed breathing timer/state; "Start my pause" CTA
- 2026-02-28: Streamlined onboarding from 10-12 screens to 4 steps; merged Goal+Triggers+Course into single screen; added back navigation; removed demo check-in/action dump; deferred budget setup and notification preference to post-onboarding
- 2026-02-28: Wired paywall to RevenueCat (purchase + restore); added subscription sync on app foreground; fixed dailyTaskCompleted to query content_progress; added TimeSaved, MotivationCard, StatCards to Home; added "Why We Charge" + plan state handling to Settings; updated paywall model to $4.99/month + 7-day trial; renamed Resist Rank → Meditation Rank in SPEC; removed unused LifeTree components; fixed redundant ternary in panic screen
- 2026-02-28: Implemented course unlock notification scheduling (8am, days 2–7); removed stealth notification mode; simplified onboarding notification step to On/Off with support text
- 2026-02-28: RevenueCat IAP fix: added initPurchases() call on app mount; added subscription expiry enforcement with 3-day offline grace period; kept Android API key as placeholder
- 2026-03-19: Phase 1 quick wins — removed notification denial alert from onboarding; moved price comparison callout above fold in paywall; made restore button visible in both trial and expired modes; added auto-renewal legal text for App Store compliance
- 2026-02-27: Added UI/UX improvement specs (paywall redesign, onboarding demo reset, panic polish, home/progress enhancements, notifications, share, accessibility)
