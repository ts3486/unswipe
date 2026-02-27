// Settings tab screen.
// Provides toggles, navigation, and section list items.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { updateUserProfile } from "@/src/data/repositories";
import type { NotificationStyle } from "@/src/domain/types";
import {
	cancelAllScheduled,
	requestPermissions,
} from "@/src/services/notifications";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, Surface, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// WhyWeCharge — inline expandable card
// ---------------------------------------------------------------------------

function WhyWeCharge(): React.ReactElement {
	const [expanded, setExpanded] = useState(false);

	return (
		<Surface style={styles.whyCard} elevation={1}>
			<List.Item
				title="Why Unmatch costs $6.99"
				description={
					expanded
						? "No ads. No data selling. No subscription traps. Your one-time purchase funds development and keeps your data private. We'll never show ads or sell your information."
						: "Tap to learn why we charge a one-time fee."
				}
				titleStyle={styles.listTitle}
				descriptionStyle={[
					styles.listDesc,
					expanded && styles.listDescExpanded,
				]}
				descriptionNumberOfLines={expanded ? 0 : 1}
				onPress={() => {
					setExpanded((prev) => !prev);
				}}
				accessibilityLabel={`Why Unmatch costs $6.99 — ${expanded ? "collapse" : "expand"}`}
				accessibilityRole="button"
				accessibilityState={{ expanded }}
				left={() => (
					<List.Icon icon="information-outline" color={colors.secondary} />
				)}
				right={() => (
					<List.Icon
						icon={expanded ? "chevron-up" : "chevron-down"}
						color={colors.muted}
					/>
				)}
			/>
		</Surface>
	);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsScreen(): React.ReactElement {
	const { userProfile, refreshProfile, isPremium } = useAppState();
	const { db } = useDatabaseContext();

	const [notifStyle, setNotifStyle] = useState<NotificationStyle>(
		userProfile?.notification_style ?? "normal",
	);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	// ---------------------------------------------------------------------------
	// Actions
	// ---------------------------------------------------------------------------

	const cycleNotifStyle = useCallback(async (): Promise<void> => {
		if (userProfile === null || isUpdating) {
			return;
		}
		const cycle: NotificationStyle[] = ["normal", "stealth", "off"];
		const currentIdx = cycle.indexOf(notifStyle);
		const next = cycle[(currentIdx + 1) % cycle.length] as NotificationStyle;
		setNotifStyle(next);
		setIsUpdating(true);
		try {
			await updateUserProfile(db, userProfile.id, { notification_style: next });
			await refreshProfile();

			if (next === "off") {
				await cancelAllScheduled();
			} else {
				const granted = await requestPermissions();
				if (!granted) {
					Alert.alert(
						"Notifications Disabled",
						"You can enable notifications in your device settings.",
					);
				}
			}
		} finally {
			setIsUpdating(false);
		}
	}, [db, userProfile, refreshProfile, notifStyle, isUpdating]);

	const notifLabel: Record<NotificationStyle, string> = {
		normal: "Normal",
		stealth: "Stealth",
		off: "Off",
	};

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<ScrollView
			style={styles.root}
			contentContainerStyle={styles.content}
			showsVerticalScrollIndicator={false}
		>
			<Text variant="headlineMedium" style={styles.screenTitle}>
				Settings
			</Text>

			{/* Notifications */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Your Notifications
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="Notification style"
					description={`Current: ${notifLabel[notifStyle]}`}
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						void cycleNotifStyle();
					}}
					accessibilityLabel={`Notification style: ${notifLabel[notifStyle]}. Tap to change.`}
					accessibilityRole="button"
					right={() => (
						<Text variant="labelMedium" style={styles.rightLabel}>
							{notifLabel[notifStyle]}
						</Text>
					)}
				/>
			</View>

			{/* Resources */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Tools
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="Blocker guide"
					description="How to limit dating app access using device settings"
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						router.push("/settings/blocker-guide");
					}}
					accessibilityLabel="Blocker guide — how to limit dating app access"
					accessibilityRole="button"
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

			{/* Data */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Your Data
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="Privacy and data"
					description="Export or delete your local data"
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						router.push("/settings/privacy");
					}}
					accessibilityLabel="Privacy and data — export or delete your local data"
					accessibilityRole="button"
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

			{/* Subscription / Unlock */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Plan
			</Text>
			<View style={styles.listCard}>
				{!isPremium ? (
					<List.Item
						title="Unlock Unmatch"
						description="One-time purchase — $6.99. No subscription."
						titleStyle={[styles.listTitle, styles.unlockTitle]}
						descriptionStyle={styles.listDesc}
						onPress={() => {
							router.push("/paywall");
						}}
						accessibilityLabel="Unlock Unmatch — one-time purchase for $6.99"
						accessibilityRole="button"
						left={() => (
							<List.Icon icon="lock-open-outline" color={colors.primary} />
						)}
						right={({ color }) => (
							<List.Icon icon="chevron-right" color={color} />
						)}
					/>
				) : (
					<List.Item
						title="Unmatch Unlocked"
						description="You have full access. Thank you!"
						titleStyle={styles.listTitle}
						descriptionStyle={styles.listDesc}
						accessibilityLabel="Unmatch is unlocked — you have full access"
						left={() => (
							<List.Icon icon="check-circle-outline" color={colors.success} />
						)}
					/>
				)}
			</View>

			{/* Why We Charge */}
			<WhyWeCharge />

			<Divider style={styles.footerDivider} />
			<View style={styles.brandingRow}>
				<Logo markSize={24} layout="horizontal" wordmarkColor={colors.muted} />
			</View>
			<Text variant="bodySmall" style={styles.footerText}>
				All data stays on your device — always.
			</Text>
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
		paddingHorizontal: 16,
		paddingTop: 56,
		paddingBottom: 24,
		gap: 8,
	},
	screenTitle: {
		color: colors.text,
		fontWeight: "700",
		marginBottom: 8,
	},
	sectionLabel: {
		color: colors.muted,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginTop: 12,
		marginBottom: 4,
		paddingHorizontal: 4,
	},
	listCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
	},
	listTitle: {
		color: colors.text,
		fontWeight: "500",
	},
	unlockTitle: {
		color: colors.primary,
		fontWeight: "700",
	},
	listDesc: {
		color: colors.muted,
		fontSize: 12,
		lineHeight: 18,
	},
	rightLabel: {
		color: colors.primary,
		alignSelf: "center",
		marginRight: 4,
	},
	listDescExpanded: {
		lineHeight: 20,
		marginTop: 4,
	},
	whyCard: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: "hidden",
		marginTop: 4,
	},
	footerDivider: {
		backgroundColor: colors.border,
		marginTop: 16,
		marginBottom: 8,
	},
	brandingRow: {
		alignItems: "center",
		paddingVertical: 8,
	},
	footerText: {
		color: colors.muted,
		textAlign: "center",
		lineHeight: 18,
	},
	bottomSpacer: {
		height: 24,
	},
});
