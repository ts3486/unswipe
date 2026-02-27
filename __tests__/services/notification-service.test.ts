// Unit tests for src/services/notification-service.ts.
// Verifies scheduling, cancellation, rescheduling, and permission request behaviour.
// Mocks expo-notifications to avoid native module dependencies.

import {
	NOTIFICATION_CONTENT,
	NOTIFICATION_IDS,
	NOTIFICATION_SCHEDULE,
} from "@/src/constants/notification-content";
import type { NotificationStyle } from "@/src/domain/types";
import {
	cancelAllNotifications,
	cancelNotificationById,
	getScheduledNotifications,
	requestNotificationPermission,
	rescheduleAll,
	scheduleDaily,
} from "@/src/services/notification-service";

jest.mock("expo-notifications", () => ({
	scheduleNotificationAsync: jest.fn().mockResolvedValue(undefined),
	cancelAllScheduledNotificationsAsync: jest.fn().mockResolvedValue(undefined),
	cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
	getAllScheduledNotificationsAsync: jest.fn().mockResolvedValue([]),
	requestPermissionsAsync: jest.fn().mockResolvedValue({ status: "granted" }),
	SchedulableTriggerInputTypes: {
		DAILY: "daily",
	},
}));

import * as Notifications from "expo-notifications";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMock(fn: unknown): jest.Mock {
	return fn as jest.Mock;
}

// ---------------------------------------------------------------------------
// requestNotificationPermission
// ---------------------------------------------------------------------------

describe("requestNotificationPermission", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("returns true when permission is granted", async () => {
		getMock(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
			status: "granted",
		});
		const result = await requestNotificationPermission();
		expect(result).toBe(true);
	});

	it("returns false when permission is denied", async () => {
		getMock(Notifications.requestPermissionsAsync).mockResolvedValueOnce({
			status: "denied",
		});
		const result = await requestNotificationPermission();
		expect(result).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// scheduleDaily
// ---------------------------------------------------------------------------

describe("scheduleDaily", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("calls scheduleNotificationAsync with the correct identifier, content, and trigger", async () => {
		const identifier = NOTIFICATION_IDS.DAILY_CHECKIN;
		const content = NOTIFICATION_CONTENT[identifier].normal;
		const hour = NOTIFICATION_SCHEDULE.DAILY_CHECKIN_HOUR;
		const minute = NOTIFICATION_SCHEDULE.DAILY_CHECKIN_MINUTE;

		await scheduleDaily(identifier, hour, minute, content);

		expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
			expect.objectContaining({
				identifier,
				content: expect.objectContaining({
					title: content.title,
					body: content.body,
				}),
				trigger: expect.objectContaining({
					hour,
					minute,
				}),
			}),
		);
	});

	it("returns the identifier passed to it", async () => {
		const identifier = NOTIFICATION_IDS.STREAK_NUDGE;
		const content = NOTIFICATION_CONTENT[identifier].normal;
		getMock(Notifications.scheduleNotificationAsync).mockResolvedValueOnce(
			identifier,
		);

		const result = await scheduleDaily(
			identifier,
			NOTIFICATION_SCHEDULE.STREAK_NUDGE_HOUR,
			NOTIFICATION_SCHEDULE.STREAK_NUDGE_MINUTE,
			content,
		);

		expect(result).toBe(identifier);
	});
});

// ---------------------------------------------------------------------------
// cancelAllNotifications
// ---------------------------------------------------------------------------

describe("cancelAllNotifications", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("calls cancelAllScheduledNotificationsAsync", async () => {
		await cancelAllNotifications();
		expect(
			Notifications.cancelAllScheduledNotificationsAsync,
		).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// cancelNotificationById
// ---------------------------------------------------------------------------

describe("cancelNotificationById", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("calls cancelScheduledNotificationAsync with the given identifier", async () => {
		const id = NOTIFICATION_IDS.COURSE_UNLOCK;
		await cancelNotificationById(id);
		expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
			id,
		);
	});
});

// ---------------------------------------------------------------------------
// getScheduledNotifications
// ---------------------------------------------------------------------------

describe("getScheduledNotifications", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("returns the list from getAllScheduledNotificationsAsync", async () => {
		const fakeNotifications = [{ identifier: NOTIFICATION_IDS.DAILY_CHECKIN }];
		getMock(
			Notifications.getAllScheduledNotificationsAsync,
		).mockResolvedValueOnce(fakeNotifications);

		const result = await getScheduledNotifications();
		expect(result).toEqual(fakeNotifications);
	});
});

// ---------------------------------------------------------------------------
// rescheduleAll — normal style
// ---------------------------------------------------------------------------

describe("rescheduleAll with 'normal' style", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("cancels all notifications first", async () => {
		const style: NotificationStyle = "normal";
		await rescheduleAll(style);
		expect(
			Notifications.cancelAllScheduledNotificationsAsync,
		).toHaveBeenCalledTimes(1);
	});

	it("schedules 3 notifications", async () => {
		const style: NotificationStyle = "normal";
		await rescheduleAll(style);
		expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
	});

	it('schedules notifications with normal content titles ("Unmatch")', async () => {
		const style: NotificationStyle = "normal";
		await rescheduleAll(style);

		const calls = getMock(Notifications.scheduleNotificationAsync).mock
			.calls as Array<[{ content: { title: string } }]>;
		const titles = calls.map((call) => call[0].content.title);
		for (const title of titles) {
			expect(title).toBe("Unmatch");
		}
	});
});

// ---------------------------------------------------------------------------
// rescheduleAll — stealth style
// ---------------------------------------------------------------------------

describe("rescheduleAll with 'stealth' style", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("cancels all notifications first", async () => {
		const style: NotificationStyle = "stealth";
		await rescheduleAll(style);
		expect(
			Notifications.cancelAllScheduledNotificationsAsync,
		).toHaveBeenCalledTimes(1);
	});

	it("schedules 3 notifications", async () => {
		const style: NotificationStyle = "stealth";
		await rescheduleAll(style);
		expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(3);
	});

	it('schedules notifications with stealth content titles ("Reminder")', async () => {
		const style: NotificationStyle = "stealth";
		await rescheduleAll(style);

		const calls = getMock(Notifications.scheduleNotificationAsync).mock
			.calls as Array<[{ content: { title: string } }]>;
		const titles = calls.map((call) => call[0].content.title);
		for (const title of titles) {
			expect(title).toBe("Reminder");
		}
	});
});

// ---------------------------------------------------------------------------
// rescheduleAll — off style
// ---------------------------------------------------------------------------

describe("rescheduleAll with 'off' style", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("cancels all notifications", async () => {
		const style: NotificationStyle = "off";
		await rescheduleAll(style);
		expect(
			Notifications.cancelAllScheduledNotificationsAsync,
		).toHaveBeenCalledTimes(1);
	});

	it("does NOT schedule any new notifications", async () => {
		const style: NotificationStyle = "off";
		await rescheduleAll(style);
		expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Notification identifiers are deterministic
// ---------------------------------------------------------------------------

describe("Notification identifiers are deterministic", () => {
	it('DAILY_CHECKIN identifier is "daily-checkin"', () => {
		expect(NOTIFICATION_IDS.DAILY_CHECKIN).toBe("daily-checkin");
	});

	it('STREAK_NUDGE identifier is "streak-nudge"', () => {
		expect(NOTIFICATION_IDS.STREAK_NUDGE).toBe("streak-nudge");
	});

	it('COURSE_UNLOCK identifier is "course-unlock"', () => {
		expect(NOTIFICATION_IDS.COURSE_UNLOCK).toBe("course-unlock");
	});
});
