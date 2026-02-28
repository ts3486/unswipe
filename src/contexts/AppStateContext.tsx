// AppStateContext — central computed state for the app.
// Loads the user profile and today's progress on mount.
// No default exports. TypeScript strict mode.

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Progress, UserProfile } from '@/src/domain/types';
import {
  calculateStreak,
  calculateResistRank,
  isDaySuccess,
} from '@/src/domain/progress-rules';
import {
  createUserProfile,
  getAllProgressDates,
  countSuccessesByDate,
  getLatestProgress,
  getUserProfile,
} from '@/src/data/repositories';
import { getIsPremium, recordLifetimePurchase, recordMonthlySubscription } from '@/src/data/repositories/subscription-repository';
import { getLocalDateString } from '@/src/utils/date';
import { useDatabaseContext } from './DatabaseContext';

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
}

interface AppStateActions {
  refreshProgress: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshPremiumStatus: () => Promise<void>;
  completeOnboarding: (
    profile: Omit<UserProfile, 'id' | 'created_at'>,
  ) => Promise<void>;
  unlockPremium: (productId: string, period: 'monthly' | 'lifetime') => Promise<void>;
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

export function AppStateProvider({ children }: AppStateProviderProps): React.ReactElement {
  const { db } = useDatabaseContext();

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayProgress, setTodayProgress] = useState<Progress | null>(null);
  const [streak, setStreak] = useState<number>(0);
  const [resistRank, setResistRank] = useState<number>(1);
  const [resistCount, setResistCount] = useState<number>(0);
  const [todaySuccess, setTodaySuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);

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
    const totalResists = todayRow?.resist_count_total ?? progress?.resist_count_total ?? 0;
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
    async (profile: Omit<UserProfile, 'id' | 'created_at'>): Promise<void> => {
      await createUserProfile(db, profile);
      await refreshProfile();
    },
    [db, refreshProfile],
  );

  const unlockPremium = useCallback(
    async (productId: string, period: 'monthly' | 'lifetime'): Promise<void> => {
      if (period === 'lifetime') {
        await recordLifetimePurchase(db, productId);
      } else {
        await recordMonthlySubscription(db, productId);
      }
      await refreshPremium();
    },
    [db, refreshPremium],
  );

  // ---------------------------------------------------------------------------
  // Initial load
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    async function load(): Promise<void> {
      await Promise.all([refreshProfile(), refreshProgress(), refreshPremium()]);
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
    resistRank,
    resistCount,
    todaySuccess,
    isOnboarded: userProfile !== null,
    isLoading,
    isPremium,
    refreshProgress,
    refreshProfile,
    refreshPremiumStatus: refreshPremium,
    completeOnboarding,
    unlockPremium,
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
    throw new Error('useAppState must be used inside AppStateProvider.');
  }
  return value;
}
