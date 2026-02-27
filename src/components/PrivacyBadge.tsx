// PrivacyBadge — small inline badge showing "100% offline" indicator.
// Non-intrusive, shown on home screen near the header.
// Uses react-native-paper Text. TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import type React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Inline privacy badge.
 * Shows a shield indicator and "100% offline" label.
 * Communicates that no data leaves the device.
 */
export function PrivacyBadge(): React.ReactElement {
	return (
		<View
			style={styles.container}
			accessibilityLabel="This app works 100% offline"
		>
			<View style={styles.dot} />
			<Text variant="labelSmall" style={styles.label}>
				100% offline
			</Text>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
		alignSelf: "flex-start",
		backgroundColor: "#0F2A1F",
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: "#1A4D30",
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.success,
	},
	label: {
		color: colors.success,
		letterSpacing: 0.4,
	},
});
