// LifeTreeCompact — compact tree stat card for the home screen stat row.
// Shows tree level number and progress toward next level.
// TypeScript strict mode.

import {
	LIFE_TREE_CAP,
	LIFE_TREE_MEDITATION_PER_LEVEL,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LifeTreeCompactProps {
	level: number;
	meditationCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LifeTreeCompact({
	level,
	meditationCount,
}: LifeTreeCompactProps): React.ReactElement {
	const isMaxLevel = level >= LIFE_TREE_CAP;
	const meditationsIntoCurrentLevel = meditationCount % LIFE_TREE_MEDITATION_PER_LEVEL;

	return (
		<Surface style={styles.card} elevation={2}>
			<Text variant="displaySmall" style={styles.value}>
				{level}
			</Text>
			<Text variant="labelMedium" style={styles.label}>
				tree
			</Text>
			<Text variant="labelSmall" style={styles.progress}>
				{isMaxLevel
					? "Max"
					: `${meditationsIntoCurrentLevel}/${LIFE_TREE_MEDITATION_PER_LEVEL}`}
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
