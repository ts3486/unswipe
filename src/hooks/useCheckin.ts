// useCheckin — daily check-in flow hook.
// Loads existing check-in on mount; submits a new one when none exists.
// Privacy: note and spent_amount are stored locally only, never sent to analytics.
// No default exports. TypeScript strict mode.

import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { createCheckin, getCheckinByDate } from "@/src/data/repositories";
import type { DailyCheckin } from "@/src/domain/types";
import { getLocalDateString } from "@/src/utils/date";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

interface CheckinState {
	mood: number;
	fatigue: number;
	urge: number;
	note: string;
	openedAtNight: boolean | null;
	spentToday: boolean | null;
	spentAmount: number | null;
	isSubmitting: boolean;
	isComplete: boolean;
	existingCheckin: DailyCheckin | null;
}

interface CheckinActions {
	setMood: (v: number) => void;
	setFatigue: (v: number) => void;
	setUrge: (v: number) => void;
	setNote: (v: string) => void;
	setOpenedAtNight: (v: boolean) => void;
	setSpentToday: (v: boolean) => void;
	setSpentAmount: (v: number) => void;
	submit: () => Promise<void>;
	loadExisting: () => Promise<void>;
}

export type UseCheckinReturn = CheckinState & CheckinActions;

// ---------------------------------------------------------------------------
// Default slider values (midpoint of 1-3 scale)
// ---------------------------------------------------------------------------

const DEFAULT_MOOD = 2;
const DEFAULT_FATIGUE = 2;
const DEFAULT_URGE = 2;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages the daily check-in form state and persistence.
 *
 * On mount it calls loadExisting() to populate state from today's stored
 * check-in if one already exists.
 *
 * Privacy invariants enforced here:
 *   - `note` is NEVER included in the analytics event payload.
 *   - `spentAmount` (spent_amount) is NEVER included in the analytics event payload.
 */
export function useCheckin(): UseCheckinReturn {
	const { db } = useDatabaseContext();
	const analytics = useAnalytics();

	const [mood, setMood] = useState<number>(DEFAULT_MOOD);
	const [fatigue, setFatigue] = useState<number>(DEFAULT_FATIGUE);
	const [urge, setUrge] = useState<number>(DEFAULT_URGE);
	const [note, setNote] = useState<string>("");
	const [openedAtNight, setOpenedAtNight] = useState<boolean | null>(null);
	const [spentToday, setSpentToday] = useState<boolean | null>(null);
	const [spentAmount, setSpentAmount] = useState<number | null>(null);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [isComplete, setIsComplete] = useState<boolean>(false);
	const [existingCheckin, setExistingCheckin] = useState<DailyCheckin | null>(
		null,
	);

	// ---------------------------------------------------------------------------
	// Load existing check-in
	// ---------------------------------------------------------------------------

	const loadExisting = useCallback(async (): Promise<void> => {
		const today = getLocalDateString();
		const existing = await getCheckinByDate(db, today);

		if (existing !== null) {
			setExistingCheckin(existing);
			setMood(existing.mood);
			setFatigue(existing.fatigue);
			setUrge(existing.urge);
			setNote(existing.note ?? "");
			setOpenedAtNight(
				existing.opened_at_night !== null
					? existing.opened_at_night === 1
					: null,
			);
			setSpentToday(
				existing.spent_today !== null ? existing.spent_today === 1 : null,
			);
			setSpentAmount(existing.spent_amount);
			setIsComplete(true);
		} else {
			setExistingCheckin(null);
			setIsComplete(false);
			setMood(DEFAULT_MOOD);
			setFatigue(DEFAULT_FATIGUE);
			setUrge(DEFAULT_URGE);
			setNote("");
			setOpenedAtNight(null);
			setSpentToday(null);
			setSpentAmount(null);
		}
	}, [db]);

	// Call loadExisting on mount.
	useEffect(() => {
		void loadExisting();
	}, [loadExisting]);

	// ---------------------------------------------------------------------------
	// Submit
	// ---------------------------------------------------------------------------

	const submit = useCallback(async (): Promise<void> => {
		if (isSubmitting || isComplete) {
			return;
		}

		setIsSubmitting(true);

		try {
			const today = getLocalDateString();

			const checkin = await createCheckin(db, {
				date_local: today,
				mood,
				fatigue,
				urge,
				// note is stored locally; excluded from analytics below.
				note: note.length > 0 ? note : null,
				opened_at_night:
					openedAtNight !== null ? (openedAtNight ? 1 : 0) : null,
				spent_today: spentToday !== null ? (spentToday ? 1 : 0) : null,
				// spent_amount is stored locally; excluded from analytics below.
				spent_amount: spentAmount,
			});

			setExistingCheckin(checkin);

			// Fire analytics event.
			// PRIVACY: note and spend_amount are intentionally absent from props.
			analytics.track({
				name: "daily_checkin_completed",
				props: {
					mood,
					fatigue,
					urge,
					opened_at_night: openedAtNight,
					spent_today: spentToday,
				},
			});

			setIsComplete(true);
		} finally {
			setIsSubmitting(false);
		}
	}, [
		db,
		analytics,
		isSubmitting,
		isComplete,
		mood,
		fatigue,
		urge,
		note,
		openedAtNight,
		spentToday,
		spentAmount,
	]);

	// ---------------------------------------------------------------------------
	// Setters (typed wrappers so callers use boolean instead of number)
	// ---------------------------------------------------------------------------

	const handleSetOpenedAtNight = useCallback((v: boolean): void => {
		setOpenedAtNight(v);
	}, []);

	const handleSetSpentToday = useCallback((v: boolean): void => {
		setSpentToday(v);
	}, []);

	const handleSetSpentAmount = useCallback((v: number): void => {
		setSpentAmount(v);
	}, []);

	return {
		mood,
		fatigue,
		urge,
		note,
		openedAtNight,
		spentToday,
		spentAmount,
		isSubmitting,
		isComplete,
		existingCheckin,
		setMood,
		setFatigue,
		setUrge,
		setNote,
		setOpenedAtNight: handleSetOpenedAtNight,
		setSpentToday: handleSetSpentToday,
		setSpentAmount: handleSetSpentAmount,
		submit,
		loadExisting,
	};
}
