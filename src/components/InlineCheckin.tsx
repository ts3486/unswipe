// InlineCheckin — inline daily check-in card for the home screen.
// Two states: collapsed CTA, and completed (read-only).
// Tapping the CTA triggers the full-screen CheckinOverlay via onExpand.
// TypeScript strict mode.

import React, { useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Divider, Surface, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/src/constants/theme';
import { RatingChips, MOOD_LABELS, FATIGUE_LABELS, URGE_LABELS } from '@/src/components/RatingChips';
import type { UseCheckinReturn } from '@/src/hooks/useCheckin';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InlineCheckinProps {
  checkin: UseCheckinReturn;
  onExpand?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InlineCheckin({ checkin, onExpand }: InlineCheckinProps): React.ReactElement {
  const {
    isComplete,
    existingCheckin,
  } = checkin;

  const handleDetails = useCallback((): void => {
    router.push('/checkin');
  }, []);

  // ---------------------------------------------------------------------------
  // Completed state
  // ---------------------------------------------------------------------------

  if (isComplete && existingCheckin !== null) {
    return (
      <Surface style={[styles.card, styles.cardDone]}>
        <View style={styles.titleRow}>
          <MaterialCommunityIcons
            name="check-circle"
            size={20}
            color={colors.success}
          />
          <Text variant="titleSmall" style={styles.titleDone}>
            Today's check-in
          </Text>
        </View>

        <RatingChips
          label="Mood"
          value={existingCheckin.mood}
          onChange={() => {}}
          readonly
          labelMap={MOOD_LABELS}
        />
        <Divider style={styles.divider} />
        <RatingChips
          label="Fatigue"
          value={existingCheckin.fatigue}
          onChange={() => {}}
          readonly
          labelMap={FATIGUE_LABELS}
        />
        <Divider style={styles.divider} />
        <RatingChips
          label="Urge level"
          value={existingCheckin.urge}
          onChange={() => {}}
          readonly
          labelMap={URGE_LABELS}
        />

        <Text
          variant="labelMedium"
          style={styles.detailsLink}
          onPress={handleDetails}
        >
          Edit details
        </Text>
      </Surface>
    );
  }

  // ---------------------------------------------------------------------------
  // Collapsed CTA state
  // ---------------------------------------------------------------------------

  return (
    <TouchableOpacity onPress={onExpand} activeOpacity={0.7}>
      <Surface style={styles.card}>
        <View style={styles.collapsedRow}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={22}
            color={colors.primary}
          />
          <View style={styles.collapsedText}>
            <Text variant="titleSmall" style={styles.title}>
              Daily check-in
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              A quick self-reflection — private and offline
            </Text>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={18}
            color={colors.muted}
          />
        </View>
      </Surface>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  cardDone: {
    borderColor: '#1A3D2E',
    backgroundColor: '#0F1E18',
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  collapsedText: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontWeight: '600',
  },
  titleDone: {
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2,
  },
  divider: {
    backgroundColor: colors.border,
  },
  detailsLink: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
});
