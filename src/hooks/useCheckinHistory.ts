// useCheckinHistory — loads all daily check-ins, newest first.
// Powers the check-in history tab.
// No default exports. TypeScript strict mode.

import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { getAllCheckins } from "@/src/data/repositories";
import type { DailyCheckin } from "@/src/domain/types";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

interface CheckinHistoryState {
	checkins: DailyCheckin[];
	isLoading: boolean;
}

interface CheckinHistoryActions {
	refresh: () => Promise<void>;
}

export type UseCheckinHistoryReturn = CheckinHistoryState &
	CheckinHistoryActions;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Loads all daily check-ins from the database, ordered newest first.
 */
export function useCheckinHistory(): UseCheckinHistoryReturn {
	const { db } = useDatabaseContext();

	const [checkins, setCheckins] = useState<DailyCheckin[]>([]);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const refresh = useCallback(async (): Promise<void> => {
		setIsLoading(true);
		try {
			const all = await getAllCheckins(db);
			setCheckins(all);
		} finally {
			setIsLoading(false);
		}
	}, [db]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	return {
		checkins,
		isLoading,
		refresh,
	};
}
