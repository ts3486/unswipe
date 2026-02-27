// BreathingCircle — animated expanding/contracting circle for breathing guide.
// Uses react-native-reanimated for smooth animation.
// Respects prefers-reduced-motion via useReducedMotion hook.
// No emojis. TypeScript strict mode.

import {
	BREATHING_EXHALE,
	BREATHING_HOLD,
	BREATHING_INHALE,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import * as Haptics from "expo-haptics";
import type React from "react";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
	useReducedMotion,
	cancelAnimation,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BreathingPhase = "Inhale" | "Hold" | "Exhale";

interface BreathingCircleProps {
	/** Current breathing phase. */
	phase: BreathingPhase;
	/** Seconds remaining in the current phase (for text countdown). */
	phaseTimeLeft: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CIRCLE_MIN_SIZE = 140;
const CIRCLE_MAX_SIZE = 220;
const CIRCLE_MIN_RADIUS = CIRCLE_MIN_SIZE / 2;
const CIRCLE_MAX_RADIUS = CIRCLE_MAX_SIZE / 2;

const PHASE_DURATION_MS: Record<BreathingPhase, number> = {
	Inhale: BREATHING_INHALE * 1000,
	Hold: BREATHING_HOLD * 1000,
	Exhale: BREATHING_EXHALE * 1000,
};

// Target size as a fraction of max size (0..1), used to interpolate styles.
const PHASE_TARGET_SCALE: Record<BreathingPhase, number> = {
	Inhale: 1, // expand to max
	Hold: 1, // stay at max
	Exhale: 0, // contract back to min
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Animated breathing circle that expands on inhale and contracts on exhale.
 *
 * When the system has prefers-reduced-motion enabled, the circle is replaced
 * with a text-based countdown so the experience remains accessible without
 * any motion.
 */
export function BreathingCircle({
	phase,
	phaseTimeLeft,
}: BreathingCircleProps): React.ReactElement {
	const reducedMotion = useReducedMotion();

	// Shared value: 0 = min size, 1 = max size
	const progress = useSharedValue(phase === "Exhale" ? 0 : 1);

	// biome-ignore lint/correctness/useExhaustiveDependencies: progress is a stable reanimated shared value; adding it to deps would cause an infinite loop
	useEffect(() => {
		if (reducedMotion) return;

		const targetScale = PHASE_TARGET_SCALE[phase];
		const duration = PHASE_DURATION_MS[phase];

		// Trigger haptic on inhale start and exhale start.
		if (phase === "Inhale" || phase === "Exhale") {
			void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
				// Haptics may not be available on all devices — ignore silently.
			});
		}

		// For hold, cancel any running animation and stay at current value.
		if (phase === "Hold") {
			cancelAnimation(progress);
			return;
		}

		progress.value = withTiming(targetScale, {
			duration,
			easing:
				phase === "Inhale" ? Easing.out(Easing.ease) : Easing.in(Easing.ease),
		});
	}, [phase, reducedMotion]);

	// Outer ring animated style
	const outerRingStyle = useAnimatedStyle(() => {
		const size =
			CIRCLE_MIN_SIZE + (CIRCLE_MAX_SIZE - CIRCLE_MIN_SIZE) * progress.value;
		const radius = size / 2;
		const opacity = 0.55 + 0.45 * progress.value;
		return {
			width: size,
			height: size,
			borderRadius: radius,
			opacity,
		};
	});

	// Inner circle animated style (slightly smaller, filled)
	const innerCircleStyle = useAnimatedStyle(() => {
		const outerSize =
			CIRCLE_MIN_SIZE + (CIRCLE_MAX_SIZE - CIRCLE_MIN_SIZE) * progress.value;
		const innerSize = outerSize * 0.82;
		const radius = innerSize / 2;
		const opacity = 0.12 + 0.18 * progress.value;
		return {
			width: innerSize,
			height: innerSize,
			borderRadius: radius,
			opacity,
		};
	});

	// Phase-dependent color
	const phaseColor =
		phase === "Inhale"
			? colors.primary
			: phase === "Hold"
				? colors.secondary
				: colors.success;

	if (reducedMotion) {
		return (
			<View style={styles.reducedMotionContainer}>
				<View style={[styles.reducedMotionCircle, { borderColor: phaseColor }]}>
					<Text
						variant="displaySmall"
						style={[styles.reducedMotionCountdown, { color: phaseColor }]}
					>
						{Math.ceil(phaseTimeLeft)}
					</Text>
					<Text variant="labelSmall" style={styles.reducedMotionUnit}>
						sec
					</Text>
				</View>
			</View>
		);
	}

	return (
		<View style={styles.circleWrapper}>
			{/* Outer ring */}
			<Animated.View
				style={[styles.outerRing, outerRingStyle, { borderColor: phaseColor }]}
			/>
			{/* Inner filled circle */}
			<Animated.View
				style={[
					styles.innerCircle,
					innerCircleStyle,
					{ backgroundColor: phaseColor },
				]}
			/>
			{/* Centred countdown */}
			<View style={styles.countdownContainer}>
				<Text
					variant="headlineMedium"
					style={[styles.countdownText, { color: phaseColor }]}
				>
					{Math.ceil(phaseTimeLeft)}
				</Text>
			</View>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	circleWrapper: {
		width: CIRCLE_MAX_SIZE + 24, // extra room so outer ring never clips
		height: CIRCLE_MAX_SIZE + 24,
		alignItems: "center",
		justifyContent: "center",
	},
	outerRing: {
		position: "absolute",
		borderWidth: 2,
	},
	innerCircle: {
		position: "absolute",
	},
	countdownContainer: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
	},
	countdownText: {
		fontWeight: "700",
	},
	// Reduced-motion fallback
	reducedMotionContainer: {
		width: CIRCLE_MAX_SIZE + 24,
		height: CIRCLE_MAX_SIZE + 24,
		alignItems: "center",
		justifyContent: "center",
	},
	reducedMotionCircle: {
		width: CIRCLE_MIN_SIZE + (CIRCLE_MAX_SIZE - CIRCLE_MIN_SIZE) / 2,
		height: CIRCLE_MIN_SIZE + (CIRCLE_MAX_SIZE - CIRCLE_MIN_SIZE) / 2,
		borderRadius: (CIRCLE_MIN_RADIUS + CIRCLE_MAX_RADIUS) / 2,
		borderWidth: 2,
		alignItems: "center",
		justifyContent: "center",
		gap: 4,
	},
	reducedMotionCountdown: {
		fontWeight: "700",
	},
	reducedMotionUnit: {
		color: colors.muted,
	},
});
