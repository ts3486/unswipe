// Paywall screen — hard gate after onboarding.
// Two tiers: $4.99/month or $29.99 lifetime. Non-dismissable.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PRODUCT_MONTHLY = "unmatch_monthly_499";
const PRODUCT_LIFETIME = "unmatch_lifetime_2999";

type PlanType = "monthly" | "lifetime";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FeatureItem {
	icon: string;
	label: string;
}

const FEATURES: FeatureItem[] = [
	{ icon: "timer-outline", label: "60-second panic reset — anytime, offline" },
	{ icon: "clipboard-check-outline", label: "Daily check-in — private self-reflection" },
	{ icon: "credit-card-off-outline", label: "Spend delay cards — think before you boost" },
	{ icon: "book-open-variant", label: "7-day starter course — learn the patterns" },
	{ icon: "chart-line", label: "Progress tracking — streaks, rank, insights" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallScreen(): React.ReactElement {
	const analytics = useAnalytics();
	const { unlockPremium } = useAppState();

	const [selectedPlan, setSelectedPlan] = useState<PlanType>("lifetime");
	const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

	// Fire paywall_viewed on mount.
	useEffect(() => {
		analytics.track({
			name: "paywall_viewed",
			props: { trigger_source: "hard_gate" },
		});
	}, [analytics]);

	const handlePurchase = useCallback((): void => {
		setIsPurchasing(true);
		setFeedbackMessage(null);
		const productId = selectedPlan === "lifetime" ? PRODUCT_LIFETIME : PRODUCT_MONTHLY;
		// Stub: in production this calls StoreKit / RevenueCat.
		setTimeout(async () => {
			try {
				await unlockPremium(productId, selectedPlan);
				analytics.track({
					name: "purchase_completed",
					props: { product_id: productId, period: selectedPlan },
				});
				router.replace("/(tabs)");
			} catch {
				setFeedbackMessage(
					"Purchase could not be completed. Please try again.",
				);
			} finally {
				setIsPurchasing(false);
			}
		}, 800);
	}, [unlockPremium, analytics, selectedPlan]);

	const handleRestore = useCallback((): void => {
		setFeedbackMessage(
			"Restore purchases is not available yet in this version.",
		);
	}, []);

	const ctaLabel =
		selectedPlan === "lifetime"
			? "Get Unmatch — $29.99"
			: "Subscribe — $4.99/month";

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{/* Headline */}
			<View style={styles.header}>
				<Text variant="headlineMedium" style={styles.headline}>
					Take back your time
				</Text>
				<Text variant="bodyLarge" style={styles.subtext}>
					Everything you need to be intentional about dating apps.
				</Text>
			</View>

			{/* Feature list */}
			<View style={styles.featureList}>
				{FEATURES.map((feature) => (
					<View key={feature.label} style={styles.featureRow}>
						<View style={styles.featureIconWrap}>
							<MaterialCommunityIcons
								name={feature.icon as never}
								size={20}
								color={colors.primary}
							/>
						</View>
						<Text variant="bodyMedium" style={styles.featureLabel}>
							{feature.label}
						</Text>
					</View>
				))}
			</View>

			{/* Plan selector */}
			<View style={styles.planSelector}>
				<TouchableOpacity
					style={[
						styles.planCard,
						selectedPlan === "monthly" && styles.planCardSelected,
					]}
					onPress={() => { setSelectedPlan("monthly"); }}
					accessibilityLabel="Monthly plan — $4.99 per month"
					accessibilityRole="button"
					accessibilityState={{ selected: selectedPlan === "monthly" }}
				>
					<Text variant="titleMedium" style={styles.planPrice}>
						$4.99/month
					</Text>
					<Text variant="bodySmall" style={styles.planNote}>
						Cancel anytime
					</Text>
				</TouchableOpacity>

				<TouchableOpacity
					style={[
						styles.planCard,
						selectedPlan === "lifetime" && styles.planCardSelected,
					]}
					onPress={() => { setSelectedPlan("lifetime"); }}
					accessibilityLabel="Lifetime plan — $29.99 one-time purchase"
					accessibilityRole="button"
					accessibilityState={{ selected: selectedPlan === "lifetime" }}
				>
					<View style={styles.bestValueBadge}>
						<Text style={styles.bestValueText}>Best value</Text>
					</View>
					<Text variant="titleMedium" style={styles.planPrice}>
						$29.99
					</Text>
					<Text variant="bodySmall" style={styles.planNote}>
						One-time purchase
					</Text>
				</TouchableOpacity>
			</View>

			{/* CTA */}
			<Button
				mode="contained"
				onPress={handlePurchase}
				loading={isPurchasing}
				disabled={isPurchasing}
				style={styles.ctaButton}
				contentStyle={styles.ctaButtonContent}
				labelStyle={styles.ctaButtonLabel}
				accessibilityLabel={ctaLabel}
				accessibilityRole="button"
				accessibilityState={{ disabled: isPurchasing, busy: isPurchasing }}
			>
				{ctaLabel}
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

			{/* Terms — only shown when monthly selected */}
			{selectedPlan === "monthly" && (
				<Text variant="bodySmall" style={styles.termsText}>
					Subscription renews monthly. Cancel anytime.
				</Text>
			)}

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
	// Feature list
	featureList: {
		gap: 12,
		paddingVertical: 4,
	},
	featureRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	featureIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: "#0F1D3A",
		alignItems: "center",
		justifyContent: "center",
		flexShrink: 0,
	},
	featureLabel: {
		color: colors.text,
		flex: 1,
	},
	// Plan selector
	planSelector: {
		flexDirection: "row",
		gap: 12,
	},
	planCard: {
		flex: 1,
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 2,
		borderColor: colors.border,
		paddingVertical: 20,
		paddingHorizontal: 12,
		alignItems: "center",
		gap: 4,
	},
	planCardSelected: {
		borderColor: colors.primary,
		backgroundColor: "#0F1D3A",
	},
	planPrice: {
		color: colors.text,
		fontWeight: "700",
	},
	planNote: {
		color: colors.muted,
		textAlign: "center",
	},
	bestValueBadge: {
		backgroundColor: colors.warning,
		borderRadius: 6,
		paddingHorizontal: 8,
		paddingVertical: 2,
		marginBottom: 4,
	},
	bestValueText: {
		color: colors.background,
		fontSize: 11,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
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
	// Terms
	termsText: {
		color: colors.muted,
		textAlign: "center",
		fontSize: 12,
		lineHeight: 16,
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
