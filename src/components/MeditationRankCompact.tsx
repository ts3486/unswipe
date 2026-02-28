// MeditationRankCompact — compact rank stat card for the home screen stat row.
// Shows meditation rank number and progress toward next rank.
// TypeScript strict mode.

import {
	MEDITATION_RANK_CAP,
	MEDITATION_RANK_PER_LEVEL,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MeditationRankCompactProps {
	level: number;
	meditationCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeditationRankCompact({
	level,
	meditationCount,
}: MeditationRankCompactProps): React.ReactElement {
	const isMaxLevel = level >= MEDITATION_RANK_CAP;
	const meditationsIntoCurrentLevel = meditationCount % MEDITATION_RANK_PER_LEVEL;

	return (
		<Surface style={styles.card} elevation={2}>
			<Text variant="displaySmall" style={styles.value}>
				{level}
			</Text>
			<Text variant="labelMedium" style={styles.label}>
				rank
			</Text>
			<Text variant="labelSmall" style={styles.progress}>
				{isMaxLevel
					? "Max"
					: `${meditationsIntoCurrentLevel}/${MEDITATION_RANK_PER_LEVEL}`}
			</Text>
		</Surface>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	card: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 14,
		padding: 16,
		alignItems: "center",
		borderWidth: 1,
		borderColor: colors.border,
	},
	value: {
		color: colors.primary,
		fontWeight: "800",
		letterSpacing: -1,
		lineHeight: 52,
	},
	label: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
		marginTop: 2,
	},
	progress: {
		color: colors.muted,
		marginTop: 4,
	},
});
