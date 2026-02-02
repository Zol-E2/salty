import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { GoalOption } from '../../components/onboarding/GoalOption';
import { useOnboardingStore } from '../../stores/onboardingStore';

const GOAL_DATA: {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    key: 'save_money',
    label: 'Save Money',
    description: 'Eat well on a tight budget',
    icon: 'wallet-outline',
  },
  {
    key: 'eat_healthy',
    label: 'Eat Healthy',
    description: 'Balanced nutrition & macros',
    icon: 'heart-outline',
  },
  {
    key: 'learn_to_cook',
    label: 'Learn to Cook',
    description: 'Build kitchen confidence',
    icon: 'flame-outline',
  },
  {
    key: 'save_time',
    label: 'Save Time',
    description: 'Quick & easy meals',
    icon: 'time-outline',
  },
];

export default function GoalsScreen() {
  const router = useRouter();
  const { goal, setGoal } = useOnboardingStore();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8 mb-8">
          <ProgressDots total={4} current={1} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          What's your main goal?
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          This helps us tailor your meal plans
        </Text>

        <View className="flex-1">
          {GOAL_DATA.map((g) => (
            <GoalOption
              key={g.key}
              label={g.label}
              description={g.description}
              iconName={g.icon}
              selected={goal === g.key}
              onPress={() => setGoal(g.key)}
            />
          ))}
        </View>

        <View className="pb-8">
          <Button
            title="Continue"
            onPress={() => router.push('/(onboarding)/preferences')}
            disabled={!goal}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
