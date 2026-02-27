# Unmatch — UI/UX Improvements for Marketing & Monetization

Changes needed to support the "free install, pay-to-unlock" model and improve conversion, retention, and shareability.

---

## 1. Paywall Redesign (Critical — Blocks Revenue)

### Current State
- Shows monthly ($4.99) and yearly ($29.99) subscription plans
- No real IAP integration (stub only)
- Generic feature list, no emotional hook

### Required Changes

#### 1.1 Switch to One-Time Purchase UI
```
Replace:
  Monthly / Yearly toggle
With:
  Single "Unlock Unmatch — $6.99" button
  Subtitle: "One payment. Yours forever. No subscription."
```

#### 1.2 Paywall Content Structure
The paywall screen should follow this layout top-to-bottom:

1. **Emotional hook** (above the fold)
   - Headline: "You've already taken the first step"
   - Subtext: "Most people reinstall dating apps within a week of deleting them. Unmatch gives you a better way."

2. **Social proof bar** (when available)
   - "Join X,000 people taking back their time"
   - Or a single compelling stat: "Users resist 73% of urges in their first week"

3. **3 value props with icons**
   - Clock icon: "60-second panic reset — anytime, anywhere, offline"
   - Shield icon: "Spend delay cards — think before you boost"
   - Chart icon: "Track your progress — see your streaks grow"

4. **Price block**
   - Large: "$6.99"
   - Below: "One-time purchase. No subscription. No account."
   - Compare: "Less than one Tinder boost"

