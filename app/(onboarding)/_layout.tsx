/**
 * @file app/(onboarding)/_layout.tsx
 * Stack navigator for the 6-step onboarding flow (welcome → locale → goals →
 * preferences → complete → paywall). Uses platform-native push animations
 * consistent with the root stack.
 */

import { Stack } from 'expo-router';

/** Stack layout that wraps all screens in the (onboarding) route group. */
export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Platform-native push animation — matches the root stack screenOptions.
        animation: 'default',
        contentStyle: { backgroundColor: 'transparent' },
      }}
    >
      <Stack.Screen name="welcome" />
      {/* locale is the new step 1 — language and currency selection */}
      <Stack.Screen name="locale" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="preferences" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}
