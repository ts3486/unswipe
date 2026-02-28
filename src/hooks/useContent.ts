// useContent — hook for the learn/content tab.
// Loads all content items and tracks which have been completed.
// No default exports. TypeScript strict mode.

import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import {
	getAllContent,
	getContentProgress,
	markContentCompleted,
} from "@/src/data/repositories";
import type { Content } from "@/src/domain/types";
import { getLocalDateString } from "@/src/utils/date";
import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Day-index calculation
// ---------------------------------------------------------------------------

/**
 * Derive the current day index (1-based) from the user's created_at date.
 * Falls back to 1 when no start date is available.
 *
 * @param createdAtIso - ISO-8601 UTC string of when the user was created.
 * @returns 1-based day index, capped at 7 for the 7-day starter course.
 */
export function deriveDayIndex(createdAtIso: string | null): number {
	if (createdAtIso === null) {
		return 1;
	}

	const startDate = createdAtIso.slice(0, 10); // YYYY-MM-DD (UTC)
	const today = getLocalDateString();

	const startMs = new Date(`${startDate}T00:00:00Z`).getTime();
	const todayMs = new Date(`${today}T00:00:00Z`).getTime();
	const diffDays = Math.floor((todayMs - startMs) / (24 * 60 * 60 * 1_000));

	return Math.min(Math.max(diffDays + 1, 1), 7);
}

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

interface ContentState {
	allContent: Content[];
	completedIds: Set<string>;
	currentDayIndex: number;
	isLoading: boolean;
}

interface ContentActions {
	markCompleted: (contentId: string) => Promise<void>;
	refresh: () => Promise<void>;
}

export type UseContentReturn = ContentState & ContentActions;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Loads all content and completion progress from the database.
 *
 * `currentDayIndex` defaults to 1 and can be updated by passing the
 * user's created_at ISO string via the `createdAt` parameter.
 *
 * @param createdAt - Optional ISO-8601 UTC string (UserProfile.created_at).
 *                    Used to compute which day of the course the user is on.
 */
export function useContent(createdAt: string | null = null): UseContentReturn {
	const { db } = useDatabaseContext();
	const analytics = useAnalytics();

	const [allContent, setAllContent] = useState<Content[]>([]);
	const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
	const [currentDayIndex, setCurrentDayIndex] = useState<number>(
		deriveDayIndex(createdAt),
	);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	// ---------------------------------------------------------------------------
	// Refresh
	// ---------------------------------------------------------------------------

	const refresh = useCallback(async (): Promise<void> => {
		setIsLoading(true);

		try {
			const [content, progress] = await Promise.all([
				getAllContent(db),
				getContentProgress(db),
			]);

			setAllContent(content);
			setCompletedIds(new Set(progress.map((p) => p.content_id)));
			setCurrentDayIndex(deriveDayIndex(createdAt));
		} finally {
			setIsLoading(false);
		}
	}, [db, createdAt]);

	// Load on mount.
	useEffect(() => {
		void refresh();
	}, [refresh]);

	// ---------------------------------------------------------------------------
	// Mark completed
	// ---------------------------------------------------------------------------

	const markCompleted = useCallback(
		async (contentId: string): Promise<void> => {
			await markContentCompleted(db, contentId);

			setCompletedIds((prev) => {
				const next = new Set(prev);
				next.add(contentId);
				return next;
			});

			// Find content item for analytics payload.
			const item = allContent.find((c) => c.content_id === contentId);
			if (item !== undefined) {
				analytics.track({
					name: "content_completed",
					props: {
						content_id: item.content_id,
						day_index: item.day_index,
					},
				});
			}
		},
		[db, analytics, allContent],
	);

	return {
		allContent,
		completedIds,
		currentDayIndex,
		isLoading,
		markCompleted,
		refresh,
	};
}
