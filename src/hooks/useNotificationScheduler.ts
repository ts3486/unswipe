// useNotificationScheduler — manages notification schedule lifecycle.
// Reschedules notifications on app foreground and when style changes.
// No default exports. TypeScript strict mode.

import { NOTIFICATION_IDS } from "@/src/constants/notification-content";
import type { NotificationStyle } from "@/src/domain/types";
import {
	cancelNotificationById,
	rescheduleAll,
} from "@/src/services/notification-service";
import { useCallback, useEffect, useRef } from "react";
import { AppState, type AppStateStatus } from "react-native";

interface UseNotificationSchedulerOptions {
	notificationStyle: NotificationStyle;
}

interface UseNotificationSchedulerReturn {
	cancelStreakNudge: () => Promise<void>;
}

export function useNotificationScheduler(
	options: UseNotificationSchedulerOptions,
): UseNotificationSchedulerReturn {
	const { notificationStyle } = options;
	const appStateRef = useRef<AppStateStatus>(AppState.currentState);

	// Reschedule when style changes
	useEffect(() => {
		void rescheduleAll(notificationStyle);
	}, [notificationStyle]);

	// Reschedule on foreground transition
	useEffect(() => {
		const subscription = AppState.addEventListener(
			"change",
			(nextState: AppStateStatus) => {
				if (
					appStateRef.current.match(/inactive|background/) &&
					nextState === "active"
				) {
					void rescheduleAll(notificationStyle);
				}
				appStateRef.current = nextState;
			},
		);

		return () => {
			subscription.remove();
		};
	}, [notificationStyle]);

	const cancelStreakNudge = useCallback(async (): Promise<void> => {
		await cancelNotificationById(NOTIFICATION_IDS.STREAK_NUDGE);
	}, []);

	return { cancelStreakNudge };
}
