// Manual mock for expo-notifications.
// Used in Jest (Node environment) so pure scheduling logic can be tested
// without native modules or OS-level notification permissions.

export const SchedulableTriggerInputTypes = {
	DATE: "date",
	CALENDAR: "calendar",
	DAILY: "daily",
	WEEKLY: "weekly",
	TIME_INTERVAL: "timeInterval",
} as const;

export const getPermissionsAsync = jest
	.fn()
	.mockResolvedValue({ status: "granted" });

export const requestPermissionsAsync = jest
	.fn()
	.mockResolvedValue({ status: "granted" });

export const scheduleNotificationAsync = jest
	.fn()
	.mockResolvedValue("mock-notification-id");

export const cancelAllScheduledNotificationsAsync = jest
	.fn()
	.mockResolvedValue(undefined);

export const getAllScheduledNotificationsAsync = jest
	.fn()
	.mockResolvedValue([]);

export const cancelScheduledNotificationAsync = jest
	.fn()
	.mockResolvedValue(undefined);

export const setNotificationHandler = jest.fn();

export const addNotificationReceivedListener = jest.fn(() => ({
	remove: jest.fn(),
}));

export const addNotificationResponseReceivedListener = jest.fn(() => ({
	remove: jest.fn(),
}));
