# Unmatch — User Flow

## App Launch

```
APP LAUNCH
    │
    ▼
isOnboarded?
    ├── NO  → /onboarding
    └── YES → /(tabs)/home
```

---

## Onboarding (`/onboarding`)

Streamlined 4-step flow (state-driven, not separate routes).

```
WELCOME
  │  "Get started"
  ▼
PERSONALIZE
  │  Select one goal: Reduce swipe / Open less / Stop night check / Spend less
  │  Continue disabled until a goal is selected
  │  "Continue"
  ▼
FEATURES
  │  4 value-prop cards (guided exercises, smart reminders, progress tracking, 7-day course)
  │  "Continue"
  ▼
READY
  │  Personalized affirmation + course/notification preview
  │  "Start my pause"
  │  → Requests notification permission
  ▼
/paywall (trial offer)  →  /(tabs)/home
```

Back navigation on steps 2–4. Progress dots across all steps. Budget setup deferred to post-onboarding. Notification preference defaults to "on" (changeable in Settings).

**On completion:** creates `user_profile`, sets `isOnboarded = true`, fires `onboarding_completed`.

---

## Tab Navigator

Five tabs available after onboarding. Late-night pulse animation (21:00–02:59) on the Pause tab icon.

```
┌──────┐  ┌───────┐  ┌──────────┐  ┌───────┐  ┌──────────┐
│ Home │  │ Pause │  │ Progress │  │ Learn │  │ Settings │
└──────┘  └───────┘  └──────────┘  └───────┘  └──────────┘
```

---

## Home (`/(tabs)/home`)

Dashboard showing Meditation Rank, daily check-in, and course content.

**Elements:**
- Logo + "Today done" chip (when day is successful)
- Privacy Badge — shield icon + "100% offline" label
- Inline daily check-in card
- Today's course card (day X of 7)
- Meditation Rank display (rank level + meditation count)
- Sticky bottom CTA: "Meditate" (label from catalog copy)

**Navigation out:**

| Action | Destination |
|---|---|
| Tap check-in card | Expands check-in overlay |
| Tap "Meditate" CTA | `/(tabs)/panic` |

---

## Pause / Panic Flow (`/(tabs)/panic`)

Core reset protocol. Step-based state machine inside one screen.

```
1. SELECT URGE
   │  Choose: Swipe / Check / Spend
   ▼
2. BREATHING
   │  1-min guided exercise (skip available)
   ▼
3. SELECT ACTION
   │  Actions filtered by urge, sorted by duration
   │
   ├── urge = "spend" ──► 3b. SPEND DELAY
   │                           "I resisted" / "I spent anyway"
   │                           │
   ◄──────────────────────────┘
   ▼
4. LOG OUTCOME
   │  Outcome: Resisted / Still deciding / Gave in
   │  + optional trigger tag
   │  + optional spend category (iap, date, gift, tipping, transport, other)
   ▼
5. COMPLETE
      Resisted → animated celebration + "+1 resist"
      Ongoing  → clock icon + neutral message
      Gave in  → compassionate message

      [Done]     → router.replace('/(tabs)')  →  Home
      [Go again] → reset to step 1
```

**Key traits:** works offline, saves to sqlite immediately, refreshes app state on completion.

---

## Progress (`/(tabs)/progress`)

Calendar view and weekly stats.

**Elements:**
- Monthly calendar (success/fail indicators per day)
- Weekly comparison card (this week vs last week)
- Weekly stats (success rate, panic success rate, total resists)

**Navigation out:**

| Action | Destination |
|---|---|
| Tap a day cell | `/progress/day/[date]` |

---

## Day Detail (`/progress/day/[date]`)

Single-day breakdown accessed from the progress calendar.

**Elements:**
- Summary badges: resisted (green), did not resist (red), ongoing (grey)
- Daily check-in section (mood, fatigue, urge ratings, late-night flag, spend flag)
- Urge events timeline (chronological list with time, outcome chip, urge kind, trigger, action)

**Navigation back:** header back button → Progress tab.

---

## Learn (`/(tabs)/learn`)

7-day starter course (self-contained, no external navigation).

**Elements:**
- Day cards (1–7)
  - Completed → green checkmark
  - Current → blue badge, expandable
  - Future → lock icon
- Expanded card: body text, practice section, "Mark complete" button

---

## Daily Check-in (`/checkin`)

Private daily self-reflection form accessed from Home.

**Fields:**
- Mood (1–5)
- Fatigue (1–5)
- Urge level (1–5)
- "Opened app late at night?" (yes/no)
- "Spent money today?" (yes/no)
- Optional note (local only, never sent to analytics)

**Navigation back:** `router.back()` → Home tab.

---

## Settings (`/(tabs)/settings`)

**Inline controls (no navigation):**
- Notification style toggle (Normal / Off)
- "Why We Charge" expandable section
- "Unlock Unmatch" row (visible for non-premium users)
- Trial/subscription status display

**Navigation out:**

| Action | Destination | Presentation |
|---|---|---|
| Blocker guide | `/settings/blocker-guide` | Stack push |
| Privacy and data | `/settings/privacy` | Stack push |
| Unlock Unmatch | `/paywall` | Stack push |

Footer: "All data stays on your device — always."

---

## Blocker Guide (`/settings/blocker-guide`)

Static help content with iOS Screen Time and Android Digital Wellbeing setup steps. Disclaimer: the app cannot block other apps directly.

---

## Privacy & Data (`/settings/privacy`)

**Actions:**
- **Export data** — gathers all tables as JSON (excludes `note` and `spend_amount` fields). Fires `data_exported`.
- **Delete all data** — confirmation dialog, wipes all tables, fires `data_deleted`.

---

## Paywall (`/paywall`)

Screen for subscription management. Two modes based on context.

**Trial offer mode** (post-onboarding):
- "Try 7 Days for Free" CTA → auto-renews to $4.99/month
- Feature list with icons, trust signals

**Trial expired mode** (conversion):
- Subscribe $4.99/month CTA
- Restore purchase link
- Feature list with icons, price comparison callout, trust signals

Connected to RevenueCat — real purchase flow via `purchasePackage()`, restore via `restorePurchases()`.

Fires `paywall_viewed` on mount.

---

## Navigation Summary

| From | Action | To | Method |
|---|---|---|---|
| App start (not onboarded) | Auto-redirect | `/onboarding` | `<Redirect>` |
| Onboarding Ready step | "Start my pause" | `/paywall` → `/(tabs)` | `router.replace` |
| Home | "Meditate" CTA | `/(tabs)/panic` | `router.push` |
| Home | Check-in card | Check-in overlay | Internal state |
| Panic complete | "Done" | Home | `router.replace` |
| Panic complete | "Go again" | Panic step 1 | Internal state reset |
| Progress | Tap day | `/progress/day/[date]` | `router.push` |
| Day detail | Back | Progress | Header back |
| Settings | Blocker guide | `/settings/blocker-guide` | `router.push` |
| Settings | Privacy and data | `/settings/privacy` | `router.push` |
| Settings | Unlock Unmatch | `/paywall` | `router.push` |

---

## Domain Rules Affecting Flow

- **Success day:** `panic_success_count >= 1` OR `daily_task_completed`. Once success occurs that day, later fails don't remove it.
- **Meditation Rank:** +1 rank every 5 successful meditations. Never decreases. Cap 30.
- **Day boundary:** device local timezone midnight.
- **Urge kinds (preset-only):** swipe, check, spend.
- **Spend categories (preset-only):** iap, date, gift, tipping, transport, other.
