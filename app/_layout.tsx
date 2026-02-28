// Root layout — wraps all routes in providers and configures the Stack navigator.
// No default exports other than the required route component.
// TypeScript strict mode.

import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import type React from "react";
import { useEffect, useMemo, useRef } from "react";
import { AppState, type AppStateStatus, LogBox } from "react-native";

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
import { useContent } from "@/src/hooks/useContent";
import { rescheduleAll } from "@/src/services/notifications";
import { PaperProvider } from "react-native-paper";

// ---------------------------------------------------------------------------
// Inner layout — needs to be a child of AppStateProvider so it can access
// useAppState() to drive the notification scheduler.
// ---------------------------------------------------------------------------

function InnerLayout(): React.ReactElement {
	const { userProfile, streak, todaySuccess, meditationCount, isOnboarded } =
		useAppState();
	const analytics = useAnalytics();
	const router = useRouter();
	const appStateRef = useRef<AppStateStatus>(AppState.currentState);

	// Course state for notification scheduling.
	const { allContent, completedIds, currentDayIndex } = useContent(
		userProfile?.created_at ?? null,
	);
	const todayContentCompleted = useMemo(() => {
		const todayItems = allContent.filter(
			(c) => c.day_index === currentDayIndex,
		);
		return (
			todayItems.length > 0 && todayItems.every((c) => completedIds.has(c.content_id))
		);
	}, [allContent, completedIds, currentDayIndex]);

	useEffect(() => {
		// Only schedule after onboarding is complete and state is loaded.
		if (!isOnboarded || userProfile === null) {
			return;
		}

		// Schedule on mount / every time relevant state changes.
		void rescheduleAll(userProfile, {
			streak,
			todaySuccess,
			meditationCount,
			currentDayIndex,
			todayContentCompleted,
		});

		// Re-schedule when the app returns to the foreground.
		const subscription = AppState.addEventListener(
			"change",
			(nextAppState: AppStateStatus) => {
				const wasBackground =
					appStateRef.current === "background" ||
					appStateRef.current === "inactive";
				const isActive = nextAppState === "active";

				if (wasBackground && isActive && userProfile !== null) {
					void rescheduleAll(userProfile, {
						streak,
						todaySuccess,
						meditationCount,
						currentDayIndex,
						todayContentCompleted,
					});
				}

				appStateRef.current = nextAppState;
			},
		);

		return () => {
			subscription.remove();
		};
	}, [isOnboarded, userProfile, streak, todaySuccess, meditationCount, currentDayIndex, todayContentCompleted]);

	// Handle notification taps — track analytics and navigate to the correct screen.
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
						router.push("/(tabs)");
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

	return (
		<>
			<StatusBar style="light" />
			<Stack
				screenOptions={{
					headerStyle: { backgroundColor: "#0B1220" },
					headerTintColor: "#E6EDF7",
					headerShadowVisible: false,
				}}
			>
				<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
				<Stack.Screen name="onboarding" options={{ headerShown: false }} />
				<Stack.Screen
					name="paywall"
					options={{ headerShown: false, gestureEnabled: false }}
				/>
				<Stack.Screen
					name="settings/blocker-guide"
					options={{ title: "Blocker Guide" }}
				/>
				<Stack.Screen name="settings/privacy" options={{ title: "Privacy" }} />
				<Stack.Screen
					name="progress/day/[date]"
					options={{ title: "Day Detail", headerBackTitle: "Progress" }}
				/>
				<Stack.Screen name="checkin" options={{ title: "Daily Check-in" }} />
			</Stack>
		</>
	);
}

// ---------------------------------------------------------------------------
// Root layout
// ---------------------------------------------------------------------------

export default function RootLayout(): React.ReactElement {
	return (
		<PaperProvider theme={paperTheme}>
			<DatabaseProvider>
				<AppStateProvider>
					<AnalyticsProvider>
						<InnerLayout />
					</AnalyticsProvider>
				</AppStateProvider>
			</DatabaseProvider>
		</PaperProvider>
	);
}
