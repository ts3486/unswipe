# Plan: Crash Reporting & Analytics Provider (Phases 2.4 + 2.5)

These two features are combined into one plan because they share integration points (root layout initialization, build configuration, privacy filtering) and are both observability concerns.

---

## Current State

### Crash Reporting (2.4)

| Layer | Status | Notes |
|-------|--------|-------|
| Sentry SDK | Not installed | No `@sentry/react-native` or `sentry-expo` in deps |
| ErrorBoundary | Missing | No global error boundary component |
| Source maps | Not configured | No Sentry plugin in EAS build config |
| PII filtering | Not implemented | No scrubbing logic (needed to protect notes/spend amounts) |

### Analytics Provider (2.5)

| Layer | Status | Notes |
|-------|--------|-------|
| `AnalyticsAdapter` interface | Done | Typed interface in `src/services/analytics.ts` |
| Event types | Done | 12 typed events with `AnalyticsEvent` union type |
| Privacy enforcement | Done (compile-time) | `note` and `spend_amount` structurally excluded from all event types via TypeScript |
| Privacy tests | Done | 35 tests including 4 privacy-specific tests in `__tests__/services/analytics.test.ts` |
| `AnalyticsContext` | Done | Context + `useAnalytics()` hook in `src/contexts/AnalyticsContext.tsx` |
| `NoopAnalyticsAdapter` | Done | Stub adapter that silently discards events (current default) |
| Real adapter | Missing | `analytics.ts` has TODO comment: "Replace with FirebaseAnalyticsAdapter" |
| Provider SDK | Not installed | No PostHog, Mixpanel, Amplitude, or Firebase Analytics in deps |

---

## Provider Choices

### Crash Reporting: Sentry (Recommended)

- Industry standard for React Native crash reporting
- `sentry-expo` provides managed workflow support
- Automatic source map upload via EAS Build
- Built-in PII scrubbing / data scrubbing rules
- Free tier: 5K errors/month (sufficient for v1)

### Analytics: PostHog (Recommended)

**Why PostHog over Firebase Analytics / Mixpanel / Amplitude:**

