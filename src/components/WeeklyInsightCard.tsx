// WeeklyInsightCard — rotating insight cards derived from urge event data.
// Shows: strongest day, strongest time, and weekly trend.
// Rotates between insights every few seconds with a fade transition.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import type { DayOfWeekCount, TimeOfDayCount } from "@/src/data/repositories";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Card, Text } from "react-native-paper";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DOW_LABELS: Record<number, string> = {
	0: "Sunday",
	1: "Monday",
	2: "Tuesday",
	3: "Wednesday",
	4: "Thursday",
	5: "Friday",
	6: "Saturday",
};

const TIME_LABELS: Record<string, string> = {
	morning: "morning (5am–noon)",
	afternoon: "afternoon (noon–6pm)",
	evening: "evening (6pm+)",
};

function buildInsights(
	dowCounts: DayOfWeekCount[],
	timeCounts: TimeOfDayCount[],
	thisWeekResets: number,
	lastWeekResets: number,
): string[] {
	const insights: string[] = [];

	// Strongest day-of-week
	const bestDow = dowCounts.reduce(
		(best, cur) => (cur.count > best.count ? cur : best),
		dowCounts[0] ?? { dayOfWeek: 1, count: 0 },
	);
	if (bestDow.count > 0) {
		insights.push(
			`You reset most on ${DOW_LABELS[bestDow.dayOfWeek] ?? "weekdays"}`,
		);
	}

	// Strongest time-of-day
	const bestTime = timeCounts.reduce(
		(best, cur) => (cur.count > best.count ? cur : best),
		timeCounts[0] ?? { bucket: "morning", count: 0 },
	);
	if (bestTime.count > 0) {
		insights.push(
			`Your strongest time is ${TIME_LABELS[bestTime.bucket] ?? bestTime.bucket}`,
		);
	}

	// Weekly trend
	if (lastWeekResets > 0) {
		const pct = Math.round(
			((thisWeekResets - lastWeekResets) / lastWeekResets) * 100,
		);
		if (pct > 0) {
			insights.push(`Resets up ${pct}% vs last week`);
		} else if (pct < 0) {
			insights.push(`Resets down ${Math.abs(pct)}% vs last week`);
		} else {
			insights.push("Same number of resets as last week");
		}
	} else if (thisWeekResets > 0) {
		insights.push(
			`${thisWeekResets} reset${thisWeekResets > 1 ? "s" : ""} this week — great start`,
		);
	}

	return insights;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeeklyInsightCardProps {
	dowCounts: DayOfWeekCount[];
	timeCounts: TimeOfDayCount[];
	thisWeekResets: number;
	lastWeekResets: number;
	rotateIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function WeeklyInsightCard({
	dowCounts,
	timeCounts,
	thisWeekResets,
	lastWeekResets,
	rotateIntervalMs = 4000,
}: WeeklyInsightCardProps): React.ReactElement | null {
	const insights = buildInsights(
		dowCounts,
		timeCounts,
		thisWeekResets,
		lastWeekResets,
	);
	const [index, setIndex] = useState(0);
	const opacity = useSharedValue(1);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const animatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	useEffect(() => {
		if (insights.length <= 1) return;

		timerRef.current = setInterval(() => {
			// Fade out
			opacity.value = withTiming(
				0,
				{ duration: 300, easing: Easing.in(Easing.ease) },
				() => {
					// After fade-out, advance index and fade in
					opacity.value = withTiming(1, {
						duration: 300,
						easing: Easing.out(Easing.ease),
					});
				},
			);
			setIndex((prev) => (prev + 1) % insights.length);
		}, rotateIntervalMs);

		return () => {
			if (timerRef.current !== null) {
				clearInterval(timerRef.current);
			}
		};
	}, [insights.length, opacity, rotateIntervalMs]);

	if (insights.length === 0) {
		return null;
	}

	const currentInsight = insights[index] ?? insights[0] ?? "";

	return (
		<Card style={styles.card} mode="contained">
			<Card.Content style={styles.content}>
				<Text variant="labelMedium" style={styles.sectionLabel}>
					WEEKLY INSIGHT
				</Text>
				<Animated.View style={animatedStyle}>
					<Text variant="bodyLarge" style={styles.insightText}>
						{currentInsight}
					</Text>
				</Animated.View>
				{insights.length > 1 && (
					<View style={styles.dots}>
						{insights.map((_, i) => (
							<View
								key={i}
								style={[
									styles.dot,
									i === index ? styles.dotActive : styles.dotInactive,
								]}
							/>
						))}
					</View>
				)}
			</Card.Content>
		</Card>
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
	},
	content: {
		paddingVertical: 14,
		gap: 8,
	},
	sectionLabel: {
		color: colors.muted,
		letterSpacing: 0.6,
	},
	insightText: {
		color: colors.text,
		fontWeight: "500",
		minHeight: 28,
	},
	dots: {
		flexDirection: "row",
		gap: 6,
		marginTop: 4,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	dotActive: {
		backgroundColor: colors.primary,
	},
	dotInactive: {
		backgroundColor: colors.border,
	},
});
