// Onboarding screen — streamlined 4-step flow.
// Steps: Welcome → Personalize (goal) → Features (value props) → Ready.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import type { GoalType } from "@/src/domain/types";
import { requestPermissions } from "@/src/services/notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Button, Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "welcome" | "personalize" | "features" | "ready";

interface GoalOption {
	id: GoalType;
	label: string;
	description: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: Step[] = ["welcome", "personalize", "features", "ready"];

const GOAL_OPTIONS: GoalOption[] = [
	{
		id: "reduce_swipe",
		label: "Reduce swiping",
		description: "Spend less time swiping through profiles.",
	},
	{
		id: "reduce_open",
		label: "Open apps less",
		description: "Limit how often you open dating apps.",
	},
	{
		id: "reduce_night_check",
		label: "Stop late-night checking",
		description: "Avoid checking apps before bed.",
	},
	{
		id: "reduce_spend",
		label: "Spend less",
		description: "Reduce in-app spending and related costs.",
	},
];

const GOAL_AFFIRMATIONS: Record<GoalType, string> = {
	reduce_swipe: "Less swiping, more living",
	reduce_open: "Less checking, more living.",
	reduce_night_check: "Choose other activities before bed.",
	reduce_spend: "Save money for things that truly matter.",
};

interface FeatureShowcase {
	icon: string;
	title: string;
	description: string;
	color: string;
}

const FEATURE_SHOWCASES: FeatureShowcase[] = [
	{
		icon: "meditation",
		title: "Guided exercises",
		description:
			"When the urge hits, a 60-second breathing session helps you ride it out — no willpower needed.",
		color: colors.primary,
	},
	{
		icon: "bell-ring-outline",
		title: "Smart reminders",
		description:
			"Timely nudges in the evening, streak alerts, and weekly summaries keep you on track without being annoying.",
		color: colors.warning,
	},
	{
		icon: "chart-timeline-variant",
		title: "Progress you can see",
		description:
			"Track your streaks, see which days you resisted, and watch your Resist Rank climb as you build the habit.",
		color: colors.success,
	},
	{
		icon: "book-open-page-variant-outline",
		title: "7-day starter course",
		description:
			"Short daily lessons on the psychology behind dating app habits — understand your patterns to change them.",
		color: colors.secondary,
	},
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProgressDotsProps {
	steps: Step[];
	current: Step;
}

function ProgressDots({
	steps,
	current,
}: ProgressDotsProps): React.ReactElement {
	const currentIdx = steps.indexOf(current);
	return (
		<View
			style={styles.progressRow}
			accessibilityLabel={`Step ${currentIdx + 1} of ${steps.length}`}
		>
			{steps.map((s, i) => (
				<View
					key={s}
					style={[
						styles.progressDot,
						i === currentIdx && styles.progressDotActive,
						i < currentIdx && styles.progressDotDone,
					]}
				/>
			))}
		</View>
	);
}

function BackButton({ onPress }: { onPress: () => void }): React.ReactElement {
	return (
		<View style={styles.backButtonRow}>
			<Button
				mode="text"
				onPress={onPress}
				icon="chevron-left"
				textColor={colors.muted}
				style={styles.backButton}
				compact
				accessibilityLabel="Go back"
				testID="back-button"
			>
				Back
			</Button>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingScreen(): React.ReactElement {
	const { completeOnboarding } = useAppState();
	const analytics = useAnalytics();

	// Step state
	const [step, setStep] = useState<Step>("welcome");

	// Personalize state
	const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);

	// Submission state
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// ---------------------------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------------------------

	const goBack = useCallback((): void => {
		if (step === "personalize") {
			setStep("welcome");
		} else if (step === "features") {
			setStep("personalize");
		} else if (step === "ready") {
			setStep("features");
		}
	}, [step]);

	// ---------------------------------------------------------------------------
	// Submit (called from Ready screen)
	// ---------------------------------------------------------------------------

	const handleStart = useCallback(async (): Promise<void> => {
		if (isSubmitting || selectedGoal === null) return;
		setIsSubmitting(true);

		try {
			await completeOnboarding({
				locale: "en",
				notification_style: "normal",
				plan_selected: "starter_7d",
				goal_type: selectedGoal,
				spending_budget_weekly: null,
				spending_budget_daily: null,
				spending_limit_mode: null,
			});

			analytics.track({
				name: "onboarding_completed",
				props: {
					goal_type: selectedGoal,
					trigger_count: 0,
					has_budget: false,
				},
			});

			// Request notification permissions (default is "normal")
			const granted = await requestPermissions();
			if (!granted) {
				Alert.alert(
					"Notifications Disabled",
					"You can enable notifications in your device settings.",
				);
			}

			router.replace("/paywall");
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, selectedGoal, completeOnboarding, analytics]);

	// ---------------------------------------------------------------------------
	// Step: Welcome
	// ---------------------------------------------------------------------------

	if (step === "welcome") {
		return (
			<View style={styles.root}>
				<View style={styles.welcomeSafeArea} />
				<View style={styles.centeredContent}>
					<Logo markSize={72} layout="vertical" wordmarkColor={colors.text} />
					<View style={styles.welcomeTextBlock}>
						<Text variant="displaySmall" style={styles.welcomeTitle}>
							Take a pause from dating
						</Text>
						<Text variant="bodyLarge" style={styles.welcomeSubtitle}>
							This app helps you pause from dating apps and be intentional about
							it — not remove them from your life, just put you back in control.
						</Text>
					</View>
				</View>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("personalize");
						}}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="welcome-get-started"
					>
						Get started
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: Personalize (Goal + Triggers + Course)
	// ---------------------------------------------------------------------------

	if (step === "personalize") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="personalize" />
				<BackButton onPress={goBack} />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					{/* Goal selection */}
					<Text variant="headlineMedium" style={styles.stepTitle}>
						What would feel like a win to you?
					</Text>
					<View style={styles.goalList}>
						{GOAL_OPTIONS.map((option) => (
							<Surface
								key={option.id}
								style={[
									styles.goalCard,
									selectedGoal === option.id && styles.goalCardSelected,
								]}
								elevation={selectedGoal === option.id ? 3 : 1}
							>
								<Button
									mode="text"
									onPress={() => {
										setSelectedGoal(option.id);
									}}
									style={styles.goalCardButton}
									contentStyle={styles.goalCardButtonContent}
									testID={`goal-${option.id}`}
								>
									<View style={styles.goalCardInner}>
										<Text
											variant="titleMedium"
											style={[
												styles.goalCardTitle,
												selectedGoal === option.id &&
													styles.goalCardTitleSelected,
											]}
										>
											{option.label}
										</Text>
										<Text variant="bodySmall" style={styles.goalCardDesc}>
											{option.description}
										</Text>
									</View>
								</Button>
							</Surface>
						))}
					</View>
					{selectedGoal !== null && (
						<Text variant="bodySmall" style={styles.goalAffirmation}>
							{GOAL_AFFIRMATIONS[selectedGoal]}
						</Text>
					)}
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("features");
						}}
						disabled={selectedGoal === null}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="personalize-continue"
					>
						Continue
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: Features (value proposition showcase)
	// ---------------------------------------------------------------------------

	if (step === "features") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="features" />
				<BackButton onPress={goBack} />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text variant="headlineMedium" style={styles.stepTitle}>
						Control your dating app urges with Unmatch
					</Text>
					<Text variant="bodyLarge" style={styles.featuresSubtitle}>
						Unmatch gives you real tools — not just advice.
					</Text>

					<View style={styles.featureCardList}>
						{FEATURE_SHOWCASES.map((feature) => (
							<Surface
								key={feature.title}
								style={styles.featureCard}
								elevation={1}
							>
								<View
									style={[
										styles.featureCardIcon,
										{ backgroundColor: `${feature.color}18` },
									]}
								>
									<MaterialCommunityIcons
										name={
											feature.icon as keyof typeof MaterialCommunityIcons.glyphMap
										}
										size={28}
										color={feature.color}
									/>
								</View>
								<View style={styles.featureCardText}>
									<Text variant="titleMedium" style={styles.featureCardTitle}>
										{feature.title}
									</Text>
									<Text variant="bodySmall" style={styles.featureCardDesc}>
										{feature.description}
									</Text>
								</View>
							</Surface>
						))}
					</View>
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("ready");
						}}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="features-continue"
					>
						Continue
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: Ready (personalized CTA)
	// ---------------------------------------------------------------------------

