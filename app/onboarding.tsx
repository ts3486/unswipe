// Onboarding screen — multi-step flow.
// Steps: Welcome, Goal, Triggers, Budget (conditional), Notifications.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { getCatalog } from "@/src/data/seed-loader";
import type {
	GoalType,
	NotificationStyle,
	SpendingLimitMode,
} from "@/src/domain/types";
import {
	requestNotificationPermission,
	rescheduleAll,
} from "@/src/services/notification-service";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
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

type Step = "welcome" | "goal" | "triggers" | "budget" | "notifications";

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingScreen(): React.ReactElement {
	const { completeOnboarding } = useAppState();
	const analytics = useAnalytics();
	const catalog = getCatalog();

	const [step, setStep] = useState<Step>("welcome");
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
	// Submit
	// ---------------------------------------------------------------------------

	const handleStart = useCallback(async (): Promise<void> => {
		if (isSubmitting) {
			return;
		}
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
				lock_enabled: 0,
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
				const granted = await requestNotificationPermission();
				if (granted) {
					await rescheduleAll(notificationStyle);
				} else {
					Alert.alert(
						"Notifications Disabled",
						"You can enable notifications in your device settings.",
					);
				}
			}

			router.replace("/(tabs)");
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

	// step === 'notifications'
	return (
		<View style={styles.root}>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.scrollContent}
				showsVerticalScrollIndicator={false}
			>
				<Text variant="headlineMedium" style={styles.stepTitle}>
					How should we notify you?
				</Text>

				{(["stealth", "normal", "off"] as NotificationStyle[]).map((style_) => {
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
							style={[styles.notifCard, selected && styles.notifCardSelected]}
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
				})}

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

				<Surface style={styles.affirmationCard} elevation={1}>
					<Text variant="bodyMedium" style={styles.affirmationText}>
						{
							"You've taken the first step. The tree starts small — so does every habit."
						}
					</Text>
				</Surface>
			</ScrollView>
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
					testID="notifications-start"
				>
					Begin
				</Button>
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
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 60,
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
	goalAffirmation: {
		color: colors.secondary,
		textAlign: "center",
		fontStyle: "italic",
		marginTop: 4,
	},
	affirmationCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		padding: 16,
	},
	affirmationText: {
		color: colors.muted,
		fontStyle: "italic",
		textAlign: "center",
		lineHeight: 22,
	},
});
