# UX Improvements — Helping Users Understand the App

Audit of the current Unmatch app UX with actionable improvements, organized by impact. Goal: a first-time user should understand what the app does, how to use it, and feel guided — not lost — at every step.

---

## P0 — Critical (Users will be confused without these)

### 1. Onboarding: Add step progress indicator

**Problem:** 5 onboarding steps with zero indication of progress. Users don't know how far they are or how much is left. No back navigation means a mistake forces completion of the entire flow.

**Fix:**
- Add a dot stepper or "Step X of Y" label at the top of every onboarding screen.
- Add a back button (left arrow in header or top-left) on steps 2–5 so users can correct earlier choices.

---

### 2. Onboarding: Explain what the app actually does on the welcome screen

**Problem:** The welcome screen says "This app helps you be intentional about dating apps" — but never explains *how*. A new user has no mental model of what a "resist," "check-in," or "course" is. They're asked to pick a goal and triggers for a process they don't yet understand.

**Fix:** Add a brief "How it works" summary below the subtitle on the welcome screen, using 3 short bullets:

> - **Feel an urge?** Tap Pause for a guided breathing reset
> - **Track daily** with a private check-in — mood, fatigue, urge level
> - **Learn** with a 7-day course on breaking the swipe cycle

This primes the user's mental model before asking them to configure anything.

---

### 3. Home screen: The "Resist" button needs context

**Problem:** The sticky "Resist" bottom bar is the app's core CTA but the label is a bare imperative ("Resist") with no subtitle or explanation. A new user doesn't know what tapping it will do — is it a tracker? A timer? A pledge?

**Fix:**
- Add a one-line subtitle beneath the button label: "Feeling an urge? Start a guided reset"
- Optionally, on first launch only, show a brief tooltip/callout pointing to the Resist button: "Whenever you feel the pull to swipe, check, or spend — tap here."

---

### 4. Home screen: Show current streak

**Problem:** The streak is computed in AppStateContext but never displayed on the home screen. Users have to go to the Progress tab and mentally calculate from the calendar. A streak is the single most motivating metric for habit apps.

**Fix:** Add a compact streak indicator near the top of the home screen (e.g., next to the "Today done" chip or in the header area). Show the number prominently:

> **4-day streak** (or "Start your streak today" if 0)

---

### 5. Panic flow: Add back navigation and step indicator

**Problem:** Once a user taps a UrgeKindCard, the breathing exercise starts immediately with no confirmation and no way back. There's no indication of how many steps remain. Users who tap accidentally or change their mind are stuck.

**Fix:**
- Add a minimal step indicator (e.g., dots or a progress bar) at the top of the panic flow showing: Select > Breathe > Act > Log > Done.
- Add a back/close button (X in top-right corner or < back arrow) on every step except the final "Complete" screen. Tapping it on the first step returns to the previous tab; on later steps it goes back one step.

---

### 6. Learn tab: Empty state when course not enrolled

**Problem:** If the user didn't enable the 7-day course during onboarding, the Learn tab shows a title, subtitle, and nothing else. It looks broken.

**Fix:** Show an empty state card with an explanation and an enroll CTA:

> **Start your 7-day journey**
> A gentle daily practice to understand your habits and build healthier patterns. Each day takes 2–5 minutes.
> [Start the course]

Tapping the CTA enrolls the user and loads day 1.

---

## P1 — High Impact (Significant usability improvements)

### 7. Home screen: First-session guided tour

**Problem:** After onboarding, the user lands on the Home tab and sees a check-in card, a rank widget, and a Resist button — with no explanation of what to do first or how these relate.

**Fix:** On first launch after onboarding, show a lightweight guided overlay (coach marks) pointing to the 3 key areas:

1. **Check-in card:** "Start here each day — a quick private reflection"
2. **Resist Rank:** "Your rank grows as you resist urges"
3. **Resist button:** "Tap this whenever you feel the pull"

Dismiss on tap-anywhere. Show only once (persist a `has_seen_tour` flag).

---

### 8. Panic flow: Show action descriptions in the action selection step

**Problem:** The SelectActionStep shows action titles and estimated time, but not the `body`/`steps` content from the catalog. Users choose "5-min stretch" without knowing what it involves. This reduces trust in the suggested action.

**Fix:** Show the first line of the action's body text as a subtitle on the action card, or expand the card on tap to show the full body before committing to it.

---

### 9. Tab naming: Rename "Pause" to match the vocabulary

**Problem:** The tab bar says "Pause" but the home screen CTA says "Resist" and the completion screen says "resisted." The tab content itself doesn't use the word "pause" anywhere. Two different verbs for the same feature creates confusion.

**Fix:** Rename the tab to "Resist" to align with the button label and completion screen language. If "Pause" is preferred for brand reasons, at least add a subtitle inside the tab explaining: "Take a moment to pause and resist the urge."

---

### 10. Settings: Surface notification style as a proper selector

**Problem:** The notification style setting cycles on tap (Normal > Stealth > Off) with no visual affordance that it's interactive. It looks like a read-only display label. Users may never discover they can change it.

**Fix:** Either:
- (A) Show it as a segmented control (3 chips: Normal / Stealth / Off), or
- (B) Add a chevron-right icon to indicate it opens a picker, and show a bottom sheet with the 3 options and their descriptions.

---

### 11. Progress: Add a current streak display

**Problem:** The Progress tab shows "Personal best streak" (all-time) but not the current streak. The most motivating number — "how long is my current streak" — is missing.

**Fix:** Add a "Current streak" row at the top of the stats card, above "Personal best streak." If the current streak equals the personal best, highlight it with a visual marker (e.g., a small star or "New record!" label).

---

### 12. Day Detail: Show human-readable action names

