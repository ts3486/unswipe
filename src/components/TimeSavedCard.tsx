// TimeSavedCard — displays estimated time saved this week based on meditation count.
// Logic: each successful meditation = TIME_SAVED_PER_MEDITATION_MINUTES minutes saved.
// Uses react-native-paper components. TypeScript strict mode.

import { TIME_SAVED_PER_MEDITATION_MINUTES } from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Pure formatting utility (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Formats a minute count into a human-readable saved-time string.
 * Shows minutes when under 60, hours (1 decimal place) otherwise.
 */
export function formatTimeSaved(weeklySuccessCount: number): string {
	const mins = weeklySuccessCount * TIME_SAVED_PER_MEDITATION_MINUTES;
	if (mins === 0) return "0 min";
	if (mins < 60) return `~${mins} min`;
	return `~${(mins / 60).toFixed(1)} hrs`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TimeSavedCardProps {
	weeklySuccessCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Compact card showing estimated time saved this week.
 * Shown on the home tab. Reads weekly success count from props.
 */
export function TimeSavedCard({
	weeklySuccessCount,
}: TimeSavedCardProps): React.ReactElement {
	const formatted = formatTimeSaved(weeklySuccessCount);
	const mins = weeklySuccessCount * TIME_SAVED_PER_MEDITATION_MINUTES;

	return (
		<Surface style={styles.container} elevation={1}>
			<View style={styles.row}>
				<View style={styles.textGroup}>
					<Text variant="labelSmall" style={styles.label}>
						TIME SAVED THIS WEEK
					</Text>
					<Text variant="headlineMedium" style={styles.value}>
						{formatted}
					</Text>
					{mins > 0 && (
						<Text variant="bodySmall" style={styles.sub}>
							{weeklySuccessCount} meditation{weeklySuccessCount === 1 ? "" : "s"}{" "}
							this week
						</Text>
					)}
					{mins === 0 && (
						<Text variant="bodySmall" style={styles.sub}>
							Start meditating to track time saved
						</Text>
					)}
				</View>
				<View style={styles.iconBox}>
					<Text style={styles.iconText}>clock</Text>
				</View>
			</View>
		</Surface>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		padding: 16,
		borderWidth: 1,
		borderColor: colors.border,
	},
	row: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	textGroup: {
		flex: 1,
		gap: 2,
	},
	label: {
		color: colors.muted,
		letterSpacing: 1,
		textTransform: "uppercase",
		marginBottom: 4,
	},
	value: {
		color: colors.success,
		fontWeight: "700",
		letterSpacing: -0.5,
	},
	sub: {
		color: colors.muted,
		marginTop: 4,
	},
	iconBox: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "#1A3D2E",
		alignItems: "center",
		justifyContent: "center",
		marginLeft: 12,
	},
	iconText: {
		color: colors.success,
		fontSize: 11,
		fontWeight: "600",
	},
});
