// Settings tab screen.
// Provides toggles, navigation, and section list items.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { updateUserProfile } from "@/src/data/repositories";
import type { NotificationStyle } from "@/src/domain/types";
import {
	requestNotificationPermission,
	rescheduleAll,
} from "@/src/services/notification-service";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, Switch, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsScreen(): React.ReactElement {
	const { userProfile, refreshProfile } = useAppState();
	const analytics = useAnalytics();
	const { db } = useDatabaseContext();

	const [lockEnabled, setLockEnabled] = useState<boolean>(
		(userProfile?.lock_enabled ?? 0) === 1,
	);
	const [notifStyle, setNotifStyle] = useState<NotificationStyle>(
		userProfile?.notification_style ?? "normal",
	);
	const [isUpdating, setIsUpdating] = useState<boolean>(false);

	// ---------------------------------------------------------------------------
	// Actions
	// ---------------------------------------------------------------------------

	const handleLockToggle = useCallback(
		async (value: boolean): Promise<void> => {
			if (userProfile === null || isUpdating) {
				return;
			}
			setLockEnabled(value);
			setIsUpdating(true);
			try {
				await updateUserProfile(db, userProfile.id, {
					lock_enabled: value ? 1 : 0,
				});
				await refreshProfile();
				analytics.track({
					name: "app_lock_toggled",
					props: { enabled: value },
				});
			} finally {
				setIsUpdating(false);
			}
		},
		[db, userProfile, refreshProfile, analytics, isUpdating],
	);

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
				await rescheduleAll("off");
			} else {
				const granted = await requestNotificationPermission();
				if (granted) {
					await rescheduleAll(next);
				} else {
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

			{/* Privacy & Security */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Your Boundaries
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="App lock"
					description="Require authentication to open the app"
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					right={() => (
						<Switch
							value={lockEnabled}
							onValueChange={(v) => {
								void handleLockToggle(v);
							}}
							color={colors.primary}
							disabled={isUpdating}
						/>
					)}
				/>
			</View>

			{/* Notifications */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Your Notifications
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="Notification style"
					description="Controls how notifications appear"
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						void cycleNotifStyle();
					}}
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
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

			{/* Subscription */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				Plan
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title="Manage subscription"
					description="View plans and premium features"
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						router.push("/paywall");
					}}
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

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
