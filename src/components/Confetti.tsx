// Confetti — lightweight one-time particle burst animation.
// Triggered once on mount; does not loop.
// Automatically disabled when prefers-reduced-motion is active.
// No emojis. TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import type React from "react";
import { useEffect, useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	withDelay,
	Easing,
	useReducedMotion,
} from "react-native-reanimated";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 24;
const CONFETTI_DURATION_MS = 1200;
const PARTICLE_COLORS = [
	colors.primary,
	colors.secondary,
	colors.success,
	colors.warning,
	"#FF7BA9", // soft pink accent
	"#A78BFA", // soft purple accent
];

// Each particle has a fixed random spread direction computed at mount time.
interface ParticleConfig {
	id: number;
	color: string;
	angle: number; // degrees (0–360)
	distance: number; // px from center
	delay: number; // ms stagger
	size: number; // width/height of the dot
}

function randomBetween(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function buildParticles(): ParticleConfig[] {
	return Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
		id: i,
		color: PARTICLE_COLORS[i % PARTICLE_COLORS.length] ?? colors.primary,
		angle: randomBetween(0, 360),
		distance: randomBetween(60, 160),
		delay: randomBetween(0, 200),
		size: randomBetween(6, 12),
	}));
}

// ---------------------------------------------------------------------------
// SingleParticle
// ---------------------------------------------------------------------------

interface SingleParticleProps {
	config: ParticleConfig;
}

function SingleParticle({ config }: SingleParticleProps): React.ReactElement {
	const opacity = useSharedValue(1);
	const tx = useSharedValue(0);
	const ty = useSharedValue(0);

	// biome-ignore lint/correctness/useExhaustiveDependencies: intentional run-once mount effect; config/shared-values are stable for the lifetime of this particle
	useEffect(() => {
		const radians = (config.angle * Math.PI) / 180;
		const targetX = Math.cos(radians) * config.distance;
		const targetY = Math.sin(radians) * config.distance - 40; // slight upward bias

		const timingConfig = {
			duration: CONFETTI_DURATION_MS,
			easing: Easing.out(Easing.cubic),
		};

		tx.value = withDelay(config.delay, withTiming(targetX, timingConfig));
		ty.value = withDelay(config.delay, withTiming(targetY, timingConfig));
		opacity.value = withDelay(
			config.delay + CONFETTI_DURATION_MS * 0.5,
			withTiming(0, {
				duration: CONFETTI_DURATION_MS * 0.5,
				easing: Easing.in(Easing.ease),
			}),
		);
	}, []);

	const animStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ translateX: tx.value }, { translateY: ty.value }],
	}));

	return (
		<Animated.View
			style={[
				styles.particle,
				animStyle,
				{
					width: config.size,
					height: config.size,
					borderRadius: config.size / 2,
					backgroundColor: config.color,
				},
			]}
		/>
	);
}

// ---------------------------------------------------------------------------
// Confetti component
// ---------------------------------------------------------------------------

interface ConfettiProps {
	/** When false the component renders nothing (use for conditional display). */
	active?: boolean;
}

/**
 * Renders a one-time particle burst originating from a center point.
 * Call it once; it animates and fades out automatically.
 * Renders nothing when prefers-reduced-motion is active.
 */
export function Confetti({
	active = true,
}: ConfettiProps): React.ReactElement | null {
	const reducedMotion = useReducedMotion();

	// Memoise particle config so it doesn't regenerate on re-render.
	const particles = useMemo(() => buildParticles(), []);

	if (!active || reducedMotion) {
		return null;
	}

	return (
		<View style={styles.container} pointerEvents="none">
			{particles.map((p) => (
				<SingleParticle key={p.id} config={p} />
			))}
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	container: {
		position: "absolute",
		alignItems: "center",
		justifyContent: "center",
		// Fill entire parent so particles can fly in any direction.
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
	},
	particle: {
		position: "absolute",
	},
});
