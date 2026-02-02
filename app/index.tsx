import { Redirect } from 'expo-router';
import { useAuthStore } from '../stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { View, ActivityIndicator } from 'react-native';
import { Profile } from '../lib/types';

export default function Index() {
  const session = useAuthStore((s) => s.session);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session!.user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!session,
  });

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!profile?.onboarding_complete) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)/calendar" />;
}
