// Blocker guide settings screen.
// Explains how to limit dating app access via iOS Screen Time and Android Digital Wellbeing.
// TypeScript strict mode.

import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Card, Divider, Text } from 'react-native-paper';
import { colors } from '@/src/constants/theme';

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const IOS_STEPS: string[] = [
  'Open the Settings app on your iPhone or iPad.',
  'Tap "Screen Time" and enable it if not already on.',
  'Tap "App Limits", then "Add Limit".',
  'Choose "Social Networking" or search for a specific dating app.',
  'Set a daily time limit. When reached, a soft limit screen appears.',
  'Enable "Block at End of Limit" in Screen Time passcode settings for a firmer boundary.',
];

const ANDROID_STEPS: string[] = [
  'Open the Settings app on your Android device.',
  'Go to "Digital Wellbeing and parental controls" (location varies by manufacturer).',
  'Tap "Dashboard" and find the dating app in the list.',
  'Tap the hourglass icon next to the app to set a daily timer.',
  'When the limit is reached, the app icon becomes greyed out.',
  'For stricter controls, use Google Family Link or a third-party app blocker.',
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BlockerGuideScreen(): React.ReactElement {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineMedium" style={styles.screenTitle}>
        How to limit dating app access
      </Text>
      <Text variant="bodyMedium" style={styles.intro}>
        Your device has built-in tools to set boundaries on app usage. These are optional and entirely within your control.
      </Text>

      <View style={styles.disclaimerBox}>
        <Text variant="bodySmall" style={styles.disclaimerText}>
          This app cannot block other apps directly. The steps below use your device's native controls.
        </Text>
      </View>

      <Divider style={styles.divider} />

      {Platform.OS === 'ios' && (
        <>
          {/* iOS Section */}
          <Text variant="titleLarge" style={styles.platformTitle}>
            Screen Time
          </Text>

          <Card style={styles.card} mode="contained">
            <Card.Content style={styles.stepsContent}>
              {IOS_STEPS.map((step, idx) => (
                <StepRow key={idx} number={idx + 1} text={step} isLast={idx === IOS_STEPS.length - 1} />
              ))}
            </Card.Content>
          </Card>

          <Divider style={styles.divider} />
        </>
      )}

      {Platform.OS === 'android' && (
        <>
          {/* Android Section */}
          <Text variant="titleLarge" style={styles.platformTitle}>
            Digital Wellbeing
          </Text>

          <Card style={styles.card} mode="contained">
            <Card.Content style={styles.stepsContent}>
              {ANDROID_STEPS.map((step, idx) => (
                <StepRow key={idx} number={idx + 1} text={step} isLast={idx === ANDROID_STEPS.length - 1} />
              ))}
            </Card.Content>
          </Card>

          <Divider style={styles.divider} />
        </>
      )}

      <View style={styles.tipBox}>
        <Text variant="labelMedium" style={styles.tipLabel}>
          Tip
        </Text>
        <Text variant="bodyMedium" style={styles.tipText}>
          Setting a limit does not remove access entirely. It creates a moment of pause — which is often all you need to make a mindful choice.
        </Text>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// StepRow sub-component
// ---------------------------------------------------------------------------

interface StepRowProps {
  number: number;
  text: string;
  isLast: boolean;
}

function StepRow({ number, text, isLast }: StepRowProps): React.ReactElement {
  return (
    <>
      <View style={styles.stepRow}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{number}</Text>
        </View>
        <Text variant="bodyMedium" style={styles.stepText}>
          {text}
        </Text>
      </View>
      {!isLast && <Divider style={styles.stepDivider} />}
    </>
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
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 16,
  },
  screenTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  intro: {
    color: colors.muted,
    lineHeight: 22,
  },
  disclaimerBox: {
    backgroundColor: '#1A2D4D',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    color: colors.muted,
    lineHeight: 18,
  },
  divider: {
    backgroundColor: colors.border,
    marginVertical: 4,
  },
  platformTitle: {
    color: colors.text,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepsContent: {
    paddingVertical: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stepText: {
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },
  stepDivider: {
    backgroundColor: colors.border,
    marginLeft: 36,
  },
  tipBox: {
    backgroundColor: '#1A2D4D',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.secondary,
    gap: 6,
  },
  tipLabel: {
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipText: {
    color: colors.text,
    lineHeight: 22,
  },
  bottomSpacer: {
    height: 24,
  },
});
