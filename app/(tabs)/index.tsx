// Home tab screen.
// Shows inline check-in hero, compact stat row, today's course card, and Reset CTA.
// TypeScript strict mode.

import { CheckinOverlay } from "@/src/components/CheckinOverlay";
import { InlineCheckin } from "@/src/components/InlineCheckin";
import { Logo } from "@/src/components/Logo";
import {
	MotivationCard,
	getDailyMessage,
} from "@/src/components/MotivationCard";
import { PrivacyBadge } from "@/src/components/PrivacyBadge";
import { ResistRank } from "@/src/components/ResistRank";
import { ResistRankCompact } from "@/src/components/ResistRankCompact";
import { TimeSavedCard } from "@/src/components/TimeSavedCard";
import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { getCatalog } from "@/src/data/seed-loader";
import { useCheckin } from "@/src/hooks/useCheckin";
import { useContent } from "@/src/hooks/useContent";
import { useWeeklySuccessCount } from "@/src/hooks/useWeeklySuccessCount";
import { getLocalDateString } from "@/src/utils/date";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Chip, Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen(): React.ReactElement {
	const {
		streak,
		resistRank,
		resistCount,
		todaySuccess,
		userProfile,
		isLoading,
		isPremium,
	} = useAppState();

	const {
		allContent,
		currentDayIndex,
		isLoading: contentLoading,
	} = useContent(userProfile?.created_at ?? null);

	const checkin = useCheckin();
	const { weeklySuccessCount } = useWeeklySuccessCount();
	const [checkinOverlayVisible, setCheckinOverlayVisible] = useState(false);

	const catalog = getCatalog();
	const resetCtaLabel = catalog.copy.panicCta ?? "Reset now";

	// Today's content card (day_index matches current day in the course).
	const todayContent =
		allContent.find((c) => c.day_index === currentDayIndex) ?? null;

	// Daily motivation message — deterministic per day.
	const todayLocal = getLocalDateString();
	const motivationMessage = getDailyMessage(
		catalog.motivation_messages,
		todayLocal,
	);

	const handleResetPress = useCallback((): void => {
		router.push("/(tabs)/panic");
	}, []);

	const handleCheckinExpand = useCallback((): void => {
		setCheckinOverlayVisible(true);
	}, []);

	const handleCheckinClose = useCallback((): void => {
		setCheckinOverlayVisible(false);
	}, []);

	const handleMotivationPress = useCallback((): void => {
		router.push("/(tabs)/learn");
	}, []);

	// ---------------------------------------------------------------------------
	// Loading state
	// ---------------------------------------------------------------------------

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<Text variant="bodyMedium" style={styles.loadingText}>
					Loading...
				</Text>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<View style={styles.root}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				{/* Header */}
				<View style={styles.headerRow}>
					<Logo markSize={28} layout="horizontal" />
					<View style={styles.headerRight}>
						<PrivacyBadge />
						{todaySuccess && (
							<Chip
								compact
								style={styles.successChip}
								textStyle={styles.successChipText}
							>
								Today done
							</Chip>
						)}
					</View>
				</View>

				{/* Daily motivation card */}
				<MotivationCard
					message={motivationMessage}
					onPress={handleMotivationPress}
				/>

				{/* Time saved this week */}
				<TimeSavedCard weeklySuccessCount={weeklySuccessCount} />

				{/* Inline check-in hero */}
				<InlineCheckin checkin={checkin} onExpand={handleCheckinExpand} />

				{/* Today's course card */}
				{!contentLoading && todayContent !== null && (
					<Card style={styles.courseCard} mode="contained">
						<Card.Content>
							<Text variant="labelSmall" style={styles.courseDayLabel}>
								Day {currentDayIndex} of 7
							</Text>
							<Text variant="titleMedium" style={styles.courseTitle}>
								{todayContent.title}
							</Text>
							<Text variant="bodySmall" style={styles.courseBody}>
								{todayContent.body}
							</Text>
						</Card.Content>
						<Card.Actions>
							<Text variant="labelMedium" style={styles.courseAction}>
								{todayContent.action_text}
							</Text>
						</Card.Actions>
					</Card>
				)}

				<ResistRank level={resistRank} resistCount={resistCount} />

				{/* Spacer to prevent content from hiding behind sticky CTA */}
				<View style={styles.bottomSpacer} />
			</ScrollView>

			{/* Sticky bottom: Unlock banner (free users) + Reset CTA */}
			<View style={styles.stickyBottom}>
				{!isPremium && (
					<Button
						mode="outlined"
						onPress={() => { router.push('/paywall'); }}
						style={styles.unlockBanner}
						contentStyle={styles.unlockBannerContent}
						labelStyle={styles.unlockBannerLabel}
						accessibilityLabel="Unlock Unmatch for $6.99"
					>
						Unlock Unmatch — $6.99
					</Button>
				)}
				<Button
					mode="contained"
					onPress={handleResetPress}
					style={styles.resetButton}
					contentStyle={styles.resetButtonContent}
					labelStyle={styles.resetButtonLabel}
					accessibilityLabel="Open the reset flow"
					accessibilityHint="Starts the guided reset protocol"
				>
					{resetCtaLabel}
				</Button>
			</View>

			{/* Full-screen daily check-in overlay */}
			{checkinOverlayVisible && (
				<CheckinOverlay checkin={checkin} onClose={handleCheckinClose} />
			)}
		</View>
	);
}

// ---------------------------------------------------------------------------
// StatCard sub-component
// ---------------------------------------------------------------------------

interface StatCardProps {
	value: number;
	label: string;
	valueColor: string;
}

function StatCard({
	value,
	label,
	valueColor,
}: StatCardProps): React.ReactElement {
	return (
		<Surface style={styles.statCard} elevation={2}>
			<Text
				variant="displaySmall"
				style={[styles.statValue, { color: valueColor }]}
			>
				{value}
			</Text>
			<Text variant="labelMedium" style={styles.statLabel}>
				{label}
			</Text>
		</Surface>
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
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	loadingText: {
		color: colors.muted,
	},
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 16,
		paddingTop: 56,
		paddingBottom: 16,
		gap: 16,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	successChip: {
		backgroundColor: "#1A3D2E",
		borderColor: colors.success,
		borderWidth: 1,
	},
	successChipText: {
		color: colors.success,
		fontSize: 12,
	},
	statsRow: {
		flexDirection: "row",
		gap: 12,
	},
	statCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 14,
		padding: 16,
		alignItems: "center",
		borderWidth: 1,
		borderColor: colors.border,
	},
	statValue: {
		fontWeight: "800",
		letterSpacing: -1,
		lineHeight: 52,
	},
	statLabel: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginTop: 2,
	},
	courseCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	courseDayLabel: {
		color: colors.primary,
		textTransform: "uppercase",
		letterSpacing: 1,
		marginBottom: 6,
	},
	courseTitle: {
		color: colors.text,
		fontWeight: "600",
		marginBottom: 8,
	},
	courseBody: {
		color: colors.muted,
		lineHeight: 20,
	},
	courseAction: {
		color: colors.secondary,
		flex: 1,
		flexWrap: "wrap",
	},
	bottomSpacer: {
		height: 80,
	},
	stickyBottom: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: colors.background,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	resetButton: {
		borderRadius: 14,
		backgroundColor: colors.danger,
	},
	resetButtonContent: {
		paddingVertical: 8,
	},
	resetButtonLabel: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	unlockBanner: {
		borderRadius: 12,
		borderColor: colors.primary,
		marginBottom: 8,
	},
	unlockBannerContent: {
		paddingVertical: 4,
	},
	unlockBannerLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: colors.primary,
	},
});
