// Onboarding screen — 4-step flow.
// Steps: Opening → Meditation → Daily Checkin → Notifications → navigate to Home.
// Each feature step uses actual app components for an honest preview.
// TypeScript strict mode.

import { BreathingExercise } from "@/src/components/BreathingExercise";
import { Logo } from "@/src/components/Logo";
import {
	RatingChips,
	useMoodLabels,
	useUrgeLabels,
} from "@/src/components/RatingChips";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	Animated,
	Easing,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import { Button, Card, Chip, Divider, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Step = "welcome" | "meditation" | "checkin" | "notifications";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS: Step[] = ["welcome", "meditation", "checkin", "notifications"];

const BREATHING_DEMO_SECONDS = 60;

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
	const { t } = useTranslation();
	const currentIdx = steps.indexOf(current);
	return (
		<View
			style={styles.progressRow}
			accessibilityLabel={t("onboarding.stepIndicatorA11y", {
				current: currentIdx + 1,
				total: steps.length,
			})}
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
	const { t } = useTranslation();
	return (
		<View style={styles.backButtonRow}>
			<Button
				mode="text"
				onPress={onPress}
				icon="chevron-left"
				textColor={colors.muted}
				style={styles.backButton}
				compact
				accessibilityLabel={t("onboarding.backA11y")}
				testID="back-button"
			>
				{t("common.back")}
			</Button>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Demo: Meditation — uses actual BreathingExercise component
// ---------------------------------------------------------------------------

function MeditationDemo(): React.ReactElement {
	const [timeLeft, setTimeLeft] = useState(BREATHING_DEMO_SECONDS);

	useEffect(() => {
		if (timeLeft <= 0) return;
		const id = setInterval(() => {
			setTimeLeft((t) => Math.max(0, t - 1));
		}, 1000);
		return () => clearInterval(id);
	}, [timeLeft]);

	return (
		<BreathingExercise
			timeLeft={timeLeft}
			totalDuration={BREATHING_DEMO_SECONDS}
		/>
	);
}

// ---------------------------------------------------------------------------
// Demo: Daily check-in — uses actual RatingChips + Chip components
// ---------------------------------------------------------------------------

function CheckinDemo(): React.ReactElement {
	const { t } = useTranslation();
	const moodLabels = useMoodLabels();
	const urgeLabels = useUrgeLabels();
	return (
		<Card style={demoStyles.card} mode="contained">
			<Card.Content style={demoStyles.cardContent}>
				<RatingChips
					label={t("onboarding.checkin.demo.moodLabel")}
					value={3}
					onChange={() => {}}
					readonly
					labelMap={moodLabels}
					subtitle={t("onboarding.checkin.demo.moodSubtitle")}
				/>
				<Divider style={demoStyles.divider} />
				<RatingChips
					label={t("onboarding.checkin.demo.urgeLabel")}
					value={2}
					onChange={() => {}}
					readonly
					labelMap={urgeLabels}
				/>
				<Divider style={demoStyles.divider} />
				<View style={demoStyles.yesNoRow}>
					<Text variant="labelLarge" style={demoStyles.ratingLabel}>
						{t("onboarding.checkin.demo.lateNightQuestion")}
					</Text>
					<View style={demoStyles.chipRow}>
						<Chip
							selected={false}
							style={demoStyles.ratingChip}
							textStyle={demoStyles.ratingChipText}
							compact
						>
							{t("common.yes")}
						</Chip>
						<Chip
							selected
							style={[demoStyles.ratingChip, demoStyles.chipSelected]}
							textStyle={[
								demoStyles.ratingChipText,
								demoStyles.chipTextSelected,
							]}
							compact
						>
							{t("common.no")}
						</Chip>
					</View>
				</View>
			</Card.Content>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Demo: Notifications — iOS-style banners with app logo
// ---------------------------------------------------------------------------

interface MockNotifProps {
	title: string;
	body: string;
	time: string;
}

function AnimatedNotifBanner({
	title,
	body,
	time,
	delay,
}: MockNotifProps & { delay: number }): React.ReactElement {
	const translateY = useRef(new Animated.Value(-40)).current;
	const opacity = useRef(new Animated.Value(0)).current;
	const scale = useRef(new Animated.Value(0.92)).current;

	useEffect(() => {
		const timeout = setTimeout(() => {
			Animated.parallel([
				Animated.spring(translateY, {
					toValue: 0,
					speed: 8,
					bounciness: 6,
					useNativeDriver: true,
				}),
				Animated.timing(opacity, {
					toValue: 1,
					duration: 350,
					easing: Easing.out(Easing.ease),
					useNativeDriver: true,
				}),
				Animated.spring(scale, {
					toValue: 1,
					speed: 10,
					bounciness: 4,
					useNativeDriver: true,
				}),
			]).start();
		}, delay);

		return () => clearTimeout(timeout);
	}, [translateY, opacity, scale, delay]);

	return (
		<Animated.View
			style={[
				demoStyles.notifBanner,
				{
					opacity,
					transform: [{ translateY }, { scale }],
				},
			]}
		>
			<Logo markSize={24} layout="mark-only" />
			<View style={demoStyles.notifTextWrap}>
				<View style={demoStyles.notifHeaderRow}>
					<Text style={demoStyles.notifAppName}>Unmatch</Text>
					<Text style={demoStyles.notifTime}>{time}</Text>
				</View>
				<Text style={demoStyles.notifTitle} numberOfLines={1}>
					{title}
				</Text>
				<Text style={demoStyles.notifBody} numberOfLines={1}>
					{body}
				</Text>
			</View>
		</Animated.View>
	);
}

function NotificationsDemo(): React.ReactElement {
	const { t } = useTranslation();

	const mockNotifs: MockNotifProps[] = useMemo(
		() => [
			{
				title: t("pushNotifications.dailyMotivation.0.title"),
				body: t("pushNotifications.dailyMotivation.0.body"),
				time: "9:00 AM",
			},
			{
				title: t("pushNotifications.dailyMotivation.4.title"),
				body: t("pushNotifications.dailyMotivation.4.body"),
				time: "2:00 PM",
			},
			{
				title: t("onboarding.notifications.demo.streakTitle"),
				body: t("onboarding.notifications.demo.streakBody"),
				time: "8:00 PM",
			},
		],
		[t],
	);

	return (
		<View style={demoStyles.notifList}>
			{mockNotifs.map((notif, i) => (
				<AnimatedNotifBanner
					key={notif.title}
					{...notif}
					delay={400 + i * 800}
				/>
			))}
		</View>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OnboardingScreen(): React.ReactElement {
	const { t, i18n } = useTranslation();
	const { completeOnboarding } = useAppState();
	const analytics = useAnalytics();

	const [step, setStep] = useState<Step>("welcome");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// ---------------------------------------------------------------------------
	// Navigation
	// ---------------------------------------------------------------------------

	const goBack = useCallback((): void => {
		if (step === "meditation") {
			setStep("welcome");
		} else if (step === "checkin") {
			setStep("meditation");
		} else if (step === "notifications") {
			setStep("checkin");
		}
	}, [step]);

	const handleFinish = useCallback(async (): Promise<void> => {
		if (isSubmitting) return;
		setIsSubmitting(true);

		try {
			await completeOnboarding({
				locale: i18n.language,
				notification_style: "normal",
				plan_selected: "default",
				goal_type: "reduce_swipe",
				spending_budget_weekly: null,
				spending_budget_daily: null,
				spending_limit_mode: null,
			});

			analytics.track({
				name: "onboarding_completed",
				props: {
					goal_type: "reduce_swipe",
					trigger_count: 0,
					has_budget: false,
				},
			});

			router.replace("/(tabs)");
		} finally {
			setIsSubmitting(false);
		}
	}, [isSubmitting, completeOnboarding, analytics, i18n.language]);

	// ---------------------------------------------------------------------------
	// Step 1: Opening screen
	// ---------------------------------------------------------------------------

	if (step === "welcome") {
		return (
			<View style={styles.root}>
				<View style={styles.welcomeSafeArea} />
				<View style={styles.centeredContent}>
					<Logo markSize={72} layout="vertical" wordmarkColor={colors.text} />
					<View style={styles.welcomeTextBlock}>
						<Text variant="displaySmall" style={styles.welcomeTitle}>
							{t("onboarding.welcome.title")}
						</Text>
						<Text variant="bodyLarge" style={styles.welcomeSubtitle}>
							{t("onboarding.welcome.subtitle")}
						</Text>
					</View>
				</View>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("meditation");
						}}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="welcome-get-started"
					>
						{t("onboarding.welcome.cta")}
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step 2: Meditation feature
	// ---------------------------------------------------------------------------

	if (step === "meditation") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="meditation" />
				<BackButton onPress={goBack} />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.stepHeader}>
						<Text variant="headlineMedium" style={styles.stepTitle}>
							{t("onboarding.meditation.title")}
						</Text>
						<Text variant="bodyMedium" style={styles.stepSubtitle}>
							{t("onboarding.meditation.subtitle")}
						</Text>
					</View>

					<MeditationDemo />
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("checkin");
						}}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="meditation-continue"
					>
						{t("common.continue")}
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step 3: Daily check-in feature
	// ---------------------------------------------------------------------------

	if (step === "checkin") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="checkin" />
				<BackButton onPress={goBack} />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.stepHeader}>
						<Text variant="headlineMedium" style={styles.stepTitle}>
							{t("onboarding.checkin.title")}
						</Text>
						<Text variant="bodyMedium" style={styles.stepSubtitle}>
							{t("onboarding.checkin.subtitle")}
						</Text>
					</View>

					<CheckinDemo />
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							setStep("notifications");
						}}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="checkin-continue"
					>
						{t("common.continue")}
					</Button>
				</View>
			</View>
		);
	}

	// ---------------------------------------------------------------------------
	// Step 4: Notification reminders
	// ---------------------------------------------------------------------------

	if (step === "notifications") {
		return (
			<View style={styles.root}>
				<ProgressDots steps={STEPS} current="notifications" />
				<BackButton onPress={goBack} />
				<ScrollView
					style={styles.scroll}
					contentContainerStyle={styles.scrollContent}
					showsVerticalScrollIndicator={false}
				>
					<View style={styles.stepHeader}>
						<Text variant="headlineMedium" style={styles.stepTitle}>
							{t("onboarding.notifications.title")}
						</Text>
						<Text variant="bodyMedium" style={styles.stepSubtitle}>
							{t("onboarding.notifications.subtitle")}
						</Text>
					</View>

					<NotificationsDemo />
				</ScrollView>
				<View style={styles.bottomActions}>
					<Button
						mode="contained"
						onPress={() => {
							void handleFinish();
						}}
						loading={isSubmitting}
						disabled={isSubmitting}
						style={styles.primaryButton}
						contentStyle={styles.primaryButtonContent}
						labelStyle={styles.primaryButtonLabel}
						testID="notifications-continue"
					>
						{isSubmitting
							? t("onboarding.notifications.settingUp")
							: t("common.continue")}
					</Button>
				</View>
			</View>
		);
	}

	// Fallback — should not be reached
	return <View style={styles.root} />;
}

