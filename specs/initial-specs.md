# ✅ Claude Code Spec Prompt — Quittr-like App for Dating App Quitting (English Market)
# Concept: Compulsive swiping/checking + unnecessary spending (IAP + real-world)
# Expo Router + TS + SQLite (V1 local only) + Agent Teams + LOCKED THEME + LOCKED RULES + Seed JSON

You are an AI software engineering team (agent team). Build a self-care habit recovery app (Quittr-like) for the **English market** focused on **dating app quitting/reduction**: compulsive swiping/checking and unnecessary spending related to dating apps (boosts/premium and real-world spending like dates, gifts, tipping, transport). The app includes a Panic/Reset Button, progress tracking, and **Resist Rank** progression. Follow the DEVELOPMENT REQUIREMENTS exactly.

---

## 0) Non-negotiable constraints
- Not a medical/therapy product. No diagnosis/treatment claims.
- Discreet concept: UI should not loudly say “dating addiction.” Use neutral phrasing: “urges”, “reset”, “boundaries”, “spending impulse”, “self-care”.
- Panic/Reset must work offline and be reachable within 2 taps from app launch.
- MVP-first. Defer risky/heavy features (community posting, hard blocker enforcement, “AI therapist”).
- Data privacy: sensitive logs stored locally in V1. No server storage in V1.
- No “perfect blocking” claims.
- No relationship coaching / dating advice. This is self-care + habit support.
- No forced lockouts/coercive timers.

---

## 1) DEVELOPMENT REQUIREMENTS (must follow)
### 1.1 Platforms
- iOS + Android from day 1.

### 1.2 Framework & language (hard requirement)
- React Native using Expo (Managed)
- TypeScript only (strict mode ON)

### 1.3 Routing
- expo-router REQUIRED

### 1.4 Tooling
- pnpm
- Biome (preferred)
- Jest for domain logic + boundary tests

### 1.5 UI kit (LOCKED)
- react-native-paper

### 1.6 State management (LOCKED)
- React Context + hooks

### 1.7 Storage (MVP)
- expo-sqlite
- repository/data-access layer (no SQL in screens)

### 1.8 Date/time (LOCKED)
- date-fns + date-fns-tz
- Day boundary uses **user’s device local timezone midnight** (not Tokyo).
- Store `date_local` as ISO date string `YYYY-MM-DD` in the user’s local timezone.

### 1.9 Notifications & device features
- expo-notifications (local only)
- expo-haptics optional

### 1.10 Analytics (MVP)
- analytics interface
- Firebase adapter if feasible in Expo managed; else no-op adapter + TODO
- never send free-text notes or spend amounts

### 1.11 Monetization (MVP)
- paywall screen + entitlement model
- RevenueCat if feasible, else clean stub

### 1.12 Backend (PHASED)
- V1: none
- Phase 2: Supabase allowed (Auth + Postgres + RLS), do not implement now

---

## 2) MVP scope
### Core loops
- Urge → Reset flow → outcome logged → Resist Rank increases
- Daily check-in + 7-day starter course (seed JSON)

### Metrics (LOCKED)
- North Star: Resist Count = number of successful reset outcomes
- Supporting: Panic success rate, Night opens trend, Spend avoided trend

### V1 Features
1) Onboarding (3–5 min)
   - goal type: reduce_swipe | reduce_open | reduce_night_check | reduce_spend
   - preset triggers from catalog.json (no custom)
   - risk window
   - stealth notification style
   - 7-day starter enabled
   - optional budgets (local only): daily/weekly + mode soft|pledge

2) Home
   - streak, resist count, resist rank
   - today’s card
   - reset CTA always visible

3) Reset flow (Panic)
   - choose urge_kind: swipe/check/spend (preset)
   - 60s protocol (breathing)
   - choose action: 1m/5m/15m from catalog (preset)
   - log outcome success/fail/ongoing + optional trigger (preset)
   - spend: show spendDelayCards from catalog (preset)

4) Daily check-in
   - mood/fatigue/urge 1–5
   - optional note (local only)
   - night open yes/no
   - spent today yes/no + optional amount

5) Progress
   - calendar
   - weekly analytics: success rate, panic success, urge kind trend, night opens, spend avoided
   - achievements (subtle)

6) Learn
   - starter_7d content from starter_7d.json

7) Privacy
   - stealth notifications
   - export/delete local data

8) Monetization scaffolding
   - paywall + subscription state

### Out of scope (Anti-requirements)
- community
- hard blocking
- AI therapist
- app integration/scraping
- relationship advice
- forced lockouts
- financial/legal counseling

---

## 3) Seed data files (MANDATORY)
- data/seed/catalog.json (triggers/actions/spend delay cards)
- data/seed/starter_7d.json (7 cards, referencing catalog action IDs)

App must load these seeds on first run and store into SQLite content tables.

---

## 4) Data model (SQLite)
Tables:
- user_profile(id TEXT PK, created_at TEXT, locale TEXT, notification_style TEXT, plan_selected TEXT, goal_type TEXT, spending_budget_weekly INT NULL, spending_budget_daily INT NULL, spending_limit_mode TEXT NULL)
- daily_checkin(id TEXT PK, date_local TEXT, mood INT, fatigue INT, urge INT, note TEXT NULL, opened_at_night INT NULL, spent_today INT NULL, spent_amount INT NULL)
- urge_event(id TEXT PK, started_at TEXT, from_screen TEXT, urge_level INT, protocol_completed INT, urge_kind TEXT, action_type TEXT, action_id TEXT, outcome TEXT, trigger_tag TEXT NULL, spend_category TEXT NULL, spend_item_type TEXT NULL, spend_amount INT NULL)
- progress(date_local TEXT PK, streak_current INT, resist_count_total INT, tree_level INT, last_success_date TEXT NULL, spend_avoided_count_total INT)
- content(content_id TEXT PK, day_index INT, title TEXT, body TEXT, action_text TEXT, est_minutes INT)
- content_progress(content_id TEXT PK, completed_at TEXT)
- subscription_state(id TEXT PK, status TEXT, product_id TEXT, period TEXT, started_at TEXT, expires_at TEXT)

Rules (LOCKED):
- Day boundary = user local midnight.
- success day if (panic success >= 1) OR (daily task completed).
- once a day has success, later fails don’t remove success.
- ongoing has no effect.
- resist increments only on success.
- spend avoided increments on (urge_kind=spend AND outcome=success).
- presets only: trigger_tag/action_id must be from catalog.

---

## 5) Analytics events (exact)
(same list as before; keep names stable)

---

## 6) Routes
(same route list; keep panic tab)

---

## 7) Theme (LOCKED)
Dark-first discreet premium.

Hex palette:
- Background: #0B1220
- Surface/Card: #121C2E
- Primary accent (CTA): #4C8DFF
- Secondary accent: #7AA7FF
- Text primary: #E6EDF7
- Text secondary: #A7B3C7
- Border/divider: #223049
- Success: #47C28B
- Warning: #F2C14E

Resist Rank rules:
- starts at 1
- every 5 successful resists → +1
- never decreases
- cap 30

---

## 8) Agent team execution (MANDATORY)
(A–E same as before, now English copy/content)

---

## 9) Deliverables + Ship checklist
- offline reset flow
- local timezone midnight boundary tests
- export/delete works
- forbidden wording scan (explicit sexual, cure/treatment, perfect blocking, dating coaching)
- analytics payload has no notes or spend amounts

START NOW.
