// Root layout — wraps all routes in providers and configures the Stack navigator.
// No default exports other than the required route component.
// TypeScript strict mode.

import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type React from "react";
import { useEffect } from "react";
import { LogBox } from "react-native";

// Suppress the LogBox warning overlay in dev builds.
// It covers interactive elements (e.g. CTA buttons) and breaks E2E tests.
// Warnings are still logged to the Metro console.
LogBox.ignoreAllLogs();

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: false,
		shouldShowBanner: false,
		shouldShowList: false,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

import { paperTheme } from "@/src/constants/theme";
import {
	AnalyticsProvider,
	useAnalytics,
} from "@/src/contexts/AnalyticsContext";
import { AppStateProvider, useAppState } from "@/src/contexts/AppStateContext";
import { DatabaseProvider } from "@/src/contexts/DatabaseContext";
import { useNotificationScheduler } from "@/src/hooks/useNotificationScheduler";
import { PaperProvider } from "react-native-paper";

function NotificationInitializer({
	children,
}: { children: React.ReactNode }): React.ReactElement {
	const router = useRouter();
	const analytics = useAnalytics();
	const { userProfile } = useAppState();
	const notificationStyle = userProfile?.notification_style ?? "off";

	useNotificationScheduler({ notificationStyle });

	useEffect(() => {
		const subscription = Notifications.addNotificationResponseReceivedListener(
			(response) => {
				const identifier = response.notification.request.identifier;
				analytics.track({
					name: "notification_opened",
					props: { type: identifier },
				});
				switch (identifier) {
					case "daily-checkin":
					case "streak-nudge":
						router.push("/(tabs)/home");
						break;
					case "course-unlock":
						router.push("/(tabs)/learn");
						break;
				}
			},
		);

		return () => {
			subscription.remove();
		};
	}, [router, analytics]);

	return <>{children}</>;
}

export default function RootLayout(): React.ReactElement {
	return (
		<PaperProvider theme={paperTheme}>
			<DatabaseProvider>
				<AppStateProvider>
					<AnalyticsProvider>
						<NotificationInitializer>
							<StatusBar style="light" />
							<Stack
								screenOptions={{
									headerStyle: { backgroundColor: "#0B1220" },
									headerTintColor: "#E6EDF7",
									headerShadowVisible: false,
								}}
							>
								<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
								<Stack.Screen
									name="onboarding"
									options={{ headerShown: false }}
								/>
								<Stack.Screen
									name="paywall"
									options={{ presentation: "modal", headerShown: false }}
								/>
								<Stack.Screen
									name="settings/blocker-guide"
									options={{ title: "Blocker Guide" }}
								/>
								<Stack.Screen
									name="settings/privacy"
									options={{ title: "Privacy" }}
								/>
								<Stack.Screen
									name="progress/day/[date]"
									options={{ title: "Day Detail" }}
								/>
								<Stack.Screen
									name="checkin"
									options={{ title: "Daily Check-in" }}
								/>
							</Stack>
						</NotificationInitializer>
					</AnalyticsProvider>
				</AppStateProvider>
			</DatabaseProvider>
		</PaperProvider>
	);
}