- Self-hostable (future option for maximum privacy — aligns with app's privacy focus)
- Cloud version free tier: 1M events/month
- `posthog-react-native` SDK with Expo support
- Feature flags built-in (useful for future A/B testing)
- EU hosting option (GDPR compliance)
- Simpler event model than Firebase Analytics

**Alternative:** If simplicity is the priority and the team is already in the Firebase ecosystem, Firebase Analytics is also a reasonable choice. The existing TODO comments reference Firebase.

---

## Implementation Plan

### Part A — Crash Reporting (Sentry)

#### Step A1 — Install & Configure Sentry

```bash
pnpm add @sentry/react-native sentry-expo
```

**Create `src/services/sentry.ts`:**

```typescript
import * as Sentry from '@sentry/react-native';

export function initSentry() {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    tracesSampleRate: 0.2,  // 20% of transactions for performance monitoring
    beforeSend(event) {
      return scrubPII(event);
    },
    beforeBreadcrumb(breadcrumb) {
      return scrubBreadcrumb(breadcrumb);
    },
  });
}
```

#### Step A2 — PII Scrubbing

**Critical:** The app stores sensitive user data (notes, spend amounts) that must NEVER leak into crash reports.

**`scrubPII(event)` logic:**

- Strip any string field containing patterns matching note-like content
- Remove `spend_amount` from all breadcrumb/context data
- Use Sentry's `beforeSend` hook to intercept every event before transmission
- Allowlist known-safe fields rather than blocklisting dangerous ones (safer approach)

**Sentry server-side data scrubbing:**

- Enable "Data Scrubber" in Sentry project settings
- Add `note`, `notes`, `spend_amount`, `amount` to scrubbed field names
- Enable "Scrub IP addresses" for additional privacy

#### Step A3 — ErrorBoundary Component

**Create `src/components/ErrorBoundary.tsx`:**

```tsx
import * as Sentry from '@sentry/react-native';

class ErrorBoundary extends React.Component<Props, State> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={() => this.setState({ hasError: false })} />;
    }
    return this.props.children;
  }
}
```

**ErrorFallback UI:**

```
┌─────────────────────────┐
│                         │
│     ⚠️  Something       │
│     went wrong          │
│                         │
│  The app ran into an    │
│  unexpected issue.      │
│                         │
│    [ Try Again ]        │
│                         │
└─────────────────────────┘
```

- Styled with app theme
- "Try Again" resets error state, re-renders children
- No technical error details shown to user

#### Step A4 — Wrap Root Layout

**Modify `app/_layout.tsx`:**

```tsx
import { initSentry } from '@/services/sentry';
import { ErrorBoundary } from '@/components/ErrorBoundary';

initSentry();

export default Sentry.wrap(function RootLayout() {
  return (
    <ErrorBoundary>
      <AppProviders>
        {/* ... existing layout ... */}
      </AppProviders>
    </ErrorBoundary>
  );
});
```

`Sentry.wrap()` provides automatic performance monitoring and navigation tracking.

#### Step A5 — Source Maps in EAS Build

**Modify `app.json`:**

```json
{
  "plugins": [
    ["sentry-expo", {
      "organization": "<org-slug>",
      "project": "<project-slug>"
    }]
  ]
}
```

**Add to `eas.json` build profiles:**

```json
{
  "build": {
    "production": {
      "env": {
        "SENTRY_AUTH_TOKEN": "<token>"
      }
    }
  }
}
```

Source maps are automatically uploaded during EAS Build when the plugin is configured.

---

### Part B — Analytics Provider (PostHog)

#### Step B1 — Install PostHog SDK

```bash
pnpm add posthog-react-native
```

#### Step B2 — Implement PostHogAnalyticsAdapter

**Create `src/services/adapters/posthog-adapter.ts`:**

```typescript
import PostHog from 'posthog-react-native';
import { AnalyticsAdapter, AnalyticsEvent } from '../analytics';

export class PostHogAnalyticsAdapter implements AnalyticsAdapter {
  private client: PostHog;

  constructor(apiKey: string, host: string) {
    this.client = new PostHog(apiKey, { host });
  }

  track(event: AnalyticsEvent): void {
    this.client.capture(event.name, event.props);
  }

  identify(userId: string): void {
    this.client.identify(userId);
  }

  reset(): void {
    this.client.reset();
  }
}
```

**Key:** The adapter receives already-typed `AnalyticsEvent` objects. Since `note` and `spend_amount` are structurally excluded at the type level, they can never appear in `event.props`. The compile-time guarantee means no runtime filtering is needed in the adapter.

#### Step B3 — Wire Adapter into Context

**Modify `src/contexts/AnalyticsContext.tsx`:**

```typescript
import { PostHogAnalyticsAdapter } from '@/services/adapters/posthog-adapter';
import { NoopAnalyticsAdapter } from '@/services/analytics';

function createAdapter(): AnalyticsAdapter {
  if (__DEV__) {
    return new NoopAnalyticsAdapter(); // Silent in dev
  }
  const apiKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) {
    return new NoopAnalyticsAdapter(); // Graceful fallback
  }
  return new PostHogAnalyticsAdapter(apiKey, host);
}
```

**Keeps `NoopAnalyticsAdapter` for development and fallback** — no events sent in dev mode or if env vars are missing.

#### Step B4 — Environment Variables

**Add to `.env` (and EAS secrets):**

```
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
EXPO_PUBLIC_SENTRY_DSN=https://xxxx@sentry.io/xxxx
```

**Add `.env` to `.gitignore`** if not already present. Use EAS Secrets for production builds.

#### Step B5 — Dashboard Verification

After deploying a test build with real adapters:

1. Open PostHog dashboard
2. Verify each of the 12 event types appears with correct property names
3. Confirm `note` and `spend_amount` never appear in any event
4. Verify event volume is reasonable (no duplicate firing)
5. Check Sentry for any crash reports, verify no PII in payloads

---

### Step C — Tests

**Unit tests (`__tests__/services/adapters/posthog-adapter.test.ts`):**

- Mock `posthog-react-native`
- Test `track()` calls `capture()` with correct event name and props
- Test `identify()` passes user ID
- Test `reset()` calls PostHog reset

**Unit tests (`__tests__/components/ErrorBoundary.test.ts`):**

- Test renders children when no error
- Test renders fallback UI when child throws
- Test `Sentry.captureException` is called on error
- Test "Try Again" resets error state

**Privacy verification tests (extend existing `analytics.test.ts`):**

- Test that PostHogAnalyticsAdapter receives only typed events (compile-time, but worth a runtime assertion test)
- Test Sentry `beforeSend` scrubs known PII patterns

---

## File Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/sentry.ts` | Create | Sentry initialization + PII scrubbing |
| `src/components/ErrorBoundary.tsx` | Create | Global error boundary with fallback UI |
| `src/services/adapters/posthog-adapter.ts` | Create | PostHog analytics adapter |
| `src/contexts/AnalyticsContext.tsx` | Modify | Wire `PostHogAnalyticsAdapter` as production adapter |
| `app/_layout.tsx` | Modify | Init Sentry, wrap with `Sentry.wrap()` + `ErrorBoundary` |
| `app.json` | Modify | Add `sentry-expo` plugin config |
| `eas.json` | Modify | Add Sentry auth token to build env |
| `.env` | Create/Modify | PostHog + Sentry keys |
| `__tests__/services/adapters/posthog-adapter.test.ts` | Create | Adapter unit tests |
| `__tests__/components/ErrorBoundary.test.ts` | Create | Error boundary tests |
| `package.json` | Modify | Add `@sentry/react-native`, `sentry-expo`, `posthog-react-native` |

---

## Risks & Open Questions

1. **Provider decision** — PostHog is recommended but if the team prefers Firebase Analytics (already referenced in TODO comments), the adapter pattern makes switching trivial. Decide before starting.
2. **Sentry DSN exposure** — DSN in client code is by design (Sentry's model). Rate limiting and abuse prevention should be configured in Sentry project settings.
3. **Bundle size** — Sentry + PostHog add ~200-300KB to the JS bundle. Acceptable for the value they provide.
4. **GDPR / consent** — If targeting EU users, may need a consent banner before initializing analytics. PostHog supports opt-in mode. Sentry crash reporting is generally considered a "legitimate interest" under GDPR but consult legal.
5. **PostHog self-hosting** — Cloud is recommended for v1. Self-hosting can be considered later for maximum privacy alignment.
6. **Dev vs prod separation** — Use separate Sentry projects and PostHog projects for dev/staging/production to keep data clean.
7. **Existing test suite** — The 35 existing analytics tests validate the type system and NoopAdapter. They should continue passing unchanged. New tests cover the real adapters.
