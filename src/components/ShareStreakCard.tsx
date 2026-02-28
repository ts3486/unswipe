// ShareStreakCard — the visual card captured as an image for sharing.
// Rendered off-screen (via ref) and captured with react-native-view-shot.
// Uses only View/Text/Image (no Surface/Card) for reliable capture.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import type React from "react";
import { Image, StyleSheet, Text, View } from "react-native";

// ---------------------------------------------------------------------------
// Logo asset
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-var-requires
const logoSource = require("@/assets/images/logo.png") as number;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ShareStreakCardProps {
	/** Current streak in days. */
	streak: number;
	/** Total meditations completed all-time. */
	meditationCount: number;
	/** Meditation rank (1–30). */
	meditationRank: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Self-contained card rendered as a fixed-size (360×200) surface.
 * Captured as a PNG by the share service using a forwarded ref.
 * Keep this component stateless and side-effect free.
 */
export function ShareStreakCard({
	streak,
	meditationCount,
	meditationRank,
}: ShareStreakCardProps): React.ReactElement {
	const streakLabel = streak === 1 ? "1 day" : `${streak} days`;

	return (
		<View style={styles.card}>
			{/* Top row: logo + "100% offline" pill */}
			<View style={styles.topRow}>
				<View style={styles.logoRow}>
					<Image
						source={logoSource}
						style={styles.logoMark}
						resizeMode="contain"
					/>
					<Text style={styles.wordmark}>Unmatch</Text>
				</View>
				<View style={styles.offlinePill}>
					<View style={styles.offlineDot} />
					<Text style={styles.offlineLabel}>100% offline</Text>
				</View>
			</View>

			{/* Main headline */}
			<Text style={styles.headline}>
				Taking back my time for{" "}
				<Text style={styles.headlineAccent}>{streakLabel}</Text>
			</Text>

			{/* Stats row */}
			<View style={styles.statsRow}>
				<View style={styles.statBlock}>
					<Text style={styles.statValue}>{meditationCount}</Text>
					<Text style={styles.statLabel}>meditations completed</Text>
				</View>
				<View style={styles.statDivider} />
				<View style={styles.statBlock}>
					<Text style={styles.statValue}>Rank {meditationRank}</Text>
					<Text style={styles.statLabel}>meditation rank</Text>
				</View>
			</View>

			{/* Footer */}
			<Text style={styles.footer}>unmatch.app</Text>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	card: {
		width: 360,
		backgroundColor: "#0B1220",
		borderRadius: 20,
		padding: 24,
		gap: 16,
		borderWidth: 1,
		borderColor: "#223049",
	},
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	logoRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	logoMark: {
		width: 24,
		height: 24,
	},
	wordmark: {
		color: "#E6EDF7",
		fontSize: 15,
		fontWeight: "800",
		letterSpacing: 1.5,
	},
	offlinePill: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		backgroundColor: "#0F2A1F",
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: "#1A4D30",
	},
	offlineDot: {
		width: 5,
		height: 5,
		borderRadius: 3,
		backgroundColor: colors.success,
	},
	offlineLabel: {
		color: colors.success,
		fontSize: 10,
		fontWeight: "600",
		letterSpacing: 0.3,
	},
	headline: {
		color: "#E6EDF7",
		fontSize: 22,
		fontWeight: "700",
		lineHeight: 30,
	},
	headlineAccent: {
		color: "#4C8DFF",
	},
	statsRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	statBlock: {
		flex: 1,
		gap: 2,
	},
	statValue: {
		color: "#E6EDF7",
		fontSize: 18,
		fontWeight: "700",
		letterSpacing: -0.3,
	},
	statDivider: {
		width: 1,
		height: 32,
		backgroundColor: "#223049",
		marginHorizontal: 16,
	},
	statLabel: {
		color: "#A7B3C7",
		fontSize: 11,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	footer: {
		color: "#A7B3C7",
		fontSize: 11,
		letterSpacing: 0.3,
	},
});
