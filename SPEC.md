# SPEC.md — Unmatch App Specification

This document tracks feature-level requirements, screen specs, and implementation status. Updated at the start of each implementation cycle.

## Screens

### /onboarding
- 5-step flow: Welcome → Goal → Triggers → Budget (conditional) → Notifications
- **[NEW] Step 6: Demo Reset** — guided first panic reset (auto-select "swipe", breathing exercise with coaching overlay, coping action card, completion message)
- Progress indicator (dots/thin bar) across all steps
- Breathing step skippable with visible "Skip" link
- **[NEW] Onboarding-to-paywall transition** — after demo reset: "Nice work" screen → 1.5s pause → paywall with context message

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
- **[NEW] Share service** — generate shareable streak card image via native share sheet

## Accessibility
- **[NEW] VoiceOver/TalkBack labels** on all interactive elements
- **[NEW] Audio cues** for breathing exercise
- **[NEW] Reduced motion support** — respect prefers-reduced-motion, text-based countdown alternative, disable confetti
- Gender-neutral, inclusive language (maintained)

## Changelog
- 2026-02-28: Wired paywall to RevenueCat (purchase + restore); added subscription sync on app foreground; fixed dailyTaskCompleted to query content_progress; added TimeSaved, MotivationCard, StatCards to Home; added "Why We Charge" + plan state handling to Settings; updated paywall model to $4.99/month + 7-day trial; renamed Resist Rank → Meditation Rank in SPEC; removed unused LifeTree components; fixed redundant ternary in panic screen
- 2026-02-28: Implemented course unlock notification scheduling (8am, days 2–7); removed stealth notification mode; simplified onboarding notification step to On/Off with support text
- 2026-02-27: Added UI/UX improvement specs (paywall redesign, onboarding demo reset, panic polish, home/progress enhancements, notifications, share, accessibility)
