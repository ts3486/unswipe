// Barrel re-export for all repository modules.
// Import from this file to avoid long relative paths in consumers.
// No default exports.

export {
	getUserProfile,
	createUserProfile,
	updateUserProfile,
} from "./user-repository";

export {
	createUrgeEvent,
	getUrgeEventsByDate,
	countSuccessesByDate,
	countSpendAvoidedByDate,
	getUrgeEventsInRange,
	getUrgeCountByDayOfWeek,
	getUrgeCountByTimeOfDay,
	getSuccessCountInRange,
} from "./urge-repository";
export type { DayOfWeekCount, TimeOfDayCount } from "./urge-repository";

export {
	createCheckin,
	getCheckinByDate,
	getCheckinsInRange,
} from "./checkin-repository";

export {
	getProgress,
	getLatestProgress,
	upsertProgress,
	getAllProgressDates,
} from "./progress-repository";

export {
	getAllContent,
	getContentByDay,
	markContentCompleted,
	getContentProgress,
	isContentCompleted,
	hasContentCompletedOnDate,
} from "./content-repository";

export {
	getSubscription,
	upsertSubscription,
	recordLifetimePurchase,
	recordMonthlySubscription,
	recordTrialStart,
	getTrialInfo,
} from "./subscription-repository";
export type { TrialInfo } from "./subscription-repository";
