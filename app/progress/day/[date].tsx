// Day detail screen.
// Shows all urge events for a given date and the daily check-in if present.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { getCheckinByDate, getUrgeEventsByDate } from "@/src/data/repositories";
import { getCatalog } from "@/src/data/seed-loader";
import type { DailyCheckin, UrgeEvent } from "@/src/domain/types";
import { parseLocalDate } from "@/src/utils/date";
import { format } from "date-fns";
import { useLocalSearchParams } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Chip, Divider, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DayDetailScreen(): React.ReactElement {
	const { date } = useLocalSearchParams<{ date: string }>();
	const { db } = useDatabaseContext();

	const [urgeEvents, setUrgeEvents] = useState<UrgeEvent[]>([]);
	const [checkin, setCheckin] = useState<DailyCheckin | null>(null);
	const [isLoading, setIsLoading] = useState<boolean>(true);

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
	// Summary stats
	// ---------------------------------------------------------------------------

	const successCount = urgeEvents.filter((e) => e.outcome === "success").length;
	const failCount = urgeEvents.filter((e) => e.outcome === "fail").length;
	const ongoingCount = urgeEvents.filter((e) => e.outcome === "ongoing").length;

	// ---------------------------------------------------------------------------
	// Helpers
	// ---------------------------------------------------------------------------

	function formatTime(isoUtc: string): string {
		try {
			return format(new Date(isoUtc), "h:mm a");
		} catch {
			return "";
		}
	}

	function formatDateLabel(ds: string): string {
		try {
			return format(parseLocalDate(ds), "EEEE, MMMM d, yyyy");
		} catch {
			return ds;
		}
	}

	function outcomeLabel(outcome: UrgeEvent["outcome"]): string {
		if (outcome === "success") return "Meditated";
		if (outcome === "fail") return "Did not meditate";
		return "Ongoing";
	}

	function outcomeColor(outcome: UrgeEvent["outcome"]): string {
		if (outcome === "success") return colors.success;
		if (outcome === "fail") return "#E05A5A";
		return colors.muted;
	}

	function urgeKindLabel(kind: string): string {
		if (kind === "swipe") return "Swiping";
		if (kind === "check") return "Checking";
		if (kind === "spend") return "Spending";
		return kind;
	}

	function resolveActionTitle(actionId: string): string {
		if (actionId.length === 0) return "";
		const catalog = getCatalog();
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
				{dateStr.length > 0 ? formatDateLabel(dateStr) : "Unknown date"}
			</Text>

			{isLoading ? (
				<View style={styles.loadingContainer}>
					<Text style={styles.muted}>Loading...</Text>
				</View>
			) : (
				<>
					{/* Summary stats */}
					<View style={styles.summaryRow}>
						<SummaryBadge
							count={successCount}
							label="Meditated"
							color={colors.success}
						/>
						<SummaryBadge
							count={failCount}
							label="Did not meditate"
							color="#E05A5A"
						/>
						<SummaryBadge
							count={ongoingCount}
							label="Ongoing"
							color={colors.muted}
						/>
					</View>

					{/* Check-in card */}
					{checkin !== null && (
						<>
							<Text variant="titleMedium" style={styles.sectionTitle}>
								Daily check-in
							</Text>
							<Card style={styles.card} mode="contained">
								<Card.Content style={styles.checkinContent}>
									<CheckinRow label="Mood" value={checkin.mood} />
									<Divider style={styles.divider} />
									<CheckinRow label="Fatigue" value={checkin.fatigue} />
									<Divider style={styles.divider} />
									<CheckinRow label="Urge level" value={checkin.urge} />
									{checkin.opened_at_night !== null && (
										<>
											<Divider style={styles.divider} />
											<View style={styles.checkinRow}>
												<Text variant="bodyMedium" style={styles.muted}>
													Opened late at night
												</Text>
												<Text variant="bodyMedium" style={styles.valueText}>
													{checkin.opened_at_night === 1 ? "Yes" : "No"}
												</Text>
											</View>
										</>
									)}
									{checkin.spent_today !== null && (
										<>
											<Divider style={styles.divider} />
											<View style={styles.checkinRow}>
												<Text variant="bodyMedium" style={styles.muted}>
													Spent today
												</Text>
												<Text variant="bodyMedium" style={styles.valueText}>
													{checkin.spent_today === 1 ? "Yes" : "No"}
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
								Urge events
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
													Coping: {resolveActionTitle(ev.action_id)}
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
								No data recorded for this day.
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

function SummaryBadge({
	count,
	label,
	color,
}: {
	count: number;
	label: string;
	color: string;
}): React.ReactElement {
	return (
		<View style={[styles.summaryBadge, { borderColor: color }]}>
			<Text variant="headlineSmall" style={[styles.summaryCount, { color }]}>
				{count}
			</Text>
			<Text variant="labelSmall" style={styles.summaryLabel}>
				{label}
			</Text>
		</View>
	);
}

function CheckinRow({
	label,
	value,
}: {
	label: string;
	value: number;
}): React.ReactElement {
	return (
		<View style={styles.checkinRow}>
			<Text variant="bodyMedium" style={styles.muted}>
				{label}
			</Text>
			<View style={styles.ratingDots}>
				{[1, 2, 3, 4, 5].map((i) => (
					<View
						key={i}
						style={[
							styles.ratingDot,
							i <= value ? styles.ratingDotFilled : styles.ratingDotEmpty,
						]}
					/>
				))}
				<Text variant="bodyMedium" style={styles.valueText}>
					{value}/5
				</Text>
			</View>
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
	summaryRow: {
		flexDirection: "row",
		gap: 10,
	},
	summaryBadge: {
		flex: 1,
		borderRadius: 12,
		borderWidth: 1,
		backgroundColor: colors.surface,
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 8,
		gap: 4,
	},
	summaryCount: {
		fontWeight: "700",
	},
	summaryLabel: {
		color: colors.muted,
		textAlign: "center",
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
	ratingDots: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
	},
	ratingDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	ratingDotFilled: {
		backgroundColor: colors.primary,
	},
	ratingDotEmpty: {
		backgroundColor: colors.border,
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
