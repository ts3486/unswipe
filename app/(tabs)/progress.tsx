// Progress tab screen.
// Shows a monthly calendar view and weekly stats.
// TypeScript strict mode.

import { PersonalBestCard } from "@/src/components/PersonalBestCard";
import { ShareStreakCard } from "@/src/components/ShareStreakCard";
import { WeeklyInsightCard } from "@/src/components/WeeklyInsightCard";
import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import {
	countSuccessesByDate,
	getUrgeCountByDayOfWeek,
	getUrgeCountByTimeOfDay,
	getUrgeEventsInRange,
} from "@/src/data/repositories";
import type { DayOfWeekCount, TimeOfDayCount } from "@/src/data/repositories";
import { shareStreakCard } from "@/src/services/share";
import { getDaysBetween, getLocalDateString } from "@/src/utils/date";
import { format, getDay, getDaysInMonth, startOfMonth } from "date-fns";
import { router } from "expo-router";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";
import ViewShot from "react-native-view-shot";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DayCell {
	dateStr: string; // YYYY-MM-DD
	dayNum: number;
	isSuccess: boolean;
	isToday: boolean;
	inMonth: boolean;
}

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
	monday.setDate(d.getDate() - ((dow + 6) % 7) - 7); // go back 7 more days
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
					This week vs. last week
				</Text>
				<View style={styles.comparisonRow}>
					<View style={styles.comparisonCol}>
						<Text variant="labelSmall" style={styles.comparisonColHeader}>
							Success days
						</Text>
						<Text variant="titleLarge" style={styles.comparisonThis}>
							{thisWeekSuccessDays}
						</Text>
						<Text
							variant="labelSmall"
							style={[styles.comparisonDelta, { color: deltaColor(daysDelta) }]}
						>
							{daysDelta === 0
								? "— same"
								: `${deltaStr(daysDelta)} vs last week`}
						</Text>
					</View>
					<View style={styles.comparisonDivider} />
					<View style={styles.comparisonCol}>
						<Text variant="labelSmall" style={styles.comparisonColHeader}>
							Resets succeeded
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
								? "— same"
								: `${deltaStr(resetsDelta)} vs last week`}
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
	const { db } = useDatabaseContext();
	const {
		meditationRank,
		meditationCount: totalMeditationCount,
		streak,
	} = useAppState();
	const today = getLocalDateString();

	// Share card ref
	const shareCardRef = useRef<ViewShot>(null);
	const [isSharing, setIsSharing] = useState(false);

	const handleShare = useCallback(async (): Promise<void> => {
		if (isSharing) return;
		setIsSharing(true);
		await shareStreakCard(shareCardRef);
		setIsSharing(false);
	}, [isSharing]);

	// Current month display
	const [viewYear, setViewYear] = useState<number>(() => {
		const d = new Date(`${today}T00:00:00`);
		return d.getFullYear();
	});
	const [viewMonth, setViewMonth] = useState<number>(() => {
		const d = new Date(`${today}T00:00:00`);
		return d.getMonth(); // 0-indexed
	});

	const [successDates, setSuccessDates] = useState<Set<string>>(new Set());

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
	const [isLoading, setIsLoading] = useState<boolean>(true);
	const [dowCounts, setDowCounts] = useState<DayOfWeekCount[]>([]);
	const [timeCounts, setTimeCounts] = useState<TimeOfDayCount[]>([]);

	// ---------------------------------------------------------------------------
	// Load success dates for current month
	// ---------------------------------------------------------------------------

	const loadMonthData = useCallback(async (): Promise<void> => {
		setIsLoading(true);
		try {
			const firstDay = format(new Date(viewYear, viewMonth, 1), "yyyy-MM-dd");
			const daysInMonth = getDaysInMonth(new Date(viewYear, viewMonth, 1));
			const lastDay = format(
				new Date(viewYear, viewMonth, daysInMonth),
				"yyyy-MM-dd",
			);

			const allDays = getDaysBetween(firstDay, lastDay);
			const results = await Promise.all(
				allDays.map(async (d) => {
					const count = await countSuccessesByDate(db, d);
					return { date: d, success: count > 0 };
				}),
			);

			const set = new Set<string>();
			for (const r of results) {
				if (r.success) {
					set.add(r.date);
				}
			}
			setSuccessDates(set);
		} finally {
			setIsLoading(false);
		}
	}, [db, viewYear, viewMonth]);

	// ---------------------------------------------------------------------------
	// Load weekly stats (this week + last week)
	// ---------------------------------------------------------------------------

	const loadWeeklyStats = useCallback(async (): Promise<void> => {
		// This week
		const { start, end } = getWeekRange(today);
		const weekDays = getDaysBetween(start, end);
		const events = await getUrgeEventsInRange(db, start, end);

		const successDaySet = new Set<string>();
		for (const ev of events) {
			if (ev.outcome === "success") {
				successDaySet.add(ev.started_at.slice(0, 10));
			}
		}

		const totalDays = weekDays.length;
		const successDays = successDaySet.size;
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

		const lastWeekSuccessDaySet = new Set<string>();
		for (const ev of lastWeekEvents) {
			if (ev.outcome === "success") {
				lastWeekSuccessDaySet.add(ev.started_at.slice(0, 10));
			}
		}

		const lastWeekSuccessDays = lastWeekSuccessDaySet.size;
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
			successRate: 7 > 0 ? lastWeekSuccessDays / 7 : 0,
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
		const twoYearsAgo = format(
			new Date(new Date().getFullYear() - 2, 0, 1),
			"yyyy-MM-dd",
		);
		const allEvents = await getUrgeEventsInRange(db, twoYearsAgo, today);

		const successDateSet = new Set<string>();
		for (const ev of allEvents) {
			if (ev.outcome === "success") {
				successDateSet.add(ev.started_at.slice(0, 10));
			}
		}

		const sortedDates = Array.from(successDateSet).sort();

		let longest = 0;
		let current = 0;
		let trailingCurrent = 0;

		for (let i = 0; i < sortedDates.length; i++) {
			if (i === 0) {
				current = 1;
			} else {
				const prev = new Date(`${sortedDates[i - 1]}T00:00:00`);
				const curr = new Date(`${sortedDates[i]}T00:00:00`);
				const diffMs = curr.getTime() - prev.getTime();
				const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
				if (diffDays === 1) {
					current += 1;
				} else {
					current = 1;
				}
			}
			if (current > longest) {
				longest = current;
			}
			// Track current streak (last element's streak value)
			if (i === sortedDates.length - 1) {
				trailingCurrent = current;
			}
		}

		// Only report current streak if the last success date is today or yesterday
		const lastDate = sortedDates[sortedDates.length - 1];
		if (lastDate !== undefined) {
			const lastMs = new Date(`${lastDate}T00:00:00`).getTime();
			const todayMs = new Date(`${today}T00:00:00`).getTime();
			const diffDays = Math.round((todayMs - lastMs) / (1000 * 60 * 60 * 24));
			if (diffDays <= 1) {
				setCurrentStreak(trailingCurrent);
			} else {
				setCurrentStreak(0);
			}
		} else {
			setCurrentStreak(0);
		}

		setBestStreak(longest);
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

	useEffect(() => {
		void loadMonthData();
	}, [loadMonthData]);

	useEffect(() => {
		void loadWeeklyStats();
	}, [loadWeeklyStats]);

	useEffect(() => {
		void loadBestStreak();
	}, [loadBestStreak]);

	useEffect(() => {
		void loadInsightData();
	}, [loadInsightData]);

	// ---------------------------------------------------------------------------
	// Calendar grid
	// ---------------------------------------------------------------------------

	const calendarDays = useMemo((): DayCell[] => {
		const firstOfMonth = startOfMonth(new Date(viewYear, viewMonth, 1));
		const daysInMonth = getDaysInMonth(firstOfMonth);
		// getDay returns 0=Sun; convert to Mon-start (0=Mon)
		const startDow = (getDay(firstOfMonth) + 6) % 7;

		const cells: DayCell[] = [];

		// Leading empty cells
		for (let i = 0; i < startDow; i++) {
			cells.push({
				dateStr: "",
				dayNum: 0,
				isSuccess: false,
				isToday: false,
				inMonth: false,
			});
		}

		for (let d = 1; d <= daysInMonth; d++) {
			const dateStr = format(new Date(viewYear, viewMonth, d), "yyyy-MM-dd");
			cells.push({
				dateStr,
				dayNum: d,
				isSuccess: successDates.has(dateStr),
				isToday: dateStr === today,
				inMonth: true,
			});
		}

		return cells;
	}, [viewYear, viewMonth, successDates, today]);

	const monthLabel = format(new Date(viewYear, viewMonth, 1), "MMMM yyyy");

	const prevMonth = useCallback((): void => {
		if (viewMonth === 0) {
			setViewMonth(11);
			setViewYear((y) => y - 1);
		} else {
			setViewMonth((m) => m - 1);
		}
	}, [viewMonth]);

	const nextMonth = useCallback((): void => {
		if (viewMonth === 11) {
			setViewMonth(0);
			setViewYear((y) => y + 1);
		} else {
			setViewMonth((m) => m + 1);
		}
	}, [viewMonth]);

	const handleDayPress = useCallback((dateStr: string): void => {
		if (dateStr.length > 0) {
			router.push(`/progress/day/${dateStr}`);
		}
	}, []);

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
				Progress
			</Text>

			<Card style={styles.card} mode="contained">
						<Card.Content>
							{/* Month navigation */}
							<View style={styles.monthNav}>
								<TouchableOpacity
									onPress={prevMonth}
									style={styles.navButton}
									accessibilityLabel="Previous month"
								>
									<Text style={styles.navArrow}>{"<"}</Text>
								</TouchableOpacity>
								<Text variant="titleMedium" style={styles.monthLabel}>
									{monthLabel}
								</Text>
								<TouchableOpacity
									onPress={nextMonth}
									style={styles.navButton}
									accessibilityLabel="Next month"
								>
									<Text style={styles.navArrow}>{">"}</Text>
								</TouchableOpacity>
							</View>

							{/* Weekday headers */}
							<View style={styles.weekRow}>
								{["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
									<View key={i} style={styles.dayHeaderCell}>
										<Text style={styles.dayHeader}>{d}</Text>
									</View>
								))}
							</View>

							{/* Day cells */}
							{isLoading ? (
								<View style={styles.calendarLoading}>
									<Text style={styles.loadingText}>Loading...</Text>
								</View>
							) : (
								<View style={styles.calendarGrid}>
									{calendarDays.map((cell, idx) => {
										if (!cell.inMonth) {
											return (
												<View key={`empty-${idx}`} style={styles.dayCell} />
											);
										}
										return (
											<TouchableOpacity
												key={cell.dateStr}
												style={[
													styles.dayCell,
													cell.isSuccess && styles.dayCellSuccess,
													cell.isToday && styles.dayCellToday,
												]}
												onPress={() => {
													handleDayPress(cell.dateStr);
												}}
												accessibilityLabel={`${cell.dateStr}${cell.isSuccess ? ", success day" : ""}`}
											>
												<Text
													style={[
														styles.dayNum,
														cell.isSuccess && styles.dayNumSuccess,
														cell.isToday && styles.dayNumToday,
													]}
												>
													{cell.dayNum}
												</Text>
											</TouchableOpacity>
										);
									})}
								</View>
							)}

							{/* Legend */}
							<View style={styles.legend}>
								<View style={styles.legendItem}>
									<View
										style={[
											styles.legendDot,
											{ backgroundColor: colors.success },
										]}
									/>
									<Text style={styles.legendText}>Success day</Text>
								</View>
								<View style={styles.legendItem}>
									<View
										style={[
											styles.legendDot,
											{
												backgroundColor: colors.border,
												borderColor: colors.primary,
												borderWidth: 2,
											},
										]}
									/>
									<Text style={styles.legendText}>Today</Text>
								</View>
							</View>
						</Card.Content>
					</Card>

					{/* Personal best highlight */}
					<PersonalBestCard
						bestStreak={bestStreak}
						currentStreak={currentStreak}
					/>

					{/* Share streak button */}
					<Button
						mode="outlined"
						onPress={() => void handleShare()}
						loading={isSharing}
						disabled={isSharing}
						style={styles.shareButton}
						contentStyle={styles.shareButtonContent}
						textColor={colors.secondary}
						accessibilityLabel="Share your streak"
					>
						Share your streak
					</Button>

					{/* Off-screen share card for capture */}
					<View style={styles.offscreenCapture} pointerEvents="none">
						<ViewShot
							ref={shareCardRef}
							options={{ format: "png", quality: 1 }}
						>
							<ShareStreakCard
								streak={streak}
								meditationCount={totalMeditationCount}
								meditationRank={meditationRank}
							/>
						</ViewShot>
					</View>

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
						This Week
					</Text>

					<Card style={styles.card} mode="contained">
						<Card.Content style={styles.statsContent}>
							<StatRow
								label="Personal best streak"
								value={bestStreak > 0 ? `${bestStreak} days` : "Not yet"}
								valueColor={bestStreak > 0 ? colors.primary : colors.muted}
							/>
							<Divider style={styles.divider} />
							<StatRow
								label="Success days"
								value={`${weeklyStats.successDays} / ${weeklyStats.totalDays} (${pctSuccess}%)`}
								valueColor={
									weeklyStats.successDays > 0 ? colors.success : colors.muted
								}
							/>
							<Divider style={styles.divider} />
							<StatRow
								label="Urge resets succeeded"
								value={
									weeklyStats.panicTotalCount > 0
										? `${weeklyStats.panicSuccessCount} / ${weeklyStats.panicTotalCount} (${pctPanic}%)`
										: "None yet"
								}
								valueColor={
									weeklyStats.panicSuccessCount > 0
										? colors.primary
										: colors.muted
								}
							/>
							<Divider style={styles.divider} />
							<StatRow
								label="Spend urges avoided"
								value={String(weeklyStats.spendAvoidedCount)}
								valueColor={
									weeklyStats.spendAvoidedCount > 0
										? colors.warning
										: colors.muted
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
	monthNav: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 16,
	},
	navButton: {
		padding: 8,
	},
	navArrow: {
		color: colors.primary,
		fontSize: 18,
		fontWeight: "700",
	},
	monthLabel: {
		color: colors.text,
		fontWeight: "600",
	},
	weekRow: {
		flexDirection: "row",
		marginBottom: 8,
	},
	dayHeaderCell: {
		flex: 1,
		alignItems: "center",
	},
	dayHeader: {
		color: colors.muted,
		fontSize: 12,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	calendarGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	calendarLoading: {
		height: 160,
		alignItems: "center",
		justifyContent: "center",
	},
	loadingText: {
		color: colors.muted,
	},
	dayCell: {
		width: `${100 / 7}%`,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
		borderWidth: 2,
		borderColor: "transparent",
		borderRadius: 8,
	},
	dayCellSuccess: {
		backgroundColor: "rgba(71, 194, 139, 0.2)",
	},
	dayCellToday: {
		borderColor: colors.primary,
	},
	dayNum: {
		color: colors.text,
		fontSize: 13,
		fontWeight: "400",
		lineHeight: 18,
		textAlign: "center",
	},
	dayNumSuccess: {
		color: colors.success,
		fontWeight: "600",
	},
	dayNumToday: {
		color: colors.primary,
		fontWeight: "700",
	},
	legend: {
		flexDirection: "row",
		gap: 16,
		marginTop: 12,
		justifyContent: "flex-end",
	},
	legendItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	legendDot: {
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	legendText: {
		color: colors.muted,
		fontSize: 12,
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
	shareButton: {
		borderRadius: 12,
		borderColor: colors.secondary,
	},
	shareButtonContent: {
		paddingVertical: 6,
	},
	offscreenCapture: {
		position: "absolute",
		top: -9999,
		left: 0,
		opacity: 0,
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
