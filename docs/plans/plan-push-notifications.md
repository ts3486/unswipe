# Plan: Push Notifications (Phase 2.2)

## Current State

| Layer | Status | Notes |
|-------|--------|-------|
| `expo-notifications` | Installed (unused) | In `package.json` + `app.json` plugins, but zero imports in app code |
| `NotificationStyle` type | Done | `'stealth' \| 'normal' \| 'off'` in `src/domain/types.ts` |
| DB field | Done | `notification_style TEXT DEFAULT 'normal'` in `user_profile` table |
| Onboarding UI | Done | Three-card picker for stealth/normal/off in `app/onboarding.tsx` (lines 408–506) |
| Settings UI | Done | Cycle-through toggle in `app/(tabs)/settings.tsx` |
| Permission request | Missing | No call to `requestPermissionsAsync()` anywhere |
| Scheduling logic | Missing | No scheduled notification code |
| Stealth/off mode handling | Missing | Style is saved to DB but never read by notification logic |
| Notification listeners | Missing | No response/received handlers |
| Service layer | Missing | No `NotificationService` or hook |

---

## Notification Types to Implement

| Notification | Trigger | Default Time | Purpose |
|-------------|---------|-------------|---------|
| Daily check-in reminder | Morning schedule | 09:00 local | Prompt user to complete daily check-in |
| Streak encouragement | Evening schedule (if no check-in yet) | 20:00 local | Nudge before day ends to keep streak alive |
| Course day unlock | After midnight when new day starts | 08:00 local | Inform user a new course day is available |

---

## Implementation Plan

### Step 1 — Notification Service

**Create `src/services/notification-service.ts`:**

```
NotificationService {
  requestPermission(): Promise<boolean>
  scheduleDaily(type, hour, minute, content): Promise<string>
  cancelAll(): Promise<void>
  cancelByIdentifier(id: string): Promise<void>
  rescheduleAll(style: NotificationStyle, profile: UserProfile): Promise<void>
  getScheduled(): Promise<Notification[]>
}
```

**Core logic:**

- Uses `expo-notifications` APIs: `scheduleNotificationAsync`, `cancelAllScheduledNotificationsAsync`, `requestPermissionsAsync`
- All notifications use `trigger: { type: 'daily', hour, minute }` (repeating daily)
- Each notification gets a deterministic identifier (e.g., `daily-checkin`, `streak-nudge`, `course-unlock`) so they can be individually cancelled/replaced

### Step 2 — Content by Notification Style

| Style | Title | Body Example |
|-------|-------|-------------|
| `normal` | "Unmatch" | "Time for your daily check-in! How are you feeling today?" |
| `stealth` | "Reminder" | "You have a pending task." |
| `off` | *(no notifications scheduled)* | — |

**Stealth rules (from CLAUDE.md):** neutral wording, no app name in notification body.

**Content constants:** Define in `src/constants/notification-content.ts` — one `normal` and one `stealth` variant per notification type.

### Step 3 — Permission Flow

**When to request:**

1. During onboarding — after user selects notification style (if not `off`)
2. In settings — when user switches from `off` to `normal`/`stealth`

**Flow:**

```
User selects "Normal" or "Stealth"
  → requestPermissionsAsync()
  → If granted: schedule notifications
  → If denied: save preference but show alert explaining notifications won't work
  → If "off": cancel all scheduled notifications
```

**Important:** Never request permission if user chose `off`. Respect the choice.

### Step 4 — Schedule Management

**Create `src/hooks/useNotificationScheduler.ts`:**

- Runs on app foreground (via `AppState` listener) and on profile change
- Reads `notification_style` from user profile
- Calls `NotificationService.rescheduleAll()` which:
  1. Cancels all existing scheduled notifications
  2. If style is `off`, return (no notifications)
  3. Schedules fresh notifications with content matching the current style
- This "cancel-then-reschedule" pattern ensures style changes take effect immediately

**When to reschedule:**

- App comes to foreground (catches timezone changes, OS permission changes)
- User changes notification style in settings
- User completes onboarding

