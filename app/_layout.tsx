import './global.css';
import { useEffect } from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useColorScheme, View, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

const queryClient = new QueryClient();

function AuthGuard() {
  const { session, isLoading } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/');
    }
  }, [session, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const setSession = useAuthStore((s) => s.setSession);
  const themeMode = useThemeStore((s) => s.mode);
  const loadSavedTheme = useThemeStore((s) => s.loadSavedTheme);
  const systemScheme = useColorScheme();

  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  useEffect(() => {
    loadSavedTheme();
  }, []);

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
        <AuthGuard />
      </View>
    </QueryClientProvider>
  );
}
