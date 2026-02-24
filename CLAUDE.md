# CLAUDE.md — Dev Spec (Dating App Quitting, English Market)

This repo builds a discreet self-care app to reduce dating app swiping/checking and spending impulses (IAP + real-world). Not medical/therapy.

## Hard Constraints
- Expo Managed RN + TypeScript strict
- expo-router
- react-native-paper (LOCKED)
- React Context + hooks (LOCKED)
- expo-sqlite (V1 local only)
- date-fns + date-fns-tz (LOCKED)
- Reset flow reachable within 2 taps, works offline
- No backend in V1
- No free-text in analytics; never send spend amounts
- No explicit sexual wording; no cure/treatment; no perfect blocking claims
- No relationship/dating coaching; no forced lockouts

## Theme (LOCKED)
Palette:
- #0B1220 bg, #121C2E surface, #4C8DFF primary, #7AA7FF secondary,
- #E6EDF7 text, #A7B3C7 muted, #223049 border, #47C28B success, #F2C14E warning

## Resist Rank (LOCKED)
- resist rank starts 1
- +1 every 5 successful resists
- never decreases
- cap 30

## Time Rules (LOCKED)
- Day boundary = user’s device local timezone midnight
- A day is success if: panic_success_count >= 1 OR daily_task_completed
- Once success occurs that day, later fails don’t remove success
- outcome ongoing has no effect

## Seed JSON (MANDATORY)
- data/seed/catalog.json: triggers/actions/spend delay cards (preset-only)
- data/seed/starter_7d.json: 7-day course referencing action IDs

No custom strings for triggers/actions. Only local note allowed: daily_checkin.note (never analytics).

## Urge kinds (preset-only)
- swipe, check, spend

Spend categories (preset-only)
- iap, date, gift, tipping, transport, other

## Required Routes (expo-router)
- /onboarding
- /(tabs)/home
- /(tabs)/panic
- /(tabs)/progress
- /(tabs)/learn
- /(tabs)/settings
- /paywall
- /settings/blocker-guide
- /settings/privacy
- /progress/day/[date]

Panic must be a dedicated tab.

## Analytics Events (exact)
(Use the same exact event names/props from the main spec.)
Privacy: never send notes or spend_amount.

## Development Approach
Use TDD (Test-Driven Development) for all new logic:
1. Write a failing test that defines the expected behaviour
2. Write the minimum code to make the test pass
3. Refactor while keeping tests green

Apply TDD to: domain rules, utilities, repository functions, and use-cases.
UI screens are excluded from mandatory TDD (cover with E2E instead).

## Implementation Workflow
1) Plan files + sequence
2) Domain + tests → data layer (sqlite + seeds) → UI → services (lock/notifications/analytics/subscription)
3) Keep logic out of screens; screens call hooks/use-cases
4) Add ship checklist tests:
   - airplane mode reset flow
   - local midnight boundary test
   - export/delete works
   - forbidden wording scan
   - analytics payload review

## PR Review Process (MANDATORY)
Every implementation must go through a self-review before requesting user approval:

1. **Create a feature branch** — never commit directly to `main`
2. **After implementation, run a review checklist:**
   - All new/changed files are intentional (no stray edits)
   - Tests pass (`npx jest` or relevant test runner)
   - TypeScript compiles without errors (`npx tsc --noEmit`)
   - No CLAUDE.md hard constraints violated (theme, locked libs, privacy rules, wording rules)
   - No secrets, tokens, or sensitive data in the diff
   - Commit messages are concise and descriptive
3. **Create a PR** with:
   - A clear title summarizing the change
   - A body listing: what changed, why, and how to verify
   - Reference to any related issues or tasks
4. **Present the PR to the user for review** before merging — never merge without explicit user approval
5. **Address feedback** — if the user requests changes, update the branch and re-request review