	if (step === "ready") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="ready" />
				<BackButton onPress={goBack} />
				<View style={styles.centeredContent}>
					<View style={styles.readyIconContainer}>
						<MaterialCommunityIcons
							name="rocket-launch-outline"
							size={64}
							color={colors.primary}
						/>
					</View>
					<Text variant="headlineMedium" style={styles.readyTitle}>
						You're all set.
					</Text>
					<Text variant="bodyLarge" style={styles.readyBody}>
						{selectedGoal !== null
							? GOAL_AFFIRMATIONS[selectedGoal]
							: "Small wins add up."}
					</Text>
					<Text variant="bodyMedium" style={styles.readyDetail}>
						Your 7-day starter course to reduce your dating app usage begins today. We'll send you a nudge each
						evening to keep you on track.
					</Text>
				</View>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							void handleStart();
						}}
						loading={isSubmitting}
						disabled={isSubmitting}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="ready-continue"
					>
						{isSubmitting ? "Setting up..." : "Start my pause"}
					</Button>
				</View>
			</View>
		);
	}

	// Fallback — should not be reached
	return <View style={styles.root} />;
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
	// Progress dots
	progressRow: {
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		gap: 6,
		paddingTop: Platform.OS === "ios" ? 56 : 36,
		paddingBottom: 8,
		paddingHorizontal: 20,
	},
	progressDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.border,
	},
	progressDotActive: {
		width: 20,
		backgroundColor: colors.primary,
		borderRadius: 3,
	},
	progressDotDone: {
		backgroundColor: colors.secondary,
	},
	// Back button
	backButtonRow: {
		paddingHorizontal: 8,
		paddingBottom: 4,
	},
	backButton: {
		alignSelf: "flex-start",
	},
	// Welcome
	welcomeSafeArea: {
		height: Platform.OS === "ios" ? 56 : 36,
	},
	centeredContent: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 28,
		gap: 16,
	},
	welcomeTextBlock: {
		alignItems: "center",
		gap: 12,
		marginTop: 32,
	},
	welcomeTitle: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
	},
	welcomeSubtitle: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 26,
	},
	// Scroll
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: 16,
		gap: 16,
	},
	stepTitle: {
		color: colors.text,
		fontWeight: "700",
		marginBottom: 4,
	},
	stepSubtitle: {
		color: colors.muted,
		marginBottom: 8,
		lineHeight: 22,
	},
	// Goal
	goalList: {
		gap: 12,
	},
	goalCard: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		overflow: "hidden",
	},
	goalCardSelected: {
		borderColor: colors.primary,
		backgroundColor: "#0F1D3A",
	},
	goalCardButton: {
		width: "100%",
		borderRadius: 14,
	},
	goalCardButtonContent: {
		justifyContent: "flex-start",
		paddingVertical: 8,
		paddingHorizontal: 4,
	},
	goalCardInner: {
		flex: 1,
		alignItems: "flex-start",
		gap: 4,
	},
	goalCardTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	goalCardTitleSelected: {
		color: colors.primary,
	},
	goalCardDesc: {
		color: colors.muted,
		lineHeight: 20,
		flexWrap: "wrap",
	},
	goalAffirmation: {
		color: colors.secondary,
		textAlign: "center",
		fontStyle: "italic",
		marginTop: 4,
	},
	// Features showcase
	featuresSubtitle: {
		color: colors.muted,
		lineHeight: 24,
		marginBottom: 4,
	},
	featureCardList: {
		gap: 12,
	},
	featureCard: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		flexDirection: "row",
		padding: 16,
		gap: 14,
		alignItems: "flex-start",
	},
	featureCardIcon: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	featureCardText: {
		flex: 1,
		gap: 4,
	},
	featureCardTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	featureCardDesc: {
		color: colors.muted,
		lineHeight: 20,
	},
	// Ready
	readyIconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "#0F1D3A",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	readyTitle: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
	},
	readyBody: {
		color: colors.secondary,
		textAlign: "center",
		fontSize: 18,
		fontStyle: "italic",
		lineHeight: 26,
	},
	readyDetail: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 24,
		paddingHorizontal: 8,
	},
	// Shared bottom actions
	bottomActions: {
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: Platform.OS === "ios" ? 36 : 24,
		gap: 8,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		backgroundColor: colors.background,
	},
	primaryButton: {
		borderRadius: 14,
	},
	primaryButtonContent: {
		paddingVertical: 8,
	},
	primaryButtonLabel: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
});
