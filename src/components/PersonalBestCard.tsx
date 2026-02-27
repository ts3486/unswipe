// PersonalBestCard — highlights the user's personal best streak.
// Shows a congratulatory card when the current streak equals the all-time best.
// Uses react-native-reanimated for a fade-in entrance animation.
// TypeScript strict mode.

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from '@/src/constants/theme';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PersonalBestCardProps {
  bestStreak: number;
  currentStreak: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PersonalBestCard({
  bestStreak,
  currentStreak,
}: PersonalBestCardProps): React.ReactElement | null {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(8);

  const isNewPersonalBest = bestStreak >= 2 && currentStreak >= bestStreak;

  useEffect(() => {
    if (isNewPersonalBest) {
      opacity.value = withTiming(1, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
      translateY.value = withTiming(0, {
        duration: 500,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [isNewPersonalBest, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!isNewPersonalBest) {
    return null;
  }

  return (
    <Animated.View style={animatedStyle}>
      <Card style={styles.card} mode="contained">
        <Card.Content style={styles.content}>
          <View style={styles.iconRow}>
            <View style={styles.starContainer}>
              <Text style={styles.starIcon}>★</Text>
            </View>
            <View style={styles.textBlock}>
              <Text variant="labelMedium" style={styles.label}>
                NEW PERSONAL BEST
              </Text>
              <Text variant="titleMedium" style={styles.headline}>
                {bestStreak} day streak
              </Text>
              <Text variant="bodySmall" style={styles.sub}>
                Keep going — you're on a roll.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A3D2E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.success,
  },
  content: {
    paddingVertical: 12,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  starContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(71, 194, 139, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  starIcon: {
    color: colors.success,
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    color: colors.success,
    letterSpacing: 0.6,
  },
  headline: {
    color: colors.text,
    fontWeight: '700',
  },
  sub: {
    color: colors.muted,
  },
});
