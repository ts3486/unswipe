// Privacy and data settings screen.
// Lets users export (share sheet), import (document picker), or delete all local data.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import { useAnalytics } from "@/src/contexts/AnalyticsContext";
import { useDatabaseContext } from "@/src/contexts/DatabaseContext";
import { useDataExport } from "@/src/hooks/useDataExport";
import { useDataImport } from "@/src/hooks/useDataImport";
import type React from "react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
	Button,
	Card,
	Dialog,
	Divider,
	Portal,
	Text,
} from "react-native-paper";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function deleteAllData(
	db: import("expo-sqlite").SQLiteDatabase,
): Promise<void> {
	await db.runAsync("DELETE FROM urge_event;");
	await db.runAsync("DELETE FROM daily_checkin;");
	await db.runAsync("DELETE FROM progress;");
	await db.runAsync("DELETE FROM user_profile;");
	await db.runAsync("DELETE FROM subscription_state;");
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PrivacyScreen(): React.ReactElement {
	const { t } = useTranslation();
	const analytics = useAnalytics();
	const { db } = useDatabaseContext();

	const { isExporting, handleExport } = useDataExport();
	const {
		isImporting,
		importCounts,
		confirmVisible: importConfirmVisible,
		pickFile,
		confirmImport,
		cancelImport,
	} = useDataImport();

	const [isDeleting, setIsDeleting] = useState<boolean>(false);
	const [deleteDialogVisible, setDeleteDialogVisible] =
		useState<boolean>(false);

	const isBusy = isExporting || isImporting || isDeleting;

	// ---------------------------------------------------------------------------
	// Delete
	// ---------------------------------------------------------------------------

	const confirmDelete = useCallback((): void => {
		setDeleteDialogVisible(true);
	}, []);

	const handleDelete = useCallback(async (): Promise<void> => {
		setDeleteDialogVisible(false);
		if (isDeleting) {
			return;
		}
		setIsDeleting(true);
		try {
			await deleteAllData(db);
			analytics.track({ name: "data_deleted", props: {} });
			Alert.alert(t("privacy.dataDeletedTitle"), t("privacy.dataDeletedBody"));
		} catch {
			Alert.alert(
				t("privacy.deleteFailedTitle"),
				t("privacy.deleteFailedBody"),
			);
		} finally {
			setIsDeleting(false);
		}
	}, [db, analytics, isDeleting, t]);

	// ---------------------------------------------------------------------------
	// Import confirmation summary
	// ---------------------------------------------------------------------------

	function formatImportSummary(): string {
		if (!importCounts) return "";
		const parts: string[] = [];
		if (importCounts.urge_events > 0)
			parts.push(
				t("privacy.importUrgeEvents", { count: importCounts.urge_events }),
			);
		if (importCounts.daily_checkins > 0)
			parts.push(
				t("privacy.importCheckins", { count: importCounts.daily_checkins }),
			);
		if (importCounts.progress > 0)
			parts.push(t("privacy.importProgress", { count: importCounts.progress }));
		if (importCounts.user_profile > 0)
			parts.push(
				t("privacy.importProfile", { count: importCounts.user_profile }),
			);
		if (importCounts.subscription_state > 0)
			parts.push(
				t("privacy.importSubscription", {
					count: importCounts.subscription_state,
				}),
			);
		return parts.length > 0 ? parts.join(", ") : t("privacy.noDataFoundInFile");
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<>
			<ScrollView
				style={styles.root}
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
			>
				<Text variant="headlineMedium" style={styles.screenTitle}>
					{t("privacy.title")}
				</Text>

				<Card style={styles.infoCard} mode="contained">
					<Card.Content style={styles.infoContent}>
						<Text variant="bodyMedium" style={styles.infoText}>
							{t("privacy.allDataLocal")}
						</Text>
						<Text variant="bodyMedium" style={styles.infoText}>
							{t("privacy.noDataSentServer")}
						</Text>
						<Divider style={styles.divider} />
						<Text variant="bodySmall" style={styles.infoNote}>
							{t("privacy.exportsNote")}
						</Text>
					</Card.Content>
				</Card>

				<Text variant="titleMedium" style={styles.sectionTitle}>
					{t("privacy.yourData")}
				</Text>

				<Card style={styles.card} mode="contained">
					<Card.Content style={styles.actionContent}>
						{/* Export */}
						<View style={styles.actionRow}>
							<View style={styles.actionText}>
								<Text variant="titleSmall" style={styles.actionTitle}>
									{t("privacy.exportData")}
								</Text>
								<Text variant="bodySmall" style={styles.actionDesc}>
									{t("privacy.exportDesc")}
								</Text>
							</View>
							<Button
								mode="outlined"
								onPress={() => {
									void handleExport();
								}}
								loading={isExporting}
								disabled={isBusy}
								style={styles.exportButton}
								textColor={colors.primary}
							>
								{t("privacy.export")}
							</Button>
						</View>

						<Divider style={styles.divider} />

						{/* Import */}
						<View style={styles.actionRow}>
							<View style={styles.actionText}>
								<Text variant="titleSmall" style={styles.actionTitle}>
									{t("privacy.importData")}
								</Text>
								<Text variant="bodySmall" style={styles.actionDesc}>
									{t("privacy.importDesc")}
								</Text>
							</View>
							<Button
								mode="outlined"
								onPress={() => {
									void pickFile();
								}}
								loading={isImporting}
								disabled={isBusy}
								style={styles.importButton}
								textColor={colors.primary}
							>
								{t("privacy.import")}
							</Button>
						</View>

						<Divider style={styles.divider} />

						{/* Delete */}
						<View style={styles.actionRow}>
							<View style={styles.actionText}>
								<Text variant="titleSmall" style={styles.deleteTitle}>
									{t("privacy.deleteAllData")}
								</Text>
								<Text variant="bodySmall" style={styles.actionDesc}>
									{t("privacy.deleteDesc")}
								</Text>
							</View>
							<Button
								mode="outlined"
								onPress={confirmDelete}
								loading={isDeleting}
								disabled={isBusy}
								style={styles.deleteButton}
								textColor="#E05A5A"
							>
								{t("privacy.delete")}
							</Button>
						</View>
					</Card.Content>
				</Card>

				<View style={styles.bottomSpacer} />
			</ScrollView>

			{/* Delete confirmation dialog */}
			<Portal>
				<Dialog
					visible={deleteDialogVisible}
					onDismiss={() => {
						setDeleteDialogVisible(false);
					}}
					style={styles.dialog}
				>
					<Dialog.Title>
						<Text variant="titleMedium" style={styles.dialogTitle}>
							{t("privacy.deleteDialogTitle")}
						</Text>
					</Dialog.Title>
					<Dialog.Content>
						<Text variant="bodyMedium" style={styles.dialogBody}>
							{t("privacy.deleteDialogBody")}
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button
							onPress={() => {
								setDeleteDialogVisible(false);
							}}
							textColor={colors.muted}
						>
							{t("common.cancel")}
						</Button>
						<Button
							onPress={() => {
								void handleDelete();
							}}
							textColor="#E05A5A"
						>
							{t("privacy.deleteAll")}
						</Button>
					</Dialog.Actions>
				</Dialog>

				{/* Import confirmation dialog */}
				<Dialog
					visible={importConfirmVisible}
					onDismiss={cancelImport}
					style={styles.dialog}
				>
					<Dialog.Title>
						<Text variant="titleMedium" style={styles.dialogTitle}>
							{t("privacy.importDialogTitle")}
						</Text>
					</Dialog.Title>
					<Dialog.Content>
						<Text variant="bodyMedium" style={styles.dialogBody}>
							{t("privacy.importDialogBody")}
						</Text>
						<Text variant="bodyMedium" style={styles.importSummary}>
							{formatImportSummary()}
						</Text>
					</Dialog.Content>
					<Dialog.Actions>
						<Button onPress={cancelImport} textColor={colors.muted}>
							{t("common.cancel")}
						</Button>
						<Button
							onPress={() => {
								void confirmImport();
							}}
							textColor={colors.primary}
						>
							{t("privacy.import")}
						</Button>
					</Dialog.Actions>
				</Dialog>
			</Portal>
		</>
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
		paddingTop: 20,
		paddingBottom: 40,
		gap: 16,
	},
	screenTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	infoCard: {
		backgroundColor: "#0F1D3A",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.primary,
	},
	infoContent: {
		gap: 8,
	},
	infoText: {
		color: colors.text,
		lineHeight: 22,
	},
	infoNote: {
		color: colors.muted,
		lineHeight: 18,
	},
	divider: {
		backgroundColor: colors.border,
		marginVertical: 4,
	},
	sectionTitle: {
		color: colors.text,
		fontWeight: "600",
		marginTop: 4,
	},
	card: {
		backgroundColor: colors.surface,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: colors.border,
	},
	actionContent: {
		paddingVertical: 4,
	},
	actionRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingVertical: 12,
		gap: 12,
	},
	actionText: {
		flex: 1,
		gap: 4,
	},
	actionTitle: {
		color: colors.text,
		fontWeight: "600",
	},
	deleteTitle: {
		color: "#E05A5A",
		fontWeight: "600",
	},
	actionDesc: {
		color: colors.muted,
		lineHeight: 18,
	},
	exportButton: {
		borderColor: colors.primary,
		flexShrink: 0,
	},
	importButton: {
		borderColor: colors.primary,
		flexShrink: 0,
	},
	deleteButton: {
		borderColor: "#E05A5A",
		flexShrink: 0,
	},
	dialog: {
		backgroundColor: colors.surface,
		borderRadius: 16,
	},
	dialogTitle: {
		color: colors.text,
		fontWeight: "700",
	},
	dialogBody: {
		color: colors.muted,
		lineHeight: 22,
	},
	importSummary: {
		color: colors.text,
		lineHeight: 22,
		marginTop: 8,
		fontWeight: "600",
	},
	bottomSpacer: {
		height: 24,
	},
});
