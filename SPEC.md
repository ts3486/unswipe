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
- Resist Rank display
- Sticky bottom "Reset" CTA
- **[NEW] Free vs Paid state** — unpaid: show Resist button (navigates to paywall after first free use), locked progress area, first course day only, bottom "Unlock Unmatch — $6.99" banner
- **[NEW] Time Saved counter** — "You've saved ~X hours this week" (12 min per avoided session)
- **[NEW] Daily Motivation Card** — rotating preset messages from seed data, tappable to expand
- **[NEW] Privacy Badge** — shield icon + "100% offline" label

### /(tabs)/panic
- State machine: select_urge → breathing → select_action → spend_delay (if spend) → log_outcome → complete
- **[NEW] Haptic feedback** — light pulses on inhale/exhale start (expo-haptics)
- **[NEW] Visual breathing guide** — expanding/contracting circle animation (4s inhale, 2s hold, 6s exhale), blue gradient #4C8DFF → #7AA7FF
- **[NEW] Outcome screen enhancement** — confetti/particle animation on success, Resist Rank level-up display, "Share your streak" button

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
- **[NEW] "Why We Charge" section** — tappable row: "Why Unmatch costs $6.99" with explanation content
- **[NEW] "Unlock Unmatch" row** — always visible for free users

### /paywall
- **[REDESIGN] One-time purchase UI** — replaces monthly/yearly toggle
- Layout: Emotional hook → Social proof bar → 3 value props with icons → Price block ($6.99) → CTA ("Unlock Unmatch") → Trust signals
- Headline: "You've already taken the first step"
- Subtitle: "One payment. Yours forever. No subscription."
- Trust: "All data stays on your device", "No account required", "Restore purchase" link
- **[NEW] Trigger points:** after first free reset, 2nd+ panic tap (unpaid), Day 2+ course, Progress tab (unpaid), Settings row

### /settings/blocker-guide
- Device blocker setup guide (unchanged)

### /settings/privacy
- Data export/delete controls (unchanged)

### /progress/day/[date]
- **[NEW] Timeline of urge events** for that day
- **[NEW] Check-in mood display** if completed
- **[NEW] Coping actions used** display

## Domain Rules
- Resist Rank: starts 1, +1 per 5 resists, never decreases, cap 30
- Day boundary: device local timezone midnight
- Day success: panic_success_count >= 1 OR daily_task_completed
- Once success that day, later fails don't remove it
- Urge kinds: swipe, check, spend
- Spend categories: iap, date, gift, tipping, transport, other
- **[NEW] Time saved calculation:** each avoided session = 12 minutes saved (internal constant)
- **[NEW] Free tier:** 1 free panic reset, then paywall gate. Home tab partially visible.

## Data
- Seed: `data/seed/catalog.json` (triggers, actions, spend delay cards)
- Seed: `data/seed/starter_7d.json` (7-day course)
- **[NEW] Seed: daily motivation messages** (30+ preset messages in catalog.json)
- Storage: expo-sqlite, local only, no backend

## Services
- Lock/screen time guidance (no forced lockouts)
- Local notifications
  - **[NEW] Smart evening nudge** (9-10pm, if no app open that day)
  - **[NEW] Streak preservation nudge** (8pm, if 3+ day streak at risk)
  - **[NEW] Weekly summary** (Sunday evening)
- Analytics (no free-text, no spend_amount, no notes)
- Subscription/paywall (IAP — one-time purchase $6.99)
- **[NEW] Share service** — generate shareable streak card image via native share sheet

## Accessibility
- **[NEW] VoiceOver/TalkBack labels** on all interactive elements
- **[NEW] Audio cues** for breathing exercise
- **[NEW] Reduced motion support** — respect prefers-reduced-motion, text-based countdown alternative, disable confetti
- Gender-neutral, inclusive language (maintained)

## Changelog
- 2026-02-27: Added UI/UX improvement specs (paywall redesign, onboarding demo reset, panic polish, home/progress enhancements, notifications, share, accessibility)