5. **CTA button**
   - "Unlock Unmatch"
   - Full-width, primary color (#4C8DFF), high contrast

6. **Trust signals** (below CTA)
   - "All data stays on your device"
   - "No account required"
   - "Restore purchase" link (for reinstalls)

#### 1.3 Paywall Trigger Points
The paywall should appear at these moments:

| Trigger | Context |
|---|---|
| After first free reset | "That felt good. Unlock unlimited resets." |
| Tapping Panic tab (2nd+ time, unpaid) | Gentle gate before the flow |
| Tapping Day 2+ of starter course | "Unlock to continue learning" |
| Tapping Progress tab (unpaid) | "Unlock to track your journey" |
| From Settings | "Unlock Unmatch" row always visible |

The Home tab should remain partially visible (show streak of 0, encourage first reset) so unpaid users still feel the app is real, not an empty shell.

---

## 2. Onboarding Improvements

### 2.1 Add a "Demo Reset" Step
After the current 5-step onboarding, add a guided first panic reset:

- **Step 6: "Try your first reset"**
  - Auto-select "swipe" as urge type
  - Walk through the breathing exercise (with coaching overlay)
  - Show a coping action card
  - End with: "That's what Unmatch does. 60 seconds to take back control."
  - This is the **free taste** — the user completes one full reset before seeing the paywall

### 2.2 Shorten the Perception of Onboarding
- Add a progress indicator (dots or a thin bar) across all steps
- Make the breathing exercise step skippable with a visible "Skip" link
- Budget step (Step 4) already conditionally shows — keep this, it avoids unnecessary friction

### 2.3 Onboarding-to-Paywall Transition
After the demo reset completes:
1. Show a "Nice work" confirmation screen (reuse existing outcome screen)
2. Pause 1.5 seconds
3. Transition to paywall with context: "Unlock unlimited resets and your 7-day starter course"

This creates a natural moment where the user has just experienced value and is most likely to convert.

---

## 3. Home Tab Enhancements

### 3.1 Free vs. Paid State
When unpaid, the Home tab should show:
- The "Resist" button (tapping it navigates to paywall after first free use)
- A locked progress area: "Unlock to see your streak and stats"
- The first day of the starter course (tappable, navigates to paywall for Day 2+)
- A subtle "Unlock Unmatch — $6.99" banner at the bottom

When paid, Home works as currently designed.

### 3.2 Add "Time Saved" Counter
Show an estimated time-saved metric based on successful resists:
- Assume each avoided session = 12 minutes saved (configurable internally)
- Display: "You've saved ~2.4 hours this week"
- This gives users a concrete, shareable metric

### 3.3 Daily Motivation Card
Add a rotating card above the check-in with a short, non-preachy insight:
- Pull from a pool of 30+ preset messages in seed data
- Examples: "The average person spends 90 minutes/day on dating apps", "Boosts are priced to feel small. They add up."
- Tappable to expand into a full tip (bridges to Learn content)

---

## 4. Panic Flow Polish

### 4.1 Haptic Feedback
Add light haptic pulses during the breathing exercise (on each inhale start and exhale start). Uses `expo-haptics`, already available in Expo managed.

### 4.2 Visual Breathing Guide
Replace or supplement the timer text with an expanding/contracting circle animation:
- Inhale: circle expands smoothly over 4 seconds
- Hold: circle holds size for 2 seconds
- Exhale: circle contracts over 6 seconds
- Calming blue gradient (#4C8DFF → #7AA7FF)

### 4.3 Outcome Screen Enhancement
After logging "I resisted":
- Show confetti or a subtle particle animation (one-time, not looping)
- Display updated Resist Rank if it leveled up
- Show "Share your streak" button (see Section 8)

---

## 5. Progress Tab Improvements

### 5.1 Add a "Personal Best" Highlight
When the user achieves their longest streak:
- Animate the calendar to highlight the streak
- Show a card: "New personal best: 12 days"
- This creates a screenshot-worthy moment

### 5.2 Weekly Insight Cards
Below the calendar, add rotating insight cards:
- "You resist urges most on [weekday]"
- "Your strongest time is [morning/afternoon/evening]"
- "Check urges are down 40% this week"
- Derived from existing `urge_event` data

### 5.3 Day Detail Enhancement (`/progress/day/[date]`)
- Show a timeline of urge events for that day
- Display check-in mood if completed
- Show which coping actions were used

---

## 6. Settings & Trust

### 6.1 "Why We Charge" Section
Add a tappable row in Settings (visible to both free and paid users):
- Title: "Why Unmatch costs $6.99"
- Content: "No ads. No data selling. No subscription traps. Your one-time purchase funds development and keeps your data private. We'll never show ads or sell your information."
- This preempts the "why isn't it free" objection

### 6.2 Privacy Badge on Home
Add a small shield icon + "100% offline" label visible on the Home tab. Privacy is a core differentiator — make it visible, not buried in Settings.

---

## 7. Notification Improvements

### 7.1 Smart Evening Nudge
Schedule a notification for 9–10pm local time (peak dating app usage):
- "Feeling the urge? Open Unmatch for a 60-second reset."
- Stealth mode version: "Take a moment for yourself" (no app name)
- Only send if user hasn't opened the app that day
- Respect notification preferences from onboarding

### 7.2 Streak Preservation Nudge
If user had a streak of 3+ days and hasn't logged a resist or check-in today:
- Send at 8pm: "Your [X]-day streak is still going. Keep it alive?"
- Creates urgency without being pushy

### 7.3 Weekly Summary
Sunday evening notification:
- "This week: [X] urges resisted, [Y] minutes saved. View your progress."
- Links directly to Progress tab

---

## 8. Shareability Features

### 8.1 Share Streak Card
Generate a shareable image card showing:
- "I've been Unmatched for [X] days"
- Resist Rank badge
- Urges resisted count
- Branded with Unmatch logo + App Store link
- Dark theme matching app design
- Shareable via native share sheet

This is the primary viral mechanic. Make it beautiful and discreet (no "dating app" mention on the card — just "taking back my time").

### 8.2 Referral Mechanic (Post-Launch)
- Paid users can generate a "gift" link that gives a friend the app for free
- Cost to business: $0 (it's a digital good)
- Cap at 1–3 gift links per user to prevent abuse
- Track referral source for attribution

---

## 9. App Store Screenshot Optimization

The current 4 screenshots need to be supplemented to 5–6 and optimized:

### Recommended Screenshot Sequence
1. **Hero** — Phone showing "Resist" button + headline: "60 seconds to beat the urge"
2. **Breathing** — Breathing exercise with animated circle + "Breathe through it"
3. **Progress** — Calendar with green streak + "Watch your strength grow"
4. **Spend** — Spend delay card + "Think before you boost"
5. **Stealth** — Notification comparison (stealth vs normal) + "Your secret is safe"
6. **(Optional)** Course cards + "Learn the science behind the cycle"

### Screenshot Design Guidelines
- Dark backgrounds matching app theme (#0B1220)
- Large, readable headlines (min 60pt equivalent)
- Device frames (iPhone 15 Pro / Pixel 8 Pro)
- Consistent layout: headline top, phone mockup center, subtle gradient bottom
- No more than 5 words per headline

---

## 10. Accessibility & Inclusivity

### 10.1 Voiceover / TalkBack Support
- Ensure all interactive elements have accessibility labels
- The breathing exercise needs audio cues, not just visual
- Paywall must be fully navigable with screen reader

### 10.2 Reduced Motion
- Respect `prefers-reduced-motion` for the breathing animation
- Provide a text-based countdown alternative
- Disable confetti animation when reduced motion is on

### 10.3 Language
- Continue avoiding gendered language throughout
- Never assume heterosexual context
- "Dating apps" is already inclusive — maintain this

---

## Implementation Priority

| Priority | Change | Effort | Impact |
|---|---|---|---|
| P0 | Paywall redesign (one-time purchase) | Medium | Blocks all revenue |
| P0 | IAP integration (StoreKit/Play Billing) | Medium | Blocks all revenue |
| P0 | Free/paid state gating | Medium | Blocks conversion flow |
| P1 | Demo reset in onboarding | Small | High conversion impact |
| P1 | Onboarding-to-paywall transition | Small | High conversion impact |
| P1 | App Store screenshot optimization | Small | Higher download rate |
| P2 | Breathing circle animation | Small | Polish, retention |
| P2 | Haptic feedback | Small | Polish, retention |
| P2 | Time saved counter | Small | Retention, shareability |
| P2 | Share streak card | Medium | Viral growth |
| P2 | Evening/streak notifications | Medium | Retention |
| P3 | Weekly insight cards | Medium | Retention |
| P3 | "Why we charge" section | Small | Conversion support |
| P3 | Referral mechanic | Medium | Growth |
| P3 | Accessibility improvements | Medium | Inclusivity, App Store feature eligibility |
