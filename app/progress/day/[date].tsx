// Day detail screen.
// Shows all urge events for a given date and the daily check-in if present.
// TypeScript strict mode.

import {
	useFatigueLabels,
	useMoodLabels,
	useUrgeLabels,
} from "@/src/components/RatingChips";
import { colors } from "@/src/constants/theme";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { getCheckinByDate, getUrgeEventsByDate } from "@/src/data/repositories";
import { getCatalog } from "@/src/data/seed-loader";
import type { DailyCheckin, UrgeEvent } from "@/src/domain/types";
import { parseLocalDate } from "@/src/utils/date";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { useLocalSearchParams } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Divider, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DayDetailScreen(): React.ReactElement {
	const { date } = useLocalSearchParams<{ date: string }>();
	const { db } = useDatabaseContext();
	const { t, i18n } = useTranslation();

	const [urgeEvents, setUrgeEvents] = useState<UrgeEvent[]>([]);
	const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	const moodLabels = useMoodLabels();
	const fatigueLabels = useFatigueLabels();
	const urgeLabels = useUrgeLabels();

	const dateStr = date ?? "";

	const load = useCallback(async (): Promise<void> => {
		if (dateStr.length === 0) {
			return;
		}
		setIsLoading(true);
		try {
			const [events, checkinRow] = await Promise.all([
				getUrgeEventsByDate(db, dateStr),
				getCheckinByDate(db, dateStr),
			]);
			setUrgeEvents(events);
			setCheckin(checkinRow);
		} finally {
			setIsLoading(false);
		}
	}, [db, dateStr]);

	useEffect(() => {
		void load();
	}, [load]);

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	const dateFnsLocale = i18n.language === "ja" ? ja : undefined;

	function formatTime(isoUtc: string): string {
		try {
			return format(new Date(isoUtc), "h:mm a", { locale: dateFnsLocale });
		} catch {
			return "";
		}
	}

	function formatDateLabel(ds: string): string {
		try {
			return format(parseLocalDate(ds), "EEEE, MMMM d, yyyy", {
				locale: dateFnsLocale,
			});
		} catch {
			return ds;
		}
	}

	function outcomeLabel(outcome: UrgeEvent["outcome"]): string {
		if (outcome === "success") return t("dayDetail.meditated");
		if (outcome === "fail") return t("dayDetail.didNotMeditate");
		return t("dayDetail.ongoing");
	}

	function outcomeColor(outcome: UrgeEvent["outcome"]): string {
		if (outcome === "success") return colors.success;
		if (outcome === "fail") return "#E05A5A";
		return colors.muted;
	}

	function urgeKindLabel(kind: string): string {
		if (kind === "swipe") return t("dayDetail.urgeKind.swipe");
		if (kind === "check") return t("dayDetail.urgeKind.check");
		if (kind === "spend") return t("dayDetail.urgeKind.spend");
		return kind;
	}

	function resolveActionTitle(actionId: string): string {
		if (actionId.length === 0) return "";
		const catalog = getCatalog(i18n.language);
		const action = catalog.actions.find((a) => a.id === actionId);
		return action?.title ?? actionId;
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{/* Date header */}
			<Text variant="titleLarge" style={styles.dateTitle}>
				{dateStr.length > 0
					? formatDateLabel(dateStr)
					: t("dayDetail.unknownDate")}
			</Text>

			{isLoading ? (
				<View style={styles.loadingContainer}>
					<Text style={styles.muted}>{t("common.loading")}</Text>
				</View>
			) : (
				<>
					{/* Check-in card */}
					{checkin !== null && (
						<>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								{t("dayDetail.dailyCheckin")}
							</Text>
							<Card style={styles.card} mode="contained">
								<Card.Content style={styles.checkinContent}>
									<CheckinRow
										label={t("checkin.mood")}
										valueLabel={
											moodLabels[checkin.mood] ?? String(checkin.mood)
										}
									/>
									<Divider style={styles.divider} />
									<CheckinRow
										label={t("checkin.fatigue")}
										valueLabel={
											fatigueLabels[checkin.fatigue] ?? String(checkin.fatigue)
										}
									/>
									<Divider style={styles.divider} />
									<CheckinRow
										label={t("checkin.urgeLevel")}
										valueLabel={
											urgeLabels[checkin.urge] ?? String(checkin.urge)
										}
									/>
									{checkin.opened_at_night !== null && (
										<>
											<Divider style={styles.divider} />
											<View style={styles.checkinRow}>
												<Text variant="bodyMedium" style={styles.muted}>
													{t("dayDetail.openedLateAtNight")}
												</Text>
												<Text variant="bodyMedium" style={styles.valueText}>
													{checkin.opened_at_night === 1
														? t("common.yes")
														: t("common.no")}
												</Text>
											</View>
										</>
									)}
									{checkin.spent_today !== null && (
										<>
											<Divider style={styles.divider} />
											<View style={styles.checkinRow}>
												<Text variant="bodyMedium" style={styles.muted}>
													{t("dayDetail.spentToday")}
												</Text>
												<Text variant="bodyMedium" style={styles.valueText}>
													{checkin.spent_today === 1
														? t("common.yes")
														: t("common.no")}
												</Text>
											</View>
										</>
									)}
								</Card.Content>
							</Card>
						</>
					)}

					{/* Urge event timeline */}
					{urgeEvents.length > 0 && (
						<>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								{t("dayDetail.urgeEvents")}
							</Text>
							<View style={styles.timeline}>
								{urgeEvents.map((ev, idx) => (
									<View key={ev.id} style={styles.timelineItem}>
										{/* Connector line */}
										{idx < urgeEvents.length - 1 && (
											<View style={styles.timelineLine} />
										)}
										<View
											style={[
												styles.timelineDot,
												{ backgroundColor: outcomeColor(ev.outcome) },
											]}
										/>
										<View style={styles.timelineContent}>
											<View style={styles.timelineHeader}>
												<Text variant="labelMedium" style={styles.timelineTime}>
													{formatTime(ev.started_at)}
												</Text>
												<Chip
													compact
													style={[
														styles.outcomeChip,
														{ borderColor: outcomeColor(ev.outcome) },
													]}
													textStyle={{
														color: outcomeColor(ev.outcome),
														fontSize: 11,
													}}
												>
													{outcomeLabel(ev.outcome)}
												</Chip>
											</View>
											<Text variant="bodyMedium" style={styles.timelineKind}>
												{urgeKindLabel(ev.urge_kind)}
												{ev.trigger_tag !== null && (
													<Text style={styles.triggerTag}>
														{" "}
														· {ev.trigger_tag}
													</Text>
												)}
											</Text>
											{ev.action_id.length > 0 && (
												<Text variant="bodySmall" style={styles.muted}>
													{t("dayDetail.coping", {
														action: resolveActionTitle(ev.action_id),
													})}
												</Text>
											)}
										</View>
									</View>
								))}
							</View>
						</>
					)}

					{/* Empty state */}
					{urgeEvents.length === 0 && checkin === null && (
						<View style={styles.emptyState}>
							<Text variant="bodyLarge" style={styles.muted}>
								{t("dayDetail.noData")}
							</Text>
						</View>
					)}
				</>
			)}

			<View style={styles.bottomSpacer} />
		</ScrollView>
	);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CheckinRow({
	label,
	valueLabel,
}: {
	label: string;
	valueLabel: string;
}): React.ReactElement {
	return (
		<View style={styles.checkinRow}>
			<Text variant="bodyMedium" style={styles.muted}>
				{label}
			</Text>
			<Text variant="bodyMedium" style={styles.valueText}>
				{valueLabel}
			</Text>
		</View>
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
		paddingBottom: 24,
		gap: 16,
	},
	loadingContainer: {
		paddingVertical: 40,
		alignItems: "center",
	},
	dateTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	sectionTitle: {
		color: colors.text,
		fontWeight: "600",
		marginTop: 4,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	checkinContent: {
		paddingVertical: 4,
	},
	checkinRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 10,
		gap: 12,
	},
	divider: {
		backgroundColor: colors.border,
	},
	muted: {
		color: colors.muted,
	},
	valueText: {
		color: colors.text,
		fontWeight: "500",
	},
	timeline: {
		gap: 0,
	},
	timelineItem: {
		flexDirection: "row",
		gap: 12,
		paddingBottom: 20,
		position: "relative",
	},
	timelineDot: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginTop: 4,
		flexShrink: 0,
	},
	timelineLine: {
		position: "absolute",
		left: 5,
		top: 16,
		bottom: 0,
		width: 2,
		backgroundColor: colors.border,
	},
	timelineContent: {
		flex: 1,
		gap: 4,
	},
	timelineHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	timelineTime: {
		color: colors.muted,
	},
	timelineKind: {
		color: colors.text,
		fontWeight: "500",
	},
	triggerTag: {
		color: colors.muted,
		fontWeight: "400",
	},
	outcomeChip: {
		backgroundColor: "transparent",
		borderWidth: 1,
	},
	emptyState: {
		paddingVertical: 40,
		alignItems: "center",
	},
	bottomSpacer: {
		height: 24,
	},
});
