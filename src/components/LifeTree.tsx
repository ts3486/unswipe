// LifeTree — visual component showing the current tree level and progress.
// Uses react-native-paper components. No emojis. TypeScript strict mode.
// Phase 4A: idle pulse animation on container + ring pop on new meditation.
// Phase 4B: increased padding, displayMedium level, "Your Life Tree" title.

import {
	LIFE_TREE_CAP,
	LIFE_TREE_MEDITATION_PER_LEVEL,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import type React from "react";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { ProgressBar, Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Animated Surface
// ---------------------------------------------------------------------------

const AnimatedSurface = Animated.createAnimatedComponent(Surface);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LifeTreeProps {
	level: number;
	meditationCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Displays the Life Tree level and progress toward the next level.
 * At max level (30) shows a "Max level" badge instead of progress bar.
 * Animates with an idle pulse on the container and a ring pop when a new
 * meditation is earned.
 */
export function LifeTree({
	level,
	meditationCount,
}: LifeTreeProps): React.ReactElement {
	const isMaxLevel = level >= LIFE_TREE_CAP;

	// Meditations within the current level window (0–4 out of 5).
	const meditationsIntoCurrentLevel = meditationCount % LIFE_TREE_MEDITATION_PER_LEVEL;
	const progressFraction = isMaxLevel
		? 1
		: meditationsIntoCurrentLevel / LIFE_TREE_MEDITATION_PER_LEVEL;

	// Number of "growth rings" to render (filled vs unfilled).
	const rings = Array.from(
		{ length: LIFE_TREE_MEDITATION_PER_LEVEL },
		(_, i) => i,
	);

	// ---------------------------------------------------------------------------
	// Idle pulse animation on container
	// ---------------------------------------------------------------------------

	const pulseAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		const pulse = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.02,
					duration: 2000,
					useNativeDriver: true,
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 2000,
					useNativeDriver: true,
				}),
			]),
		);
		pulse.start();
		return () => pulse.stop();
	}, [pulseAnim]);

	// ---------------------------------------------------------------------------
	// Ring pop animation on new meditation
	// ---------------------------------------------------------------------------

	// One Animated.Value per ring slot.
	const ringScales = useRef<Animated.Value[]>(
		Array.from(
			{ length: LIFE_TREE_MEDITATION_PER_LEVEL },
			() => new Animated.Value(1),
		),
	).current;

	// Track previous meditation count to detect increment.
	const prevMeditationCount = useRef<number>(meditationCount);

	useEffect(() => {
		if (meditationCount > prevMeditationCount.current) {
			// The newly-filled ring index within the current level window.
			// meditationsIntoCurrentLevel is already updated after increment.
			const newlyFilledIndex = meditationsIntoCurrentLevel - 1;
			// Guard: only animate a valid ring index.
			if (
				newlyFilledIndex >= 0 &&
				newlyFilledIndex < LIFE_TREE_MEDITATION_PER_LEVEL
			) {
				const scale = ringScales[newlyFilledIndex];
				if (scale !== undefined) {
					Animated.sequence([
						Animated.spring(scale, {
							toValue: 1.3,
							useNativeDriver: true,
							speed: 40,
							bounciness: 6,
						}),
						Animated.spring(scale, {
							toValue: 1,
							useNativeDriver: true,
							speed: 40,
							bounciness: 6,
						}),
					]).start();
				}
			}
		}
		prevMeditationCount.current = meditationCount;
	}, [meditationCount, meditationsIntoCurrentLevel, ringScales]);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
			<Surface style={styles.container} elevation={2}>
				{/* Title */}
				<Text variant="titleMedium" style={styles.title}>
					Your Life Tree
				</Text>

				{/* Level header */}
				<View style={styles.headerRow}>
					<View>
						<Text variant="labelMedium" style={styles.label}>
							Level
						</Text>
						<Text variant="displayMedium" style={styles.levelNumber}>
							{level}
						</Text>
						<Text variant="bodySmall" style={styles.sublabel}>
							{isMaxLevel
								? "Maximum level reached"
								: `Level ${level} of ${LIFE_TREE_CAP}`}
						</Text>
					</View>

					{/* Growth ring indicators */}
					<View style={styles.ringsContainer}>
						{rings.map((i) => (
							<Animated.View
								key={i}
								style={[
									styles.ring,
									i < meditationsIntoCurrentLevel
										? styles.ringFilled
										: styles.ringEmpty,
									{
										transform: [
											{ scale: ringScales[i] ?? new Animated.Value(1) },
										],
									},
								]}
							/>
						))}
						<Text variant="labelSmall" style={styles.ringsLabel}>
							{isMaxLevel
								? "Max"
								: `${meditationsIntoCurrentLevel} / ${LIFE_TREE_MEDITATION_PER_LEVEL}`}
						</Text>
					</View>
				</View>

				{/* Progress bar toward next level */}
				<View style={styles.progressSection}>
					<ProgressBar
						progress={progressFraction}
						color={isMaxLevel ? colors.success : colors.primary}
						style={styles.progressBar}
					/>
					{!isMaxLevel && (
						<Text variant="labelSmall" style={styles.progressLabel}>
							{LIFE_TREE_MEDITATION_PER_LEVEL - meditationsIntoCurrentLevel} more to
							Level {level + 1}
						</Text>
					)}
					{isMaxLevel && (
						<View style={styles.maxBadge}>
							<Text variant="labelSmall" style={styles.maxBadgeText}>
								Max Level
							</Text>
						</View>
					)}
				</View>
			</Surface>
		</Animated.View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	container: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		padding: 28,
		borderWidth: 1,
		borderColor: colors.border,
	},
	title: {
		color: colors.text,
		fontWeight: "700",
		marginBottom: 12,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	label: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 1.2,
		marginBottom: 4,
	},
	levelNumber: {
		color: colors.primary,
		fontWeight: "700",
		lineHeight: 64,
	},
	sublabel: {
		color: colors.muted,
		marginTop: 2,
	},
	ringsContainer: {
		alignItems: "flex-end",
		gap: 4,
	},
	ring: {
		width: 12,
		height: 12,
		borderRadius: 6,
		marginBottom: 3,
	},
	ringFilled: {
		backgroundColor: colors.primary,
	},
	ringEmpty: {
		backgroundColor: colors.border,
	},
	ringsLabel: {
		color: colors.muted,
		marginTop: 4,
	},
	progressSection: {
		gap: 8,
	},
	progressBar: {
		height: 8,
		borderRadius: 4,
		backgroundColor: colors.border,
	},
	progressLabel: {
		color: colors.muted,
		textAlign: "right",
	},
	maxBadge: {
		alignSelf: "flex-end",
		backgroundColor: colors.success,
		paddingHorizontal: 10,
		paddingVertical: 3,
		borderRadius: 8,
	},
	maxBadgeText: {
		color: "#0B1220",
		fontWeight: "700",
	},
});
