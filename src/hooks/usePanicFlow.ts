// usePanicFlow — state machine for the panic/reset protocol.
// Manages step transitions, breathing timer, and outcome logging.
// No default exports. TypeScript strict mode.

import { BREATHING_DURATION_SECONDS } from "@/src/constants/config";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import {
	countSuccessesByDate,
	createUrgeEvent,
	getAllProgressDates,
	getLatestProgress,
	upsertProgress,
} from "@/src/data/repositories";
import { getCatalog } from "@/src/data/seed-loader";
import {
	calculateResistRank,
	isDaySuccess,
	shouldIncrementResist,
	shouldIncrementSpendAvoided,
} from "@/src/domain/progress-rules";
import { calculateStreak } from "@/src/domain/progress-rules";
import type {
	SpendCategory,
	SpendItemType,
	UrgeKind,
	UrgeOutcome,
} from "@/src/domain/types";
import { getLocalDateString } from "@/src/utils/date";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Step type
// ---------------------------------------------------------------------------

type PanicStep =
	| "select_urge"
	| "breathing"
	| "select_action"
	| "log_outcome"
	| "spend_delay"
	| "complete";

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

interface PanicFlowState {
	step: PanicStep;
	urgeKind: UrgeKind | null;
	actionId: string | null;
	outcome: UrgeOutcome | null;
	triggerTag: string | null;
	spendCategory: SpendCategory | null;
	spendItemType: SpendItemType | null;
	breathingTimeLeft: number;
	isBreathing: boolean;
	/** Resist rank after logOutcome; null until complete step. */
	resistRankAfter: number | null;
	/** Whether the resist rank leveled up during this session. */
	resistRankLeveledUp: boolean;
}

interface PanicFlowActions {
	selectUrgeKind: (kind: UrgeKind) => void;
	startBreathing: () => void;
	skipBreathing: () => void;
	completeBreathing: () => void;
	selectAction: (actionId: string) => void;
	logOutcome: (
		outcome: UrgeOutcome,
		triggerTag?: string | null,
	) => Promise<void>;
	selectSpendCategory: (category: SpendCategory) => void;
	selectSpendItemType: (itemType: SpendItemType) => void;
	reset: () => void;
}

