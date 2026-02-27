// PremiumGate — renders a locked-state card when the user is not premium.
// Tapping the CTA navigates to the paywall with the appropriate trigger_source.
// No default exports. TypeScript strict mode.

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/src/constants/theme';
import type { PaywallTriggerSource } from '@/src/domain/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PremiumGateProps {
  /** Message shown in the locked state headline. */
  headline: string;
  /** Optional supporting text beneath the headline. */
  subtext?: string;
  /** Where the user is being gated from (sets paywall context). */
  triggerSource: PaywallTriggerSource;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Full-width locked state card. Place this where premium content would appear.
 * When the user taps "Unlock", navigates to /paywall with trigger_source param.
 */
export function PremiumGate({
  headline,
  subtext,
  triggerSource,
}: PremiumGateProps): React.ReactElement {
  const handleUnlock = (): void => {
    router.push({ pathname: '/paywall', params: { trigger_source: triggerSource } });
  };

  return (
    <View style={styles.container}>
      <View style={styles.lockIconWrap}>
        <MaterialCommunityIcons name="lock-outline" size={32} color={colors.muted} />
      </View>
      <Text variant="titleMedium" style={styles.headline}>
        {headline}
      </Text>
      {subtext !== undefined && (
        <Text variant="bodySmall" style={styles.subtext}>
          {subtext}
        </Text>
      )}
      <Button
        mode="contained"
        onPress={handleUnlock}
        style={styles.button}
        contentStyle={styles.buttonContent}
        labelStyle={styles.buttonLabel}
      >
        Unlock Unmatch — $6.99
      </Button>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    padding: 24,
    gap: 10,
  },
  lockIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F1D3A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headline: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtext: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  button: {
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: colors.primary,
  },
  buttonContent: {
    paddingVertical: 4,
  },
  buttonLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
});
