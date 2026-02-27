// Learn tab screen — 7-day starter course.
// Shows content cards with expand/collapse and mark-complete action.
// TypeScript strict mode.

import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppState } from '@/src/contexts/AppStateContext';
import { useContent } from '@/src/hooks/useContent';
import { useAnalytics } from '@/src/contexts/AnalyticsContext';
import { colors } from '@/src/constants/theme';
import type { Content } from '@/src/domain/types';
import { router } from 'expo-router';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LearnScreen(): React.ReactElement {
  const { userProfile, isPremium } = useAppState();
  const analytics = useAnalytics();
  const {
    allContent,
    completedIds,
    currentDayIndex,
    isLoading,
    markCompleted,
  } = useContent(userProfile?.created_at ?? null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const handleCardPress = useCallback((content: Content): void => {
    // Day 2+ requires premium.
    if (content.day_index > 1 && !isPremium) {
      router.push({ pathname: '/paywall', params: { trigger_source: 'learn_locked' } });
      return;
    }

    const wasExpanded = expandedId === content.content_id;
    setExpandedId(wasExpanded ? null : content.content_id);

    if (!wasExpanded) {
      analytics.track({
        name: 'content_viewed',
        props: {
          content_id: content.content_id,
          day_index: content.day_index,
        },
      });
    }
  }, [expandedId, analytics, isPremium]);

  const handleMarkComplete = useCallback(async (contentId: string): Promise<void> => {
    if (markingId !== null) {
      return;
    }
    setMarkingId(contentId);
    try {
      await markCompleted(contentId);
    } finally {
      setMarkingId(null);
    }
  }, [markCompleted, markingId]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text variant="headlineMedium" style={styles.screenTitle}>
        7-Day Starter
      </Text>
      <Text variant="bodyMedium" style={styles.screenSubtitle}>
        A gentle daily practice to build healthier habits.
      </Text>

      <View style={styles.cardList}>
        {allContent.map((item) => {
          const isCompleted = completedIds.has(item.content_id);
          const isCurrent = item.day_index === currentDayIndex;
          const isExpanded = expandedId === item.content_id;
          // Day 2+ is locked for free users; premium users follow normal progression lock.
          const isPaywallLocked = item.day_index > 1 && !isPremium;
          const isLocked = isPaywallLocked || item.day_index > currentDayIndex;

          return (
            <ContentCard
              key={item.content_id}
              content={item}
              isCompleted={isCompleted}
              isCurrent={isCurrent}
              isExpanded={isExpanded}
              isLocked={isLocked}
              isMarking={markingId === item.content_id}
              onPress={() => { handleCardPress(item); }}
              onMarkComplete={() => { void handleMarkComplete(item.content_id); }}
            />
          );
        })}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// ContentCard sub-component
// ---------------------------------------------------------------------------

interface ContentCardProps {
  content: Content;
  isCompleted: boolean;
  isCurrent: boolean;
  isExpanded: boolean;
  isLocked: boolean;
  isMarking: boolean;
  onPress: () => void;
  onMarkComplete: () => void;
}

function ContentCard({
  content,
  isCompleted,
  isCurrent,
  isExpanded,
  isLocked,
  isMarking,
  onPress,
  onMarkComplete,
}: ContentCardProps): React.ReactElement {
  return (
    <Card
      style={[
        styles.contentCard,
        isCurrent && styles.contentCardCurrent,
        isCompleted && styles.contentCardCompleted,
        isLocked && styles.contentCardLocked,
      ]}
      mode="contained"
    >
      <TouchableOpacity
        onPress={onPress}
        disabled={isLocked}
        accessibilityLabel={`Day ${content.day_index}: ${content.title}`}
        accessibilityHint={isLocked ? 'Not yet available' : 'Tap to expand'}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.dayBadge, isCurrent && styles.dayBadgeCurrent, isCompleted && styles.dayBadgeCompleted]}>
              <Text style={[styles.dayBadgeText, (isCurrent || isCompleted) && styles.dayBadgeTextHighlight]}>
                {content.day_index}
              </Text>
            </View>
            <View style={styles.cardHeaderText}>
              <Text
                variant="titleSmall"
                style={[
                  styles.cardTitle,
                  isCompleted && styles.cardTitleCompleted,
                  isLocked && styles.cardTitleLocked,
                ]}
                numberOfLines={isExpanded ? undefined : 2}
              >
                {content.title}
              </Text>
              <Text variant="labelSmall" style={styles.cardMeta}>
                {content.est_minutes} min
              </Text>
            </View>
          </View>

          <View style={styles.cardHeaderRight}>
            {isCompleted && (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={colors.success}
              />
            )}
            {isLocked && (
              <MaterialCommunityIcons
                name="lock-outline"
                size={18}
                color={colors.muted}
              />
            )}
            {!isLocked && !isCompleted && (
              <MaterialCommunityIcons
                name={isExpanded ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={colors.muted}
              />
            )}
          </View>
        </View>

        {isExpanded && !isLocked && (
          <View style={styles.expandedContent}>
            <Divider style={styles.divider} />
            <Text variant="bodyMedium" style={styles.bodyText}>
              {content.body}
            </Text>
            {content.action_text.length > 0 && (
              <View style={styles.actionTextBox}>
                <Text variant="labelMedium" style={styles.actionTextLabel}>
                  Practice
                </Text>
                <Text variant="bodyMedium" style={styles.actionText}>
                  {content.action_text}
                </Text>
              </View>
            )}
            {!isCompleted && (
              <Button
                mode="contained"
                onPress={onMarkComplete}
                loading={isMarking}
                disabled={isMarking}
                style={styles.markButton}
                contentStyle={styles.markButtonContent}
                labelStyle={styles.markButtonLabel}
              >
                Mark complete
              </Button>
            )}
            {isCompleted && (
              <View style={styles.completedBanner}>
                <MaterialCommunityIcons
                  name="check-circle-outline"
                  size={16}
                  color={colors.success}
                />
                <Text variant="labelMedium" style={styles.completedBannerText}>
                  Completed
                </Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    </Card>
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
    paddingTop: 56,
    paddingBottom: 24,
    gap: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  screenTitle: {
    color: colors.text,
    fontWeight: '700',
    marginBottom: 2,
  },
  screenSubtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  cardList: {
    gap: 10,
  },
  contentCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  contentCardCurrent: {
    borderColor: colors.primary,
  },
  contentCardCompleted: {
    borderColor: colors.border,
    opacity: 0.85,
  },
  contentCardLocked: {
    opacity: 0.5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  cardHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  dayBadgeCurrent: {
    backgroundColor: colors.primary,
  },
  dayBadgeCompleted: {
    backgroundColor: '#1A3D2E',
  },
  dayBadgeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  dayBadgeTextHighlight: {
    color: colors.text,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    color: colors.text,
    fontWeight: '600',
    lineHeight: 20,
  },
  cardTitleCompleted: {
    color: colors.muted,
  },
  cardTitleLocked: {
    color: colors.muted,
  },
  cardMeta: {
    color: colors.muted,
  },
  cardHeaderRight: {
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContent: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  divider: {
    backgroundColor: colors.border,
    marginBottom: 4,
  },
  bodyText: {
    color: colors.text,
    lineHeight: 22,
  },
  actionTextBox: {
    backgroundColor: colors.background,
    borderRadius: 10,
    padding: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionTextLabel: {
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionText: {
    color: colors.text,
    lineHeight: 22,
  },
  markButton: {
    borderRadius: 10,
    marginTop: 4,
  },
  markButtonContent: {
    paddingVertical: 4,
  },
  markButtonLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  completedBannerText: {
    color: colors.success,
  },
  bottomSpacer: {
    height: 24,
  },
});
