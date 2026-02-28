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
import { Divider, List, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsScreen(): React.ReactElement {
	const { userProfile, refreshProfile, refreshPremiumStatus } = useAppState();
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
			</View>

			{/* Dev-only tools — __DEV__ is false in production builds, so the
			    bundler strips this entire block from release bundles. */}
			{__DEV__ && (
				<>
					<Text variant="labelLarge" style={styles.sectionLabel}>
						Dev Tools
					</Text>
					<View style={styles.listCard}>
						<List.Item
							title="Reset subscription"
							description="Clears premium status so you can test the paywall"
							titleStyle={[styles.listTitle, { color: colors.warning }]}
							descriptionStyle={styles.listDesc}
							onPress={() => {
								Alert.alert(
									"Reset subscription?",
									"This will remove your premium status and redirect to the paywall.",
									[
										{ text: "Cancel", style: "cancel" },
										{
											text: "Reset",
											style: "destructive",
											onPress: () => {
												void (async () => {
													await db.runAsync(
														"DELETE FROM subscription_state WHERE id = 'singleton';",
													);
													await refreshPremiumStatus();
													router.replace("/paywall");
												})();
											},
										},
									],
								);
							}}
							accessibilityLabel="Reset subscription for testing"
							left={() => (
								<List.Icon icon="bug-outline" color={colors.warning} />
							)}
						/>
						<Divider style={{ backgroundColor: colors.border }} />
						<List.Item
							title="Reset onboarding"
							description="Wipes profile so you restart from onboarding"
							titleStyle={[styles.listTitle, { color: colors.warning }]}
							descriptionStyle={styles.listDesc}
							onPress={() => {
								Alert.alert(
									"Reset onboarding?",
									"This will delete your profile and all data. The app will restart at onboarding.",
									[
										{ text: "Cancel", style: "cancel" },
										{
											text: "Reset",
											style: "destructive",
											onPress: () => {
												void (async () => {
													await db.runAsync("DELETE FROM user_profile;");
													await db.runAsync("DELETE FROM subscription_state;");
													await db.runAsync("DELETE FROM daily_checkin;");
													await db.runAsync("DELETE FROM urge_event;");
													await db.runAsync("DELETE FROM progress;");
													await db.runAsync("DELETE FROM content_progress;");
													await refreshProfile();
													router.replace("/onboarding");
												})();
											},
										},
									],
								);
							}}
							accessibilityLabel="Reset onboarding for testing"
							left={() => (
								<List.Icon icon="restart" color={colors.warning} />
							)}
						/>
					</View>
				</>
			)}

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