**Problem:** The urge event timeline shows raw `action_id` values like `"breathing_60"` instead of the human-readable title from the catalog ("60-second reset breathing").

**Fix:** Look up the action title from the catalog data and display that instead of the raw ID.

---

## P2 — Medium Impact (Polish and delight)

### 13. Onboarding: Explain what triggers selection is for

**Problem:** Users select triggers during onboarding, but the selection has no visible effect anywhere in the app. It's stored nowhere and used for nothing. Users who carefully chose triggers will wonder why.

**Fix:** Either:
- (A) Persist trigger selections and use them to personalize the panic flow (e.g., pre-select the most relevant trigger on the log_outcome step), or
- (B) Remove the triggers step from onboarding entirely to reduce friction, and instead surface triggers organically during the first panic flow completion.

Option (A) is preferred — it gives meaning to the onboarding step and makes the log step faster.

---

### 14. Panic flow: Add an urge intensity slider

**Problem:** `urge_level` is hardcoded to 5 for every urge event. The domain model supports 1–10 but users never rate their urge. This is a missed opportunity for self-awareness and data richness.

**Fix:** Add a quick slider (1–10 or 1–5 scale with emoji labels like Mild / Moderate / Strong / Intense / Overwhelming) on the first step, after selecting the urge type. Keep it optional — default to middle value but let users adjust.

---

### 15. Home screen: Course card empty state

**Problem:** If the user enrolled in the 7-day course, a course card shows on home. If they didn't enroll or the course is over, nothing appears — with no explanation.

**Fix:**
- **Not enrolled:** Show a teaser card: "Explore the 7-day starter course" with a CTA to the Learn tab.
- **Course completed:** Show a congratulatory card: "7-day course complete! Revisit lessons anytime in Learn."

---

### 16. Check-in: Smarter defaults and confirmation

**Problem:** All three sliders (mood, fatigue, urge) default to 3/5. Users who tap "Save" immediately record a neutral check-in that may not reflect reality.

**Fix:**
- Don't pre-select any value. Show the chips as unselected until the user taps one. The "Save" button stays disabled until at least mood is rated.
- After saving, show a brief confirmation (e.g., a green toast "Check-in saved" or a subtle checkmark animation) before returning to home.

---

### 17. Settings: Show app version

**Problem:** No app version displayed anywhere. This is a standard expectation in mobile apps and needed for support/debugging.

**Fix:** Add a version string at the bottom of the Settings screen, below the footer: "Version 1.0.0 (build 1)" pulled from `expo-constants`.

---

### 18. Settings: Remove non-functional toggles or mark them as "coming soon"

**Problem:** The "App lock" toggle saves a flag but does nothing (no biometric auth integrated). Users who enable it will feel the app is broken when it doesn't lock.

**Fix:** Either:
- (A) Disable the toggle and show "Coming soon" badge, or
- (B) Remove it entirely from V1 and ship it when biometric auth is wired up.

Option (A) is preferred — it signals the feature is planned without misleading users.

---

## P3 — Nice to Have (Low effort, small wins)

### 19. Progress calendar: Improve month navigation

**Problem:** Month navigation uses plain text `<` and `>` characters as arrows. Looks unfinished.

**Fix:** Replace with `chevron-left` and `chevron-right` Material Community Icons, wrapped in an IconButton for proper touch targets.

---

### 20. Learn tab: Explain the day unlock logic

**Problem:** Users don't know why future days are locked. The logic is days-since-install, but this is never explained.

**Fix:** Add a brief note below the course subtitle: "A new lesson unlocks each day." On locked cards, show "Unlocks tomorrow" or "Unlocks in X days" instead of just a lock icon.

---

### 21. Panic flow: Add a transition message between breathing and action

**Problem:** The transition from breathing to action selection is abrupt — one moment you're breathing, the next you're picking an action.

**Fix:** Show a brief interstitial (1–2 seconds, or tap-to-dismiss): "Good. Now choose something to redirect that energy." This provides emotional closure for the breathing step and context for the next.

---

### 22. Check-in overlay: Use a proper modal

**Problem:** The CheckinOverlay is an absolute-positioned View, not a Modal. Swiping the tab bar during the overlay dismisses it without saving.

**Fix:** Wrap CheckinOverlay in a React Native `Modal` component (or use react-native-paper's `Portal`) to ensure it covers the entire screen including the tab bar.

---

### 23. Panic "Complete" screen: Add haptic feedback on success

**Problem:** The success screen shows a pulsing green check and text, but there's no haptic/tactile confirmation. Haptic feedback reinforces the positive moment.

**Fix:** Fire a light haptic (using `expo-haptics` — `Haptics.notificationAsync(Success)`) when the success screen animates in.

---

### 24. Progress calendar: Differentiate check-in days from resist days

**Problem:** All success days look the same on the calendar (green background). Users can't distinguish days where they did a check-in vs. days where they completed a resist.

**Fix:** Use two visual markers: a small dot below the day number for check-in completion, and the green background for resist success. Both can co-exist on the same day.

---

## Summary Priority Matrix

| Priority | Items | Theme |
|----------|-------|-------|
| **P0** | 1–6 | Users literally won't understand the app without these |
| **P1** | 7–12 | Major usability gaps; high-confidence improvements |
| **P2** | 13–18 | Meaningful polish; deepen engagement |
| **P3** | 19–24 | Small wins; refinement and delight |

### Suggested implementation order

**Phase 1 (Core clarity):** Items 1, 2, 3, 4, 5, 6
**Phase 2 (Guided experience):** Items 7, 8, 9, 10, 11, 12
**Phase 3 (Depth):** Items 13, 14, 15, 16, 17, 18
**Phase 4 (Polish):** Items 19, 20, 21, 22, 23, 24
