// useWeeklySuccessCount — hook to load the current week's successful meditation count.
// Reads from the urge_event table via getWeeklySuccessCount repository function.
// No default exports. TypeScript strict mode.

import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { getWeeklySuccessCount } from "@/src/data/repositories/urge-repository";
import { getLocalDateString } from "@/src/utils/date";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

interface UseWeeklySuccessCountResult {
	weeklySuccessCount: number;
	isLoading: boolean;
	refresh: () => Promise<void>;
}

/**
 * Returns the number of successful meditations in the current calendar week
 * (Monday through today, inclusive).
 *
 * Refreshes on mount. Call refresh() to reload after a new meditation.
 */
export function useWeeklySuccessCount(): UseWeeklySuccessCountResult {
	const { db } = useDatabaseContext();
	const [weeklySuccessCount, setWeeklySuccessCount] = useState<number>(0);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const refresh = useCallback(async (): Promise<void> => {
		const today = getLocalDateString();
		const count = await getWeeklySuccessCount(db, today);
		setWeeklySuccessCount(count);
	}, [db]);

	useEffect(() => {
		let cancelled = false;

		async function load(): Promise<void> {
			await refresh();
			if (!cancelled) {
				setIsLoading(false);
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [refresh]);

	return { weeklySuccessCount, isLoading, refresh };
}
