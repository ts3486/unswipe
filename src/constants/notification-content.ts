// Notification content constants.
// No default exports. TypeScript strict mode.

import i18n from "@/src/i18n";

export interface NotificationContent {
	title: string;
	body: string;
}

/**
 * Rotating motivational messages reminding the user to focus on themselves.
 * Two distinct messages are picked at random each day (morning + afternoon).
 * Read at call time (not module load) so the current locale is reflected.
 */
export function getDailyMotivationMessages(): NotificationContent[] {
	return i18n.t("pushNotifications.dailyMotivation", {
		returnObjects: true,
	}) as NotificationContent[];
}

// Default schedule times (24h format, local timezone)
export const NOTIFICATION_SCHEDULE = {
	DAILY_MOTIVATION_MORNING_HOUR: 9,
	DAILY_MOTIVATION_MORNING_MINUTE: 0,
	DAILY_MOTIVATION_AFTERNOON_HOUR: 14,
	DAILY_MOTIVATION_AFTERNOON_MINUTE: 0,
	STREAK_NUDGE_HOUR: 20,
	STREAK_NUDGE_MINUTE: 0,
} as const;
