// History tab screen — daily check-in history.
// Shows a scrollable list of past check-ins, newest first.
// Tapping a row opens the existing day-detail screen for the full timeline.
// TypeScript strict mode.

import {
	useFatigueLabels,
	useMoodLabels,
	useUrgeLabels,
} from "@/src/components/RatingChips";
import { colors } from "@/src/constants/theme";
import { useCheckinHistory } from "@/src/hooks/useCheckinHistory";
import type { DailyCheckin } from "@/src/domain/types";
import { parseLocalDate } from "@/src/utils/date";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useRouter } from "expo-router";
import type React from "react";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	TouchableOpacity,
	View,
} from "react-native";
import { Card, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HistoryScreen(): React.ReactElement {
	const { t, i18n } = useTranslation();
	const router = useRouter();
	const { checkins, isLoading } = useCheckinHistory();

	const moodLabels = useMoodLabels();
	const fatigueLabels = useFatigueLabels();
	const urgeLabels = useUrgeLabels();

	const dateFnsLocale = i18n.language === "ja" ? ja : undefined;

	const formatDateLabel = useCallback(
		(dateLocal: string): string => {
			try {
				return format(parseLocalDate(dateLocal), "EEEE, MMMM d, yyyy", {
					locale: dateFnsLocale,
				});
			} catch {
				return dateLocal;
			}
		},
		[dateFnsLocale],
	);

	const handlePress = useCallback(
		(dateLocal: string): void => {
			router.push(`/progress/day/${dateLocal}`);
		},
		[router],
	);

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
				{t("history.title")}
			</Text>
			<Text variant="bodyMedium" style={styles.screenSubtitle}>
				{t("history.subtitle")}
			</Text>

			{checkins.length === 0 ? (
				<View style={styles.emptyState}>
					<MaterialCommunityIcons
						name="calendar-blank-outline"
						size={32}
						color={colors.muted}
					/>
					<Text variant="bodyMedium" style={styles.emptyText}>
						{t("history.empty")}
					</Text>
				</View>
			) : (
				<View style={styles.cardList}>
					{checkins.map((checkin: DailyCheckin) => (
						<CheckinRow
							key={checkin.id}
							checkin={checkin}
							dateLabel={formatDateLabel(checkin.date_local)}
							moodLabel={moodLabels[checkin.mood] ?? String(checkin.mood)}
							fatigueLabel={
								fatigueLabels[checkin.fatigue] ?? String(checkin.fatigue)
							}
							urgeLabel={urgeLabels[checkin.urge] ?? String(checkin.urge)}
							onPress={() => {
								handlePress(checkin.date_local);
							}}
						/>
					))}
				</View>
			)}

			<View style={styles.bottomSpacer} />
		</ScrollView>
	);
}

// ---------------------------------------------------------------------------
// CheckinRow sub-component
// ---------------------------------------------------------------------------

interface CheckinRowProps {
	checkin: DailyCheckin;
	dateLabel: string;
	moodLabel: string;
	fatigueLabel: string;
	urgeLabel: string;
	onPress: () => void;
}

function CheckinRow({
	checkin,
	dateLabel,
	moodLabel,
	fatigueLabel,
	urgeLabel,
	onPress,
}: CheckinRowProps): React.ReactElement {
	const { t } = useTranslation();
	return (
		<Card style={styles.card} mode="contained">
			<TouchableOpacity
				onPress={onPress}
				accessibilityLabel={t("history.rowA11y", { date: dateLabel })}
			>
				<View style={styles.cardContent}>
					<View style={styles.cardHeader}>
						<Text variant="titleSmall" style={styles.dateLabel}>
							{dateLabel}
						</Text>
						<MaterialCommunityIcons
							name="chevron-right"
							size={20}
							color={colors.muted}
						/>
					</View>
					<Text variant="bodyMedium" style={styles.summaryLine}>
						{t("history.summaryLine", {
							mood: moodLabel,
							fatigue: fatigueLabel,
							urge: urgeLabel,
						})}
					</Text>
					{(checkin.opened_at_night === 1 || checkin.spent_today === 1) && (
						<View style={styles.flagRow}>
							{checkin.opened_at_night === 1 && (
								<View style={styles.flag}>
									<MaterialCommunityIcons
										name="weather-night"
										size={14}
										color={colors.secondary}
									/>
									<Text variant="labelSmall" style={styles.flagText}>
										{t("dayDetail.openedLateAtNight")}
									</Text>
								</View>
							)}
							{checkin.spent_today === 1 && (
								<View style={styles.flag}>
									<MaterialCommunityIcons
										name="currency-usd"
										size={14}
										color={colors.warning}
									/>
									<Text variant="labelSmall" style={styles.flagText}>
										{t("dayDetail.spentToday")}
									</Text>
								</View>
							)}
						</View>
					)}
				</View>
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
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	screenTitle: {
		color: colors.text,
		fontWeight: "700",
		marginBottom: 2,
	},
	screenSubtitle: {
		color: colors.muted,
		lineHeight: 22,
	},
	cardList: {
		gap: 10,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
	},
	cardContent: {
		padding: 14,
		gap: 6,
	},
	cardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	dateLabel: {
		color: colors.text,
		fontWeight: "600",
	},
	summaryLine: {
		color: colors.muted,
	},
	flagRow: {
		flexDirection: "row",
		gap: 12,
		marginTop: 2,
	},
	flag: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	flagText: {
		color: colors.muted,
	},
	emptyState: {
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		paddingVertical: 48,
	},
	emptyText: {
		color: colors.muted,
		textAlign: "center",
	},
	bottomSpacer: {
		height: 24,
	},
});
