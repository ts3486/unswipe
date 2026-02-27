// AppStateContext — central computed state for the app.
// Loads the user profile and today's progress on mount.
// Initialises RevenueCat on launch and syncs premium state.
// No default exports. TypeScript strict mode.

import {
	countSuccessesByDate,
	createUserProfile,
	getAllProgressDates,
	getLatestProgress,
	getUserProfile,
} from "@/src/data/repositories";
import { getIsPremium } from "@/src/data/repositories/subscription-repository";
import {
	calculateResistRank,
	calculateStreak,
	isDaySuccess,
} from "@/src/domain/progress-rules";
import type { Progress, UserProfile } from "@/src/domain/types";
import {
	getCustomerInfo,
	getOfferings,
	initPurchases,
	purchasePackage,
	restorePurchases as restorePurchasesService,
	syncSubscriptionToDb,
} from "@/src/services/subscription-service";
import type React from "react";
import {
	type ReactNode,
	createContext,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import Purchases from "react-native-purchases";
import type {
	PurchasesOffering,
	PurchasesPackage,
	CustomerInfo as RCCustomerInfo,
} from "react-native-purchases";

import { getLocalDateString } from "@/src/utils/date";
import { useDatabaseContext } from "./DatabaseContext";

// ---------------------------------------------------------------------------
// State and action interfaces
// ---------------------------------------------------------------------------

interface AppState {
	userProfile: UserProfile | null;
	todayProgress: Progress | null;
	streak: number;
	resistRank: number;
	resistCount: number;
	todaySuccess: boolean;
	isOnboarded: boolean;
	isLoading: boolean;
	isPremium: boolean;
	offerings: PurchasesOffering | null;
}

interface AppStateActions {
	refreshProgress: () => Promise<void>;
	refreshProfile: () => Promise<void>;
	refreshPremiumStatus: () => Promise<void>;
	completeOnboarding: (
		profile: Omit<UserProfile, "id" | "created_at">,
	) => Promise<void>;
	unlockPremium: (pkg: PurchasesPackage) => Promise<void>;
	restorePurchases: () => Promise<void>;
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
	const [resistRank, setResistRank] = useState<number>(1);
	const [resistCount, setResistCount] = useState<number>(0);
	const [todaySuccess, setTodaySuccess] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [isPremium, setIsPremium] = useState<boolean>(false);
	const [rcInitialized, setRcInitialized] = useState<boolean>(false);
	const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);

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
	}, [db]);

	const refreshProgress = useCallback(async (): Promise<void> => {
		const today = getLocalDateString();

		// Load today's progress row (may be null on first day).
		const progress = await getLatestProgress(db);
		const todayRow = progress?.date_local === today ? progress : null;
		setTodayProgress(todayRow);

		// Determine how many total resists have been accumulated.
		const totalResists =
			todayRow?.resist_count_total ?? progress?.resist_count_total ?? 0;
		setResistCount(totalResists);

		// Resist rank is derived purely from total resist count.
		setResistRank(calculateResistRank(totalResists));

		// Streak: gather all progress dates that were success days.
		const allDates = await getAllProgressDates(db);
		setStreak(calculateStreak(allDates, today));

		// Today success: at least one panic success OR daily task completed.
		const panicSuccessCount = await countSuccessesByDate(db, today);
		// daily_task_completed is represented by the progress row existing for today
		// and (for V1) we derive it from the content_progress table indirectly via
		// the presence of a progress row. For now we use the panic count only;
		// content completion updates progress separately.
		const dailyTaskCompleted = false;
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
		async (pkg: PurchasesPackage): Promise<void> => {
			const customerInfo = await purchasePackage(pkg);
			await syncSubscriptionToDb(db, customerInfo);
			await refreshPremium();
		},
		[db, refreshPremium],
	);

	const restorePurchases = useCallback(async (): Promise<void> => {
		const customerInfo = await restorePurchasesService();
		await syncSubscriptionToDb(db, customerInfo);
		await refreshPremium();
	}, [db, refreshPremium]);

	// ---------------------------------------------------------------------------
	// Initial load — init RevenueCat, sync premium, load profile + progress
	// ---------------------------------------------------------------------------

	useEffect(() => {
		let cancelled = false;

		async function initAndSyncPremium(): Promise<void> {
			try {
				await initPurchases();
				if (!cancelled) setRcInitialized(true);
				const info = await getCustomerInfo();
				await syncSubscriptionToDb(db, info);
			} catch {
				// Offline or SDK error — silent. Local DB cache used as fallback.
			}
			await refreshPremium();
		}

		async function load(): Promise<void> {
			await Promise.all([
				refreshProfile(),
				refreshProgress(),
				initAndSyncPremium(),
			]);
			if (!cancelled) {
				setIsLoading(false);
			}
			// Load offerings non-blocking after initial render.
			try {
				const current = await getOfferings();
				if (!cancelled) setOfferings(current);
			} catch {
				// Offline — offerings stay null; CTA will be disabled.
			}
		}

		void load();

		return () => {
			cancelled = true;
		};
	}, [db, refreshProfile, refreshProgress, refreshPremium]);

	// ---------------------------------------------------------------------------
	// RevenueCat listener — handles renewals, expirations, refunds
	// ---------------------------------------------------------------------------

	useEffect(() => {
		if (!rcInitialized) return;

		const listener = (info: RCCustomerInfo): void => {
			void (async () => {
				await syncSubscriptionToDb(db, info);
				await refreshPremium();
			})();
		};

		Purchases.addCustomerInfoUpdateListener(listener);

		return () => {
			Purchases.removeCustomerInfoUpdateListener(listener);
		};
	}, [rcInitialized, db, refreshPremium]);

	// ---------------------------------------------------------------------------
	// Context value
	// ---------------------------------------------------------------------------

	const value: AppStateContextValue = {
		userProfile,
		todayProgress,
		streak,
		resistRank,
		resistCount,
		todaySuccess,
		isOnboarded: userProfile !== null,
		isLoading,
		isPremium,
		offerings,
		refreshProgress,
		refreshProfile,
		refreshPremiumStatus: refreshPremium,
		completeOnboarding,
		unlockPremium,
		restorePurchases,
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
