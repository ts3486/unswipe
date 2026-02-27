// MotivationCard — shows a daily rotating motivation message.
// Message is selected deterministically using day-of-year % message count.
// Uses react-native-paper components. TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import type React from "react";
import { StyleSheet } from "react-native";
import { Card, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Day-of-year utility (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Returns a 0-based day-of-year index for the given local date string (YYYY-MM-DD).
 * Jan 1 = 0, Jan 2 = 1, …, Dec 31 = 364 or 365.
 */
export function getDayOfYear(dateLocal: string): number {
	const date = new Date(`${dateLocal}T00:00:00`);
	const startOfYear = new Date(date.getFullYear(), 0, 0);
	const diff = date.getTime() - startOfYear.getTime();
	const oneDay = 24 * 60 * 60 * 1000;
	return Math.floor(diff / oneDay);
}

/**
 * Picks a message from an array deterministically based on day-of-year.
 * Returns null if the array is empty.
 */
export function getDailyMessage(
	messages: string[],
	dateLocal: string,
): string | null {
	if (messages.length === 0) return null;
	const dayIndex = getDayOfYear(dateLocal);
	return messages[dayIndex % messages.length] ?? null;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MotivationCardProps {
	message: string | null;
	onPress?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Card displaying the daily motivation message.
 * Tappable — calls onPress to navigate to Learn content.
 * Returns null when there is no message to show.
 */
export function MotivationCard({
	message,
	onPress,
}: MotivationCardProps): React.ReactElement | null {
	if (message === null) return null;

	return (
		<Card
			style={styles.card}
			mode="contained"
			onPress={onPress}
			accessible
			accessibilityRole="button"
			accessibilityLabel="Daily motivation. Tap to learn more."
		>
			<Card.Content style={styles.content}>
				<Text variant="labelSmall" style={styles.eyebrow}>
					DAILY INSIGHT
				</Text>
				<Text variant="bodyMedium" style={styles.message}>
					{message}
				</Text>
				{onPress !== undefined && (
					<Text variant="labelSmall" style={styles.tapHint}>
						Tap to explore
					</Text>
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
		backgroundColor: "#1A2D4D",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	content: {
		gap: 8,
		paddingVertical: 16,
		paddingHorizontal: 16,
	},
	eyebrow: {
		color: colors.secondary,
		letterSpacing: 1.2,
		textTransform: "uppercase",
	},
	message: {
		color: colors.text,
		lineHeight: 22,
	},
	tapHint: {
		color: colors.muted,
		marginTop: 4,
	},
});
