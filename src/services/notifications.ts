// Notifications service for Unmatch.
//
// Scheduling logic is separated into pure functions (testable without OS) and
// side-effectful scheduler functions (require expo-notifications + device).
//
// Privacy rules:
//   - Notification content must never mention spending amounts.
//
// No default exports. TypeScript strict mode.

import {
	NOTIFICATION_SCHEDULE,
	getDailyMotivationMessages,
} from "@/src/constants/notification-content";
import type { NotificationStyle, UserProfile } from "@/src/domain/types";
import i18n from "@/src/i18n";
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
		title: i18n.t("pushNotifications.eveningNudgeTitle"),
		body: i18n.t("pushNotifications.eveningNudgeBody"),
	};
}

// ---------------------------------------------------------------------------
// Pure helper: daily motivation content (2 distinct messages)
// ---------------------------------------------------------------------------

/**
 * Picks two distinct random messages from DAILY_MOTIVATION_MESSAGES.
 * Returns null when style is 'off'.
 */
export function pickDailyMotivationPair(
	style: NotificationStyle,
): [NotificationContent, NotificationContent] | null {
	if (style === "off") {
		return null;
	}
	const messages = getDailyMotivationMessages();
	const firstIndex = Math.floor(Math.random() * messages.length);
	let secondIndex = Math.floor(Math.random() * (messages.length - 1));
	if (secondIndex >= firstIndex) {
		secondIndex += 1;
	}
	return [messages[firstIndex], messages[secondIndex]];
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
		title: i18n.t("pushNotifications.streakStillGoingTitle", {
			days: streakDays,
		}),
		body: i18n.t("pushNotifications.keepItAlive"),
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
		title: i18n.t("pushNotifications.weeklySummaryTitle"),
		body: i18n.t("pushNotifications.weeklySummaryBody", {
			count: meditationCount,
			minutes: minutesSaved,
		}),
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
	const content = buildWeeklySummaryContent(
		meditationCount,
		minutesSaved,
		notificationStyle,
	);
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

// ---------------------------------------------------------------------------
// Side-effectful: daily motivation (morning + afternoon)
// ---------------------------------------------------------------------------

/**
 * Schedules two motivational notifications: one at 9 AM, one at 2 PM.
 * Each uses a distinct randomly picked message.
 */
export async function scheduleDailyMotivation(
	notificationStyle: NotificationStyle,
): Promise<void> {
	const pair = pickDailyMotivationPair(notificationStyle);
	if (pair === null) {
		return;
	}

	const now = new Date();

	const morningTrigger = new Date(now);
	morningTrigger.setHours(
		NOTIFICATION_SCHEDULE.DAILY_MOTIVATION_MORNING_HOUR,
		NOTIFICATION_SCHEDULE.DAILY_MOTIVATION_MORNING_MINUTE,
		0,
		0,
	);

	const afternoonTrigger = new Date(now);
	afternoonTrigger.setHours(
		NOTIFICATION_SCHEDULE.DAILY_MOTIVATION_AFTERNOON_HOUR,
		NOTIFICATION_SCHEDULE.DAILY_MOTIVATION_AFTERNOON_MINUTE,
		0,
		0,
	);

	const schedules: Promise<string>[] = [];

	if (morningTrigger > now) {
		schedules.push(
			ExpoNotifications.scheduleNotificationAsync({
				content: {
					title: pair[0].title,
					body: pair[0].body,
					sound: true,
				},
				trigger: {
					type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
					date: morningTrigger,
				},
				identifier: "daily-motivation-morning",
			}),
		);
	}

	if (afternoonTrigger > now) {
		schedules.push(
			ExpoNotifications.scheduleNotificationAsync({
				content: {
					title: pair[1].title,
					body: pair[1].body,
					sound: true,
				},
				trigger: {
					type: ExpoNotifications.SchedulableTriggerInputTypes.DATE,
					date: afternoonTrigger,
				},
				identifier: "daily-motivation-afternoon",
			}),
		);
	}

	await Promise.all(schedules);
}

// ---------------------------------------------------------------------------
// Master scheduler
// ---------------------------------------------------------------------------

interface AppStateForNotifications {
	/**
	 * The streak as of yesterday — i.e. the run that is still "at risk"
	 * until today's check-in happens. Must NOT be the today-inclusive
	 * streak: this scheduler runs before today's check-in exists, so a
	 * today-inclusive streak would always read 0 here, and the nudge
	 * could never fire.
	 */
	streakBeforeToday: number;
	todaySuccess: boolean;
	meditationCount: number;
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
		scheduleDailyMotivation(style),
		scheduleEveningNudge(style, appState.todaySuccess),
		scheduleStreakNudge(
			appState.streakBeforeToday,
			appState.todaySuccess,
			style,
		),
		scheduleWeeklySummary(appState.meditationCount, minutesSaved, style),
	]);
}
