// AppStateContext — central computed state for the app.
// Loads the user profile and today's progress on mount.
// No default exports. TypeScript strict mode.

import {
	countSuccessesByDate,
	createUserProfile,
	getAllProgressDates,
	getLatestProgress,
	getUserProfile,
	hasContentCompletedOnDate,
} from "@/src/data/repositories";
import {
	getIsPremium,
	getTrialInfo,
	recordLifetimePurchase,
	recordMonthlySubscription,
	recordTrialStart,
} from "@/src/data/repositories/subscription-repository";
import type { TrialInfo } from "@/src/data/repositories/subscription-repository";
import {
	calculateMeditationRank,
	calculateStreak,
	isDaySuccess,
} from "@/src/domain/progress-rules";
import type { Progress, UserProfile } from "@/src/domain/types";
import { getLocalDateString } from "@/src/utils/date";
import type React from "react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { useDatabaseContext } from "./DatabaseContext";

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

const DEFAULT_TRIAL_INFO: TrialInfo = {
	hasStartedTrial: false,
	isTrialActive: false,
	trialDaysRemaining: 0,
	trialEndsAt: "",
};

interface AppState {
	userProfile: UserProfile | null;
	todayProgress: Progress | null;
	streak: number;
	meditationRank: number;
	meditationCount: number;
	todaySuccess: boolean;
	isOnboarded: boolean;
	isLoading: boolean;
	isPremium: boolean;
	trialInfo: TrialInfo;
}

interface AppStateActions {
	refreshProgress: () => Promise<void>;
	refreshProfile: () => Promise<void>;
	refreshPremiumStatus: () => Promise<void>;
	completeOnboarding: (
		profile: Omit<UserProfile, "id" | "created_at">,
	) => Promise<void>;
	unlockPremium: (
		productId: string,
		period: "monthly" | "lifetime",
	) => Promise<void>;
	startTrial: () => Promise<void>;
}

type AppStateContextValue = AppState & AppStateActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface AppStateProviderProps {
	children: ReactNode;
}

export function AppStateProvider({
	children,
}: AppStateProviderProps): React.ReactElement {
	const { db } = useDatabaseContext();

	const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
	const [todayProgress, setTodayProgress] = useState<Progress | null>(null);
	const [streak, setStreak] = useState<number>(0);
	const [meditationRank, setMeditationRank] = useState<number>(1);
	const [meditationCount, setMeditationCount] = useState<number>(0);
	const [todaySuccess, setTodaySuccess] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isPremium, setIsPremium] = useState<boolean>(false);
	const [trialInfo, setTrialInfo] = useState<TrialInfo>(DEFAULT_TRIAL_INFO);

	// ---------------------------------------------------------------------------
	// Data loaders
	// ---------------------------------------------------------------------------

	const refreshProfile = useCallback(async (): Promise<void> => {
		const profile = await getUserProfile(db);
		setUserProfile(profile);
	}, [db]);

	const refreshPremium = useCallback(async (): Promise<void> => {
		const premium = await getIsPremium(db);
		setIsPremium(premium);
		const trial = await getTrialInfo(db);
		setTrialInfo(trial);
	}, [db]);

	const refreshProgress = useCallback(async (): Promise<void> => {
		const today = getLocalDateString();

		// Load today's progress row (may be null on first day).
		const progress = await getLatestProgress(db);
		const todayRow = progress?.date_local === today ? progress : null;
		setTodayProgress(todayRow);

		// Determine how many total meditations have been accumulated.
		const totalMeditations =
			todayRow?.meditation_count_total ?? progress?.meditation_count_total ?? 0;
		setMeditationCount(totalMeditations);

		// Meditation rank is derived purely from total meditation count.
		setMeditationRank(calculateMeditationRank(totalMeditations));

		// Streak: gather all progress dates that were success days.
		const allDates = await getAllProgressDates(db);
		setStreak(calculateStreak(allDates, today));

		// Today success: at least one panic success OR daily task completed.
		const panicSuccessCount = await countSuccessesByDate(db, today);
		const dailyTaskCompleted = await hasContentCompletedOnDate(db, today);
		setTodaySuccess(isDaySuccess(panicSuccessCount, dailyTaskCompleted));
	}, [db]);

	// ---------------------------------------------------------------------------
	// Actions
	// ---------------------------------------------------------------------------

	const completeOnboarding = useCallback(
		async (profile: Omit<UserProfile, "id" | "created_at">): Promise<void> => {
			await createUserProfile(db, profile);
			await refreshProfile();
		},
		[db, refreshProfile],
	);

	const unlockPremium = useCallback(
		async (
			productId: string,
			period: "monthly" | "lifetime",
		): Promise<void> => {
			if (period === "lifetime") {
				await recordLifetimePurchase(db, productId);
			} else {
				await recordMonthlySubscription(db, productId);
			}
			await refreshPremium();
		},
		[db, refreshPremium],
	);

	const startTrial = useCallback(async (): Promise<void> => {
		await recordTrialStart(db);
		await refreshPremium();
	}, [db, refreshPremium]);

	// ---------------------------------------------------------------------------
	// Initial load
	// ---------------------------------------------------------------------------

	useEffect(() => {
		let cancelled = false;

		async function load(): Promise<void> {
			await Promise.all([
				refreshProfile(),
				refreshProgress(),
				refreshPremium(),
			]);
			if (!cancelled) {
				setIsLoading(false);
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [refreshProfile, refreshProgress, refreshPremium]);

	// ---------------------------------------------------------------------------
	// Context value
	// ---------------------------------------------------------------------------

	const value: AppStateContextValue = {
		userProfile,
		todayProgress,
		streak,
		meditationRank,
		meditationCount,
		todaySuccess,
		isOnboarded: userProfile !== null,
		isLoading,
		isPremium,
		trialInfo,
		refreshProgress,
		refreshProfile,
		refreshPremiumStatus: refreshPremium,
		completeOnboarding,
		unlockPremium,
		startTrial,
	};

	return (
		<AppStateContext.Provider value={value}>
			{children}
		</AppStateContext.Provider>
	);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the central app state and actions.
 * Must be used inside AppStateProvider; throws otherwise.
 */
export function useAppState(): AppStateContextValue {
	const value = useContext(AppStateContext);
	if (value === null) {
		throw new Error("useAppState must be used inside AppStateProvider.");
	}
	return value;
}
