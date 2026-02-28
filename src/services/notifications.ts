// Notifications service for Unmatch.
//
// Scheduling logic is separated into pure functions (testable without OS) and
// side-effectful scheduler functions (require expo-notifications + device).
//
// Privacy rules:
//   - Notification content must never mention spending amounts.
//
// No default exports. TypeScript strict mode.

import type { NotificationStyle, UserProfile } from "@/src/domain/types";
import * as ExpoNotifications from "expo-notifications";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface NotificationContent {
	title: string;
	body: string;
}

// ---------------------------------------------------------------------------
// Pure helper: evening nudge content
// ---------------------------------------------------------------------------

/**
 * Returns notification content for the evening nudge, or null when style is
 * 'off'.
 */
export function buildEveningNudgeContent(
	style: NotificationStyle,
): NotificationContent | null {
	if (style === "off") {
		return null;
	}
	return {
		title: "Feeling the urge?",
		body: "Open Unmatch for a 60-second reset.",
	};
}

// ---------------------------------------------------------------------------
// Pure helper: streak nudge content
// ---------------------------------------------------------------------------

/**
 * Returns notification content for the streak preservation nudge, or null
 * when the streak is below 3 or style is 'off'.
 */
export function buildStreakNudgeContent(
	streakDays: number,
	style: NotificationStyle,
): NotificationContent | null {
	if (style === "off") {
		return null;
	}
	if (streakDays < 3) {
		return null;
	}
	return {
		title: `Your ${streakDays}-day streak is still going.`,
		body: "Keep it alive?",
	};
}

// ---------------------------------------------------------------------------
// Pure helper: weekly summary content
// ---------------------------------------------------------------------------

/**
 * Returns notification content for the Sunday evening weekly summary, or null
 * when style is 'off'.
 */
export function buildWeeklySummaryContent(
	meditationCount: number,
	minutesSaved: number,
	style: NotificationStyle,
): NotificationContent | null {
	if (style === "off") {
		return null;
	}
	return {
		title: "Your week in review",
		body: `This week: ${meditationCount} meditations completed, ${minutesSaved} minutes saved. View your progress.`,
	};
}

// ---------------------------------------------------------------------------
// Pure helper: course unlock content
// ---------------------------------------------------------------------------

/**
 * Returns notification content for a course unlock notification, or null
 * when style is 'off'.
 */
export function buildCourseUnlockContent(
	style: NotificationStyle,
): NotificationContent | null {
	if (style === "off") {
		return null;
	}
	return {
		title: "Unmatch",
		body: "A new lesson is available in your starter course.",
	};
}

// ---------------------------------------------------------------------------
// Pure decision helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the evening nudge should be scheduled.
 * Sends only if the user has a non-'off' notification style and has NOT
 * opened the app today (to avoid redundant nudges).
 */
export function shouldSendEveningNudge(
	style: NotificationStyle,
	hasOpenedToday: boolean,
): boolean {
	if (style === "off") {
		return false;
	}
	return !hasOpenedToday;
}

/**
 * Returns true when the streak nudge should be scheduled.
 * Only nudges if: streak >= 3 AND the user has not already had a success
 * today (meaning the streak is genuinely at risk).
 */
export function shouldSendStreakNudge(
	streakDays: number,
	todaySuccess: boolean,
): boolean {
	if (streakDays < 3) {
		return false;
	}
	return !todaySuccess;
}

/**
 * Returns true when a course unlock notification should be scheduled.
 * Only notifies on days 2–7 when the user hasn't completed today's lesson.
 */
export function shouldSendCourseUnlock(
	currentDayIndex: number,
	todayContentCompleted: boolean,
): boolean {
	if (currentDayIndex <= 1) {
		return false;
	}
	if (currentDayIndex > 7) {
		return false;
	}
	return !todayContentCompleted;
}

/**
 * Returns the hour (0-23) at which to fire the evening nudge.
 * Randomly picks between 21 (9pm) and 22 (10pm) to avoid feeling robotic.
 */
export function getEveningTriggerHour(): number {
	return Math.random() < 0.5 ? 21 : 22;
}

// ---------------------------------------------------------------------------
// Side-effectful scheduling functions
// ---------------------------------------------------------------------------

/**
 * Requests notification permissions from the OS.
 * Returns true when granted, false otherwise.
 */
export async function requestPermissions(): Promise<boolean> {
	const { status: existingStatus } =
		await ExpoNotifications.getPermissionsAsync();

	if (existingStatus === "granted") {
		return true;
	}

	const { status } = await ExpoNotifications.requestPermissionsAsync();
	return status === "granted";
}

/**
 * Cancels all previously scheduled local notifications.
 * Call this before rescheduling to avoid duplicate notifications.
 */
