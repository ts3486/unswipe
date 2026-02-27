// Notification content constants.
// Normal and stealth variants for each notification type.
// No default exports. TypeScript strict mode.

export const NOTIFICATION_IDS = {
	DAILY_CHECKIN: "daily-checkin",
	STREAK_NUDGE: "streak-nudge",
	COURSE_UNLOCK: "course-unlock",
} as const;

export interface NotificationContent {
	title: string;
	body: string;
}

export const NOTIFICATION_CONTENT: Record<
	string,
	{ normal: NotificationContent; stealth: NotificationContent }
> = {
	[NOTIFICATION_IDS.DAILY_CHECKIN]: {
		normal: {
			title: "Unmatch",
			body: "Time for your daily check-in! How are you feeling today?",
		},
		stealth: {
			title: "Reminder",
			body: "You have a pending task.",
		},
	},
	[NOTIFICATION_IDS.STREAK_NUDGE]: {
		normal: {
			title: "Unmatch",
			body: "Don't break your streak! Complete today's check-in before midnight.",
		},
		stealth: {
			title: "Reminder",
			body: "You have an incomplete daily task.",
		},
	},
	[NOTIFICATION_IDS.COURSE_UNLOCK]: {
		normal: {
			title: "Unmatch",
			body: "A new lesson is available in your starter course.",
		},
		stealth: {
			title: "Reminder",
			body: "New content is available.",
		},
	},
};

// Default schedule times (24h format, local timezone)
export const NOTIFICATION_SCHEDULE = {
	DAILY_CHECKIN_HOUR: 9,
	DAILY_CHECKIN_MINUTE: 0,
	STREAK_NUDGE_HOUR: 20,
	STREAK_NUDGE_MINUTE: 0,
	COURSE_UNLOCK_HOUR: 8,
	COURSE_UNLOCK_MINUTE: 0,
} as const;
