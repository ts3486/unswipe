# SPEC.md — Unmatch App Specification

This document tracks feature-level requirements, screen specs, and implementation status. Updated at the start of each implementation cycle.

## Screens

### /onboarding
- **[DONE] Streamlined 4-step flow:** Welcome → Personalize → Features → Ready → Paywall
- **Personalize** — goal selection (single scrollable screen); Continue disabled until a goal is selected
- **Features** — value proposition showcase with 4 feature cards (guided exercises, smart reminders, progress tracking, 7-day course); each card has a color-coded icon, title, and description
- **Ready** — personalized "You're all set" screen with goal affirmation and course/notification preview; CTA: "Start my pause"
- Back navigation on steps 2–4; progress dots across all steps
- Goal requires explicit tap (no pre-selection); Continue disabled until selected
- Budget setup deferred to post-onboarding (Settings or first spend-urge panic); notification preference defaults to "on" (changeable in Settings)
- Notification permission requested after Ready CTA tap

### /(tabs)/home
- Logo + "Today done" chip
- Inline daily check-in
- Today's course card
- Meditation Rank display
- Sticky bottom "Reset" CTA
- **[DONE] Stat row** — streak count + total meditation count
- **[DONE] Time Saved counter** — "You've saved ~X hours this week" (12 min per avoided session)
- **[DONE] Daily Motivation Card** — rotating preset messages from seed data, tappable to navigate to Learn
- **[NEW] Privacy Badge** — shield icon + "100% offline" label

### /(tabs)/panic
- State machine: select_urge → breathing → select_action → spend_delay (if spend) → log_outcome → complete
- **[NEW] Haptic feedback** — light pulses on inhale/exhale start (expo-haptics)
- **[NEW] Visual breathing guide** — expanding/contracting circle animation (4s inhale, 2s hold, 6s exhale), blue gradient #4C8DFF → #7AA7FF
- **[NEW] Outcome screen enhancement** — confetti/particle animation on success, Meditation Rank level-up display, "Share your streak" button

### /(tabs)/progress
- Monthly calendar with success-day highlighting
- Weekly comparison card
- Panic session stats
- **[NEW] Personal Best highlight** — animate calendar on longest streak, show "New personal best: X days" card
- **[NEW] Weekly Insight Cards** — "You resist urges most on [weekday]", "Your strongest time is [morning/afternoon/evening]", "Check urges are down X% this week"

### /(tabs)/learn
- 7-day starter course display
- Content completion tracking

### /(tabs)/settings
- Notification style toggle
- Blocker guide link
- Privacy/data export link
- **[DONE] "Why We Charge" section** — expandable row with explanation content
- **[DONE] "Unlock Unmatch" row** — visible for non-premium users (trial expired or free)

### /paywall
- **[DONE] Two modes:** trial offer (post-onboarding) vs. trial expired (conversion)
- **Trial offer mode:** 7-day free trial CTA → auto-renews to $4.99/month
- **Trial expired mode:** Subscribe $4.99/month CTA + Restore purchase link
- Feature list with icons, price comparison callout, trust signals
- **[DONE] Connected to RevenueCat** — real purchase flow via `purchasePackage()`, restore via `restorePurchases()`
- **[DONE] Subscription sync on app foreground** — keeps `isPremium` in sync with App Store

### /settings/blocker-guide
- Device blocker setup guide (unchanged)

### /settings/privacy
- Data export/delete controls (unchanged)

### /progress/day/[date]
- **[NEW] Timeline of urge events** for that day
- **[NEW] Check-in mood display** if completed
- **[NEW] Coping actions used** display

## Domain Rules
- Meditation Rank: starts 1, +1 per 5 meditations, never decreases, cap 30
- Day boundary: device local timezone midnight
- Day success: panic_success_count >= 1 OR daily_task_completed
- Once success that day, later fails don't remove it
- Urge kinds: swipe, check, spend
- Spend categories: iap, date, gift, tipping, transport, other
- **[NEW] Time saved calculation:** each avoided session = 12 minutes saved (internal constant)
- **[DONE] Subscription gating:** `isPremium` is the single gate. True during active trial or paid subscription. False when trial expires without subscribing or subscription lapses. Non-premium users are redirected to paywall.
- **[DONE] RevenueCat SDK initialization:** `initPurchases()` called once on app mount before any RC operations. Handles init failure gracefully (no crash).
- **[DONE] Subscription expiry enforcement:** On foreground, after `getCustomerInfo()`, if RC reports no active entitlement and local `expires_at` is past, mark `is_premium = false`, `status = 'expired'`. Offline fallback: if RC call fails, check local `expires_at` + 3-day grace period before marking expired.

## Data
- Seed: `data/seed/catalog.json` (triggers, actions, spend delay cards)
- Seed: `data/seed/starter_7d.json` (7-day course)
- **[NEW] Seed: daily motivation messages** (30+ preset messages in catalog.json)
- Storage: expo-sqlite, local only, no backend

## Services
- Lock/screen time guidance (no forced lockouts)
- Local notifications (style: `normal` | `off` — stealth mode removed)
  - **[DONE] Smart evening nudge** (9-10pm, if no app open that day)
  - **[DONE] Streak preservation nudge** (8pm, if 3+ day streak at risk)
  - **[DONE] Weekly summary** (Sunday evening)
  - **[DONE] Course unlock notification** (8am daily, days 2–7, if lesson not yet completed)
- Analytics (no free-text, no spend_amount, no notes)
- Subscription/paywall (IAP — $4.99/month with 7-day free trial, via RevenueCat)
  - **[DONE] RevenueCat SDK init** on app launch (platform-gated API key)
  - **[DONE] Subscription expiry enforcement** with 3-day offline grace period
- **[NEW] Share service** — generate shareable streak card image via native share sheet

## Accessibility
- **[NEW] VoiceOver/TalkBack labels** on all interactive elements
- **[NEW] Audio cues** for breathing exercise
- **[NEW] Reduced motion support** — respect prefers-reduced-motion, text-based countdown alternative, disable confetti
- Gender-neutral, inclusive language (maintained)

## Changelog
- 2026-02-28: Replaced onboarding breathing demo with value proposition showcase; new flow: Welcome → Personalize → Features (4 value-prop cards) → Ready (personalized CTA); removed breathing timer/state; "Start my pause" CTA
- 2026-02-28: Streamlined onboarding from 10-12 screens to 4 steps; merged Goal+Triggers+Course into single screen; added back navigation; removed demo check-in/action dump; deferred budget setup and notification preference to post-onboarding
- 2026-02-28: Wired paywall to RevenueCat (purchase + restore); added subscription sync on app foreground; fixed dailyTaskCompleted to query content_progress; added TimeSaved, MotivationCard, StatCards to Home; added "Why We Charge" + plan state handling to Settings; updated paywall model to $4.99/month + 7-day trial; renamed Resist Rank → Meditation Rank in SPEC; removed unused LifeTree components; fixed redundant ternary in panic screen
- 2026-02-28: Implemented course unlock notification scheduling (8am, days 2–7); removed stealth notification mode; simplified onboarding notification step to On/Off with support text
- 2026-02-28: RevenueCat IAP fix: added initPurchases() call on app mount; added subscription expiry enforcement with 3-day offline grace period; kept Android API key as placeholder
- 2026-02-27: Added UI/UX improvement specs (paywall redesign, onboarding demo reset, panic polish, home/progress enhancements, notifications, share, accessibility)
