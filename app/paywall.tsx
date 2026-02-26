// Paywall screen.
// Shows premium features and subscription options.
// TypeScript strict mode.

import React, { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Chip, Divider, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAnalytics } from '@/src/contexts/AnalyticsContext';
import { colors } from '@/src/constants/theme';
import type { SubscriptionPeriod } from '@/src/domain/types';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface PremiumFeature {
  icon: string;
  title: string;
  description: string;
}

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    icon: 'chart-line',
    title: 'Detailed analytics',
    description: 'Weekly and monthly trend charts, pattern insights.',
  },
  {
    icon: 'calendar-check',
    title: 'Extended courses',
    description: 'Beyond the 7-day starter: 30-day and custom tracks.',
  },
  {
    icon: 'bell-badge',
    title: 'Smart reminders',
    description: 'Contextual nudges based on your urge patterns.',
  },
  {
    icon: 'export-variant',
    title: 'Data export',
    description: 'Save and share your progress as a PDF or CSV file.',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallScreen(): React.ReactElement {
  const analytics = useAnalytics();
  const [period, setPeriod] = useState<SubscriptionPeriod>('yearly');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [subscribeMessage, setSubscribeMessage] = useState<string | null>(null);

  // Fire paywall_viewed on mount.
  useEffect(() => {
    analytics.track({
      name: 'paywall_viewed',
      props: { source: 'settings' },
    });
  }, [analytics]);

  const handleSubscribe = useCallback((): void => {
    setIsSubscribing(true);
    // Stub: in a real implementation this would call RevenueCat or StoreKit.
    setTimeout(() => {
      setIsSubscribing(false);
      setSubscribeMessage('Subscription purchases are not available yet in this version.');
    }, 800);
  }, []);

  const handleRestore = useCallback((): void => {
    setSubscribeMessage('Restore purchases is not available yet in this version.');
  }, []);

  const monthlyPrice = '$4.99 / month';
  const yearlyPrice = '$29.99 / year';
  const yearlySavings = 'Save 50%';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Go premium
        </Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Unlock all features and support independent development.
        </Text>
      </View>

      {/* Features list */}
      <Card style={styles.featuresCard} mode="contained">
        <Card.Content style={styles.featuresContent}>
          {PREMIUM_FEATURES.map((feat, idx) => (
            <React.Fragment key={feat.title}>
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <MaterialCommunityIcons
                    name={feat.icon as never}
                    size={22}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.featureText}>
                  <Text variant="titleSmall" style={styles.featureTitle}>
                    {feat.title}
                  </Text>
                  <Text variant="bodySmall" style={styles.featureDesc}>
                    {feat.description}
                  </Text>
                </View>
              </View>
              {idx < PREMIUM_FEATURES.length - 1 && (
                <Divider style={styles.featureDivider} />
              )}
            </React.Fragment>
          ))}
        </Card.Content>
      </Card>

      {/* Period toggle */}
      <View style={styles.periodRow}>
        <Chip
          selected={period === 'monthly'}
          onPress={() => { setPeriod('monthly'); }}
          style={[styles.periodChip, period === 'monthly' && styles.periodChipSelected]}
          textStyle={period === 'monthly' ? styles.periodChipTextSelected : styles.periodChipText}
        >
          Monthly
        </Chip>
        <Chip
          selected={period === 'yearly'}
          onPress={() => { setPeriod('yearly'); }}
          style={[styles.periodChip, period === 'yearly' && styles.periodChipSelected]}
          textStyle={period === 'yearly' ? styles.periodChipTextSelected : styles.periodChipText}
        >
          Yearly
        </Chip>
        {period === 'yearly' && (
          <View style={styles.savingsBadge}>
            <Text style={styles.savingsText}>{yearlySavings}</Text>
          </View>
        )}
      </View>

      {/* Price display */}
      <Card style={styles.priceCard} mode="contained">
        <Card.Content style={styles.priceContent}>
          <Text variant="displaySmall" style={styles.priceAmount}>
            {period === 'monthly' ? monthlyPrice : yearlyPrice}
          </Text>
          {period === 'yearly' && (
            <Text variant="bodySmall" style={styles.priceNote}>
              Billed once per year. Cancel any time.
            </Text>
          )}
        </Card.Content>
      </Card>

      {/* Subscribe button */}
      <Button
        mode="contained"
        onPress={handleSubscribe}
        loading={isSubscribing}
        disabled={isSubscribing}
        style={styles.subscribeButton}
        contentStyle={styles.subscribeButtonContent}
        labelStyle={styles.subscribeButtonLabel}
      >
        Subscribe
      </Button>

      {/* Restore link */}
      <Button
        mode="text"
        onPress={handleRestore}
        textColor={colors.muted}
        style={styles.restoreButton}
      >
        Restore purchases
      </Button>

      {/* Feedback message */}
      {subscribeMessage !== null && (
        <View style={styles.messageBox}>
          <Text variant="bodySmall" style={styles.messageText}>
            {subscribeMessage}
          </Text>
        </View>
      )}

      <Divider style={styles.footerDivider} />
      <Text variant="bodySmall" style={styles.footerText}>
        Subscriptions are managed by the {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. No data is shared with payment processors.
      </Text>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 8,
    paddingBottom: 8,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 24,
  },
  featuresCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featuresContent: {
    paddingVertical: 4,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 12,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F1D3A',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    color: colors.text,
    fontWeight: '600',
  },
  featureDesc: {
    color: colors.muted,
    lineHeight: 18,
  },
  featureDivider: {
    backgroundColor: colors.border,
    marginLeft: 50,
  },
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  periodChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
  },
  periodChipSelected: {
    backgroundColor: '#0F1D3A',
    borderColor: colors.primary,
  },
  periodChipText: {
    color: colors.muted,
  },
  periodChipTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  savingsBadge: {
    backgroundColor: '#1A3D2E',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.success,
  },
  savingsText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  priceCard: {
    backgroundColor: '#0F1D3A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  priceContent: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 4,
  },
  priceAmount: {
    color: colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  priceNote: {
    color: colors.muted,
    textAlign: 'center',
  },
  subscribeButton: {
    borderRadius: 14,
  },
  subscribeButtonContent: {
    paddingVertical: 8,
  },
  subscribeButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  restoreButton: {
    marginTop: -4,
  },
  messageBox: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerDivider: {
    backgroundColor: colors.border,
    marginTop: 8,
    marginBottom: 4,
  },
  footerText: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 18,
  },
  bottomSpacer: {
    height: 24,
  },
});
