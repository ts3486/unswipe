// Tab navigator layout — defines the 5 primary tabs.
// Onboarding redirect lives here so it runs inside all providers.
// TypeScript strict mode.

import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppState } from '@/src/contexts/AppStateContext';
import { colors } from '@/src/constants/theme';

/**
 * Returns an Animated.Value for opacity that pulses (0.6↔1, 1.5s cycle) when
 * the current device hour is in the late-night window: 21:00–02:59 inclusive.
 * Outside that window the value stays at 1 (fully opaque, no animation).
 */
function usePulseAnimation(): Animated.Value {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const hour = new Date().getHours();
    const isLateNight = hour >= 21 || hour <= 2;

    if (!isLateNight) {
      return;
    }

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.6,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );

    pulse.start();

    return () => {
      pulse.stop();
    };
  }, [opacity]);

  return opacity;
}

export default function TabsLayout(): React.ReactElement {
  const { isOnboarded, isLoading, isPremium } = useAppState();
  const pauseOpacity = usePulseAnimation();

  // While the database and profile are loading, render nothing to avoid flash.
  if (isLoading) {
    return <></>;
  }

  if (!isOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  if (!isPremium) {
    return <Redirect href="/paywall" />;
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
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="panic"
        options={{
          title: 'Pause',
          tabBarIcon: ({ size }) => (
            <Animated.View style={{ opacity: pauseOpacity }}>
              <MaterialCommunityIcons
                name="meditation"
                color={colors.primary}
                size={size}
              />
            </Animated.View>
          ),
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.primary,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="chart-line" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="book-open-variant"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
