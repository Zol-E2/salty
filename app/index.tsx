import { Redirect } from 'expo-router';
import { useOnboardingStore } from '../stores/onboardingStore';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { onboardingComplete, isLoaded } = useOnboardingStore();

  if (!isLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!onboardingComplete) {
    return <Redirect href="/(onboarding)/welcome" />;
  }

  return <Redirect href="/(tabs)/calendar" />;
}