### Step 5 — Smart Scheduling: Streak Nudge

The streak encouragement notification should only fire if the user hasn't checked in yet. Two approaches:

**Option A — Always schedule, cancel on check-in (Recommended):**

- Schedule the evening nudge every day at 20:00
- When user completes daily check-in, cancel that day's streak nudge
- Simpler, works even if app is killed

**Option B — Background task checks:**

- Use `expo-task-manager` to run a background check
- More complex, less reliable on iOS

**Recommendation:** Option A. Schedule optimistically, cancel when no longer needed.

### Step 6 — Notification Response Handling

**In `app/_layout.tsx` (or a dedicated `useNotificationListener` hook):**

```typescript
// On notification tap:
Notifications.addNotificationResponseReceivedListener((response) => {
  const type = response.notification.request.identifier;
  switch (type) {
    case 'daily-checkin':
      router.push('/(tabs)/home');  // Navigate to check-in
      break;
    case 'streak-nudge':
      router.push('/(tabs)/home');
      break;
    case 'course-unlock':
      router.push('/(tabs)/learn');
      break;
  }
});
```

**Analytics events on notification interaction:**

- `notification_opened` — `{ type: string }` (which notification was tapped)

### Step 7 — Integration with Root Layout

**Modify `app/_layout.tsx`:**

1. Set notification handler (for foreground notifications):
   ```typescript
   Notifications.setNotificationHandler({
     handleNotification: async () => ({
       shouldShowAlert: false,  // Don't show banner when app is open
       shouldPlaySound: false,
       shouldSetBadge: false,
     }),
   });
   ```
2. Register notification response listener (for tap handling)
3. Initialize notification scheduler

### Step 8 — Settings Integration

**Modify `app/(tabs)/settings.tsx`:**

- When `cycleNotifStyle()` changes to `normal`/`stealth`:
  - Check permission status
  - If not granted, request permission
  - Reschedule all notifications with new style content
- When changing to `off`:
  - Cancel all scheduled notifications
  - No permission request needed

### Step 9 — Tests

**Unit tests (`__tests__/services/notification-service.test.ts`):**

- Mock `expo-notifications` module
- Test `rescheduleAll()` schedules correct notifications for `normal` style
- Test `rescheduleAll()` schedules correct (stealth) content for `stealth` style
- Test `rescheduleAll()` cancels all for `off` style
- Test permission request is called only when needed
- Test notification identifiers are deterministic

**Integration tests:**

- Notification appears when app is backgrounded (manual, device testing)
- Tapping notification navigates to correct screen
- Style change immediately updates scheduled notifications
- Timezone change doesn't duplicate notifications

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/notification-service.ts` | Create | Core notification scheduling/cancellation logic |
| `src/constants/notification-content.ts` | Create | Normal + stealth content variants |
| `src/hooks/useNotificationScheduler.ts` | Create | App-level hook that manages schedule lifecycle |
| `app/_layout.tsx` | Modify | Init handler, response listener, scheduler |
| `app/(tabs)/settings.tsx` | Modify | Trigger reschedule on style change, permission request |
| `app/onboarding.tsx` | Modify | Request permission after style selection |
| `__tests__/services/notification-service.test.ts` | Create | Unit tests |

---

## Risks & Open Questions

1. **iOS notification limits** — iOS allows up to 64 scheduled local notifications; we use only 3, so no concern
2. **Exact timing** — `daily` trigger type fires at approximately the scheduled time; iOS may defer slightly for battery optimization. Acceptable for our use case.
3. **Timezone changes** — The cancel-and-reschedule-on-foreground pattern handles this. If user travels to new timezone, notifications adjust on next app open.
4. **Android notification channels** — `expo-notifications` creates a default channel. Consider creating a custom channel (`unmatch-reminders`) with user-controllable importance level.
5. **Stealth content review** — Ensure stealth wording passes Apple review (must still be meaningful, not misleading)
6. **Badge count** — Currently not using badge. Could add badge = 1 for pending check-in, cleared on completion. Deferred to future iteration.
