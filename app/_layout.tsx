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

const queryClient = new QueryClient();

function FlowGuard() {
  const { onboardingComplete, isLoaded } = useOnboardingStore();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
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
        animation: 'slide_from_right',
        animationDuration: 250,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen
        name="meal/[id]"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
          animationDuration: 300,
        }}
      />
      <Stack.Screen
        name="day/[date]"
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const loadOnboardingState = useOnboardingStore((s) => s.loadOnboardingState);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  useEffect(() => {
    loadSavedTheme();
    loadOnboardingState();
  }, []);

  // Listen for auth state changes
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
      <View className={`flex-1 ${isDark ? 'dark' : ''}`}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <FlowGuard />
      </View>
    </QueryClientProvider>
  );
}
