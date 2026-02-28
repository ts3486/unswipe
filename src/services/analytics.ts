// Analytics interface and adapters for the Unmatch app.
//
// PRIVACY RULES (LOCKED):
//   - `note` (daily_checkin.note) must NEVER appear in any event props.
//   - `spend_amount` must NEVER appear in any event props.
//   - These fields are structurally excluded from every event type below;
//     the TypeScript type system enforces this at compile time.
//
// No default exports. TypeScript strict mode assumed.

// ---------------------------------------------------------------------------
// Event union type
// ---------------------------------------------------------------------------

/**
 * Union of all analytics events the app may emit.
 *
 * Every member carries `name` (the exact event string from the spec) and
 * `props` (the associated payload).  Sensitive fields (`note`, `spend_amount`)
 * are deliberately absent from every props type.
 */
export type AnalyticsEvent =
	| {
			name: "onboarding_completed";
			props: {
				goal_type: string;
				trigger_count: number;
				has_budget: boolean;
			};
	  }
	| {
			name: "panic_started";
			props: {
				urge_kind: string;
				from_screen: string;
			};
	  }
	| {
			name: "panic_protocol_completed";
			props: {
				urge_kind: string;
				duration_ms: number;
			};
	  }
	| {
			name: "panic_action_selected";
			props: {
				urge_kind: string;
				action_id: string;
			};
	  }
	| {
			name: "panic_outcome_logged";
			props: {
				urge_kind: string;
				outcome: string;
				trigger_tag: string | null;
			};
	  }
	| {
			name: "daily_checkin_completed";
			props: {
				mood: number;
				fatigue: number;
				urge: number;
				/** Null when the user did not answer. */
				opened_at_night: boolean | null;
				/** Null when the user did not answer. */
				spent_today: boolean | null;
				// `note` and `spend_amount` are intentionally absent.
			};
	  }
	| {
			name: "content_viewed";
			props: {
				content_id: string;
				day_index: number;
			};
	  }
	| {
			name: "content_completed";
			props: {
				content_id: string;
				day_index: number;
			};
	  }
	| {
			name: "paywall_viewed";
			props: {
				trigger_source: string;
			};
	  }
	| {
			name: "purchase_completed";
			props: {
				product_id: string;
				period: string;
			};
	  }
	| {
			name: "subscription_started";
			props: {
				product_id: string;
				period: string;
			};
	  }
	| {
			name: "notification_opened";
			props: {
				type: string;
			};
	  }
	| {
			name: "data_exported";
			props: Record<string, never>;
	  }
	| {
			name: "data_deleted";
			props: Record<string, never>;
	  }
	| {
			name: "trial_started";
			props: Record<string, never>;
	  };

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------

/**
 * Minimal interface every analytics backend must implement.
 * Call `track` with a typed AnalyticsEvent; call `setUserId` after the user
 * is identified (post-onboarding).
 */
export interface AnalyticsAdapter {
	track(event: AnalyticsEvent): void;
	setUserId(id: string): void;
}

// ---------------------------------------------------------------------------
// No-op adapter
// ---------------------------------------------------------------------------

/**
 * Silent adapter that discards all events.
 * Used in development and as a safe fallback when no backend is configured.
 */
export class NoopAnalyticsAdapter implements AnalyticsAdapter {
	track(_event: AnalyticsEvent): void {
		// Intentionally empty — no data leaves the device.
	}

	setUserId(_id: string): void {
		// Intentionally empty.
	}
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Returns the analytics adapter appropriate for the current environment.
 *
 * TODO(firebase): Replace the returned adapter with a FirebaseAnalyticsAdapter
 * once the Firebase SDK is integrated.  The adapter must implement
 * `AnalyticsAdapter` and must not forward `note` or `spend_amount`.
 *
 * @returns An AnalyticsAdapter instance ready to use.
 */
export function createAnalytics(): AnalyticsAdapter {
	// TODO(firebase): swap for FirebaseAnalyticsAdapter when available.
	return new NoopAnalyticsAdapter();
}
