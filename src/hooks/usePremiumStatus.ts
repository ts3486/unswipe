// usePremiumStatus — thin hook that exposes isPremium from AppStateContext.
// Screens use this to decide whether to show gated content or redirect.
// No default exports. TypeScript strict mode.

import { useAppState } from '@/src/contexts/AppStateContext';

/**
 * Returns { isPremium } from central app state.
 * Prefer this over calling useAppState() directly in screens that only
 * need the premium flag, so gating logic stays readable.
 */
export function usePremiumStatus(): { isPremium: boolean } {
  const { isPremium } = useAppState();
  return { isPremium };
}