// ---------------------------------------------------------------------------
// Styles — main layout
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: colors.background,
	},
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
	backButtonRow: {
		paddingHorizontal: 8,
		paddingBottom: 4,
	},
	backButton: {
		alignSelf: "flex-start",
	},
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
	scroll: {
		flex: 1,
	},
	scrollContent: {
		paddingHorizontal: 20,
		paddingTop: 8,
		paddingBottom: 16,
	},
	stepHeader: {
		gap: 8,
		marginBottom: 8,
	},
	stepTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	stepSubtitle: {
		color: colors.muted,
		lineHeight: 22,
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
});

// ---------------------------------------------------------------------------
// Styles — demo previews
// ---------------------------------------------------------------------------

const demoStyles = StyleSheet.create({
	// Check-in demo (matches actual checkin.tsx Card styling)
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	cardContent: {
		paddingVertical: 4,
		gap: 2,
	},
	divider: {
		backgroundColor: colors.border,
	},
	yesNoRow: {
		paddingVertical: 12,
		gap: 10,
	},
	ratingLabel: {
		color: colors.text,
		fontWeight: "500",
	},
	chipRow: {
		flexDirection: "row",
		gap: 8,
		flexWrap: "wrap",
	},
	ratingChip: {
		backgroundColor: colors.background,
		borderColor: colors.border,
		borderWidth: 1,
		minWidth: 44,
	},
	ratingChipText: {
		color: colors.muted,
	},
	chipSelected: {
		backgroundColor: "#0F1D3A",
		borderColor: colors.primary,
	},
	chipTextSelected: {
		color: colors.text,
		fontWeight: "600",
	},

	// Notification banners (iOS-style)
	notifList: {
		gap: 10,
		marginTop: 8,
	},
	notifBanner: {
		flexDirection: "row",
		alignItems: "flex-start",
		backgroundColor: "#1C2840",
		borderRadius: 16,
		padding: 14,
		gap: 12,
		// Subtle shadow for depth
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 4,
	},
	notifTextWrap: {
		flex: 1,
		gap: 1,
	},
	notifHeaderRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 2,
	},
	notifAppName: {
		color: colors.muted,
		fontSize: 12,
		fontWeight: "500",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	notifTime: {
		color: colors.muted,
		fontSize: 11,
	},
	notifTitle: {
		color: colors.text,
		fontSize: 14,
		fontWeight: "600",
		lineHeight: 18,
	},
	notifBody: {
		color: colors.muted,
		fontSize: 13,
		lineHeight: 17,
	},
});