export async function cancelAllScheduled(): Promise<void> {
	await ExpoNotifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Schedules the evening nudge for tonight at the chosen hour.
 * Does nothing when style is 'off' or user has already opened the app today.
 */
export async function scheduleEveningNudge(
	notificationStyle: NotificationStyle,
	hasOpenedToday: boolean,
): Promise<void> {
	if (!shouldSendEveningNudge(notificationStyle, hasOpenedToday)) {
		return;
	}

	const content = buildEveningNudgeContent(notificationStyle);
	if (content === null) {
		return;
	}

	const hour = getEveningTriggerHour();
	const now = new Date();
	const trigger = new Date(now);
	trigger.setHours(hour, 0, 0, 0);

	// If the chosen time has already passed today, skip (don't reschedule for
	// tomorrow; the next app-open tomorrow morning will reschedule).
	if (trigger <= now) {
		return;
	}

	await ExpoNotifications.scheduleNotificationAsync({
		content: {
			title: content.title,
			body: content.body.length > 0 ? content.body : undefined,
			sound: true,
		},
		trigger: {
			type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
			date: trigger,
		},
	});
}

/**
 * Schedules the streak preservation nudge for 8pm tonight.
 * Only fires when streak >= 3 and the user hasn't had a success today.
 */
export async function scheduleStreakNudge(
	streakDays: number,
	todaySuccess: boolean,
	notificationStyle: NotificationStyle,
): Promise<void> {
	if (!shouldSendStreakNudge(streakDays, todaySuccess)) {
		return;
	}

	const content = buildStreakNudgeContent(streakDays, notificationStyle);
	if (content === null) {
		return;
	}

	const now = new Date();
	const trigger = new Date(now);
	trigger.setHours(20, 0, 0, 0); // 8pm local

	if (trigger <= now) {
		return;
	}

	await ExpoNotifications.scheduleNotificationAsync({
		content: {
			title: content.title,
			body: content.body,
			sound: true,
		},
		trigger: {
			type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
			date: trigger,
		},
	});
}

/**
 * Schedules the weekly summary notification for this coming Sunday at 7pm.
 * Always schedules regardless of today's activity.
 */
export async function scheduleWeeklySummary(
	meditationCount: number,
	minutesSaved: number,
	notificationStyle: NotificationStyle,
): Promise<void> {
	const content = buildWeeklySummaryContent(meditationCount, minutesSaved, notificationStyle);
	if (content === null) {
		return;
	}

	const now = new Date();
	// Find next Sunday (0 = Sunday in JS Date).
	const daysUntilSunday = (7 - now.getDay()) % 7;
	const trigger = new Date(now);
	trigger.setDate(trigger.getDate() + daysUntilSunday);
	trigger.setHours(19, 0, 0, 0); // 7pm Sunday

	// If today is Sunday and 7pm has passed, skip until next Sunday.
	if (trigger <= now) {
		trigger.setDate(trigger.getDate() + 7);
	}

	await ExpoNotifications.scheduleNotificationAsync({
		content: {
			title: content.title,
			body: content.body,
			sound: true,
		},
		trigger: {
			type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
			date: trigger,
		},
	});
}

/**
 * Schedules the course unlock notification for today at 8:00 AM.
 * Only fires on days 2–7 when the user hasn't completed today's lesson.
 */
export async function scheduleCourseUnlock(
	notificationStyle: NotificationStyle,
	currentDayIndex: number,
	todayContentCompleted: boolean,
): Promise<void> {
	if (!shouldSendCourseUnlock(currentDayIndex, todayContentCompleted)) {
		return;
	}

	const content = buildCourseUnlockContent(notificationStyle);
	if (content === null) {
		return;
	}

	const now = new Date();
	const trigger = new Date(now);
	trigger.setHours(8, 0, 0, 0); // 8am local

	// If 8 AM already passed today, skip.
	if (trigger <= now) {
		return;
	}

	await ExpoNotifications.scheduleNotificationAsync({
		content: {
			title: content.title,
			body: content.body,
			sound: true,
		},
		trigger: {
			type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
			date: trigger,
		},
		identifier: "course-unlock",
	});
}

// ---------------------------------------------------------------------------
// Master scheduler
// ---------------------------------------------------------------------------

interface AppStateForNotifications {
	streak: number;
	todaySuccess: boolean;
	meditationCount: number;
	currentDayIndex: number;
	todayContentCompleted: boolean;
}

/**
 * Master scheduler — cancel all existing notifications and reschedule based
 * on current user profile and app state.
 *
 * Call this:
 *   - On app mount
 *   - When the app returns to foreground
 *   - After onboarding completes
 */
export async function rescheduleAll(
	userProfile: UserProfile,
	appState: AppStateForNotifications,
): Promise<void> {
	if (userProfile.notification_style === "off") {
		await cancelAllScheduled();
		return;
	}

	// Cancel previous schedule before rebuilding.
	await cancelAllScheduled();

	// Estimate minutes saved: 2 minutes per meditation (simple heuristic for V1).
	const MINUTES_PER_MEDITATION = 2;
	const minutesSaved = appState.meditationCount * MINUTES_PER_MEDITATION;

	// Schedule each notification type — each guard-checks internally.
	const style = userProfile.notification_style;
	await Promise.all([
		scheduleEveningNudge(style, appState.todaySuccess),
		scheduleStreakNudge(appState.streak, appState.todaySuccess, style),
		scheduleWeeklySummary(appState.meditationCount, minutesSaved, style),
		scheduleCourseUnlock(style, appState.currentDayIndex, appState.todayContentCompleted),
	]);
}
