// Onboarding screen — multi-step flow.
// Steps: Welcome, Goal, Triggers, Budget (conditional), Notifications, Demo Reset.
// TypeScript strict mode.

import { BreathingExercise } from "@/src/components/BreathingExercise";
import { Logo } from "@/src/components/Logo";
import {
	BREATHING_EXHALE,
	BREATHING_HOLD,
	BREATHING_INHALE,
} from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { getCatalog } from "@/src/data/seed-loader";
import type {
	GoalType,
	NotificationStyle,
	SpendingLimitMode,
} from "@/src/domain/types";
import { requestPermissions } from "@/src/services/notifications";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	Alert,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import {
	Button,
	Chip,
	SegmentedButtons,
	Surface,
	Text,
	TextInput,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step =
	| "welcome"
	| "goal"
	| "triggers"
	| "budget"
	| "notifications"
	| "demo";

// Sub-steps within the demo step
type DemoSubStep = "intro" | "breathing" | "action" | "nicework";

interface GoalOption {
	id: GoalType;
	label: string;
	description: string;
}

const GOAL_AFFIRMATIONS: Record<GoalType, string> = {
	reduce_swipe: "Small moments of stillness add up.",
	reduce_open: "Less checking, more living.",
	reduce_night_check: "Sleep is self-care.",
	reduce_spend: "Your wallet will thank you.",
};

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

// Ordered steps for the progress indicator. 'budget' is shown only when
// goal is reduce_spend, but we always include it in the ordered list so
// the dot count is stable after goal selection.
const ORDERED_STEPS: Step[] = [
	"welcome",
	"goal",
	"triggers",
	"notifications",
	"demo",
];
// budget is inserted between triggers and notifications when relevant
const ORDERED_STEPS_WITH_BUDGET: Step[] = [
	"welcome",
	"goal",
	"triggers",
	"budget",
	"notifications",
	"demo",
];

// Demo breathing duration — shorter than the full 60s for onboarding UX
const DEMO_BREATHING_SECONDS =
	BREATHING_INHALE + BREATHING_HOLD + BREATHING_EXHALE; // one full cycle = 12s

// ---------------------------------------------------------------------------
// Progress indicator
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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingScreen(): React.ReactElement {
	const { completeOnboarding } = useAppState();
	const analytics = useAnalytics();
	const catalog = getCatalog();

	const [step, setStep] = useState<Step>("welcome");
	const [demoSubStep, setDemoSubStep] = useState<DemoSubStep>("intro");
	const [demoTimeLeft, setDemoTimeLeft] = useState<number>(
		DEMO_BREATHING_SECONDS,
	);
	const demoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const [selectedGoal, setSelectedGoal] = useState<GoalType>("reduce_swipe");
	const [selectedTriggerIds, setSelectedTriggerIds] = useState<Set<string>>(
		new Set(),
	);
	const [budgetPeriod, setBudgetPeriod] = useState<"daily" | "weekly">(
		"weekly",
	);
	const [budgetAmount, setBudgetAmount] = useState<string>("");
	const [budgetMode, setBudgetMode] = useState<SpendingLimitMode>("soft");
	const [notificationStyle, setNotificationStyle] =
		useState<NotificationStyle>("normal");
	const [starterCourseEnabled, setStarterCourseEnabled] =
		useState<boolean>(true);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Derive ordered steps for progress indicator based on selected goal
	const orderedSteps =
		selectedGoal === "reduce_spend" ? ORDERED_STEPS_WITH_BUDGET : ORDERED_STEPS;

	// ---------------------------------------------------------------------------
	// Demo timer
	// ---------------------------------------------------------------------------

	const clearDemoTimer = useCallback((): void => {
		if (demoTimerRef.current !== null) {
			clearInterval(demoTimerRef.current);
			demoTimerRef.current = null;
		}
	}, []);

	// Clean up on unmount
	useEffect(() => {
		return () => {
			clearDemoTimer();
		};
	}, [clearDemoTimer]);

	const startDemoBreathing = useCallback((): void => {
		clearDemoTimer();
		setDemoTimeLeft(DEMO_BREATHING_SECONDS);
		setDemoSubStep("breathing");

		const id = setInterval(() => {
			setDemoTimeLeft((prev) => {
				const next = prev - 1;
				if (next <= 0) {
					clearInterval(id);
					demoTimerRef.current = null;
					setDemoSubStep("action");
					return 0;
				}
				return next;
			});
		}, 1_000);

		demoTimerRef.current = id;
	}, [clearDemoTimer]);

	const skipDemoBreathing = useCallback((): void => {
		clearDemoTimer();
		setDemoSubStep("action");
	}, [clearDemoTimer]);

	// ---------------------------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------------------------

	const goToGoal = useCallback((): void => {
		setStep("goal");
	}, []);
	const goToTriggers = useCallback((): void => {
		setStep("triggers");
	}, []);

	const goToBudgetOrNotifications = useCallback((): void => {
		if (selectedGoal === "reduce_spend") {
			setStep("budget");
		} else {
			setStep("notifications");
		}
	}, [selectedGoal]);

	const goToNotifications = useCallback((): void => {
		setStep("notifications");
	}, []);

	const goToDemo = useCallback((): void => {
		setDemoSubStep("intro");
		setDemoTimeLeft(DEMO_BREATHING_SECONDS);
		setStep("demo");
	}, []);

	// ---------------------------------------------------------------------------
	// Trigger toggle
	// ---------------------------------------------------------------------------

	const toggleTrigger = useCallback((triggerId: string): void => {
		setSelectedTriggerIds((prev) => {
			const next = new Set(prev);
			if (next.has(triggerId)) {
				next.delete(triggerId);
			} else {
				next.add(triggerId);
			}
			return next;
		});
	}, []);

	// ---------------------------------------------------------------------------
	// Submit (called after demo nice-work screen)
	// ---------------------------------------------------------------------------

	const handleStart = useCallback(async (): Promise<void> => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			const hasBudget =
				selectedGoal === "reduce_spend" && budgetAmount.trim().length > 0;
			const parsedAmount = hasBudget
				? Math.round(Number.parseFloat(budgetAmount) * 100)
				: null;

			await completeOnboarding({
				locale: "en",
				notification_style: notificationStyle,
				plan_selected: starterCourseEnabled ? "starter_7d" : "",
				goal_type: selectedGoal,
				spending_budget_weekly: budgetPeriod === "weekly" ? parsedAmount : null,
				spending_budget_daily: budgetPeriod === "daily" ? parsedAmount : null,
				spending_limit_mode: hasBudget ? budgetMode : null,
			});

			analytics.track({
				name: "onboarding_completed",
				props: {
					goal_type: selectedGoal,
					trigger_count: selectedTriggerIds.size,
					has_budget: hasBudget,
				},
			});

			// Request notification permission if not off
			if (notificationStyle !== "off") {
				const granted = await requestPermissions();
				if (!granted) {
					Alert.alert(
						"Notifications Disabled",
						"You can enable notifications in your device settings.",
					);
				}
			}

			// After demo, go to paywall with onboarding context
			router.replace({
				pathname: "/paywall",
				params: { trigger_source: "onboarding" },
			});
		} finally {
			setIsSubmitting(false);
		}
	}, [
		isSubmitting,
		completeOnboarding,
		analytics,
		selectedGoal,
		selectedTriggerIds,
		budgetAmount,
		budgetPeriod,
		budgetMode,
		notificationStyle,
		starterCourseEnabled,
	]);

	// ---------------------------------------------------------------------------
	// Steps
	// ---------------------------------------------------------------------------

	if (step === "welcome") {
		return (
			<View style={styles.root}>
				<View style={styles.centeredContent}>
					<Logo markSize={72} layout="vertical" wordmarkColor={colors.text} />
					<View style={styles.welcomeTextBlock}>
						<Text variant="displaySmall" style={styles.welcomeTitle}>
							Something worth protecting
						</Text>
						<Text variant="bodyLarge" style={styles.welcomeSubtitle}>
							This app helps you be intentional about dating apps — not remove
							them from your life, just put you back in control.
						</Text>
					</View>
				</View>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={goToGoal}
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

	if (step === "goal") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={orderedSteps} current="goal" />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text variant="headlineMedium" style={styles.stepTitle}>
						What would feel like a win?
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
						onPress={goToTriggers}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="goal-continue"
					>
						Continue
					</Button>
				</View>
			</View>
		);
	}

	if (step === "triggers") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={orderedSteps} current="triggers" />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text variant="headlineMedium" style={styles.stepTitle}>
						When does the pull feel strongest?
					</Text>
					<Text variant="bodyMedium" style={styles.stepSubtitle}>
						No judgment — these are just patterns.
					</Text>
					<View style={styles.chipGrid}>
						{catalog.triggers.map((trigger) => {
							const selected = selectedTriggerIds.has(trigger.id);
							return (
								<Chip
									key={trigger.id}
									selected={selected}
									onPress={() => {
										toggleTrigger(trigger.id);
									}}
									style={[
										styles.triggerChip,
										selected && styles.triggerChipSelected,
									]}
									textStyle={[
										styles.triggerChipText,
										selected && styles.triggerChipTextSelected,
									]}
								>
									{trigger.label}
								</Chip>
							);
						})}
					</View>
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={goToBudgetOrNotifications}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="triggers-continue"
					>
						Continue
					</Button>
				</View>
			</View>
		);
	}

	if (step === "budget") {
		return (
			<KeyboardAvoidingView
				style={styles.root}
				behavior={Platform.OS === "ios" ? "padding" : "height"}
			>
				<ProgressDots steps={orderedSteps} current="budget" />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					<Text variant="headlineMedium" style={styles.stepTitle}>
						Set a gentle spending limit (optional)
					</Text>
					<Text variant="bodyMedium" style={styles.stepSubtitle}>
						A soft limit reminds you before you overspend. A pledge is a
						personal commitment.
					</Text>

					<Text variant="labelLarge" style={styles.fieldLabel}>
						Period
					</Text>
					<SegmentedButtons
						value={budgetPeriod}
						onValueChange={(v) => {
							setBudgetPeriod(v as "daily" | "weekly");
						}}
						buttons={[
							{ value: "daily", label: "Daily" },
							{ value: "weekly", label: "Weekly" },
						]}
						style={styles.segmented}
						theme={{ colors: { secondaryContainer: colors.primary } }}
					/>

					<Text variant="labelLarge" style={styles.fieldLabel}>
						Amount
					</Text>
					<TextInput
						mode="outlined"
						placeholder="0.00"
						value={budgetAmount}
						onChangeText={setBudgetAmount}
						keyboardType="decimal-pad"
						left={<TextInput.Affix text="$" />}
						style={styles.textInput}
						outlineColor={colors.border}
						activeOutlineColor={colors.primary}
						textColor={colors.text}
						placeholderTextColor={colors.muted}
					/>

					<Text variant="labelLarge" style={styles.fieldLabel}>
						Mode
					</Text>
					<SegmentedButtons
						value={budgetMode}
						onValueChange={(v) => {
							setBudgetMode(v as SpendingLimitMode);
						}}
						buttons={[
							{ value: "soft", label: "Soft reminder" },
							{ value: "pledge", label: "Personal pledge" },
						]}
						style={styles.segmented}
						theme={{ colors: { secondaryContainer: colors.primary } }}
					/>
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={goToNotifications}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="budget-continue"
					>
						Continue
					</Button>
					<Button
						mode="text"
						onPress={goToNotifications}
						textColor={colors.muted}
						testID="budget-skip"
					>
						Skip for now
					</Button>
				</View>
			</KeyboardAvoidingView>
		);
	}

	if (step === "notifications") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={orderedSteps} current="notifications" />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<Text variant="headlineMedium" style={styles.stepTitle}>
						How should we notify you?
					</Text>

					{(["stealth", "normal", "off"] as NotificationStyle[]).map(
						(style_) => {
							const labels: Record<
								NotificationStyle,
								{ title: string; desc: string }
							> = {
								stealth: {
									title: "Stealth",
									desc: "Generic-looking notifications, no app name visible.",
								},
								normal: {
									title: "Normal",
									desc: "Standard notifications with app context.",
								},
								off: { title: "Off", desc: "No notifications." },
							};
							const info = labels[style_];
							const selected = notificationStyle === style_;
							return (
								<Surface
									key={style_}
									style={[
										styles.notifCard,
										selected && styles.notifCardSelected,
									]}
									elevation={selected ? 3 : 1}
								>
									<Button
										mode="text"
										onPress={() => {
											setNotificationStyle(style_);
										}}
										style={styles.goalCardButton}
										contentStyle={styles.goalCardButtonContent}
										testID={`notif-${style_}`}
									>
										<View style={styles.goalCardInner}>
											<Text
												variant="titleMedium"
												style={[
													styles.goalCardTitle,
													selected && styles.goalCardTitleSelected,
												]}
											>
												{info.title}
											</Text>
											<Text variant="bodySmall" style={styles.goalCardDesc}>
												{info.desc}
											</Text>
										</View>
									</Button>
								</Surface>
							);
						},
					)}

					<View style={styles.courseToggleRow}>
						<View style={styles.courseToggleText}>
							<Text variant="titleMedium" style={styles.goalCardTitle}>
								Enable 7-day starter course
							</Text>
							<Text variant="bodySmall" style={styles.goalCardDesc}>
								A gentle daily lesson delivered over 7 days.
							</Text>
						</View>
						<Chip
							selected={starterCourseEnabled}
							onPress={() => {
								setStarterCourseEnabled((prev) => !prev);
							}}
							style={[
								styles.toggleChip,
								starterCourseEnabled && styles.toggleChipSelected,
							]}
							textStyle={
								starterCourseEnabled
									? styles.triggerChipTextSelected
									: styles.triggerChipText
							}
						>
							{starterCourseEnabled ? "On" : "Off"}
						</Chip>
					</View>
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={goToDemo}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="notifications-continue"
					>
						Continue
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: demo — Try your first reset
	// ---------------------------------------------------------------------------

	if (step === "demo") {
		// --- Sub-step: intro ---
		if (demoSubStep === "intro") {
			return (
				<View style={styles.root}>
					<ProgressDots steps={orderedSteps} current="demo" />
					<View style={styles.centeredContent}>
						<View style={styles.demoIconContainer}>
							<MaterialCommunityIcons
								name="hand-peace"
								size={64}
								color={colors.primary}
							/>
						</View>
						<Text variant="headlineMedium" style={styles.demoIntroTitle}>
							Try your first reset
						</Text>
						<Text variant="bodyLarge" style={styles.demoIntroSubtitle}>
							The urge is "swipe." We'll guide you through a 60-second breathing
							reset — the same one that's waiting whenever you need it.
						</Text>
					</View>
					<View style={styles.bottomActions}>
						<Button
							mode="contained"
							onPress={startDemoBreathing}
							style={styles.primaryButton}
							contentStyle={styles.primaryButtonContent}
							labelStyle={styles.primaryButtonLabel}
							testID="demo-start-breathing"
						>
							Start breathing exercise
						</Button>
						<Button
							mode="text"
							onPress={skipDemoBreathing}
							textColor={colors.muted}
							testID="demo-skip-breathing"
						>
							Skip
						</Button>
					</View>
				</View>
			);
		}

		// --- Sub-step: breathing ---
		if (demoSubStep === "breathing") {
			return (
				<View style={styles.root}>
					<ProgressDots steps={orderedSteps} current="demo" />
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						<View style={styles.demoBreathingHeader}>
							<Text variant="labelLarge" style={styles.demoBreathingLabel}>
								DEMO RESET — SWIPE URGE
							</Text>
							<Text variant="headlineSmall" style={styles.stepTitle}>
								Follow the breathing guide
							</Text>
						</View>

						<BreathingExercise
							timeLeft={demoTimeLeft}
							totalDuration={DEMO_BREATHING_SECONDS}
						/>
					</ScrollView>
					<View style={styles.bottomActions}>
						<Button
							mode="text"
							onPress={skipDemoBreathing}
							textColor={colors.muted}
							accessibilityLabel="Skip breathing and continue"
							testID="demo-skip-mid"
						>
							Skip
						</Button>
					</View>
				</View>
			);
		}

		// --- Sub-step: action ---
		if (demoSubStep === "action") {
			// Pick the first non-spend action from catalog as the demo action card
			const demoAction =
				catalog.actions.find((a) => a.action_type !== "spend") ??
				catalog.actions[0];

			return (
				<View style={styles.root}>
					<ProgressDots steps={orderedSteps} current="demo" />
					<ScrollView
						style={styles.scroll}
						contentContainerStyle={styles.scrollContent}
						showsVerticalScrollIndicator={false}
					>
						<Text variant="headlineMedium" style={styles.stepTitle}>
							One more step
						</Text>
						<Text variant="bodyMedium" style={styles.stepSubtitle}>
							After breathing, pick something to do instead. Here's an example:
						</Text>

						{demoAction !== undefined && (
							<Surface style={styles.demoActionCard} elevation={2}>
								<Text variant="titleMedium" style={styles.demoActionTitle}>
									{demoAction.title}
								</Text>
								<Text variant="bodySmall" style={styles.demoActionBody}>
									{demoAction.body}
								</Text>
								<Text variant="labelSmall" style={styles.demoActionTime}>
									{Math.round(demoAction.est_seconds / 60)} min
								</Text>
							</Surface>
						)}

						<Surface style={styles.demoTagline} elevation={1}>
							<Text variant="bodyMedium" style={styles.demoTaglineText}>
								That's what Unmatch does. 60 seconds to take back control.
							</Text>
						</Surface>
					</ScrollView>
					<View style={styles.bottomActions}>
						<Button
							mode="contained"
							onPress={() => {
								setDemoSubStep("nicework");
							}}
							style={styles.primaryButton}
							contentStyle={styles.primaryButtonContent}
							labelStyle={styles.primaryButtonLabel}
							testID="demo-action-done"
						>
							I did it
						</Button>
					</View>
				</View>
			);
		}

		// --- Sub-step: nicework ---
		// Auto-transitions to paywall after 1.5 seconds after save completes
		return (
			<DemoNiceWork
				isSubmitting={isSubmitting}
				onReady={() => {
					void handleStart();
				}}
			/>
		);
	}

	// Fallback — should not be reached
	return <View style={styles.root} />;
}

