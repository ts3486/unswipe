// Daily check-in screen.
// Collects mood/fatigue/urge ratings, late-night flag, and spend info.
// Privacy: note and spent_amount are never sent to analytics.
// TypeScript strict mode.

import {
	FATIGUE_LABELS,
	MOOD_LABELS,
	RatingChips,
	URGE_LABELS,
} from "@/src/components/RatingChips";
import { colors } from "@/src/constants/theme";
import { useCheckin } from "@/src/hooks/useCheckin";
import { router } from "expo-router";
import type React from "react";
import { useCallback } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	StyleSheet,
	View,
} from "react-native";
import {
	Button,
	Card,
	Chip,
	Divider,
	Text,
	TextInput,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Sub-component: YesNoToggle
// ---------------------------------------------------------------------------

interface YesNoToggleProps {
	label: string;
	value: boolean | null;
	onChange: (v: boolean) => void;
	readonly?: boolean;
}

function YesNoToggle({
	label,
	value,
	onChange,
	readonly = false,
}: YesNoToggleProps): React.ReactElement {
	return (
		<View style={styles.yesNoRow}>
			<Text variant="labelLarge" style={styles.ratingLabel}>
				{label}
			</Text>
			<View style={styles.chipRow}>
				<Chip
					selected={value === true}
					onPress={
						readonly
							? undefined
							: () => {
									onChange(true);
								}
					}
					style={[styles.ratingChip, value === true && styles.yesChipSelected]}
					textStyle={[
						styles.ratingChipText,
						value === true && styles.ratingChipTextSelected,
					]}
					compact
				>
					Yes
				</Chip>
				<Chip
					selected={value === false}
					onPress={
						readonly
							? undefined
							: () => {
									onChange(false);
								}
					}
					style={[styles.ratingChip, value === false && styles.noChipSelected]}
					textStyle={[
						styles.ratingChipText,
						value === false && styles.ratingChipTextSelected,
					]}
					compact
				>
					No
				</Chip>
			</View>
		</View>
	);
}

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function CheckinScreen(): React.ReactElement {
	const {
		mood,
		fatigue,
		urge,
		note,
		openedAtNight,
		spentToday,
		spentAmount,
		isSubmitting,
		isComplete,
		existingCheckin,
		setMood,
		setFatigue,
		setUrge,
		setNote,
		setOpenedAtNight,
		setSpentToday,
		setSpentAmount,
		submit,
	} = useCheckin();

	const handleSubmit = useCallback((): void => {
		void submit();
	}, [submit]);

	const handleClose = useCallback((): void => {
		if (router.canGoBack()) {
			router.back();
		} else {
			router.replace("/(tabs)");
		}
	}, []);

	const handleSpentAmountChange = useCallback(
		(text: string): void => {
			const parsed = Number.parseFloat(text);
			if (!isNaN(parsed) && parsed >= 0) {
				setSpentAmount(Math.round(parsed * 100));
			} else if (text.trim() === "") {
				setSpentAmount(0);
			}
		},
		[setSpentAmount],
	);

	const spentAmountDollars =
		spentAmount !== null && spentAmount > 0
			? (spentAmount / 100).toFixed(2)
			: "";

	// ---------------------------------------------------------------------------
	// Read-only summary (already submitted today)
	// ---------------------------------------------------------------------------

	if (isComplete && existingCheckin !== null) {
		return (
			<ScrollView
				style={styles.root}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Text variant="headlineMedium" style={styles.screenTitle}>
						Today's check-in
					</Text>
					<Text variant="bodyMedium" style={styles.subtitle}>
						Already submitted for today.
					</Text>
				</View>

				<Card style={styles.card} mode="contained">
					<Card.Content style={styles.summaryContent}>
						<RatingChips
							label="Mood"
							value={existingCheckin.mood}
							onChange={() => {}}
							readonly
							labelMap={MOOD_LABELS}
						/>
						<Divider style={styles.divider} />
						<RatingChips
							label="Fatigue"
							value={existingCheckin.fatigue}
							onChange={() => {}}
							readonly
							labelMap={FATIGUE_LABELS}
						/>
						<Divider style={styles.divider} />
						<RatingChips
							label="Urge level"
							value={existingCheckin.urge}
							onChange={() => {}}
							readonly
							labelMap={URGE_LABELS}
						/>

						{existingCheckin.opened_at_night !== null && (
							<>
								<Divider style={styles.divider} />
								<View style={styles.readonlyRow}>
									<Text variant="bodyMedium" style={styles.ratingLabel}>
										Opened app late at night
									</Text>
									<Text variant="bodyMedium" style={styles.readonlyValue}>
										{existingCheckin.opened_at_night === 1 ? "Yes" : "No"}
									</Text>
								</View>
							</>
						)}

						{existingCheckin.spent_today !== null && (
							<>
								<Divider style={styles.divider} />
								<View style={styles.readonlyRow}>
									<Text variant="bodyMedium" style={styles.ratingLabel}>
										Spent money on dating today
									</Text>
									<Text variant="bodyMedium" style={styles.readonlyValue}>
										{existingCheckin.spent_today === 1 ? "Yes" : "No"}
									</Text>
								</View>
							</>
						)}
					</Card.Content>
				</Card>

				<Button
					mode="outlined"
					onPress={handleClose}
					style={styles.closeButton}
					textColor={colors.muted}
				>
					Close
				</Button>

				<View style={styles.bottomSpacer} />
			</ScrollView>
		);
	}

	// ---------------------------------------------------------------------------
	// Check-in form
	// ---------------------------------------------------------------------------

	return (
		<KeyboardAvoidingView
			style={styles.root}
			behavior={Platform.OS === "ios" ? "padding" : "height"}
		>
			<ScrollView
				style={styles.scroll}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
			>
				<View style={styles.header}>
					<Text variant="headlineMedium" style={styles.screenTitle}>
						Daily check-in
					</Text>
					<Text variant="bodyMedium" style={styles.subtitle}>
						At the end of the day, reflect on your mood, urges, and patterns. This helps you understand your relationship with dating apps and track your progress over time.
					</Text>
				</View>

				<Card style={styles.card} mode="contained">
					<Card.Content style={styles.formContent}>
						<RatingChips
							label="Mood"
							value={mood}
							onChange={setMood}
							labelMap={MOOD_LABELS}
							subtitle="How are you feeling right now?"
						/>
						<Divider style={styles.divider} />
						<RatingChips
							label="Fatigue"
							value={fatigue}
							onChange={setFatigue}
							labelMap={FATIGUE_LABELS}
						/>
						<Divider style={styles.divider} />
						<RatingChips
							label="Urge level"
							value={urge}
							onChange={setUrge}
							labelMap={URGE_LABELS}
						/>
					</Card.Content>
				</Card>

				<Card style={styles.card} mode="contained">
					<Card.Content style={styles.formContent}>
						<YesNoToggle
							label="Opened a dating app late at night?"
							value={openedAtNight}
							onChange={setOpenedAtNight}
						/>
						<Divider style={styles.divider} />
						<YesNoToggle
							label="Spent money on dating today?"
							value={spentToday}
							onChange={setSpentToday}
						/>

						{spentToday === true && (
							<View style={styles.amountContainer}>
								<TextInput
									mode="outlined"
									label="Approximate amount (optional)"
									placeholder="0.00"
									value={spentAmountDollars}
									onChangeText={handleSpentAmountChange}
									keyboardType="decimal-pad"
									left={<TextInput.Affix text="$" />}
									style={styles.amountInput}
									outlineColor={colors.border}
									activeOutlineColor={colors.primary}
									textColor={colors.text}
									placeholderTextColor={colors.muted}
								/>
								<Text variant="bodySmall" style={styles.amountNote}>
									Amount is stored locally and never shared.
								</Text>
							</View>
						)}
					</Card.Content>
				</Card>

				<Card style={styles.card} mode="contained">
					<Card.Content>
						<TextInput
							mode="outlined"
							label="Personal note (optional)"
							placeholder="For your eyes only"
							value={note}
							onChangeText={setNote}
							multiline
							numberOfLines={4}
							style={styles.noteInput}
							outlineColor={colors.border}
							activeOutlineColor={colors.primary}
							textColor={colors.text}
							placeholderTextColor={colors.muted}
						/>
						<Text variant="bodySmall" style={styles.noteNote}>
							Notes are never included in analytics or exports.
						</Text>
					</Card.Content>
				</Card>

				<View style={styles.bottomSpacer} />
			</ScrollView>

			{/* Sticky bottom */}
			<View style={styles.stickyBottom}>
				<Button
					mode="contained"
					onPress={handleSubmit}
					loading={isSubmitting}
					disabled={isSubmitting}
					style={styles.submitButton}
					contentStyle={styles.submitButtonContent}
					labelStyle={styles.submitButtonLabel}
				>
					Save my reflection
				</Button>
				<Button mode="text" onPress={handleClose} textColor={colors.muted}>
					Maybe later
				</Button>
			</View>
		</KeyboardAvoidingView>
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
	scroll: {
		flex: 1,
	},
	content: {
		paddingHorizontal: 16,
		paddingTop: 20,
		paddingBottom: 140,
		gap: 16,
	},
	header: {
		gap: 6,
	},
	screenTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	subtitle: {
		color: colors.muted,
		lineHeight: 22,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	formContent: {
		paddingVertical: 4,
		gap: 2,
	},
	summaryContent: {
		paddingVertical: 4,
		gap: 2,
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
	yesChipSelected: {
		backgroundColor: "#0F1D3A",
		borderColor: colors.primary,
	},
	noChipSelected: {
		backgroundColor: "#0F1D3A",
		borderColor: colors.primary,
	},
	ratingChipText: {
		color: colors.muted,
	},
	ratingChipTextSelected: {
		color: colors.text,
		fontWeight: "600",
	},
	divider: {
		backgroundColor: colors.border,
	},
	readonlyRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
	},
	readonlyValue: {
		color: colors.text,
		fontWeight: "500",
	},
	amountContainer: {
		paddingTop: 8,
		gap: 6,
	},
	amountInput: {
		backgroundColor: colors.background,
	},
	amountNote: {
		color: colors.muted,
		lineHeight: 18,
	},
	noteInput: {
		backgroundColor: colors.background,
		minHeight: 100,
	},
	noteNote: {
		color: colors.muted,
		lineHeight: 18,
		marginTop: 6,
	},
	stickyBottom: {
		position: "absolute",
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: colors.background,
		paddingHorizontal: 16,
		paddingTop: 12,
		paddingBottom: Platform.OS === "ios" ? 36 : 24,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		gap: 4,
	},
	submitButton: {
		borderRadius: 14,
	},
	submitButtonContent: {
		paddingVertical: 8,
	},
	submitButtonLabel: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: 0.5,
	},
	closeButton: {
		borderColor: colors.border,
		borderRadius: 14,
	},
	bottomSpacer: {
		height: 24,
	},
});
