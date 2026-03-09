/**
 * @file app/_layout.tsx
 * Root layout — the single entry point that wraps the entire app.
 *
 * Responsibilities:
 *   1. Initialises the TanStack QueryClient for all server-state hooks.
 *   2. Applies the active theme (light / dark / system) via the `dark` class on
 *      the root `View`, which NativeWind picks up for `dark:` prefix styles.
 *   3. Subscribes to Supabase auth state changes and keeps `authStore` in sync.
 *   4. Renders `FlowGuard`, which decides which screen group to show.
 *   5. Wraps children in `ErrorBoundary` to prevent full-app crashes.
 *
 * FlowGuard routing logic (evaluated after stores are loaded):
 *   - Not loaded yet            → show SaltShakerLoader (loading screen)
 *   - onboarding incomplete     → replace to `/(onboarding)/welcome`
 *   - onboarding done, no auth  → replace to `/(auth)/login`
 *   - authenticated             → show `(tabs)` (main app)
 */

import './global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useAuth } from '../hooks/useAuth';
import { SaltShakerLoader } from '../components/ui/SaltShakerLoader';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

/** Shared QueryClient instance — lives for the lifetime of the app. */
const queryClient = new QueryClient();

/**
 * FlowGuard reads auth and onboarding state and redirects to the correct
 * screen group. It must render inside `QueryClientProvider` so that hooks
 * that call `useQueryClient()` work correctly.
 *
 * The guard delays all routing until both `isLoaded` (onboarding) and
 * `!authLoading` (auth session) are true, preventing a flash to the wrong
 * screen on cold start.
 */
function FlowGuard() {
  const { onboardingComplete, isLoaded } = useOnboardingStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Wait until both stores have finished loading before making any routing decision
    if (!isLoaded || authLoading) return;

    const inOnboarding = segments[0] === '(onboarding)';
    const inAuth = segments[0] === '(auth)';

    if (!onboardingComplete && !inOnboarding) {
      // New user: show onboarding
      router.replace('/(onboarding)/welcome');
    } else if (onboardingComplete && !isAuthenticated && !inAuth) {
      // Signed out user who completed onboarding: show login
      router.replace('/(auth)/login');
    }
  }, [onboardingComplete, isLoaded, isAuthenticated, authLoading, segments]);

  // Show loading screen while stores hydrate
  if (!isLoaded || authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
        <SaltShakerLoader message="" submessage="" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Platform-native push animation: UIKit spring on iOS, Material
        // shared-axis slide on Android. Users immediately recognise it as
        // "standard navigation" — more harmonious than animation: 'none'.
        // Modal screens override this with slide_from_bottom below.
        animation: 'default',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen
        name="meal/[id]"
        options={{
          presentation: 'modal',
          // Modal screens keep a slide_from_bottom animation for a clear
          // visual distinction between push navigation and modal overlays.
          animation: 'slide_from_bottom',
          animationDuration: 300,
          gestureDirection: 'vertical',
        }}
      />
      {/* meal/add is a modal for choosing a meal to assign to a calendar slot */}
      <Stack.Screen
        name="meal/add"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 300,
          gestureDirection: 'vertical',
        }}
      />
      {/* day/[date] inherits the default push animation from screenOptions. */}
      <Stack.Screen name="day/[date]" />
    </Stack>
  );
}

/**
 * RootLayout is the top-level component rendered by Expo Router.
 * It sets up providers (QueryClient, theme), subscribes to auth events,
 * wraps children in ErrorBoundary, and renders FlowGuard.
 */
export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const loadOnboardingState = useOnboardingStore((s) => s.loadOnboardingState);
  const systemScheme = useColorScheme();

  // Resolve effective dark mode: explicit override or system preference
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  // Load persisted theme and onboarding state on first render
  useEffect(() => {
    loadSavedTheme();
    loadOnboardingState();
  }, []);

  // Subscribe to Supabase auth state changes for the lifetime of the app.
  // `onAuthStateChange` also fires immediately with the current session, so
  // we don't need a separate `getSession()` call — but we keep it for the
  // initial synchronous population before the listener fires.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <FlowGuard />
        </View>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}
