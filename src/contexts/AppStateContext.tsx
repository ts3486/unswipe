// AppStateContext — central computed state for the app.
// Loads the user profile and today's progress on mount.
// No default exports. TypeScript strict mode.

import {
	countSuccessesByDate,
	createUserProfile,
	getAllCheckinDates,
	getCheckinByDate,
	getLatestProgress,
	getUserProfile,
	updateUserProfile,
} from "@/src/data/repositories";
import {
	getHasEverSubscribed,
	getIsPremium,
	recordLifetimePurchase,
	recordMonthlySubscription,
} from "@/src/data/repositories/subscription-repository";
import {
	calculateMeditationRank,
	calculateStreak,
	isDaySuccess,
} from "@/src/domain/progress-rules";
import type { Progress, UserProfile } from "@/src/domain/types";
import i18n, { type SupportedLocale, isSupportedLocale } from "@/src/i18n";
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
	hasEverSubscribed: boolean;
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
	changeLocale: (locale: SupportedLocale) => Promise<void>;
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
	const [hasEverSubscribed, setHasEverSubscribed] = useState<boolean>(false);

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
		const everSubscribed = await getHasEverSubscribed(db);
		setHasEverSubscribed(everSubscribed);
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

		// Streak: based on consecutive daily check-in dates.
		const checkinDates = await getAllCheckinDates(db);
		setStreak(calculateStreak(checkinDates, today));

		// Today success: at least one panic success OR daily task completed.
		// The daily task is today's check-in.
		const panicSuccessCount = await countSuccessesByDate(db, today);
		const todaysCheckin = await getCheckinByDate(db, today);
		setTodaySuccess(isDaySuccess(panicSuccessCount, todaysCheckin !== null));
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

	const changeLocale = useCallback(
		async (locale: SupportedLocale): Promise<void> => {
			if (userProfile === null) return;
			await updateUserProfile(db, userProfile.id, { locale });
			await i18n.changeLanguage(locale);
			await refreshProfile();
		},
		[db, userProfile, refreshProfile],
	);

	// ---------------------------------------------------------------------------
	// Keep i18n language in sync with the persisted profile locale.
	// ---------------------------------------------------------------------------

	useEffect(() => {
		if (
			userProfile !== null &&
			isSupportedLocale(userProfile.locale) &&
			userProfile.locale !== i18n.language
		) {
			void i18n.changeLanguage(userProfile.locale);
		}
	}, [userProfile]);

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
		hasEverSubscribed,
		refreshProgress,
		refreshProfile,
		refreshPremiumStatus: refreshPremium,
		completeOnboarding,
		unlockPremium,
		changeLocale,
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