export type UsePanicFlowReturn = PanicFlowState & PanicFlowActions;

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const INITIAL_STATE: PanicFlowState = {
	step: "select_urge",
	urgeKind: null,
	actionId: null,
	outcome: null,
	triggerTag: null,
	spendCategory: null,
	spendItemType: null,
	breathingTimeLeft: BREATHING_DURATION_SECONDS,
	isBreathing: false,
	resistRankAfter: null,
	resistRankLeveledUp: false,
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the full panic/reset flow state machine.
 *
 * Steps:
 *   select_urge -> breathing -> select_action
 *     -> (spend) spend_delay -> log_outcome -> complete
 *     -> (other) log_outcome -> complete
 *
 * The breathing timer counts down from BREATHING_DURATION_SECONDS.
 * When it reaches 0 it automatically transitions to select_action.
 */
export function usePanicFlow(): UsePanicFlowReturn {
	const { db } = useDatabaseContext();

	const [state, setState] = useState<PanicFlowState>(INITIAL_STATE);

	// Ref used to cancel the interval on unmount or when breathing stops.
	const breathingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	// Timestamp when breathing started (used to derive elapsed time if needed).
	const breathingStartRef = useRef<number | null>(null);

	// ---------------------------------------------------------------------------
	// Timer management
	// ---------------------------------------------------------------------------

	const clearBreathingTimer = useCallback(() => {
		if (breathingTimerRef.current !== null) {
			clearInterval(breathingTimerRef.current);
			breathingTimerRef.current = null;
		}
	}, []);

	// Clean up timer on unmount.
	useEffect(() => {
		return () => {
			clearBreathingTimer();
		};
	}, [clearBreathingTimer]);

	// ---------------------------------------------------------------------------
	// Actions
	// ---------------------------------------------------------------------------

	const selectUrgeKind = useCallback((kind: UrgeKind): void => {
		setState((prev) => ({ ...prev, urgeKind: kind }));
	}, []);

	const startBreathing = useCallback((): void => {
		clearBreathingTimer();
		breathingStartRef.current = Date.now();

		setState((prev) => ({
			...prev,
			step: "breathing",
			isBreathing: true,
			breathingTimeLeft: BREATHING_DURATION_SECONDS,
		}));

		const intervalId = setInterval(() => {
			setState((prev) => {
				const nextTime = prev.breathingTimeLeft - 1;

				if (nextTime <= 0) {
					clearInterval(intervalId);
					breathingTimerRef.current = null;
					return {
						...prev,
						step: "select_action",
						isBreathing: false,
						breathingTimeLeft: 0,
					};
				}

				return { ...prev, breathingTimeLeft: nextTime };
			});
		}, 1_000);

		breathingTimerRef.current = intervalId;
	}, [clearBreathingTimer]);

	const skipBreathing = useCallback((): void => {
		clearBreathingTimer();
		setState((prev) => ({
			...prev,
			step: "select_action",
			isBreathing: false,
			breathingTimeLeft: 0,
		}));
	}, [clearBreathingTimer]);

	const completeBreathing = useCallback((): void => {
		clearBreathingTimer();
		setState((prev) => ({
			...prev,
			step: "select_action",
			isBreathing: false,
			breathingTimeLeft: 0,
		}));
	}, [clearBreathingTimer]);

	const selectAction = useCallback((actionId: string): void => {
		setState((prev) => {
			// For spend urges, show spend_delay card step before log_outcome.
			const nextStep: PanicStep =
				prev.urgeKind === "spend" ? "spend_delay" : "log_outcome";
			return { ...prev, actionId, step: nextStep };
		});
	}, []);

	const selectSpendCategory = useCallback((category: SpendCategory): void => {
		setState((prev) => ({ ...prev, spendCategory: category }));
	}, []);

	const selectSpendItemType = useCallback((itemType: SpendItemType): void => {
		setState((prev) => ({ ...prev, spendItemType: itemType }));
	}, []);

	const logOutcome = useCallback(
		async (outcome: UrgeOutcome, triggerTag?: string | null): Promise<void> => {
			const today = getLocalDateString();
			const startedAt = new Date().toISOString();

			// Resolve action metadata from catalog.
			const catalog = getCatalog();
			const action =
				state.actionId !== null
					? catalog.actions.find((a) => a.id === state.actionId)
					: null;

			// Persist the urge event.
			await createUrgeEvent(db, {
				started_at: startedAt,
				from_screen: "panic",
				urge_level: 5, // Default mid-range; callers may extend this later.
				protocol_completed: 1,
				urge_kind: state.urgeKind ?? "check",
				action_type: action?.action_type ?? "general",
				action_id: state.actionId ?? "",
				outcome,
				trigger_tag: triggerTag ?? null,
				spend_category: state.spendCategory,
				spend_item_type: state.spendItemType,
				spend_amount: null, // Never stored via this flow.
			});

			// Load current totals to build updated progress.
			const existing = await getLatestProgress(db);
			const prevResistTotal = existing?.resist_count_total ?? 0;
			const prevSpendAvoided = existing?.spend_avoided_count_total ?? 0;

			const newResistTotal = shouldIncrementResist(outcome)
				? prevResistTotal + 1
				: prevResistTotal;

			const newSpendAvoided = shouldIncrementSpendAvoided(
				state.urgeKind ?? "check",
				outcome,
			)
				? prevSpendAvoided + 1
				: prevSpendAvoided;

			const prevResistRank = calculateResistRank(prevResistTotal);
			const newResistRank = calculateResistRank(newResistTotal);
			const rankLeveledUp = newResistRank > prevResistRank;

			// Build streak from all success dates.
			const allDates = await getAllProgressDates(db);
			const panicSuccessCount = await countSuccessesByDate(db, today);
			// panicSuccessCount already includes the event we just logged
			// because countSuccessesByDate queries the DB.
			const daySuccess = isDaySuccess(panicSuccessCount, false);
			const successDates = daySuccess
				? Array.from(new Set([...allDates, today]))
				: allDates;
			const newStreak = calculateStreak(successDates, today);

			await upsertProgress(db, {
				date_local: today,
				streak_current: newStreak,
				resist_count_total: newResistTotal,
				tree_level: newResistRank,
				last_success_date: daySuccess
					? today
					: (existing?.last_success_date ?? null),
				spend_avoided_count_total: newSpendAvoided,
			});

			setState((prev) => ({
				...prev,
				outcome,
				triggerTag: triggerTag ?? null,
				step: "complete",
				resistRankAfter: newResistRank,
				resistRankLeveledUp: rankLeveledUp,
			}));
		},
		[
			db,
			state.actionId,
			state.urgeKind,
			state.spendCategory,
			state.spendItemType,
		],
	);

	const reset = useCallback((): void => {
		clearBreathingTimer();
		setState(INITIAL_STATE);
	}, [clearBreathingTimer]);

	// ---------------------------------------------------------------------------
	// Derived catalog data (spend delay cards for the spend_delay step)
	// These are read-only seed data and do not need to be in state.
	// Screens access them via getCatalog() directly.
	// ---------------------------------------------------------------------------

	return {
		...state,
		selectUrgeKind,
		startBreathing,
		skipBreathing,
		completeBreathing,
		selectAction,
		logOutcome,
		selectSpendCategory,
		selectSpendItemType,
		reset,
	};
}
