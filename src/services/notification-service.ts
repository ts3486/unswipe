// Notification scheduling service for the Unmatch app.
// Wraps expo-notifications to schedule/cancel daily local notifications.
// Supports normal and stealth content modes; respects the 'off' preference.
// No default exports. TypeScript strict mode.

import {
	NOTIFICATION_CONTENT,
	NOTIFICATION_IDS,
	NOTIFICATION_SCHEDULE,
	type NotificationContent,
} from "@/src/constants/notification-content";
import type { NotificationStyle } from "@/src/domain/types";
import * as Notifications from "expo-notifications";

// ---------------------------------------------------------------------------
// Permission
// ---------------------------------------------------------------------------

/**
 * Request notification permission from the OS.
 * Returns true if permission was granted.
 */
export async function requestNotificationPermission(): Promise<boolean> {
	const { status } = await Notifications.requestPermissionsAsync();
	return status === "granted";
}

// ---------------------------------------------------------------------------
// Scheduling
// ---------------------------------------------------------------------------

/**
 * Schedule a repeating daily notification at the given hour/minute (local time).
 * Uses a deterministic identifier so the notification can be replaced/cancelled.
 */
export async function scheduleDaily(
	identifier: string,
	hour: number,
	minute: number,
	content: NotificationContent,
): Promise<string> {
	await Notifications.scheduleNotificationAsync({
		identifier,
		content: {
			title: content.title,
			body: content.body,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DAILY,
			hour,
			minute,
		},
	});
	return identifier;
}

// ---------------------------------------------------------------------------
// Cancellation
// ---------------------------------------------------------------------------

/**
 * Cancel all scheduled notifications.
 */
export async function cancelAllNotifications(): Promise<void> {
	await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Cancel a specific notification by its identifier.
 */
export async function cancelNotificationById(
	identifier: string,
): Promise<void> {
	await Notifications.cancelScheduledNotificationAsync(identifier);
}

// ---------------------------------------------------------------------------
// Query
// ---------------------------------------------------------------------------

/**
 * Get all currently scheduled notifications.
 */
export async function getScheduledNotifications(): Promise<
	Notifications.NotificationRequest[]
> {
	return Notifications.getAllScheduledNotificationsAsync();
}

// ---------------------------------------------------------------------------
// Reschedule
// ---------------------------------------------------------------------------

/**
 * Cancel all existing notifications and reschedule based on the current style.
 * If style is 'off', only cancels (no new notifications are scheduled).
 */
export async function rescheduleAll(style: NotificationStyle): Promise<void> {
	// Always cancel first to avoid duplicates
	await cancelAllNotifications();

	if (style === "off") {
		return;
	}

	// 'normal' or 'stealth'
	const contentKey = style;

	await scheduleDaily(
		NOTIFICATION_IDS.DAILY_CHECKIN,
		NOTIFICATION_SCHEDULE.DAILY_CHECKIN_HOUR,
		NOTIFICATION_SCHEDULE.DAILY_CHECKIN_MINUTE,
		NOTIFICATION_CONTENT[NOTIFICATION_IDS.DAILY_CHECKIN][contentKey],
	);

	await scheduleDaily(
		NOTIFICATION_IDS.STREAK_NUDGE,
		NOTIFICATION_SCHEDULE.STREAK_NUDGE_HOUR,
		NOTIFICATION_SCHEDULE.STREAK_NUDGE_MINUTE,
		NOTIFICATION_CONTENT[NOTIFICATION_IDS.STREAK_NUDGE][contentKey],
	);

	await scheduleDaily(
		NOTIFICATION_IDS.COURSE_UNLOCK,
		NOTIFICATION_SCHEDULE.COURSE_UNLOCK_HOUR,
		NOTIFICATION_SCHEDULE.COURSE_UNLOCK_MINUTE,
		NOTIFICATION_CONTENT[NOTIFICATION_IDS.COURSE_UNLOCK][contentKey],
	);
}
