// BreathingExercise — animated breathing guide component.
// Delegates the animated circle to BreathingCircle (reanimated + haptics).
// No emojis. TypeScript strict mode.

import {
	BREATHING_EXHALE,
	BREATHING_HOLD,
	BREATHING_INHALE,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import type React from "react";
import { type AccessibilityRole, StyleSheet, View } from "react-native";
import { Text } from "react-native-paper";
import { BreathingCircle, type BreathingPhase } from "./BreathingCircle";

// ---------------------------------------------------------------------------
// Phase calculation
// ---------------------------------------------------------------------------

const CYCLE_DURATION = BREATHING_INHALE + BREATHING_HOLD + BREATHING_EXHALE; // 12s

/**
 * Derives the current breathing phase and time remaining in that phase
 * from the total elapsed time within one cycle.
 */
function getPhase(
	timeLeft: number,
	totalDuration: number,
): {
	phase: BreathingPhase;
	phaseTimeLeft: number;
} {
	const elapsed = totalDuration - timeLeft;
	const positionInCycle = elapsed % CYCLE_DURATION;

	if (positionInCycle < BREATHING_INHALE) {
		return {
			phase: "Inhale",
			phaseTimeLeft: BREATHING_INHALE - positionInCycle,
		};
	}

	if (positionInCycle < BREATHING_INHALE + BREATHING_HOLD) {
		return {
			phase: "Hold",
			phaseTimeLeft: BREATHING_INHALE + BREATHING_HOLD - positionInCycle,
		};
	}

	return {
		phase: "Exhale",
		phaseTimeLeft: CYCLE_DURATION - positionInCycle,
	};
}

// ---------------------------------------------------------------------------
// Phase display config
// ---------------------------------------------------------------------------

const PHASE_CONFIG: Record<
	BreathingPhase,
	{ color: string; instruction: string }
> = {
	Inhale: { color: colors.primary, instruction: "breathe in slowly" },
	Hold: { color: colors.secondary, instruction: "hold gently" },
	Exhale: { color: colors.success, instruction: "release slowly" },
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BreathingExerciseProps {
	/** Seconds remaining in the overall session. */
	timeLeft: number;
	/** Total session duration in seconds (used to derive elapsed time). */
	totalDuration: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Shows current breathing phase with an animated circle (via BreathingCircle)
 * and a countdown timer. Haptic feedback is triggered inside BreathingCircle.
 *
 * Cycle: 4s Inhale -> 2s Hold -> 6s Exhale -> repeat
 */
export function BreathingExercise({
	timeLeft,
	totalDuration,
}: BreathingExerciseProps): React.ReactElement {
	const { phase, phaseTimeLeft } = getPhase(timeLeft, totalDuration);
	const config = PHASE_CONFIG[phase];

	const minutes = Math.floor(timeLeft / 60);
	const seconds = timeLeft % 60;
	const timerDisplay =
		minutes > 0
			? `${minutes}:${String(seconds).padStart(2, "0")}`
			: `${seconds}s`;

	return (
		<View style={styles.container}>
			{/* Animated circle with haptics */}
			<BreathingCircle phase={phase} phaseTimeLeft={phaseTimeLeft} />

			{/* Phase label — accessibilityLiveRegion announces phase transitions to screen readers */}
			<Text
				variant="displaySmall"
				style={[styles.phaseText, { color: config.color }]}
				accessibilityLiveRegion="polite"
				accessibilityLabel={`${phase} — ${config.instruction}`}
				accessibilityRole={"text" as AccessibilityRole}
			>
				{phase}
			</Text>
			<Text variant="bodyMedium" style={styles.instructionText}>
				{config.instruction}
			</Text>

			{/* Overall timer */}
			<View style={styles.timerContainer}>
				<Text variant="labelMedium" style={styles.timerLabel}>
					Session remaining
				</Text>
				<Text variant="headlineMedium" style={styles.timerText}>
					{timerDisplay}
				</Text>
			</View>

			{/* Cycle guide */}
			<View style={styles.cycleGuide}>
				<CycleStep
					label="Inhale"
					duration={BREATHING_INHALE}
					active={phase === "Inhale"}
				/>
				<View style={styles.cycleDivider} />
				<CycleStep
					label="Hold"
					duration={BREATHING_HOLD}
					active={phase === "Hold"}
				/>
				<View style={styles.cycleDivider} />
				<CycleStep
					label="Exhale"
					duration={BREATHING_EXHALE}
					active={phase === "Exhale"}
				/>
			</View>
		</View>
	);
}

// ---------------------------------------------------------------------------
// CycleStep sub-component
// ---------------------------------------------------------------------------

interface CycleStepProps {
	label: string;
	duration: number;
	active: boolean;
}

function CycleStep({
	label,
	duration,
	active,
}: CycleStepProps): React.ReactElement {
	return (
		<View style={styles.cycleStep}>
			<Text
				variant="labelMedium"
				style={[styles.cycleStepLabel, active && styles.cycleStepLabelActive]}
			>
				{label}
			</Text>
			<Text
				variant="labelSmall"
				style={[
					styles.cycleStepDuration,
					active && styles.cycleStepDurationActive,
				]}
			>
				{duration}s
			</Text>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	container: {
		alignItems: "center",
		paddingVertical: 24,
		gap: 12,
	},
	phaseText: {
		fontWeight: "700",
		letterSpacing: 1,
	},
	instructionText: {
		color: colors.muted,
		fontStyle: "italic",
	},
	timerContainer: {
		alignItems: "center",
		marginTop: 8,
		gap: 2,
	},
	timerLabel: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	timerText: {
		color: colors.text,
		fontWeight: "600",
	},
	cycleGuide: {
		flexDirection: "row",
		alignItems: "center",
		marginTop: 16,
		paddingHorizontal: 24,
		gap: 8,
	},
	cycleDivider: {
		width: 24,
		height: 1,
		backgroundColor: colors.border,
	},
	cycleStep: {
		alignItems: "center",
		gap: 2,
	},
	cycleStepLabel: {
		color: colors.muted,
	},
	cycleStepLabelActive: {
		color: colors.text,
		fontWeight: "700",
	},
	cycleStepDuration: {
		color: colors.border,
	},
	cycleStepDurationActive: {
		color: colors.muted,
	},
});
