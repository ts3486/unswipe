// Panic (Reset) tab screen — full guided reset flow.
// Single screen, step-driven via usePanicFlow state machine.
// Works entirely offline. TypeScript strict mode.

import { BreathingExercise } from "@/src/components/BreathingExercise";
import { Confetti } from "@/src/components/Confetti";
import { ShareStreakCard } from "@/src/components/ShareStreakCard";
import { UrgeKindCard } from "@/src/components/UrgeKindCard";
import { BREATHING_DURATION_SECONDS } from "@/src/constants/config";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { getCatalog } from "@/src/data/seed-loader";
import type { SpendCategory, UrgeKind, UrgeOutcome } from "@/src/domain/types";
import { usePanicFlow } from "@/src/hooks/usePanicFlow";
import { shareStreakCard } from "@/src/services/share";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import {
	Button,
	Chip,
	Divider,
	IconButton,
	Surface,
	Text,
} from "react-native-paper";
import ViewShot from "react-native-view-shot";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PanicScreen(): React.ReactElement {
	const flow = usePanicFlow();
	const { refreshProgress, streak, meditationCount, meditationRank } =
		useAppState();
	const analytics = useAnalytics();
	const catalog = getCatalog();
	const prevStepRef = useRef(flow.step);

	// Fire panic_protocol_completed when breathing ends via timer (auto-complete).
	// The skip path fires it inline; this handles the timer-auto-complete path.
	useEffect(() => {
		if (prevStepRef.current === "breathing" && flow.step === "select_action") {
			analytics.track({
				name: "panic_protocol_completed",
				props: {
					urge_kind: flow.urgeKind ?? "check",
					duration_ms: BREATHING_DURATION_SECONDS * 1000,
				},
			});
		}
		prevStepRef.current = flow.step;
	}, [flow.step, flow.urgeKind, analytics]);

	// ---------------------------------------------------------------------------
	// Step: select_urge
	// ---------------------------------------------------------------------------

	if (flow.step === "select_urge") {
		return (
			<SelectUrgeStep
				onSelect={(kind: UrgeKind) => {
					analytics.track({
						name: "panic_started",
						props: { urge_kind: kind, from_screen: "panic" },
					});
					flow.selectUrgeKind(kind);
					flow.startBreathing();
				}}
				urgeKinds={catalog.urge_kinds}
			/>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: breathing
	// ---------------------------------------------------------------------------

	if (flow.step === "breathing") {
		return (
			<BreathingStep
				timeLeft={flow.breathingTimeLeft}
				totalDuration={BREATHING_DURATION_SECONDS}
				onSkip={() => {
					const elapsed =
						(BREATHING_DURATION_SECONDS - flow.breathingTimeLeft) * 1000;
					analytics.track({
						name: "panic_protocol_completed",
						props: {
							urge_kind: flow.urgeKind ?? "check",
							duration_ms: elapsed,
						},
					});
					flow.skipBreathing();
				}}
			/>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: select_action
	// ---------------------------------------------------------------------------

	if (flow.step === "select_action") {
		return (
			<SelectActionStep
				actions={catalog.actions}
				urgeKind={flow.urgeKind}
				onSelect={(actionId: string) => {
					analytics.track({
						name: "panic_action_selected",
						props: { urge_kind: flow.urgeKind ?? "check", action_id: actionId },
					});
					flow.selectAction(actionId);
				}}
			/>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: spend_delay
	// ---------------------------------------------------------------------------

	if (flow.step === "spend_delay") {
		return (
			<SpendDelayStep
				spendDelayCards={catalog.spend_delay_cards}
				actions={catalog.actions}
				onSelectAction={flow.selectAction}
				onMeditated={() => {
					analytics.track({
						name: "panic_outcome_logged",
						props: {
							urge_kind: flow.urgeKind ?? "spend",
							outcome: "success",
							trigger_tag: null,
						},
					});
					void flow.logOutcome("success");
				}}
				onSpentAnyway={() => {
					analytics.track({
						name: "panic_outcome_logged",
						props: {
							urge_kind: flow.urgeKind ?? "spend",
							outcome: "fail",
							trigger_tag: null,
						},
					});
					void flow.logOutcome("fail");
				}}
			/>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: log_outcome
	// ---------------------------------------------------------------------------

	if (flow.step === "log_outcome") {
		return (
			<LogOutcomeStep
				urgeKind={flow.urgeKind}
				triggers={catalog.triggers}
				spendCategories={catalog.spend_categories}
				selectedCategory={flow.spendCategory}
				onSelectCategory={flow.selectSpendCategory}
				onLogOutcome={async (outcome, triggerTag) => {
					analytics.track({
						name: "panic_outcome_logged",
						props: {
							urge_kind: flow.urgeKind ?? "check",
							outcome,
							trigger_tag: triggerTag ?? null,
						},
					});
					await flow.logOutcome(outcome, triggerTag);
				}}
			/>
		);
	}

	// ---------------------------------------------------------------------------
	// Step: complete
	// ---------------------------------------------------------------------------

	if (flow.step === "complete") {
		return (
			<CompleteStep
				outcome={flow.outcome}
				catalogCopy={catalog.copy}
				urgeKind={flow.urgeKind}
				meditationRankAfter={flow.meditationRankAfter}
				meditationRankLeveledUp={flow.meditationRankLeveledUp}
				streak={streak}
				meditationCount={meditationCount}
				meditationRank={meditationRank}
				onDone={() => {
					void refreshProgress();
					flow.reset();
					router.replace("/(tabs)");
				}}
				onReset={() => {
					flow.reset();
				}}
			/>
		);
	}

	// Fallback (should not be reached with correct state machine).
	return <View style={styles.fallback} />;
}

// ---------------------------------------------------------------------------
// Step sub-components
// ---------------------------------------------------------------------------

// --- SelectUrgeStep ---------------------------------------------------------

interface SelectUrgeStepProps {
	urgeKinds: Array<{ id: UrgeKind; label: string }>;
	onSelect: (kind: UrgeKind) => void;
}

function SelectUrgeStep({
	urgeKinds,
	onSelect,
}: SelectUrgeStepProps): React.ReactElement {
	const catalog = getCatalog();

	// Raw urgeKinds from catalog have help text in the raw JSON, but the domain
	// type doesn't carry it. We read from the rawCatalog via getCatalog + a
	// parallel lookup using the seed-loader which exposes the mapped catalog.
	// Since CatalogUrgeKind only has {id, label}, we pull the help text from
	// catalog.copy or fall back to a sensible default.
	const helpMap: Record<string, string> = {
		swipe: "I want to swipe right now.",
		check: "I want to check messages or likes.",
		spend: "I want to buy boosts, premium, or spend money.",
	};

	return (
		<View style={styles.stepContainer}>
			<ScrollView
				style={styles.stepScroll}
				contentContainerStyle={styles.stepScrollContent}
				showsVerticalScrollIndicator={false}
			>
				<StepHeader
					title="What's happening right now?"
					subtitle="Choose what's pulling you"
				/>

				<View style={styles.cardsContainer}>
					{urgeKinds.map((kind) => (
						<UrgeKindCard
							key={kind.id}
							urgeKind={kind.id}
							label={kind.label}
							helpText={helpMap[kind.id] ?? ""}
							onPress={() => onSelect(kind.id)}
						/>
					))}
				</View>

				<Text variant="bodySmall" style={styles.footerNote}>
					Tap to start a guided reset
				</Text>
			</ScrollView>
		</View>
	);
}

// --- BreathingStep ----------------------------------------------------------

interface BreathingStepProps {
	timeLeft: number;
	totalDuration: number;
	onSkip: () => void;
}

function BreathingStep({
	timeLeft,
	totalDuration,
	onSkip,
}: BreathingStepProps): React.ReactElement {
	return (
		<View style={styles.stepContainer}>
			<ScrollView
				style={styles.stepScroll}
				contentContainerStyle={styles.stepScrollContent}
				showsVerticalScrollIndicator={false}
			>
				<StepHeader
					title="Take a breath"
					subtitle="Follow the breathing guide below"
				/>

				<BreathingExercise timeLeft={timeLeft} totalDuration={totalDuration} />

				<View style={styles.skipContainer}>
					<Button
						mode="text"
						onPress={onSkip}
						textColor={colors.muted}
						accessibilityLabel="Skip breathing and continue"
					>
						Skip
					</Button>
				</View>
			</ScrollView>
		</View>
	);
}

// --- SelectActionStep -------------------------------------------------------

interface SelectActionStepProps {
	actions: Array<{
		id: string;
		title: string;
		body: string;
		est_seconds: number;
		action_type: string;
	}>;
	urgeKind: UrgeKind | null;
	onSelect: (actionId: string) => void;
}

function SelectActionStep({
	actions,
	urgeKind,
	onSelect,
}: SelectActionStepProps): React.ReactElement {
	// Show actions relevant to the urge kind. For spend we show spend-specific
	// and general actions; for others we show all except spend-specific ones.
	const filteredActions = actions.filter((a) => {
		if (urgeKind === "spend") {
			return true; // show all for spend
		}
		// For swipe/check, show actions not tagged exclusively for spend.
		return a.action_type !== "spend";
	});

	// Sort by est_seconds ascending so 1-min options appear first.
	const sorted = [...filteredActions].sort(
		(a, b) => a.est_seconds - b.est_seconds,
	);

	return (
		<View style={styles.stepContainer}>
			<ScrollView
				style={styles.stepScroll}
				contentContainerStyle={styles.stepScrollContent}
				showsVerticalScrollIndicator={false}
			>
				<StepHeader
					title="Choose your next step"
					subtitle="Pick something you can do right now"
				/>

				<View style={styles.cardsContainer}>
					{sorted.map((action) => {
						const estMinutes = Math.round(action.est_seconds / 60);
						return (
							<ActionCard
								key={action.id}
								title={action.title}
								estMinutes={estMinutes}
								onPress={() => onSelect(action.id)}
							/>
						);
					})}
				</View>
			</ScrollView>
		</View>
	);
}

// --- SpendDelayStep ---------------------------------------------------------

interface SpendDelayStepProps {
	spendDelayCards: Array<{
		id: string;
		title: string;
		body: string;
		action_id: string;
	}>;
	actions: Array<{
		id: string;
		title: string;
		body: string;
		est_seconds: number;
		action_type: string;
	}>;
	onSelectAction: (actionId: string) => void;
	onMeditated: () => void;
	onSpentAnyway: () => void;
}

function SpendDelayStep({
	spendDelayCards,
	actions,
	onSelectAction,
	onMeditated,
	onSpentAnyway,
}: SpendDelayStepProps): React.ReactElement {
	const actionMap = new Map(actions.map((a) => [a.id, a]));

	return (
		<View style={styles.stepContainer}>
			<ScrollView
				style={styles.stepScroll}
				contentContainerStyle={styles.stepScrollContent}
				showsVerticalScrollIndicator={false}
			>
				<StepHeader
					title="Before you spend..."
					subtitle="Try one of these first"
				/>

				<View style={styles.cardsContainer}>
					{spendDelayCards.map((card) => {
						const linkedAction = actionMap.get(card.action_id);
						return (
							<SpendDelayCard
								key={card.id}
								title={card.title}
								body={card.body}
								ctaLabel={linkedAction?.title ?? "Try this"}
								onCtaPress={() => onSelectAction(card.action_id)}
							/>
						);
					})}
				</View>

				<Divider style={styles.divider} />

				<View style={styles.outcomeButtons}>
					<Button
						mode="contained"
						onPress={onMeditated}
						style={[styles.outcomeButton, styles.outcomeButtonSuccess]}
						contentStyle={styles.outcomeButtonContent}
						textColor={colors.background}
					>
						I meditated
					</Button>
					<Button
						mode="outlined"
						onPress={onSpentAnyway}
						style={styles.outcomeButton}
						contentStyle={styles.outcomeButtonContent}
						textColor={colors.muted}
					>
						I spent anyway
					</Button>
				</View>
			</ScrollView>
		</View>
	);
}

// --- LogOutcomeStep ---------------------------------------------------------

interface LogOutcomeStepProps {
	urgeKind: UrgeKind | null;
	triggers: Array<{ id: string; label: string }>;
	spendCategories: Array<{ id: SpendCategory; label: string }>;
	selectedCategory: SpendCategory | null;
	onSelectCategory: (cat: SpendCategory) => void;
	onLogOutcome: (
		outcome: UrgeOutcome,
		triggerTag?: string | null,
	) => Promise<void>;
}

function LogOutcomeStep({
	urgeKind,
	triggers,
	spendCategories,
	selectedCategory,
	onSelectCategory,
	onLogOutcome,
}: LogOutcomeStepProps): React.ReactElement {
	const [selectedTrigger, setSelectedTrigger] = useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleOutcome = useCallback(
		async (outcome: UrgeOutcome): Promise<void> => {
			if (isSubmitting) return;
			setIsSubmitting(true);
			await onLogOutcome(outcome, selectedTrigger);
		},
		[isSubmitting, onLogOutcome, selectedTrigger],
	);

	return (
		<View style={styles.stepContainer}>
			<ScrollView
				style={styles.stepScroll}
				contentContainerStyle={styles.stepScrollContent}
				showsVerticalScrollIndicator={false}
			>
				<StepHeader
					title="How did it go?"
					subtitle="Be honest — there's no judgment here"
				/>

				{/* Trigger selector */}
				<View style={styles.sectionBlock}>
					<Text variant="labelMedium" style={styles.sectionLabel}>
						What triggered it? (optional)
					</Text>
					<View style={styles.chipRow}>
						{triggers.map((t) => (
							<Chip
								key={t.id}
								selected={selectedTrigger === t.id}
								onPress={() =>
									setSelectedTrigger(selectedTrigger === t.id ? null : t.id)
								}
								style={[
									styles.triggerChip,
									selectedTrigger === t.id && styles.triggerChipSelected,
								]}
								textStyle={[
									styles.triggerChipText,
									selectedTrigger === t.id && styles.triggerChipTextSelected,
								]}
								compact
							>
								{t.label}
							</Chip>
						))}
					</View>
				</View>

				{/* Spend category picker (only for spend urges) */}
				{urgeKind === "spend" && (
					<View style={styles.sectionBlock}>
						<Text variant="labelMedium" style={styles.sectionLabel}>
							Category (optional)
						</Text>
						<View style={styles.chipRow}>
							{spendCategories.map((cat) => (
								<Chip
									key={cat.id}
									selected={selectedCategory === cat.id}
									onPress={() => onSelectCategory(cat.id)}
									style={[
										styles.triggerChip,
										selectedCategory === cat.id && styles.triggerChipSelected,
									]}
									textStyle={[
										styles.triggerChipText,
										selectedCategory === cat.id &&
											styles.triggerChipTextSelected,
									]}
									compact
								>
									{cat.label}
								</Chip>
							))}
						</View>
					</View>
				)}

				<Divider style={styles.divider} />

				{/* Outcome buttons */}
				<View style={styles.outcomeButtons}>
					<Button
						mode="contained"
						onPress={() => void handleOutcome("success")}
						disabled={isSubmitting}
						style={[styles.outcomeButton, styles.outcomeButtonSuccess]}
						contentStyle={styles.outcomeButtonContent}
						textColor={colors.background}
					>
						I meditated
					</Button>
					<Button
						mode="contained"
						onPress={() => void handleOutcome("ongoing")}
						disabled={isSubmitting}
						style={[styles.outcomeButton, styles.outcomeButtonOngoing]}
						contentStyle={styles.outcomeButtonContent}
						textColor={colors.text}
					>
						Still deciding
					</Button>
					<Button
						mode="outlined"
						onPress={() => void handleOutcome("fail")}
						disabled={isSubmitting}
						style={styles.outcomeButton}
						contentStyle={styles.outcomeButtonContent}
						textColor={colors.muted}
					>
						I gave in
					</Button>
				</View>
			</ScrollView>
		</View>
	);
}

// --- CompleteStep -----------------------------------------------------------

interface CompleteStepProps {
	outcome: UrgeOutcome | null;
	catalogCopy: Record<string, string>;
	urgeKind: UrgeKind | null;
	/** Updated meditation rank after this session; null if not yet computed. */
	meditationRankAfter: number | null;
	/** Whether the rank leveled up during this session. */
	meditationRankLeveledUp: boolean;
	/** Current streak in days (for the share card). */
	streak: number;
	/** Total meditations completed all-time (for the share card). */
	meditationCount: number;
	/** Current meditation rank (for the share card). */
	meditationRank: number;
	onDone: () => void;
	onReset: () => void;
}

function CompleteStep({
	outcome,
	catalogCopy,
	urgeKind,
	meditationRankAfter,
	meditationRankLeveledUp,
	streak,
	meditationCount,
	meditationRank,
	onDone,
	onReset,
}: CompleteStepProps): React.ReactElement {
	const isSuccess = outcome === "success";
	const isOngoing = outcome === "ongoing";

	// Ref for the share card capture
	const shareCardRef = useRef<ViewShot>(null);
	const [isSharing, setIsSharing] = useState(false);

	const handleShare = useCallback(async (): Promise<void> => {
		if (isSharing) return;
		setIsSharing(true);
		await shareStreakCard(shareCardRef);
		setIsSharing(false);
	}, [isSharing]);

	// Fade-in entrance animation
	const fadeAnim = useRef(new Animated.Value(0)).current;

	// Pulse animation for the icon container on success
	const pulseAnim = useRef(new Animated.Value(1)).current;

	useEffect(() => {
		Animated.timing(fadeAnim, {
			toValue: 1,
			duration: 400,
			useNativeDriver: true,
		}).start();
	}, [fadeAnim]);

	useEffect(() => {
		if (isSuccess) {
			const pulse = Animated.loop(
				Animated.sequence([
					Animated.timing(pulseAnim, {
						toValue: 1.15,
						duration: 1000,
						useNativeDriver: true,
					}),
					Animated.timing(pulseAnim, {
						toValue: 1,
						duration: 1000,
						useNativeDriver: true,
					}),
				]),
			);
			pulse.start();
			return () => pulse.stop();
		}
	}, [isSuccess, pulseAnim]);

	const title = isSuccess
		? (catalogCopy.successTitle ?? "Nice work.")
		: isOngoing
			? "Noted."
			: (catalogCopy.failTitle ?? "It's okay.");

	const body = isSuccess
		? urgeKind === "swipe"
			? "You didn't swipe — you chose yourself instead."
			: urgeKind === "check"
				? "You broke the cycle. That takes real strength."
				: urgeKind === "spend"
					? "You held your ground. Your future self thanks you."
					: (catalogCopy.successBody ?? "Small wins add up.")
		: isOngoing
			? "Staying aware is part of the process."
			: "It happens. You came here — that still counts.";

	return (
		<View style={styles.stepContainer}>
			{/* One-time confetti burst on success */}
			{isSuccess && <Confetti active />}

			{/*
			  Off-screen ViewShot wrapper — renders the share card at a fixed
			  position outside the visible area so it can be captured without
			  appearing in the UI. position: absolute + top: -9999 keeps it
			  mounted and capturable without affecting layout.
			*/}
			{isSuccess && (
				<View style={styles.offscreenCapture} pointerEvents="none">
					<ViewShot ref={shareCardRef} options={{ format: "png", quality: 1 }}>
						<ShareStreakCard
							streak={streak}
							meditationCount={meditationCount}
							meditationRank={meditationRank}
						/>
					</ViewShot>
				</View>
			)}

			<Animated.View style={[styles.completeContainer, { opacity: fadeAnim }]}>
				{/* Outcome icon */}
				<Animated.View
					style={isSuccess ? { transform: [{ scale: pulseAnim }] } : undefined}
				>
					<View
						style={[
							styles.completeIconContainer,
							isSuccess && styles.completeIconSuccess,
							isOngoing && styles.completeIconOngoing,
							!isSuccess && !isOngoing && styles.completeIconFail,
						]}
					>
						<MaterialCommunityIcons
							name={
								isSuccess
									? "check-circle-outline"
									: isOngoing
										? "clock-outline"
										: "circle-outline"
							}
							size={64}
							color={
								isSuccess
									? colors.success
									: isOngoing
										? colors.warning
										: colors.muted
							}
						/>
					</View>
				</Animated.View>

				{/* Title */}
				<Text variant="headlineMedium" style={styles.completeTitle}>
					{title}
				</Text>

				{/* "+ 1 meditation" badge — success only */}
				{isSuccess && (
					<View style={styles.meditationBadge}>
						<Text variant="labelMedium" style={styles.meditationBadgeText}>
							+ 1 meditation
						</Text>
					</View>
				)}

				{/* Rank level-up notice — success + leveled-up only */}
				{isSuccess &&
					meditationRankLeveledUp &&
					meditationRankAfter !== null && (
						<View style={styles.rankLevelUpBadge}>
							<MaterialCommunityIcons
								name="star-circle"
								size={18}
								color={colors.warning}
								style={styles.rankLevelUpIcon}
							/>
							<Text variant="labelMedium" style={styles.rankLevelUpText}>
								Meditation Rank {meditationRankAfter} unlocked
							</Text>
						</View>
					)}

				{/* Body */}
				<Text variant="bodyLarge" style={styles.completeBody}>
					{body}
				</Text>

				{/* Done button */}
				<Button
					mode="contained"
					onPress={onDone}
					style={styles.doneButton}
					contentStyle={styles.doneButtonContent}
					labelStyle={styles.doneButtonLabel}
					accessibilityLabel="Return to home screen"
				>
					Done
				</Button>

				{/* Share streak button — only shown on success */}
				{isSuccess && (
					<Button
						mode="outlined"
						onPress={() => void handleShare()}
						loading={isSharing}
						disabled={isSharing}
						style={styles.shareButton}
						contentStyle={styles.doneButtonContent}
						textColor={colors.secondary}
						accessibilityLabel="Share your streak"
					>
						Share your streak
					</Button>
				)}

				{/* Go again link */}
				<Button
					mode="text"
					onPress={onReset}
					textColor={colors.muted}
					accessibilityLabel="Start the reset flow again"
				>
					Go again
				</Button>
			</Animated.View>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

// StepHeader
interface StepHeaderProps {
	title: string;
	subtitle?: string;
}

function StepHeader({ title, subtitle }: StepHeaderProps): React.ReactElement {
	return (
		<View style={styles.stepHeader}>
			<Text variant="headlineMedium" style={styles.stepTitle}>
				{title}
			</Text>
			{subtitle !== undefined && (
				<Text variant="bodyMedium" style={styles.stepSubtitle}>
					{subtitle}
				</Text>
			)}
		</View>
	);
}

// ActionCard
interface ActionCardProps {
	title: string;
	estMinutes: number;
	onPress: () => void;
}

function ActionCard({
	title,
	estMinutes,
	onPress,
}: ActionCardProps): React.ReactElement {
	return (
		<Surface style={styles.actionCard} elevation={2}>
			<View style={styles.actionCardContent}>
				<View style={styles.actionCardText}>
					<Text variant="titleSmall" style={styles.actionCardTitle}>
						{title}
					</Text>
					<Text variant="labelSmall" style={styles.actionCardTime}>
						{estMinutes} min
					</Text>
				</View>
				<IconButton
					icon="chevron-right"
					iconColor={colors.primary}
					size={22}
					onPress={onPress}
					accessibilityLabel={`Select ${title}`}
				/>
			</View>
		</Surface>
	);
}

// SpendDelayCard
interface SpendDelayCardProps {
	title: string;
	body: string;
	ctaLabel: string;
	onCtaPress: () => void;
}

function SpendDelayCard({
	title,
	body,
	ctaLabel,
	onCtaPress,
}: SpendDelayCardProps): React.ReactElement {
	return (
		<Surface style={styles.spendCard} elevation={2}>
			<Text variant="titleSmall" style={styles.spendCardTitle}>
				{title}
			</Text>
			<Text variant="bodySmall" style={styles.spendCardBody}>
				{body}
			</Text>
			<Button
				mode="text"
				onPress={onCtaPress}
				textColor={colors.primary}
				compact
				style={styles.spendCardCta}
			>
				{ctaLabel}
			</Button>
		</Surface>
	);
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
	fallback: {
		flex: 1,
		backgroundColor: colors.background,
	},
	stepContainer: {
		flex: 1,
		backgroundColor: colors.background,
	},
	stepScroll: {
		flex: 1,
	},
	stepScrollContent: {
		paddingHorizontal: 16,
		paddingTop: 56,
		paddingBottom: 40,
		gap: 20,
	},
	stepHeader: {
		gap: 6,
		marginBottom: 4,
	},
	stepTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	stepSubtitle: {
		color: colors.muted,
	},
	cardsContainer: {
		gap: 4,
	},
	footerNote: {
		color: colors.muted,
		textAlign: "center",
		marginTop: 8,
	},
	skipContainer: {
		alignItems: "center",
		marginTop: 8,
	},
	actionCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
	},
	actionCardContent: {
		flexDirection: "row",
		alignItems: "center",
		paddingLeft: 16,
		paddingVertical: 4,
	},
	actionCardText: {
		flex: 1,
		gap: 2,
	},
	actionCardTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	actionCardTime: {
		color: colors.muted,
	},
	spendCard: {
		backgroundColor: colors.surface,
		borderRadius: 12,
		padding: 16,
		marginBottom: 10,
		borderWidth: 1,
		borderColor: colors.border,
		gap: 8,
	},
	spendCardTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	spendCardBody: {
		color: colors.muted,
		lineHeight: 20,
	},
	spendCardCta: {
		alignSelf: "flex-start",
		marginTop: 4,
	},
	divider: {
		backgroundColor: colors.border,
		marginVertical: 8,
	},
	sectionBlock: {
		gap: 10,
	},
	sectionLabel: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 0.8,
	},
	chipRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	triggerChip: {
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border,
	},
	triggerChipSelected: {
		backgroundColor: "#1A3366",
		borderColor: colors.primary,
	},
	triggerChipText: {
		color: colors.muted,
	},
	triggerChipTextSelected: {
		color: colors.primary,
	},
	outcomeButtons: {
		gap: 12,
	},
	outcomeButton: {
		borderRadius: 12,
	},
	outcomeButtonContent: {
		paddingVertical: 6,
	},
	outcomeButtonSuccess: {
		backgroundColor: colors.success,
	},
	outcomeButtonOngoing: {
		backgroundColor: "#3D2E00",
	},
	// Off-screen capture container for share card
	offscreenCapture: {
		position: "absolute",
		top: -9999,
		left: 0,
		opacity: 0,
	},
	// Complete step
	completeContainer: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		paddingHorizontal: 32,
		gap: 16,
	},
	completeIconContainer: {
		width: 112,
		height: 112,
		borderRadius: 56,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 8,
	},
	completeIconSuccess: {
		backgroundColor: "#1A3D2E",
	},
	completeIconOngoing: {
		backgroundColor: "#3D2E00",
	},
	completeIconFail: {
		backgroundColor: "#1C2D47",
	},
	completeTitle: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
	},
	completeBody: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 26,
	},
	meditationBadge: {
		backgroundColor: "#1A3D2E",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 4,
	},
	meditationBadgeText: {
		color: colors.success,
	},
	rankLevelUpBadge: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#3D2E00",
		borderRadius: 12,
		paddingHorizontal: 12,
		paddingVertical: 6,
		gap: 6,
	},
	rankLevelUpIcon: {
		// marginRight handled by gap
	},
	rankLevelUpText: {
		color: colors.warning,
	},
	doneButton: {
		borderRadius: 12,
		width: "100%",
		marginTop: 8,
	},
	shareButton: {
		borderRadius: 12,
		width: "100%",
		borderColor: colors.secondary,
	},
	doneButtonContent: {
		paddingVertical: 8,
	},
	doneButtonLabel: {
		fontSize: 16,
		fontWeight: "700",
	},
});
