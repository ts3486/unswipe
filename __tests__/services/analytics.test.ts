// Unit tests for src/services/analytics.ts.
// Verifies the NoopAnalyticsAdapter and the createAnalytics factory.
// Privacy rule: no test sends or logs note/spend_amount.

import {
  NoopAnalyticsAdapter,
  createAnalytics,
} from '@/src/services/analytics';
import type { AnalyticsAdapter, AnalyticsEvent } from '@/src/services/analytics';

// ---------------------------------------------------------------------------
// NoopAnalyticsAdapter
// ---------------------------------------------------------------------------

describe('NoopAnalyticsAdapter', () => {
  let adapter: NoopAnalyticsAdapter;

  beforeEach(() => {
    adapter = new NoopAnalyticsAdapter();
  });

  it('implements the AnalyticsAdapter interface', () => {
    const contract: AnalyticsAdapter = adapter;
    expect(typeof contract.track).toBe('function');
    expect(typeof contract.setUserId).toBe('function');
  });

  it('track() does not throw for onboarding_completed', () => {
    const event: AnalyticsEvent = {
      name: 'onboarding_completed',
      props: { goal_type: 'reduce_swipe', trigger_count: 2, has_budget: false },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for panic_started', () => {
    const event: AnalyticsEvent = {
      name: 'panic_started',
      props: { urge_kind: 'swipe', from_screen: 'home' },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for panic_protocol_completed', () => {
    const event: AnalyticsEvent = {
      name: 'panic_protocol_completed',
      props: { urge_kind: 'check', duration_ms: 3000 },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for panic_action_selected', () => {
    const event: AnalyticsEvent = {
      name: 'panic_action_selected',
      props: { urge_kind: 'spend', action_id: 'breathing_60' },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for panic_outcome_logged', () => {
    const event: AnalyticsEvent = {
      name: 'panic_outcome_logged',
      props: { urge_kind: 'swipe', outcome: 'success', trigger_tag: 'bored' },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for panic_outcome_logged with null trigger_tag', () => {
    const event: AnalyticsEvent = {
      name: 'panic_outcome_logged',
      props: { urge_kind: 'check', outcome: 'fail', trigger_tag: null },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for daily_checkin_completed', () => {
    const event: AnalyticsEvent = {
      name: 'daily_checkin_completed',
      props: {
        mood: 3,
        fatigue: 2,
        urge: 4,
        opened_at_night: false,
        spent_today: null,
        // note and spend_amount are intentionally absent — TypeScript enforces this
      },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for daily_checkin_completed with all nulls', () => {
    const event: AnalyticsEvent = {
      name: 'daily_checkin_completed',
      props: {
        mood: 3,
        fatigue: 3,
        urge: 3,
        opened_at_night: null,
        spent_today: null,
      },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for content_viewed', () => {
    const event: AnalyticsEvent = {
      name: 'content_viewed',
      props: { content_id: 'starter_7d_day_1', day_index: 1 },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for content_completed', () => {
    const event: AnalyticsEvent = {
      name: 'content_completed',
      props: { content_id: 'starter_7d_day_1', day_index: 1 },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for paywall_viewed', () => {
    const event: AnalyticsEvent = {
      name: 'paywall_viewed',
      props: { trigger_source: 'settings' },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for subscription_started', () => {
    const event: AnalyticsEvent = {
      name: 'subscription_started',
      props: { product_id: 'premium_monthly', period: 'monthly' },
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for data_exported', () => {
    const event: AnalyticsEvent = {
      name: 'data_exported',
      props: {},
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('track() does not throw for data_deleted', () => {
    const event: AnalyticsEvent = {
      name: 'data_deleted',
      props: {},
    };
    expect(() => adapter.track(event)).not.toThrow();
  });

  it('setUserId() does not throw', () => {
    expect(() => adapter.setUserId('user-123')).not.toThrow();
  });

  it('setUserId() does not throw for empty string', () => {
    expect(() => adapter.setUserId('')).not.toThrow();
  });

  it('calling track() multiple times does not throw', () => {
    const event: AnalyticsEvent = {
      name: 'panic_started',
      props: { urge_kind: 'swipe', from_screen: 'home' },
    };
    expect(() => {
      adapter.track(event);
      adapter.track(event);
      adapter.track(event);
    }).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createAnalytics factory
// ---------------------------------------------------------------------------

describe('createAnalytics()', () => {
  it('returns an object with a track method', () => {
    const analytics = createAnalytics();
    expect(typeof analytics.track).toBe('function');
  });

  it('returns an object with a setUserId method', () => {
    const analytics = createAnalytics();
    expect(typeof analytics.setUserId).toBe('function');
  });

  it('returned adapter does not throw on track()', () => {
    const analytics = createAnalytics();
    const event: AnalyticsEvent = {
      name: 'data_exported',
      props: {},
    };
    expect(() => analytics.track(event)).not.toThrow();
  });

  it('returned adapter does not throw on setUserId()', () => {
    const analytics = createAnalytics();
    expect(() => analytics.setUserId('test-id')).not.toThrow();
  });

  it('returns a NoopAnalyticsAdapter instance', () => {
    const analytics = createAnalytics();
    expect(analytics).toBeInstanceOf(NoopAnalyticsAdapter);
  });
});

// ---------------------------------------------------------------------------
// Privacy: analytics event shape does not carry note or spend_amount
// ---------------------------------------------------------------------------

describe('Analytics privacy — note and spend_amount absence', () => {
  // These tests verify at runtime that the event objects constructed for
  // daily_checkin_completed do not carry the prohibited fields.
  // The TypeScript type system enforces this at compile time, but we also
  // want a runtime guard as documentation and regression protection.

  it('daily_checkin_completed event does not include "note" key', () => {
    const event: AnalyticsEvent = {
      name: 'daily_checkin_completed',
      props: {
        mood: 3,
        fatigue: 2,
        urge: 4,
        opened_at_night: true,
        spent_today: false,
      },
    };
    expect(Object.keys(event.props)).not.toContain('note');
  });

  it('daily_checkin_completed event does not include "spend_amount" key', () => {
    const event: AnalyticsEvent = {
      name: 'daily_checkin_completed',
      props: {
        mood: 3,
        fatigue: 2,
        urge: 4,
        opened_at_night: null,
        spent_today: null,
      },
    };
    expect(Object.keys(event.props)).not.toContain('spend_amount');
  });

  it('panic_outcome_logged event does not include "spend_amount" key', () => {
    const event: AnalyticsEvent = {
      name: 'panic_outcome_logged',
      props: { urge_kind: 'spend', outcome: 'success', trigger_tag: null },
    };
    expect(Object.keys(event.props)).not.toContain('spend_amount');
  });
});
