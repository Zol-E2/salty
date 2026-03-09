/**
 * @file app/(onboarding)/_layout.tsx
 * Stack navigator for the 6-step onboarding flow (welcome → goals →
 * preferences → paywall → complete). Uses platform-native push animations
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
    />
  );
}
