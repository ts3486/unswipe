# Plan: App Blocker — Screen Time API Integration

## Overview

Allow users to block specific dating apps directly from Unmatch using Apple's Screen Time API (FamilyControls / ManagedSettings / DeviceActivity frameworks). This replaces the current manual guide with native, in-app control over app blocking.

**Target platform:** iOS 16+ only (frameworks are iOS 16+; Android has no equivalent API).

---

## Current State

| Layer | Status | Notes |
|-------|--------|-------|
| `/settings/blocker-guide` | Done | Static step-by-step guide for manual Screen Time setup |
| Native Screen Time integration | Missing | No native module, no entitlement, no config plugin |
| App selection UI | Missing | No in-app picker for selecting apps to block |
| Block/unblock logic | Missing | No programmatic shield management |

**Current behavior:** The blocker guide screen tells users how to set up Screen Time manually. The app has no ability to block other apps itself.

---

## Phased Rollout

### Phase 1 — Apple Entitlement Application (Non-code, start immediately)

Apple requires the **Family Controls** entitlement to use these APIs. This is a manual application process.

**Steps:**

1. Log in to [Apple Developer Account](https://developer.apple.com/account)
2. Navigate to Certificates, Identifiers & Profiles → Identifiers
3. Select the app's bundle ID
4. Request the `com.apple.developer.family-controls` entitlement
5. Fill out the application form explaining the use case:
   - "Digital wellbeing app that helps users reduce compulsive dating app usage"
   - "Users voluntarily select which apps to restrict"
   - "No parental control / child monitoring features"
6. Wait for Apple review (typically 1–4 weeks)

**Blocker:** Phase 2 cannot begin until Apple approves the entitlement.

**Risk:** Apple may reject the application. If rejected, fall back to improving Phase 1's manual guide with better UX (deep links, screenshots, video walkthroughs).

---

### Phase 2 — Expo Config Plugin + Native Swift Module

Build the native Swift code and bridge it to React Native via an Expo Config Plugin using `expo-modules-api`.

#### Step 1 — Scaffold the Expo Module

Create a local Expo module for the Screen Time bridge.

**Directory structure:**

```
modules/
  screen-time/
    expo-module.config.json
    index.ts                          ← JS API surface
    src/
      ScreenTimeModule.swift          ← Native implementation
    plugin/
      src/
        index.ts                      ← Config plugin (adds entitlements + frameworks)
```

**`expo-module.config.json`:**

```json
{
  "platforms": ["ios"],
  "ios": {
    "modules": ["ScreenTimeModule"]
  }
}
```

**Config plugin responsibilities (`plugin/src/index.ts`):**

- Add `com.apple.developer.family-controls` entitlement to the app's `.entitlements` file
- Link `FamilyControls.framework`, `ManagedSettings.framework`, `DeviceActivity.framework`
- Set minimum deployment target to iOS 16.0 if below

#### Step 2 — Native Swift Module

**`ScreenTimeModule.swift` — Core API:**

```swift
import ExpoModulesCore
import FamilyControls
import ManagedSettings

public class ScreenTimeModule: Module {
  private let center = AuthorizationCenter.shared
  private let store = ManagedSettingsStore()

  public func definition() -> ModuleDefinition {
    Name("ScreenTime")

    // Request Screen Time authorization from the user
    AsyncFunction("requestAuthorization") { () -> Bool in
      try await center.requestAuthorization(for: .individual)
      return center.authorizationStatus == .approved
    }

    // Check current authorization status
    Function("getAuthorizationStatus") { () -> String in
      switch center.authorizationStatus {
      case .notDetermined: return "notDetermined"
      case .approved: return "approved"
      case .denied: return "denied"
      @unknown default: return "unknown"
      }
    }

    // Present Apple's FamilyActivityPicker (native UI for selecting apps)
    // Returns opaque app tokens — we never see actual app names/bundle IDs
    AsyncFunction("presentAppPicker") { () -> Void in
      // FamilyActivityPicker must be presented as a SwiftUI view
      // This triggers a native sheet the user interacts with
    }

    // Apply shields (block) to selected apps
    AsyncFunction("shieldApps") { (tokenData: Data) -> Void in
      let selection = try JSONDecoder().decode(FamilyActivitySelection.self, from: tokenData)
      store.shield.applications = selection.applicationTokens
    }

    // Remove all shields (unblock all apps)
    Function("removeAllShields") { () -> Void in
      store.shield.applications = nil
    }

    // Check if any apps are currently shielded
    Function("hasActiveShields") { () -> Bool in
      return store.shield.applications != nil
    }
  }
}
```

**Key constraints of Apple's API:**
- `FamilyActivityPicker` is a **SwiftUI view** — must be presented natively, not in RN
- App tokens are **opaque** — your app never learns which specific apps the user selected (privacy by design)
- Tokens persist across app launches when stored
- Shields are **system-level** — they survive app kill and device restart

#### Step 3 — FamilyActivityPicker as a Native SwiftUI View

Since `FamilyActivityPicker` is SwiftUI-only, we need a native view component.

**Options:**
1. Present it as a native modal triggered from JS (recommended)
2. Embed it via `UIHostingController` in an RN native view

**Approach:** Use option 1. When JS calls `presentAppPicker()`, the native module presents a `UIHostingController` wrapping the `FamilyActivityPicker` as a modal sheet. On completion, the selected tokens are passed back to JS as serialized data.

#### Step 4 — JS Bridge (`modules/screen-time/index.ts`)

```typescript
import { requireNativeModule } from 'expo-modules-core';

const ScreenTimeModule = requireNativeModule('ScreenTime');

export type AuthorizationStatus = 'notDetermined' | 'approved' | 'denied' | 'unknown';

export async function requestAuthorization(): Promise<boolean> {
  return ScreenTimeModule.requestAuthorization();
}

export function getAuthorizationStatus(): AuthorizationStatus {
  return ScreenTimeModule.getAuthorizationStatus();
}

export async function presentAppPicker(): Promise<void> {
  return ScreenTimeModule.presentAppPicker();
}

export async function shieldApps(tokenData: string): Promise<void> {
  return ScreenTimeModule.shieldApps(tokenData);
}

export function removeAllShields(): void {
  ScreenTimeModule.removeAllShields();
}

export function hasActiveShields(): boolean {
  return ScreenTimeModule.hasActiveShields();
}
```

---

### Phase 3 — React Native Integration

#### Step 5 — Hook: `useAppBlocker`

**Create `src/hooks/useAppBlocker.ts`:**

```typescript
interface AppBlockerState {
  /** Whether Screen Time authorization has been granted */
  isAuthorized: boolean;
  /** Whether the feature is available (iOS 16+, entitlement present) */
  isAvailable: boolean;
  /** Whether any apps are currently blocked */
  isBlocking: boolean;
  /** Request Screen Time authorization */
  requestAuth(): Promise<boolean>;
  /** Open the native app picker to select apps to block */
  pickApps(): Promise<void>;
  /** Remove all blocks */
  unblockAll(): void;
}
```

**Logic:**

- On mount: check `getAuthorizationStatus()` and `hasActiveShields()`
- `requestAuth()`: calls `requestAuthorization()`, updates state
- `pickApps()`: calls `presentAppPicker()`, then `shieldApps()` with returned tokens
- `unblockAll()`: calls `removeAllShields()`, updates state
- Persist selected token data to `expo-secure-store` so shields can be re-applied after app reinstall

#### Step 6 — Blocker Settings Screen

**Modify `/settings/blocker-guide.tsx`** — transform from static guide to interactive blocker screen.

**UI flow:**

```
┌─────────────────────────────────┐
│  App Blocker                    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 🛡  Block Dating Apps   │    │
│  │                         │    │
│  │ Prevent selected apps   │    │
│  │ from opening on your    │    │
│  │ device.                 │    │
│  │                         │    │
│  │ [Choose Apps to Block]  │    │  ← Opens FamilyActivityPicker
│  └─────────────────────────┘    │
│                                 │
│  Status: 3 apps blocked    ✓   │  ← Shows count (we can't show names)
│                                 │
│  ┌─────────────────────────┐    │
│  │ [Unblock All Apps]      │    │  ← Confirmation dialog first
│  └─────────────────────────┘    │
│                                 │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
│                                 │
│  ℹ  You can change your         │
│  blocked apps at any time.      │
│  This uses iOS Screen Time.     │
│                                 │
│  [Set Up Manually Instead →]    │  ← Falls back to current guide
│                                 │
└─────────────────────────────────┘
```

**State-dependent rendering:**

| Authorization State | What the user sees |
|--------------------|--------------------|
| `notDetermined` | "Enable App Blocker" button → triggers auth prompt |
| `approved` | Full blocker UI (pick apps, unblock, status) |
| `denied` | Message explaining how to enable in Settings → fallback to manual guide |
| iOS < 16 / no entitlement | Show manual guide only (current behavior) |

#### Step 7 — Integration with Panic Flow (Optional Enhancement)

Connect blocking to the resist/panic system:

- When user starts a panic session → optionally re-apply shields if they were removed
- When user resists successfully → shields stay active (positive reinforcement)
- Settings option: "Auto-block after resist" (re-shields apps after each successful resist)

This is optional and can be a follow-up after the core blocker works.

---

### Phase 4 — Persist & Restore

#### Step 8 — Token Persistence

App tokens from `FamilyActivityPicker` must be persisted so shields survive:
- App restart
- Device restart (shields persist system-level, but we need tokens to modify them)

**Storage:** Serialize `FamilyActivitySelection` to `expo-secure-store` (tokens are sensitive).

**Restore flow on app launch:**
1. Read stored tokens from SecureStore
2. Check authorization status
3. If authorized + tokens exist → verify shields are still active
4. If shields dropped (user cleared Screen Time) → update UI state accordingly

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `modules/screen-time/expo-module.config.json` | Create | Expo module config |
| `modules/screen-time/index.ts` | Create | JS API surface for Screen Time bridge |
| `modules/screen-time/src/ScreenTimeModule.swift` | Create | Native Swift module — auth, picker, shield management |
| `modules/screen-time/plugin/src/index.ts` | Create | Config plugin — adds entitlements + frameworks to Xcode project |
| `src/hooks/useAppBlocker.ts` | Create | React hook wrapping the native module |
| `app/settings/blocker-guide.tsx` | Modify | Transform from static guide → interactive blocker + fallback guide |
| `app.json` / `app.config.ts` | Modify | Register the config plugin |
| `package.json` | Modify | Add local module reference |

---

## Constraints & Compliance

| CLAUDE.md Rule | How we comply |
|----------------|---------------|
| No forced lockouts | User chooses which apps to block and can unblock at any time. No auto-locking without user action. |
| Expo Managed RN | Config plugin approach keeps us in Expo Managed — no eject required. |
| No backend V1 | All token storage is local (SecureStore). No server communication. |
| No explicit sexual wording | UI copy is neutral: "dating apps", "app blocker", "set boundaries". |
| No cure/treatment claims | Framed as "a tool to help you set boundaries", never as treatment. |
| No perfect blocking claims | Disclaimer: "You can change your blocked apps at any time." |
| Privacy: no free-text in analytics | Only emit `blocker_enabled`, `blocker_disabled`, `blocker_apps_updated` events. No app names or tokens in analytics. |

---

## Analytics Events

| Event | Properties | Notes |
|-------|------------|-------|
| `blocker_auth_requested` | `{ status: 'approved' \| 'denied' }` | User responded to Screen Time auth prompt |
| `blocker_apps_updated` | `{ count: number }` | Number of apps selected (not names) |
| `blocker_enabled` | `{}` | Shields activated |
| `blocker_disabled` | `{}` | All shields removed |

---

## Risks & Open Questions

1. **Entitlement rejection** — Apple may not approve. Mitigation: improve the manual guide with screenshots/video and possibly deep link to Screen Time settings (`App-Prefs:SCREEN_TIME` — may be rejected in App Store review).

2. **FamilyActivityPicker is SwiftUI-only** — Requires bridging via `UIHostingController`. This is a well-documented pattern but adds native complexity.

3. **Opaque tokens** — We cannot display which apps the user blocked (Apple privacy design). UI must communicate this clearly: "3 apps blocked" not "Tinder, Bumble, Hinge blocked".

4. **iOS 16+ requirement** — Users on iOS 15 or below see the manual guide fallback. As of 2025, iOS 16+ adoption is ~95%, so this is acceptable.

5. **Token invalidation** — If the user uninstalls a blocked app and reinstalls it, the token may become invalid. Need to handle gracefully (remove stale tokens, prompt re-selection).

6. **Expo SDK compatibility** — The local module approach with `expo-modules-api` is stable but requires testing with each Expo SDK upgrade. Pin the module to the current SDK version.

7. **App Store review** — Apple may scrutinize Screen Time API usage. Ensure the app description clearly states it's a voluntary self-care tool, not parental control or MDM.

---

## Timeline Estimate

| Phase | Duration | Blocker |
|-------|----------|---------|
| Phase 1 — Entitlement application | 1–4 weeks (Apple review) | None — start immediately |
| Phase 2 — Native module + config plugin | 1–2 weeks dev | Phase 1 approval |
| Phase 3 — RN integration + UI | 1 week dev | Phase 2 |
| Phase 4 — Persistence + edge cases | 2–3 days dev | Phase 3 |
| Testing + App Store submission | 1 week | Phase 4 |

**Total:** ~3–6 weeks (dominated by Apple's entitlement review time).
