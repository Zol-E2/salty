import { useEffect } from 'react';
import { View, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function VerifyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleDeepLink = async () => {
      // The auth state change listener in _layout.tsx handles session updates.
      // This screen just shows a loading state while the magic link is processed.
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        router.replace('/');
      }
    };

    handleDeepLink();
  }, [params]);

  return <LoadingSpinner message="Signing you in..." />;
}
