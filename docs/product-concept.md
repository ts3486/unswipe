# Unmatch — Product Concept

## What it is

Unmatch is a self-care app that helps people reduce compulsive dating app usage — the swiping, the checking, and the spending that comes with it. It is not therapy, not a blocker, and not dating advice. It is a private, offline-first tool that gives users a structured way to pause, reflect, and build better habits around dating apps.

## The problem

Dating apps are designed to keep people engaged. Swipe mechanics, notifications, premium upsells, and social pressure create loops that are hard to break. Users often recognize the pattern but lack a practical tool to interrupt it in the moment.

The costs go beyond screen time:

- **Compulsive swiping/checking** — opening apps reflexively, losing hours, disrupting sleep
- **Spending** — in-app purchases (boosts, premium, super likes), plus real-world costs tied to app-driven behavior (dates, gifts, tipping, transport)
- **Emotional toll** — anxiety, low self-esteem, and fatigue from the cycle

There is no mainstream app addressing this specific problem. General screen-time tools are too blunt. Habit-tracking apps lack the domain-specific structure. Therapy apps are too heavy for what most people need.

## Who it's for

Adults who use dating apps and want to use them less. They are self-aware enough to recognize the pattern, but need a tool — not a lecture — to act on it. They value privacy and discretion. They are not looking for a therapist or a dating coach.

Typical user signals:

- Checks dating apps multiple times a day, especially at night
- Has spent money on boosts or premium features and regretted it
- Has tried deleting an app and reinstalled it within days
- Feels worse after using dating apps, not better

## How it works

### Core loop

1. User feels an urge (to swipe, check, or spend)
2. Opens Unmatch and taps the Panic/Reset button (reachable in 2 taps)
3. Completes a 60-second breathing protocol
4. Chooses a short coping action (1–15 min, from a preset catalog)
5. Logs the outcome — did they resist, give in, or is it still ongoing?
6. Their Resist Rank increases with each successful resist

This loop is the core of the app. Everything else supports it.

### Supporting features

- **Daily check-in** — mood, fatigue, and urge levels (1–5 scale), plus optional flags for night opens and spending. Private notes stay on-device only.
- **7-day starter course** — short daily lessons that build awareness (triggers, notifications, bedtime boundaries, spending patterns, habit replacement). Content is preset and ships with the app.
- **Progress tracking** — calendar view of success days, streak counter, weekly stats (success rate, panic outcomes, urge trends, spend avoided). A day counts as successful if the user resisted at least one urge OR completed a daily task.
- **Resist Rank** — a visual representation of cumulative progress. Starts at level 1, gains a level for every 5 successful resists, capped at 30. Never decreases. Simple, motivating, no gamification tricks.

### Spend-specific flow

When the urge is spending-related, the reset flow adds a delay step with four preset cards:

- **24-hour rule** — wait a day before buying
- **Budget check** — review what you've already spent
- **Reason picklist** — identify why you want to spend
- **Close the app now** — the simplest intervention

This targets both in-app purchases (boosts, premium, like packs) and real-world spending tied to dating app behavior (dates, gifts, tipping, transport).

## Design principles

### Discreet
The app does not loudly announce "dating addiction." It uses neutral language — urges, reset, boundaries, self-care. The icon, notifications, and UI are all designed to be unremarkable on a home screen. Notification style is configurable (normal, stealth, or off).

### Private
All data stays on-device in V1. No backend, no cloud sync, no accounts. Spend amounts and personal notes are never sent anywhere, not even to analytics. Users can export or delete all their data at any time.

### Offline-first
The reset flow works without an internet connection. The entire app works offline. No loading spinners, no server dependencies.

### Non-coercive
No forced lockouts, no guilt trips, no shame mechanics. The app helps when the user asks for help. A failed reset is logged without judgment. The Resist Rank never decreases. Progress is cumulative.

### Preset-only content
Triggers, coping actions, spend categories, and course content are all preset — shipped as seed data, not user-generated. This keeps the experience consistent, avoids moderation issues, and ensures privacy (no free-text in analytics). The only free-text field is the daily check-in note, which never leaves the device.

## Technical foundation

| Layer | Technology |
|---|---|
| Framework | React Native (Expo Managed) |
| Language | TypeScript (strict) |
| Routing | expo-router |
| UI kit | react-native-paper |
| State | React Context + hooks |
| Storage | expo-sqlite (local only) |
| Date/time | date-fns + date-fns-tz |
| Notifications | expo-notifications (local) |
Architecture follows a clean layered pattern: domain rules (pure functions) → data layer (repositories over SQLite) → contexts (state providers) → hooks (feature logic) → screens (thin UI). All domain logic is tested. No SQL in screens.

## What's built (V1)

- Onboarding (goal selection, trigger picklist, optional budget, notification preferences)
- Home tab (Resist Rank, streak, resist count, daily card, reset CTA)
- Panic tab (6-step reset protocol with breathing, action selection, outcome logging)
- Progress tab (calendar, weekly stats, streak tracking)
- Learn tab (7-day starter course with day-locked progression)
- Settings tab (notification style, privacy controls)
- Daily check-in (mood/fatigue/urge scales, optional night-open and spend flags)
- Paywall scaffold (subscription model ready for RevenueCat integration)
- Analytics framework (typed events, no-op adapter, privacy enforced at the type level)
- Full test suite (domain rules, repositories, seed integrity, forbidden wording scan)

## What's not built (and why)

| Feature | Reason |
|---|---|
| Community / social | Moderation complexity, privacy risk, not MVP |
| Hard app blocking | Platform restrictions, false sense of security, coercive |
| AI therapist / chatbot | Liability, out of scope, not the product's role |
| Dating advice / coaching | Different product category entirely |
| Backend / cloud sync | Not needed for V1, adds privacy complexity |
| Custom triggers / actions | Moderation risk, analytics pollution, preset catalog is sufficient |

## Monetization

Freemium model with a subscription paywall. The core reset flow is free. Premium unlocks additional features (TBD — likely extended analytics, additional courses, customization). RevenueCat integration is scaffolded but not yet connected.

## Roadmap considerations

### Near-term
- Connect analytics adapter (Firebase)
- Implement paywall with RevenueCat
- App Store + Google Play submission
- Localization framework

### Medium-term
- Additional course content beyond the 7-day starter
- Widget for quick-access reset from home screen
- Richer progress insights (time-of-day patterns, trigger correlations)
- Notification reminders tied to user-defined risk windows

### Long-term
- Optional cloud backup (Supabase, end-to-end encrypted)
- Accountability partner feature (paired, not social)
- Watch companion for in-the-moment interventions

## Positioning

Unmatch sits in a gap between general wellness apps and clinical tools. It borrows the habit-interruption model from smoking/alcohol cessation apps (like the Quittr pattern) and applies it to a specific, underserved problem. The closest comparisons are screen-time tools, but Unmatch is narrower and deeper — it understands *why* someone opens a dating app, not just *that* they did.

The discreet, private-by-default approach is a feature, not a limitation. People don't want to announce they're struggling with dating apps. They want a quiet tool that helps when they need it and stays out of the way when they don't.
