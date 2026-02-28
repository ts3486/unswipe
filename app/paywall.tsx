// Paywall screen — two modes: trial offer (post-onboarding) or conversion (trial expired).
// Monthly only — no lifetime plan. Non-dismissable.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import {
	getOfferings,
	isPremiumFromCustomerInfo,
	purchasePackage,
	restorePurchases,
	syncSubscriptionToDb,
} from "@/src/services/subscription-service";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

interface FeatureItem {
	icon: string;
	label: string;
}

const FEATURES: FeatureItem[] = [
	{ icon: "timer-outline", label: "60-second panic reset — anytime, offline" },
	{
		icon: "clipboard-check-outline",
		label: "Daily check-in — private self-reflection",
	},
	{
		icon: "credit-card-off-outline",
		label: "Spend delay cards — think before you boost",
	},
	{
		icon: "book-open-variant",
		label: "7-day starter course — learn the patterns",
	},
	{ icon: "chart-line", label: "Progress tracking — streaks, rank, insights" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaywallScreen(): React.ReactElement {
	const analytics = useAnalytics();
	const { startTrial, trialInfo, refreshPremiumStatus } = useAppState();
	const { db } = useDatabaseContext();

	const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
	const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

	const isTrialOffer = !trialInfo.hasStartedTrial;
	const triggerSource = isTrialOffer ? "trial_offer" : "trial_expired";

	// Fire paywall_viewed on mount.
	useEffect(() => {
		analytics.track({
			name: "paywall_viewed",
			props: { trigger_source: triggerSource },
		});
	}, [analytics, triggerSource]);

	const handleStartTrial = useCallback(async (): Promise<void> => {
		setIsPurchasing(true);
		setFeedbackMessage(null);
		try {
			await startTrial();
			analytics.track({
				name: "trial_started",
				props: {},
			});
			router.replace("/(tabs)");
		} catch {
			setFeedbackMessage("Could not start your free trial. Please try again.");
		} finally {
			setIsPurchasing(false);
		}
	}, [startTrial, analytics]);

	const handlePurchase = useCallback(async (): Promise<void> => {
		if (isPurchasing) return;
		setIsPurchasing(true);
		setFeedbackMessage(null);
		try {
			const offering = await getOfferings();
			if (!offering || !offering.monthly) {
				setFeedbackMessage(
					"Unable to load subscription options. Please try again.",
				);
				return;
			}
			const customerInfo = await purchasePackage(offering.monthly);
			await syncSubscriptionToDb(db, customerInfo);
			await refreshPremiumStatus();
			const productId = offering.monthly.product.identifier;
			analytics.track({
				name: "purchase_completed",
				props: { product_id: productId, period: "monthly" },
			});
			router.replace("/(tabs)");
		} catch (err: unknown) {
			const isCancelled =
				err !== null &&
				typeof err === "object" &&
				"userCancelled" in err &&
				(err as { userCancelled: boolean }).userCancelled;
			if (!isCancelled) {
				setFeedbackMessage(
					"Purchase could not be completed. Please try again.",
				);
			}
		} finally {
			setIsPurchasing(false);
		}
	}, [isPurchasing, db, refreshPremiumStatus, analytics]);

	const handleRestore = useCallback(async (): Promise<void> => {
		if (isPurchasing) return;
		setIsPurchasing(true);
		setFeedbackMessage(null);
		try {
			const customerInfo = await restorePurchases();
			await syncSubscriptionToDb(db, customerInfo);
			await refreshPremiumStatus();
			if (isPremiumFromCustomerInfo(customerInfo)) {
				router.replace("/(tabs)");
			} else {
				setFeedbackMessage("No previous purchases found.");
			}
		} catch {
			setFeedbackMessage("Could not restore purchases. Please try again.");
		} finally {
			setIsPurchasing(false);
		}
	}, [isPurchasing, db, refreshPremiumStatus]);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			{/* Logo + Headline */}
			<View style={styles.header}>
				<Logo markSize={48} layout="vertical" />
				<Text variant="headlineMedium" style={styles.headline}>
					{isTrialOffer
						? "Pause from dating apps"
						: "Your free trial has ended"}
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

			{/* Price comparison callout */}
			<View style={styles.priceCompareWrap}>
				<View style={styles.priceCompareBadge}>
					<Text style={styles.priceCompareBadgeText}>
						CHEAPER THAN ONE TINDER BOOST
					</Text>
				</View>
				<View style={styles.priceCompare}>
					<Text variant="titleMedium" style={styles.priceComparePrice}>
						$4.99/month
					</Text>
					<Text variant="bodySmall" style={styles.priceCompareContext}>
						A single boost costs $5.99 and lasts 30 minutes.{"\n"}
						Unmatch costs less — and works all month.
					</Text>
				</View>
			</View>

			{/* CTA */}
			{isTrialOffer ? (
				<>
					<Button
						mode="contained"
						onPress={() => {
							void handleStartTrial();
						}}
						loading={isPurchasing}
						disabled={isPurchasing}
						style={styles.ctaButton}
						contentStyle={styles.ctaButtonContent}
						labelStyle={styles.ctaButtonLabel}
						accessibilityLabel="Try 7 Days for Free"
						accessibilityRole="button"
						accessibilityState={{ disabled: isPurchasing, busy: isPurchasing }}
					>
						Try 7 Days for Free
					</Button>
					<Text variant="bodySmall" style={styles.pricingNote}>
						Then $4.99/month — cheaper than a single boost
					</Text>
					<Text variant="bodySmall" style={styles.cancelNote}>
						Cancel anytime in Settings
					</Text>
				</>
			) : (
				<>
					<Button
						mode="contained"
						onPress={() => {
							void handlePurchase();
						}}
						loading={isPurchasing}
						disabled={isPurchasing}
						style={styles.ctaButton}
						contentStyle={styles.ctaButtonContent}
						labelStyle={styles.ctaButtonLabel}
						accessibilityLabel="Subscribe — $4.99/month"
						accessibilityRole="button"
						accessibilityState={{ disabled: isPurchasing, busy: isPurchasing }}
					>
						Subscribe — $4.99/month
					</Button>
					<Text variant="bodySmall" style={styles.pricingNote}>
						Cheaper than a single boost. Cancel anytime.
					</Text>

					{/* Restore link */}
					<Button
						mode="text"
						onPress={() => {
							void handleRestore();
						}}
						textColor={colors.muted}
						style={styles.restoreButton}
						labelStyle={styles.restoreLabel}
						accessibilityLabel="Restore previous purchase"
						accessibilityRole="button"
					>
						Restore purchase
					</Button>
				</>
			)}

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

			{/* Terms */}
			<Text variant="bodySmall" style={styles.termsText}>
				Subscription renews monthly. Cancel anytime.
			</Text>

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
		paddingTop: 40,
		paddingBottom: 24,
		gap: 16,
	},
	// Header
	header: {
		alignItems: "center",
		gap: 10,
		paddingBottom: 2,
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
	// Price comparison callout
	priceCompareWrap: {
		alignItems: "center",
		marginTop: 2,
	},
	priceCompareBadge: {
		backgroundColor: colors.warning,
		borderRadius: 8,
		paddingHorizontal: 12,
		paddingVertical: 4,
		marginBottom: -14,
		zIndex: 1,
	},
	priceCompareBadgeText: {
		color: colors.background,
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 0.8,
	},
	priceCompare: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.warning,
		paddingTop: 22,
		paddingBottom: 14,
		paddingHorizontal: 20,
		alignItems: "center",
		alignSelf: "stretch",
		gap: 6,
	},
	priceComparePrice: {
		color: colors.text,
		fontWeight: "700",
	},
	priceCompareContext: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 18,
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
	// Pricing note
	pricingNote: {
		color: colors.muted,
		textAlign: "center",
		fontSize: 13,
		lineHeight: 18,
		marginTop: -8,
	},
	cancelNote: {
		color: colors.muted,
		textAlign: "center",
		fontSize: 12,
		lineHeight: 16,
		marginTop: -10,
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
		height: 8,
	},
});
