// Settings tab screen.
// Provides toggles, navigation, and section list items.
// TypeScript strict mode.

import { Logo } from "@/src/components/Logo";
import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { updateUserProfile } from "@/src/data/repositories";
import type { NotificationStyle } from "@/src/domain/types";
import { type SupportedLocale, isSupportedLocale } from "@/src/i18n";
import {
	cancelAllScheduled,
	requestPermissions,
} from "@/src/services/notifications";
import { router } from "expo-router";
import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { Divider, List, Text } from "react-native-paper";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SettingsScreen(): React.ReactElement {
	const { t, i18n } = useTranslation();
	const { userProfile, refreshProfile, refreshPremiumStatus, changeLocale } =
		useAppState();
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
		const cycle: NotificationStyle[] = ["normal", "off"];
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
						t("settings.notifDisabledTitle"),
						t("settings.notifDisabledBody"),
					);
				}
			}
		} finally {
			setIsUpdating(false);
		}
	}, [db, userProfile, refreshProfile, notifStyle, isUpdating, t]);

	const notifLabel: Record<NotificationStyle, string> = {
		normal: t("settings.on"),
		off: t("settings.off"),
	};

	const languageLabel: Record<SupportedLocale, string> = {
		en: t("settings.languageEnglish"),
		ja: t("settings.languageJapanese"),
	};

	const currentLocale: SupportedLocale = isSupportedLocale(i18n.language)
		? i18n.language
		: "en";

	const cycleLocale = useCallback(async (): Promise<void> => {
		const cycle: SupportedLocale[] = ["en", "ja"];
		const currentIdx = cycle.indexOf(currentLocale);
		const next = cycle[(currentIdx + 1) % cycle.length] as SupportedLocale;
		await changeLocale(next);
	}, [currentLocale, changeLocale]);

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
				{t("settings.title")}
			</Text>

			{/* Notifications */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				{t("settings.yourNotifications")}
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title={t("settings.notificationStyle")}
					description={t("settings.currentPrefix", {
						value: notifLabel[notifStyle],
					})}
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						void cycleNotifStyle();
					}}
					accessibilityLabel={t("settings.notifStyleA11y", {
						value: notifLabel[notifStyle],
					})}
					accessibilityRole="button"
					right={() => (
						<Text variant="labelMedium" style={styles.rightLabel}>
							{notifLabel[notifStyle]}
						</Text>
					)}
				/>
				<Divider style={{ backgroundColor: colors.border }} />
				<List.Item
					title={t("settings.language")}
					description={languageLabel[currentLocale]}
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						void cycleLocale();
					}}
					accessibilityLabel={`${t("settings.language")}: ${languageLabel[currentLocale]}`}
					accessibilityRole="button"
					right={() => (
						<Text variant="labelMedium" style={styles.rightLabel}>
							{languageLabel[currentLocale]}
						</Text>
					)}
				/>
			</View>

			{/* Resources */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				{t("settings.tools")}
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title={t("settings.blockerGuide")}
					description={t("settings.blockerGuideDesc")}
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						router.push("/settings/blocker-guide");
					}}
					accessibilityLabel={`${t("settings.blockerGuide")} — ${t("settings.blockerGuideDesc")}`}
					accessibilityRole="button"
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

			{/* Data */}
			<Text variant="labelLarge" style={styles.sectionLabel}>
				{t("settings.yourData")}
			</Text>
			<View style={styles.listCard}>
				<List.Item
					title={t("settings.privacyAndData")}
					description={t("settings.privacyAndDataDesc")}
					titleStyle={styles.listTitle}
					descriptionStyle={styles.listDesc}
					onPress={() => {
						router.push("/settings/privacy");
					}}
					accessibilityLabel={`${t("settings.privacyAndData")} — ${t("settings.privacyAndDataDesc")}`}
					accessibilityRole="button"
					right={({ color }) => (
						<List.Icon icon="chevron-right" color={color} />
					)}
				/>
			</View>

			{/* Dev-only tools — __DEV__ is false in production builds, so the
			    bundler strips this entire block from release bundles. */}
			{__DEV__ && (
				<>
					<Text variant="labelLarge" style={styles.sectionLabel}>
						{t("settings.devTools")}
					</Text>
					<View style={styles.listCard}>
						<List.Item
							title={t("settings.resetOnboarding")}
							description={t("settings.resetOnboardingDesc")}
							titleStyle={[styles.listTitle, { color: colors.warning }]}
							descriptionStyle={styles.listDesc}
							onPress={() => {
								Alert.alert(
									t("settings.resetOnboardingDialogTitle"),
									t("settings.resetOnboardingDialogBody"),
									[
										{ text: t("common.cancel"), style: "cancel" },
										{
											text: t("settings.reset"),
											style: "destructive",
											onPress: () => {
												void (async () => {
													await db.runAsync("DELETE FROM user_profile;");
													await db.runAsync("DELETE FROM subscription_state;");
													await db.runAsync("DELETE FROM daily_checkin;");
													await db.runAsync("DELETE FROM urge_event;");
													await db.runAsync("DELETE FROM progress;");
													await refreshProfile();
													router.replace("/onboarding");
												})();
											},
										},
									],
								);
							}}
							accessibilityLabel="Reset onboarding for testing"
							left={() => <List.Icon icon="restart" color={colors.warning} />}
						/>
					</View>
				</>
			)}

			<Divider style={styles.footerDivider} />
			<View style={styles.brandingRow}>
				<Logo markSize={24} layout="horizontal" wordmarkColor={colors.muted} />
			</View>
			<Text variant="bodySmall" style={styles.footerText}>
				{t("settings.footerText")}
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
		paddingLeft: 8,
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