// ---------------------------------------------------------------------------
// DemoNiceWork — confirmation screen before paywall
// ---------------------------------------------------------------------------

interface DemoNiceWorkProps {
	isSubmitting: boolean;
	onReady: () => void;
}

function DemoNiceWork({
	isSubmitting,
	onReady,
}: DemoNiceWorkProps): React.ReactElement {
	const calledRef = useRef(false);
	const onReadyRef = useRef(onReady);
	onReadyRef.current = onReady;

	useEffect(() => {
		if (calledRef.current) return;
		calledRef.current = true;

		// 1.5-second pause then transition
		const timeout = setTimeout(() => {
			onReadyRef.current();
		}, 1_500);

		return () => {
			clearTimeout(timeout);
		};
	}, []);

	return (
		<View style={styles.root}>
			<View style={styles.centeredContent}>
				<View style={styles.niceworkIconContainer}>
					<MaterialCommunityIcons
						name="check-circle-outline"
						size={80}
						color={colors.success}
						accessibilityLabel="Success"
					/>
				</View>
				<Text variant="headlineMedium" style={styles.niceworkTitle}>
					Nice work.
				</Text>
				<Text variant="bodyLarge" style={styles.niceworkBody}>
					You just did a real reset. That's what this whole app is built around.
				</Text>
				{isSubmitting && (
					<Text variant="bodySmall" style={styles.niceworkLoading}>
						Setting up your account...
					</Text>
				)}
			</View>
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
	// Welcome
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
		paddingTop: 20,
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
	// Triggers
	chipGrid: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	triggerChip: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderWidth: 1,
	},
	triggerChipSelected: {
		backgroundColor: "#0F1D3A",
		borderColor: colors.primary,
	},
	triggerChipText: {
		color: colors.muted,
	},
	triggerChipTextSelected: {
		color: colors.primary,
	},
	// Budget
	fieldLabel: {
		color: colors.text,
		marginBottom: 4,
		marginTop: 8,
	},
	segmented: {
		marginBottom: 4,
	},
	textInput: {
		backgroundColor: colors.surface,
	},
	// Notifications
	notifCard: {
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		backgroundColor: colors.surface,
		overflow: "hidden",
	},
	notifCardSelected: {
		borderColor: colors.primary,
		backgroundColor: "#0F1D3A",
	},
	courseToggleRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
		gap: 12,
	},
	courseToggleText: {
		flex: 1,
		gap: 4,
	},
	toggleChip: {
		backgroundColor: colors.surface,
		borderColor: colors.border,
		borderWidth: 1,
	},
	toggleChipSelected: {
		backgroundColor: "#0F1D3A",
		borderColor: colors.primary,
	},
	// Demo intro
	demoIconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		backgroundColor: "#0F1D3A",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	demoIntroTitle: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
	},
	demoIntroSubtitle: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 26,
	},
	// Demo breathing
	demoBreathingHeader: {
		gap: 6,
		marginBottom: 8,
	},
	demoBreathingLabel: {
		color: colors.primary,
		textTransform: "uppercase",
		letterSpacing: 1,
	},
	// Demo action card
	demoActionCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 20,
		gap: 8,
	},
	demoActionTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	demoActionBody: {
		color: colors.muted,
		lineHeight: 20,
	},
	demoActionTime: {
		color: colors.secondary,
		marginTop: 4,
	},
	// Demo tagline
	demoTagline: {
		backgroundColor: "#0F1D3A",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.primary,
		padding: 20,
	},
	demoTaglineText: {
		color: colors.text,
		fontStyle: "italic",
		textAlign: "center",
		lineHeight: 24,
	},
	// Nice work screen
	niceworkIconContainer: {
		width: 140,
		height: 140,
		borderRadius: 70,
		backgroundColor: "#1A3D2E",
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 16,
	},
	niceworkTitle: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
	},
	niceworkBody: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 26,
	},
	niceworkLoading: {
		color: colors.muted,
		textAlign: "center",
		marginTop: 12,
		fontStyle: "italic",
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
