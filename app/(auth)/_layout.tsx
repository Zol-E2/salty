/**
 * @file app/(auth)/_layout.tsx
 * Stack navigator for the authentication flow (login, email verification).
 * Uses platform-native push animations consistent with the root stack.
 */

import { Stack } from 'expo-router';

/** Stack layout that wraps all screens in the (auth) route group. */
export default function AuthLayout() {
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
