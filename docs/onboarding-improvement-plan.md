# Onboarding Improvement Plan — Unmatch

## Current Flow Summary

```
Welcome → Goal → Triggers → [Budget] → Notifications → Demo (intro → breathing → action → checkin → nicework) → Paywall
```

**Total steps:** 5–6 configuration screens + 5 demo sub-steps + paywall = 11–12 screens before the user reaches the app. This is too many.

---

## Issue Analysis

### P0 — Conversion Blockers

#### 1. Flow is too long — user fatigue before paywall
The user must navigate 10–12 screens before hitting the paywall and entering the app. Each screen is a drop-off point. Industry best practice for onboarding is 3–5 screens max before value delivery.

**Fix:** Consolidate steps. Merge Triggers into the Goal step (or remove entirely). Remove the Budget step from onboarding (move to Settings post-signup). Cut the demo from 5 sub-steps to 2.

#### 2. Demo check-in creates false expectations
The "Save my reflection" button and "Check-ins are stored locally" privacy note both imply the data is persisted. It is not — the demo data is silently discarded. Users who take time to fill this in carefully will feel misled when they don't see their first check-in in Progress.

**Fix:** Either (a) actually persist the demo check-in as Day 0 data, or (b) remove the demo check-in entirely and show a brief preview screenshot/mockup instead. Option (b) is recommended — it's simpler and shortens the flow.

#### 3. No back navigation anywhere
Users cannot correct mistakes. If they pick the wrong goal, the only option is to complete the entire onboarding and go into Settings later (if the option even exists). This creates anxiety and slows users down — they second-guess each choice because it feels irreversible.

**Fix:** Add a back button/chevron to every step after Welcome. Wire it to `setStep(previousStep)`.

#### 4. Demo breathing label is hardcoded to "MANAGE THE SWIPE URGE"
If the user selected "Spend less" or "Stop late-night checking" as their goal, seeing "MANAGE THE SWIPE URGE" during the demo is jarring and disconnects the personalization they just configured.

**Fix:** Derive the label from `selectedGoal`:
- `reduce_swipe` → "MANAGE THE SWIPE URGE"
- `reduce_open` → "RESIST THE URGE TO CHECK"
- `reduce_night_check` → "WIND DOWN WITHOUT APPS"
- `reduce_spend` → "PAUSE BEFORE YOU SPEND"

#### 5. Trigger selections are never persisted
Users pick their triggers expecting them to influence the experience. They don't. The data is only sent as a count in analytics. This is a trust violation — the app asks for input then ignores it.

**Fix:** Either (a) persist triggers to the user profile and use them to personalize panic session messaging, or (b) reframe this step as purely informational ("Here are common triggers people face") with no selection interaction.

### P1 — UX Friction

#### 6. Goal is silently pre-selected
`selectedGoal` defaults to `"reduce_swipe"`, so the first card renders as selected on load. A user who taps "Continue" without interacting has unknowingly "chosen" reduce_swipe. This skews analytics and may produce a mismatched experience.

**Fix:** Start with no goal selected (`null`). Disable the Continue button until one is tapped. This forces intentional engagement and produces cleaner data.

#### 7. Welcome screen has no safe area handling
The welcome step uses a plain `<View style={{flex: 1}}>` without `SafeAreaView` or top padding. On devices with a notch/Dynamic Island, content can overlap the status bar.

**Fix:** Wrap the welcome screen in `SafeAreaView` or apply `paddingTop: Platform.OS === "ios" ? 56 : 36` matching the progress dot area.

