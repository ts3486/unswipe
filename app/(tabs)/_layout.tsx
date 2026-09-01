// Tab navigator layout — defines the 4 primary tabs.
// Onboarding redirect lives here so it runs inside all providers.
// TypeScript strict mode.

import { colors } from "@/src/constants/theme";
import { useAppState } from "@/src/contexts/AppStateContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Redirect, Tabs } from "expo-router";
import type React from "react";

export default function TabsLayout(): React.ReactElement {
	const { isOnboarded, isLoading } = useAppState();

	// While the database and profile are loading, render nothing to avoid flash.
	if (isLoading) {
		return <></>;
	}

	if (!isOnboarded) {
		return <Redirect href="/onboarding" />;
	}

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarStyle: {
					backgroundColor: colors.background,
					borderTopColor: colors.border,
					borderTopWidth: 1,
				},
				tabBarActiveTintColor: colors.primary,
				tabBarInactiveTintColor: colors.muted,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="meditation"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			{/* Hidden route — keeps /(tabs)/panic valid for deep links */}
			<Tabs.Screen name="panic" options={{ href: null }} />
			<Tabs.Screen
				name="progress"
				options={{
					title: "Progress",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="chart-line"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="history"
				options={{
					title: "History",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons
							name="calendar-check-outline"
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="settings"
				options={{
					title: "Settings",
					tabBarIcon: ({ color, size }) => (
						<MaterialCommunityIcons name="cog" color={color} size={size} />
					),
				}}
			/>
		</Tabs>
	);
}
