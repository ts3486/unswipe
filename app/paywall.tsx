// Paywall screen — one-time purchase redesign.
// Shows emotional hook, social proof, value props, price block, and CTA.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import type { PaywallTriggerSource } from "@/src/domain/types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Card, Divider, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface ValueProp {
	icon: string;
	title: string;
	description: string;
}

const VALUE_PROPS: ValueProp[] = [
	{
		icon: "timer-outline",
		title: "60-second panic reset",
		description:
			"A fast, structured protocol to interrupt urges before they take over.",
	},
	{
		icon: "shield-check-outline",
		title: "Spend delay cards",
		description:
			"Pause before in-app purchases with friction cards that buy you time.",
	},
	{
		icon: "chart-bar",
		title: "Track your progress",
		description:
			"See streaks, resist rank, and patterns that show how far you've come.",
	},
];

const TRIGGER_MESSAGES: Record<
	PaywallTriggerSource,
	{ headline: string; subtext: string }
> = {
	settings: {
		headline: "You've already taken the first step",
		subtext: "Unlock everything Unmatch has to offer with a single purchase.",
	},
	panic_limit: {
		headline: "You're building real momentum",
		subtext: "Unlock the full panic reset toolkit to keep that momentum going.",
	},
	learn_locked: {
		headline: "Ready to go deeper?",
		subtext: "Unlock the full course library to build lasting habits.",
	},
	progress_locked: {
		headline: "Your progress is real",
		subtext:
			"Unlock detailed insights to see exactly how much ground you've covered.",
	},
	onboarding: {
		headline: "You've already taken the first step",
		subtext:
			"Join thousands of people taking back their time — one resist at a time.",
	},
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallScreen(): React.ReactElement {
	const analytics = useAnalytics();
	const { unlockPremium } = useAppState();
	const params = useLocalSearchParams<{ trigger_source?: string }>();

	const triggerSource: PaywallTriggerSource =
		(params.trigger_source as PaywallTriggerSource | undefined) ?? "settings";

	const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

	const copy = TRIGGER_MESSAGES[triggerSource] ?? TRIGGER_MESSAGES.settings;

	// Fire paywall_viewed on mount.
	useEffect(() => {
		analytics.track({
			name: "paywall_viewed",
			props: { trigger_source: triggerSource },
		});
	}, [analytics, triggerSource]);

	const handlePurchase = useCallback((): void => {
		setIsPurchasing(true);
		setFeedbackMessage(null);
		// Stub: in production this calls StoreKit / RevenueCat.
		// On success, call unlockPremium() and navigate back.
		setTimeout(async () => {
			try {
				await unlockPremium("unmatch_one_time_699");
				analytics.track({
					name: "purchase_completed",
					props: { product_id: "unmatch_one_time_699" },
				});
				router.back();
			} catch {
				setFeedbackMessage(
					"Purchase could not be completed. Please try again.",
				);
			} finally {
				setIsPurchasing(false);
			}
		}, 800);
	}, [unlockPremium, analytics]);

	const handleRestore = useCallback((): void => {
		setFeedbackMessage(
			"Restore purchases is not available yet in this version.",
		);
	}, []);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{/* Emotional hook */}
			<View style={styles.header}>
				<Text variant="headlineMedium" style={styles.headline}>
					{copy.headline}
				</Text>
				<Text variant="bodyLarge" style={styles.subtext}>
					{copy.subtext}
				</Text>
			</View>

			{/* Social proof bar */}
			<View style={styles.socialProofBar}>
				<MaterialCommunityIcons
					name="account-group-outline"
					size={18}
					color={colors.secondary}
				/>
				<Text variant="bodySmall" style={styles.socialProofText}>
					Join 4,000+ people taking back their time
				</Text>
			</View>

			{/* Value props */}
			<Card style={styles.valueCard} mode="contained">
				<Card.Content style={styles.valueCardContent}>
					{VALUE_PROPS.map((prop, idx) => (
						<React.Fragment key={prop.title}>
							<View style={styles.valueRow}>
								<View style={styles.valueIconWrap}>
									<MaterialCommunityIcons
										name={prop.icon as never}
										size={22}
										color={colors.primary}
									/>
								</View>
								<View style={styles.valueText}>
									<Text variant="titleSmall" style={styles.valueTitle}>
										{prop.title}
									</Text>
									<Text variant="bodySmall" style={styles.valueDesc}>
										{prop.description}
									</Text>
								</View>
							</View>
							{idx < VALUE_PROPS.length - 1 && (
								<Divider style={styles.valueDivider} />
							)}
						</React.Fragment>
					))}
				</Card.Content>
			</Card>

			{/* Price block */}
			<Card style={styles.priceCard} mode="contained">
				<Card.Content style={styles.priceCardContent}>
					<Text variant="displaySmall" style={styles.priceAmount}>
						$6.99
					</Text>
					<Text variant="titleSmall" style={styles.priceLabel}>
						One-time purchase. No subscription. No account.
					</Text>
					<Text variant="bodySmall" style={styles.priceComparison}>
						Less than one Tinder boost.
					</Text>
				</Card.Content>
			</Card>

			{/* CTA */}
			<Button
				mode="contained"
				onPress={handlePurchase}
				loading={isPurchasing}
				disabled={isPurchasing}
				style={styles.ctaButton}
				contentStyle={styles.ctaButtonContent}
				labelStyle={styles.ctaButtonLabel}
				accessibilityLabel="Unlock Unmatch — one-time purchase for $6.99"
				accessibilityRole="button"
				accessibilityState={{ disabled: isPurchasing, busy: isPurchasing }}
			>
				Unlock Unmatch
			</Button>

			{/* Trust signals */}
			<View style={styles.trustRow}>
				<View style={styles.trustItem}>
					<MaterialCommunityIcons
						name="lock-outline"
						size={14}
						color={colors.muted}
					/>
					<Text variant="bodySmall" style={styles.trustText}>
						All data stays on your device
					</Text>
				</View>
				<View style={styles.trustItem}>
					<MaterialCommunityIcons
						name="account-off-outline"
						size={14}
						color={colors.muted}
					/>
					<Text variant="bodySmall" style={styles.trustText}>
						No account required
					</Text>
				</View>
			</View>

			{/* Restore link */}
			<Button
				mode="text"
				onPress={handleRestore}
				textColor={colors.muted}
				style={styles.restoreButton}
				labelStyle={styles.restoreLabel}
				accessibilityLabel="Restore previous purchase"
				accessibilityRole="button"
			>
				Restore purchase
			</Button>

			{/* Feedback message */}
			{feedbackMessage !== null && (
				<View style={styles.feedbackBox}>
					<Text variant="bodySmall" style={styles.feedbackText}>
						{feedbackMessage}
					</Text>
				</View>
			)}

			<View style={styles.bottomSpacer} />
		</ScrollView>
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
	content: {
		paddingHorizontal: 20,
		paddingTop: 48,
		paddingBottom: 40,
		gap: 18,
	},
	// Header
	header: {
		alignItems: "center",
		gap: 10,
		paddingBottom: 4,
	},
	headline: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
		lineHeight: 32,
	},
	subtext: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 26,
	},
	// Social proof
	socialProofBar: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 6,
		backgroundColor: colors.surface,
		borderRadius: 10,
		paddingVertical: 10,
		paddingHorizontal: 16,
		borderWidth: 1,
		borderColor: colors.border,
	},
	socialProofText: {
		color: colors.secondary,
		fontWeight: "600",
	},
	// Value props card
	valueCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	valueCardContent: {
		paddingVertical: 4,
	},
	valueRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		gap: 14,
		paddingVertical: 14,
	},
	valueIconWrap: {
		width: 38,
		height: 38,
		borderRadius: 10,
		backgroundColor: "#0F1D3A",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	valueText: {
		flex: 1,
		gap: 3,
	},
	valueTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	valueDesc: {
		color: colors.muted,
		lineHeight: 18,
	},
	valueDivider: {
		backgroundColor: colors.border,
		marginLeft: 52,
	},
	// Price block
	priceCard: {
		backgroundColor: "#0F1D3A",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	priceCardContent: {
		alignItems: "center",
		paddingVertical: 12,
		gap: 4,
	},
	priceAmount: {
		color: colors.text,
		fontWeight: "700",
		textAlign: "center",
		letterSpacing: -0.5,
	},
	priceLabel: {
		color: colors.muted,
		textAlign: "center",
		fontWeight: "400",
	},
	priceComparison: {
		color: colors.warning,
		textAlign: "center",
		fontWeight: "500",
		marginTop: 2,
	},
	// CTA button
	ctaButton: {
		borderRadius: 14,
		backgroundColor: colors.primary,
	},
	ctaButtonContent: {
		paddingVertical: 10,
	},
	ctaButtonLabel: {
		fontSize: 17,
		fontWeight: "700",
		letterSpacing: 0.3,
		color: "#FFFFFF",
	},
	// Trust signals
	trustRow: {
		flexDirection: "row",
		justifyContent: "center",
		gap: 20,
		flexWrap: "wrap",
	},
	trustItem: {
		flexDirection: "row",
		alignItems: "center",
		gap: 5,
	},
	trustText: {
		color: colors.muted,
	},
	// Restore
	restoreButton: {
		alignSelf: "center",
		marginTop: -6,
	},
	restoreLabel: {
		fontSize: 13,
		textDecorationLine: "underline",
	},
	// Feedback
	feedbackBox: {
		backgroundColor: colors.surface,
		borderRadius: 10,
		padding: 12,
		borderWidth: 1,
		borderColor: colors.border,
	},
	feedbackText: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 18,
	},
	bottomSpacer: {
		height: 16,
	},
});
