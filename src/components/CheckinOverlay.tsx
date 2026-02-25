// CheckinOverlay — full-screen daily check-in overlay.
// Covers the tab content area (tab bar remains visible).
// Auto-dismisses on successful save.
// TypeScript strict mode.

import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '@/src/constants/theme';
import {
  RatingChips,
  MOOD_LABELS,
  FATIGUE_LABELS,
  URGE_LABELS,
} from '@/src/components/RatingChips';
import type { UseCheckinReturn } from '@/src/hooks/useCheckin';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CheckinOverlayProps {
  checkin: UseCheckinReturn;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CheckinOverlay({
  checkin,
  onClose,
}: CheckinOverlayProps): React.ReactElement {
  const {
    mood,
    fatigue,
    urge,
    isComplete,
    isSubmitting,
    setMood,
    setFatigue,
    setUrge,
    submit,
  } = checkin;

  const wasComplete = useRef(isComplete);

  // Auto-dismiss when save completes.
  useEffect(() => {
    if (isComplete && !wasComplete.current) {
      onClose();
    }
    wasComplete.current = isComplete;
  }, [isComplete, onClose]);

  const handleSave = useCallback((): void => {
    void submit();
  }, [submit]);

  const handleDetails = useCallback((): void => {
    onClose();
    router.push('/checkin');
  }, [onClose]);

  return (
    <View style={styles.overlay}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons
            name="clipboard-text-outline"
            size={24}
            color={colors.primary}
          />
          <View>
            <Text variant="titleLarge" style={styles.title}>
              Daily check-in
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              How are you today?
            </Text>
          </View>
        </View>
        <IconButton
          icon="close"
          iconColor={colors.muted}
          size={24}
          onPress={onClose}
        />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <RatingChips
          label="Mood"
          value={mood}
          onChange={setMood}
          labelMap={MOOD_LABELS}
        />
        <Divider style={styles.divider} />
        <RatingChips
          label="Fatigue"
          value={fatigue}
          onChange={setFatigue}
          labelMap={FATIGUE_LABELS}
        />
        <Divider style={styles.divider} />
        <RatingChips
          label="Urge level"
          value={urge}
          onChange={setUrge}
          labelMap={URGE_LABELS}
        />
      </View>

      {/* Footer actions */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleSave}
          loading={isSubmitting}
          disabled={isSubmitting}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
        >
          Save reflection
        </Button>
        <Text
          variant="labelMedium"
          style={styles.detailsLink}
          onPress={handleDetails}
        >
          Add details
        </Text>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    paddingTop: 56,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    color: colors.text,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.muted,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingTop: 8,
  },
  divider: {
    backgroundColor: colors.border,
  },
  footer: {
    paddingBottom: 24,
  },
  saveButton: {
    borderRadius: 14,
  },
  saveButtonContent: {
    paddingVertical: 8,
  },
  saveButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  detailsLink: {
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
});
