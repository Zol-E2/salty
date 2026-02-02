import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8">
          <ProgressDots total={6} current={0} />
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-28 h-28 bg-primary-500 rounded-[32px] items-center justify-center mb-8">
            <Ionicons name="restaurant" size={56} color="white" />
          </View>

          <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-3">
            Welcome to Salty
          </Text>

          <Text className="text-lg text-slate-500 dark:text-slate-400 text-center leading-7 mb-2">
            Your personal AI meal planner.{'\n'}
            Eat better, spend less, stress never.
          </Text>
        </View>

        <View className="pb-8">
          <View className="flex-row items-center bg-primary-50 dark:bg-primary-400/10 rounded-2xl p-4 mb-6">
            <Ionicons name="sparkles" size={20} color="#10B981" />
            <Text className="text-sm text-primary-700 dark:text-primary-300 ml-3 flex-1">
              We'll personalize your experience in a few quick steps
            </Text>
          </View>

          <Button
            title="Get Started"
            onPress={() => router.push('/(onboarding)/goals')}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