#### 8. Budget input has no validation
Typing "abc" into the budget field produces `NaN` which is silently stored as `null`. No error is shown. A user who types "$50" (with the dollar sign that's already prefixed) gets `NaN` too.

**Fix:** Strip non-numeric characters on input. Show an inline error if the parsed value is invalid. Disable "Continue" while the input is invalid.

#### 9. Action step is overwhelming — 7 cards with no selection
The demo action step shows 7 action cards the user can scroll through, but there's no selection mechanism. The button says "I did it" implying they performed an action, but none was chosen. The cognitive load is high and the interaction is hollow.

**Fix:** Show 3 highlight actions max (curated for the selected goal). Let the user tap one to "select" it, then enable the continue button. Or simplify to a single summary card: "After breathing, you'll pick a healthy alternative like stretching, walking, or journaling."

#### 10. Progress dots disappear on the "Nice work" sub-step
`DemoNiceWork` is rendered outside the progress dots wrapper, so the dots vanish on the final screen. This breaks visual continuity.

**Fix:** Include `<ProgressDots>` in the `DemoNiceWork` component, or render it in the parent.

#### 11. Nicework screen auto-advances with no user control
The 1.5s auto-advance means the user has no time to read the message on slower cognition, and no way to retry if `handleStart()` silently fails.

**Fix:** Replace the auto-advance with a "Let's go" button. Show a loading indicator while `handleStart()` runs. If it fails, show a retry button.

### P2 — Polish & Trust

#### 12. Notifications step lacks context about when the permission dialog appears
Users select "On" but the system permission dialog doesn't fire until after the demo completes. There's no indication this will happen, which can feel surprising.

**Fix:** Add a small note below the notification options: "We'll ask for permission after you try the demo."

#### 13. The 7-day course toggle is buried in the notifications step
Conceptually, the starter course has nothing to do with notifications. Placing it here makes it easy to miss and creates confusion about what this step is really about.

**Fix:** Move the course toggle to its own mini-step, or bundle it into the Goal step as a follow-up question: "Want to start with a 7-day guided course?"

#### 14. Spec says one-time $6.99 purchase, code implements $4.99/month subscription
The paywall the user hits after onboarding doesn't match the spec. This needs resolution before any other paywall work.

**Fix:** Align implementation to spec (or update spec). This is a product decision, not an onboarding UX issue per se, but it directly impacts the post-onboarding conversion moment.

#### 15. Off-palette colors in demo check-in
The "No" chip uses hardcoded `#E05A5A` (red) which isn't in the CLAUDE.md locked palette. The "Yes" chip background `#1A3D2E` and "No" background `#1A1220` are also off-palette.

**Fix:** Use theme-derived colors or add these to the palette if intentional. For consistency, use `colors.warning` or a muted approach instead of red for "No".

---

## Recommended Revised Flow

```
Welcome → Goal (with course opt-in) → Try It (breathing only) → Nice Work → Paywall
```

**4 screens + paywall = 5 total.** Here's what changes:

### Screen 1: Welcome (keep, add SafeAreaView)
- Logo, headline, subtitle, "Get started" button
- Add safe area inset

### Screen 2: Goal + Personalization (merge Goal + Triggers + Course)
- "What would feel like a win?" — 4 goal cards, no pre-selection
- Below: "When does the pull feel strongest?" — trigger chips (optional, clearly labeled)
- Below: course opt-in toggle
- Continue button (disabled until goal selected)
- Triggers and course are visible but clearly secondary — scroll reveals them
- **Back arrow** to Welcome

### Screen 3: Try It (simplified demo)
- "Let's try a quick breathing reset" — contextual label based on goal
- Start button → 12s breathing exercise → auto-advance to confirmation
- Skip link always visible
- **Back arrow** to Goal
- No action card dump, no demo check-in

### Screen 4: Nice Work (with explicit CTA)
- Success icon + "That's the core of Unmatch" message
- Brief preview of what else the app includes (check-ins, progress, course) — static, not interactive
- "Continue" button (not auto-advance)
- Triggers `handleStart()` on tap, shows loading state
- If notifications are "normal" (default), permission dialog fires here

### Screen 5: Paywall
- Unchanged (aside from spec alignment on pricing)

### Deferred to post-onboarding
- **Budget setup** → moved to Settings or first spend-urge panic session
- **Notification preference** → default to "on", let users change in Settings. The permission dialog is the real gate, not an onboarding screen.
- **Demo check-in** → removed. Users will discover the real check-in on Day 1.
- **Demo action cards** → removed. Users will see actions in their first real panic session.

---

## Implementation Priority

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | Add back navigation to all steps | S | High — reduces anxiety |
| 2 | Remove pre-selection on Goal (require tap) | XS | High — cleaner data + engagement |
| 3 | Derive breathing label from selected goal | XS | Medium — personalization consistency |
| 4 | Consolidate flow (Goal + Triggers + Course → one screen) | M | High — fewer drop-off points |
| 5 | Remove demo check-in and action dump | M | High — shorter path to value |
| 6 | Replace nicework auto-advance with explicit CTA | S | Medium — user control + error recovery |
| 7 | Add SafeAreaView to welcome screen | XS | Low — visual polish |
| 8 | Fix progress dots on nicework | XS | Low — visual consistency |
| 9 | Persist triggers (or reframe as informational) | M | Medium — trust |
| 10 | Add budget input validation | S | Low — edge case |
| 11 | Move notification pref to Settings (default on) | S | Medium — one less screen |
| 12 | Align paywall pricing with spec | M | High — product/revenue |

**Recommended order:** 1 → 2 → 3 → 6 → 7 → 8 → 4 → 5 → 11 → 9 → 10 → 12

Quick wins (1–3, 6–8) can ship immediately. The consolidation (4–5, 11) is the highest-impact change and should be the next sprint focus.

---

## Metrics to Track

After implementing changes, compare:

- **Onboarding completion rate** — % of users who reach paywall from welcome
- **Step-by-step drop-off** — which step loses the most users
- **Time to paywall** — seconds from first screen to paywall view
- **Goal distribution** — should be more even without pre-selection bias
- **Trial start rate** — % of paywall views that convert to trial

---

## Notes

- All changes respect CLAUDE.md constraints (no custom strings, no explicit wording, locked theme palette, locked libs)
- Budget setup is moved but not removed — it should be surfaced contextually during the first spend-urge panic session
- The revised flow maintains the demo breathing exercise as the core "aha moment" while cutting the screens that add length without adding value
