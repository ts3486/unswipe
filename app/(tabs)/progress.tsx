// Progress tab screen.
// Shows a streak ring display and weekly stats.
// TypeScript strict mode.

import { PersonalBestCard } from "@/src/components/PersonalBestCard";
import { StreakRing } from "@/src/components/StreakRing";
import { WeeklyInsightCard } from "@/src/components/WeeklyInsightCard";
import { colors } from "@/src/constants/theme";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import {
	getAllCheckinDates,
	getCheckinsInRange,
	getUrgeCountByDayOfWeek,
	getUrgeCountByTimeOfDay,
	getUrgeEventsInRange,
} from "@/src/data/repositories";
import type { DayOfWeekCount, TimeOfDayCount } from "@/src/data/repositories";
import {
	calculateLongestStreak,
	calculateStreak,
} from "@/src/domain/progress-rules";
import { getDaysBetween, getLocalDateString } from "@/src/utils/date";
import { format } from "date-fns";
import { useFocusEffect } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Divider, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeeklyStats {
	successRate: number;
	successDays: number;
	totalDays: number;
	panicSuccessRate: number;
	panicSuccessCount: number;
	panicTotalCount: number;
	spendAvoidedCount: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekRange(today: string): { start: string; end: string } {
	const d = new Date(`${today}T00:00:00`);
	const dow = d.getDay(); // 0=Sun
	const monday = new Date(d);
	monday.setDate(d.getDate() - ((dow + 6) % 7));
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const fmt = (dt: Date): string => format(dt, "yyyy-MM-dd");
	return { start: fmt(monday), end: fmt(sunday) };
}

function getLastWeekRange(today: string): { start: string; end: string } {
	const d = new Date(`${today}T00:00:00`);
	const dow = d.getDay();
	const monday = new Date(d);
	monday.setDate(d.getDate() - ((dow + 6) % 7) - 7);
	const sunday = new Date(monday);
	sunday.setDate(monday.getDate() + 6);
	const fmt = (dt: Date): string => format(dt, "yyyy-MM-dd");
	return { start: fmt(monday), end: fmt(sunday) };
}

// ---------------------------------------------------------------------------
// WeekComparisonCard sub-component
// ---------------------------------------------------------------------------

interface WeekComparisonCardProps {
	thisWeekSuccessDays: number;
	lastWeekSuccessDays: number;
	thisWeekResets: number;
	lastWeekResets: number;
}

function WeekComparisonCard({
	thisWeekSuccessDays,
	lastWeekSuccessDays,
	thisWeekResets,
	lastWeekResets,
}: WeekComparisonCardProps): React.ReactElement {
	const { t } = useTranslation();
	const daysDelta = thisWeekSuccessDays - lastWeekSuccessDays;
	const resetsDelta = thisWeekResets - lastWeekResets;

	function deltaColor(delta: number): string {
		if (delta > 0) return colors.success;
		if (delta < 0) return colors.warning;
		return colors.muted;
	}

	function deltaStr(delta: number): string {
		if (delta > 0) return `+${delta}`;
		return String(delta);
	}

	return (
		<Card style={styles.card} mode="contained">
			<Card.Content>
				<Text variant="labelMedium" style={styles.comparisonTitle}>
					{t("progress.thisWeekVsLastWeek")}
				</Text>
				<View style={styles.comparisonRow}>
					<View style={styles.comparisonCol}>
						<Text variant="labelSmall" style={styles.comparisonColHeader}>
							{t("progress.checkinDays")}
						</Text>
						<Text variant="titleLarge" style={styles.comparisonThis}>
							{thisWeekSuccessDays}
						</Text>
						<Text
							variant="labelSmall"
							style={[styles.comparisonDelta, { color: deltaColor(daysDelta) }]}
						>
							{daysDelta === 0
								? t("progress.same")
								: t("progress.deltaVsLastWeek", { delta: deltaStr(daysDelta) })}
						</Text>
					</View>
					<View style={styles.comparisonDivider} />
					<View style={styles.comparisonCol}>
						<Text variant="labelSmall" style={styles.comparisonColHeader}>
							{t("progress.resetsSucceeded")}
						</Text>
						<Text variant="titleLarge" style={styles.comparisonThis}>
							{thisWeekResets}
						</Text>
						<Text
							variant="labelSmall"
							style={[
								styles.comparisonDelta,
								{ color: deltaColor(resetsDelta) },
							]}
						>
							{resetsDelta === 0
								? t("progress.same")
								: t("progress.deltaVsLastWeek", {
										delta: deltaStr(resetsDelta),
									})}
						</Text>
					</View>
				</View>
			</Card.Content>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ProgressScreen(): React.ReactElement {
	const { t } = useTranslation();
	const { db } = useDatabaseContext();
	const today = getLocalDateString();

	const zeroWeekStats: WeeklyStats = {
		successRate: 0,
		successDays: 0,
		totalDays: 7,
		panicSuccessRate: 0,
		panicSuccessCount: 0,
		panicTotalCount: 0,
		spendAvoidedCount: 0,
	};

	const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>(zeroWeekStats);
	const [lastWeekStats, setLastWeekStats] =
		useState<WeeklyStats>(zeroWeekStats);
	const [bestStreak, setBestStreak] = useState<number>(0);
	const [currentStreak, setCurrentStreak] = useState<number>(0);
	const [dowCounts, setDowCounts] = useState<DayOfWeekCount[]>([]);
	const [timeCounts, setTimeCounts] = useState<TimeOfDayCount[]>([]);

	// ---------------------------------------------------------------------------
	// Load weekly stats (this week + last week)
	// ---------------------------------------------------------------------------

	const loadWeeklyStats = useCallback(async (): Promise<void> => {
		// This week
		const { start, end } = getWeekRange(today);
		const weekDays = getDaysBetween(start, end);
		const events = await getUrgeEventsInRange(db, start, end);
		const checkins = await getCheckinsInRange(db, start, end);

		// Count check-in days (days where a daily check-in was completed)
		const checkinDaySet = new Set<string>(checkins.map((c) => c.date_local));

		const totalDays = weekDays.length;
		const successDays = checkinDaySet.size;
		const panicTotal = events.filter((e) => e.outcome !== "ongoing").length;
		const panicSuccess = events.filter((e) => e.outcome === "success").length;
		const spendAvoided = events.filter(
			(e) => e.urge_kind === "spend" && e.outcome === "success",
		).length;

		setWeeklyStats({
			successRate: totalDays > 0 ? successDays / totalDays : 0,
			successDays,
			totalDays,
			panicSuccessRate: panicTotal > 0 ? panicSuccess / panicTotal : 0,
			panicSuccessCount: panicSuccess,
			panicTotalCount: panicTotal,
			spendAvoidedCount: spendAvoided,
		});

		// Last week
		const lastWeekRange = getLastWeekRange(today);
		const lastWeekEvents = await getUrgeEventsInRange(
			db,
			lastWeekRange.start,
			lastWeekRange.end,
		);
		const lastWeekCheckins = await getCheckinsInRange(
			db,
			lastWeekRange.start,
			lastWeekRange.end,
		);

		const lastWeekCheckinDaySet = new Set<string>(
			lastWeekCheckins.map((c) => c.date_local),
		);

		const lastWeekSuccessDays = lastWeekCheckinDaySet.size;
		const lastWeekPanicTotal = lastWeekEvents.filter(
			(e) => e.outcome !== "ongoing",
		).length;
		const lastWeekPanicSuccess = lastWeekEvents.filter(
			(e) => e.outcome === "success",
		).length;
		const lastWeekSpendAvoided = lastWeekEvents.filter(
			(e) => e.urge_kind === "spend" && e.outcome === "success",
		).length;

		setLastWeekStats({
			successRate: lastWeekSuccessDays / 7,
			successDays: lastWeekSuccessDays,
			totalDays: 7,
			panicSuccessRate:
				lastWeekPanicTotal > 0 ? lastWeekPanicSuccess / lastWeekPanicTotal : 0,
			panicSuccessCount: lastWeekPanicSuccess,
			panicTotalCount: lastWeekPanicTotal,
			spendAvoidedCount: lastWeekSpendAvoided,
		});
	}, [db, today]);

	// ---------------------------------------------------------------------------
	// Load personal best streak
	// ---------------------------------------------------------------------------

	const loadBestStreak = useCallback(async (): Promise<void> => {
		const checkinDates = await getAllCheckinDates(db);
		setCurrentStreak(calculateStreak(checkinDates, today));
		setBestStreak(calculateLongestStreak(checkinDates));
	}, [db, today]);

	// ---------------------------------------------------------------------------
	// Load weekly insight data (day-of-week, time-of-day)
	// ---------------------------------------------------------------------------

	const loadInsightData = useCallback(async (): Promise<void> => {
		const [dow, tod] = await Promise.all([
			getUrgeCountByDayOfWeek(db),
			getUrgeCountByTimeOfDay(db),
		]);
		setDowCounts(dow);
		setTimeCounts(tod);
	}, [db]);

	useFocusEffect(
		useCallback(() => {
			void loadWeeklyStats();
			void loadBestStreak();
			void loadInsightData();
		}, [loadWeeklyStats, loadBestStreak, loadInsightData]),
	);

	const pctSuccess = Math.round(weeklyStats.successRate * 100);
	const pctPanic = Math.round(weeklyStats.panicSuccessRate * 100);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			<Text variant="headlineMedium" style={styles.screenTitle}>
				{t("progress.title")}
			</Text>

			{/* Streak ring display */}
			<StreakRing streak={currentStreak} bestStreak={bestStreak} />

			{/* Personal best highlight */}
			<PersonalBestCard bestStreak={bestStreak} currentStreak={currentStreak} />

			{/* Week comparison */}
			<WeekComparisonCard
				thisWeekSuccessDays={weeklyStats.successDays}
				lastWeekSuccessDays={lastWeekStats.successDays}
				thisWeekResets={weeklyStats.panicSuccessCount}
				lastWeekResets={lastWeekStats.panicSuccessCount}
			/>

			{/* Weekly insight cards */}
			<WeeklyInsightCard
				dowCounts={dowCounts}
				timeCounts={timeCounts}
				thisWeekResets={weeklyStats.panicSuccessCount}
				lastWeekResets={lastWeekStats.panicSuccessCount}
			/>

			{/* Weekly stats */}
			<Text variant="titleMedium" style={styles.sectionTitle}>
				{t("progress.thisWeek")}
			</Text>

			<Card style={styles.card} mode="contained">
				<Card.Content style={styles.statsContent}>
					<StatRow
						label={t("progress.bestCheckinStreak")}
						value={
							bestStreak > 0
								? t("progress.daysCount", { count: bestStreak })
								: t("progress.notYet")
						}
						valueColor={bestStreak > 0 ? colors.primary : colors.muted}
					/>
					<Divider style={styles.divider} />
					<StatRow
						label={t("progress.checkinDays")}
						value={`${weeklyStats.successDays} / ${weeklyStats.totalDays} (${pctSuccess}%)`}
						valueColor={
							weeklyStats.successDays > 0 ? colors.success : colors.muted
						}
					/>
					<Divider style={styles.divider} />
					<StatRow
						label={t("progress.urgeResetsSucceeded")}
						value={
							weeklyStats.panicTotalCount > 0
								? `${weeklyStats.panicSuccessCount} / ${weeklyStats.panicTotalCount} (${pctPanic}%)`
								: t("progress.noneYet")
						}
						valueColor={
							weeklyStats.panicSuccessCount > 0 ? colors.primary : colors.muted
						}
					/>
					<Divider style={styles.divider} />
					<StatRow
						label={t("progress.spendUrgesAvoided")}
						value={String(weeklyStats.spendAvoidedCount)}
						valueColor={
							weeklyStats.spendAvoidedCount > 0 ? colors.warning : colors.muted
						}
					/>
				</Card.Content>
			</Card>

			<View style={styles.bottomSpacer} />
		</ScrollView>
	);
}

// ---------------------------------------------------------------------------
// StatRow sub-component
// ---------------------------------------------------------------------------

interface StatRowProps {
	label: string;
	value: string;
	valueColor: string;
}

function StatRow({
	label,
	value,
	valueColor,
}: StatRowProps): React.ReactElement {
	return (
		<View style={styles.statRow}>
			<Text variant="bodyMedium" style={styles.statLabel}>
				{label}
			</Text>
			<Text
				variant="bodyMedium"
				style={[styles.statValue, { color: valueColor }]}
			>
				{value}
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
		paddingTop: 56,
		paddingBottom: 24,
		gap: 16,
	},
	screenTitle: {
		color: colors.text,
		fontWeight: "700",
		marginBottom: 4,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	sectionTitle: {
		color: colors.text,
		fontWeight: "600",
		marginTop: 4,
	},
	statsContent: {
		paddingVertical: 4,
	},
	statRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
	},
	statLabel: {
		color: colors.muted,
		flex: 1,
	},
	statValue: {
		fontWeight: "600",
	},
	divider: {
		backgroundColor: colors.border,
	},
	bottomSpacer: {
		height: 24,
	},
	// WeekComparisonCard styles
	comparisonTitle: {
		color: colors.muted,
		marginBottom: 12,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	comparisonRow: {
		flexDirection: "row",
		alignItems: "stretch",
	},
	comparisonCol: {
		flex: 1,
		alignItems: "center",
		gap: 4,
	},
	comparisonColHeader: {
		color: colors.muted,
		textAlign: "center",
	},
	comparisonThis: {
		color: colors.text,
		fontWeight: "700",
	},
	comparisonDelta: {
		textAlign: "center",
	},
	comparisonDivider: {
		width: 1,
		backgroundColor: colors.border,
		marginHorizontal: 12,
	},
});
