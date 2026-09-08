// Home tab screen — breathing exercise with daily check-in footer.
// TypeScript strict mode.

import { BreathingExercise } from "@/src/components/BreathingExercise";
import { Logo } from "@/src/components/Logo";

import { BREATHING_DURATION_SECONDS } from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useCheckin } from "@/src/hooks/useCheckin";
import { useDismissedTips } from "@/src/hooks/useDismissedTips";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Chip, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Guide overlay — centered modal with step indicator
// ---------------------------------------------------------------------------

function GuideOverlay({
	visible,
	step,
	totalSteps,
	title,
	text,
	onNext,
}: {
	visible: boolean;
	step: number;
	totalSteps: number;
	title: string;
	text: string;
	onNext: () => void;
}): React.ReactElement | null {
	const { t } = useTranslation();
	const anim = useRef(new Animated.Value(0)).current;
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		if (visible) {
			setMounted(true);
			Animated.spring(anim, {
				toValue: 1,
				useNativeDriver: true,
				tension: 50,
				friction: 9,
			}).start();
		} else if (mounted) {
			Animated.timing(anim, {
				toValue: 0,
				duration: 200,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) setMounted(false);
			});
		}
	}, [visible, anim, mounted]);

	if (!mounted) return null;

	const scale = anim.interpolate({
		inputRange: [0, 1],
		outputRange: [0.95, 1],
	});

	const isLast = step === totalSteps - 1;

	return (
		<View style={styles.overlayBackdrop} pointerEvents="box-none">
			<Animated.View
				style={[
					styles.overlayCard,
					{ opacity: anim, transform: [{ scale }] },
				]}
			>
				<MaterialCommunityIcons
					name="information-outline"
					size={24}
					color={colors.primary}
				/>
				<Text variant="titleSmall" style={styles.overlayTitle}>
					{title}
				</Text>
				<Text variant="bodyMedium" style={styles.overlayText}>
					{text}
				</Text>

				{/* Step dots */}
				<View style={styles.stepDots}>
					{Array.from({ length: totalSteps }, (_, i) => (
						<View
							key={i}
							style={[
								styles.dot,
								i === step ? styles.dotActive : styles.dotInactive,
							]}
						/>
					))}
				</View>

				<TouchableOpacity
					onPress={onNext}
					style={styles.overlayButton}
					activeOpacity={0.7}
					accessibilityLabel={isLast ? t("home.guide.gotIt") : t("home.guide.next")}
				>
					<Text variant="labelMedium" style={styles.overlayButtonText}>
						{isLast ? t("home.guide.gotIt") : t("home.guide.next")}
					</Text>
				</TouchableOpacity>
			</Animated.View>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function HomeScreen(): React.ReactElement {
	const { t } = useTranslation();
	const { todaySuccess, isLoading } = useAppState();

	const checkin = useCheckin();
	const tips = useDismissedTips();

	useFocusEffect(
		useCallback(() => {
			void checkin.loadExisting();
		}, [checkin.loadExisting]),
	);

	const GUIDE_STEPS = useMemo(
		() =>
			[
				{
					title: t("home.guide.breathing.title"),
					text: t("home.guide.breathing.text"),
				},
				{
					title: t("home.guide.checkin.title"),
					text: t("home.guide.checkin.text"),
				},
			] as const,
		[t],
	);

	// Guide state: which step we're on, or null if not showing
	const [guideStep, setGuideStep] = useState<number | null>(null);

	// Auto-show guide on first visit (when tips haven't been dismissed yet)
	const autoShownRef = useRef(false);
	useEffect(() => {
		if (
			tips.isLoaded &&
			!autoShownRef.current &&
			!tips.dismissed.has("tip_guide_complete")
		) {
			autoShownRef.current = true;
			setGuideStep(0);
		}
	}, [tips.isLoaded, tips.dismissed]);

	const handleNextStep = useCallback(() => {
		setGuideStep((prev) => {
			if (prev === null) return null;
			if (prev >= GUIDE_STEPS.length - 1) {
				// Last step — mark guide as done
				tips.dismiss("tip_guide_complete");
				return null;
			}
			return prev + 1;
		});
	}, [tips, GUIDE_STEPS.length]);

	const handleShowGuide = useCallback(() => {
		setGuideStep(0);
	}, []);

	// ---------------------------------------------------------------------------
	// Breathing timer — always running, loops continuously
	// ---------------------------------------------------------------------------

	const [breathingTimeLeft, setBreathingTimeLeft] = useState<number>(
		BREATHING_DURATION_SECONDS,
	);
	const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(
		BREATHING_DURATION_SECONDS,
	);
	const [sessionComplete, setSessionComplete] = useState(false);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		const id = setInterval(() => {
			setBreathingTimeLeft((prev) => {
				if (prev <= 1) {
					return BREATHING_DURATION_SECONDS;
				}
				return prev - 1;
			});
			setSessionTimeLeft((prev) => {
				if (prev <= 1) {
					setSessionComplete(true);
					return 0;
				}
				return prev - 1;
			});
		}, 1_000);
		timerRef.current = id;

		return () => {
			clearInterval(id);
			timerRef.current = null;
		};
	}, []);

	const handleRestartSession = useCallback(() => {
		setSessionTimeLeft(BREATHING_DURATION_SECONDS);
		setSessionComplete(false);
	}, []);

	// ---------------------------------------------------------------------------
	// Loading state
	// ---------------------------------------------------------------------------

	if (isLoading) {
		return (
			<View style={styles.loadingContainer}>
				<Text variant="bodyMedium" style={styles.loadingText}>
					{t("common.loading")}
				</Text>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	const currentStep = guideStep !== null ? GUIDE_STEPS[guideStep] : null;

	return (
		<View style={styles.root}>
			<View style={styles.content}>
				{/* Header */}
				<View style={styles.headerRow}>
					<Logo markSize={28} layout="horizontal" />
					<View style={styles.headerRight}>
						<TouchableOpacity
							onPress={handleShowGuide}
							hitSlop={8}
							accessibilityLabel={t("home.showGuideA11y")}
							style={styles.helpButton}
						>
							<MaterialCommunityIcons
								name="help-circle-outline"
								size={22}
								color={colors.muted}
							/>
						</TouchableOpacity>
						{todaySuccess && (
							<Chip
								compact
								style={styles.successChip}
								textStyle={styles.successChipText}
							>
								{t("home.todayDone")}
							</Chip>
						)}
					</View>
				</View>

				{/* Breathing exercise — always visible */}
				<View style={styles.breathingArea}>
					<BreathingExercise
						timeLeft={breathingTimeLeft}
						totalDuration={BREATHING_DURATION_SECONDS}
						sessionTimeLeft={sessionTimeLeft}
						sessionComplete={sessionComplete}
						onRestart={handleRestartSession}
					/>
				</View>
			</View>

			{/* Sticky bottom: Daily check-in CTA */}
			<View style={styles.stickyBottom}>
				{checkin.isComplete ? (
					<TouchableOpacity
						onPress={() => router.push("/checkin")}
						activeOpacity={0.7}
						style={styles.checkinDoneRow}
					>
						<MaterialCommunityIcons
							name="check-circle"
							size={20}
							color={colors.success}
						/>
						<Text variant="titleSmall" style={styles.checkinDoneText}>
							{t("home.checkinDone")}
						</Text>
						<MaterialCommunityIcons
							name="chevron-right"
							size={18}
							color={colors.muted}
						/>
					</TouchableOpacity>
				) : (
					<Button
						mode="contained"
						onPress={() => router.push("/checkin")}
						style={styles.checkinButton}
						contentStyle={styles.checkinButtonContent}
						labelStyle={styles.checkinButtonLabel}
						accessibilityLabel={t("home.dailyCheckinA11y")}
						accessibilityHint={t("home.dailyCheckinHint")}
					>
						{t("home.dailyCheckin")}
					</Button>
				)}
			</View>

			{/* Guide overlay */}
			{currentStep != null && (
				<GuideOverlay
					visible={guideStep !== null}
					step={guideStep ?? 0}
					totalSteps={GUIDE_STEPS.length}
					title={currentStep.title}
					text={currentStep.text}
					onNext={handleNextStep}
				/>
			)}
		</View>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	loadingContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: colors.background,
	},
	loadingText: {
		color: colors.muted,
	},
	content: {
		flex: 1,
		paddingHorizontal: 16,
		paddingTop: 56,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 4,
	},
	headerRight: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	helpButton: {
		padding: 2,
	},
	successChip: {
		backgroundColor: "#1A3D2E",
		borderColor: colors.success,
		borderWidth: 1,
	},
	successChipText: {
		color: colors.success,
		fontSize: 12,
	},
	breathingArea: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	stickyBottom: {
		backgroundColor: colors.background,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: 24,
		borderTopWidth: 1,
		borderTopColor: colors.border,
	},
	checkinButton: {
		borderRadius: 14,
		borderColor: colors.primary,
		backgroundColor: colors.primary,
	},
	checkinButtonContent: {
		paddingVertical: 8,
	},
	checkinButtonLabel: {
		fontSize: 16,
		fontWeight: "600",
		letterSpacing: 0.3,
		color: "#FFFFFF",
	},
	checkinDoneRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 8,
		paddingVertical: 12,
	},
	checkinDoneText: {
		color: colors.success,
		fontWeight: "600",
	},
	// Overlay
	overlayBackdrop: {
		...StyleSheet.absoluteFillObject,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "rgba(0,0,0,0.5)",
		paddingHorizontal: 28,
		zIndex: 100,
	},
	overlayCard: {
		backgroundColor: colors.surface,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 24,
		alignItems: "center",
		gap: 12,
		width: "100%",
		maxWidth: 340,
	},
	overlayTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	overlayText: {
		color: colors.muted,
		lineHeight: 22,
		textAlign: "center",
	},
	stepDots: {
		flexDirection: "row",
		gap: 8,
		marginTop: 4,
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4,
	},
	dotActive: {
		backgroundColor: colors.primary,
	},
	dotInactive: {
		backgroundColor: colors.border,
	},
	overlayButton: {
		backgroundColor: colors.primary,
		borderRadius: 12,
		paddingVertical: 10,
		paddingHorizontal: 32,
		marginTop: 4,
	},
	overlayButtonText: {
		color: "#FFFFFF",
		fontWeight: "600",
	},
});
