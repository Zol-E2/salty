import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { GOALS, SKILL_LEVELS, DIETARY_OPTIONS } from '../../lib/constants';

export default function CompleteScreen() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const { goal, weekly_budget, skill_level, dietary_restrictions, markComplete } =
    useOnboardingStore();

  const goalLabel = GOALS.find((g) => g.key === goal)?.label ?? goal;
  const skillLabel =
    SKILL_LEVELS.find((s) => s.key === skill_level)?.label ?? skill_level;
  const dietaryLabels = dietary_restrictions.map(
    (r) => DIETARY_OPTIONS.find((d) => d.key === r)?.label ?? r
  );

  const handleFinish = async () => {
    setSaving(true);
    try {
      await markComplete();
      router.push('/(onboarding)/paywall');
    } catch {
      Alert.alert('Error', 'Failed to save your preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8 mb-8">
          <ProgressDots total={6} current={3} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          You're all set!
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          Here's a summary of your preferences
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
          <SummaryRow icon="flag-outline" label="Goal" value={goalLabel} />
          <SummaryRow
            icon="wallet-outline"
            label="Your budget"
            value={`$${weekly_budget}`}
          />
          <SummaryRow
            icon="flame-outline"
            label="Skill level"
            value={skillLabel}
          />
          <SummaryRow
            icon="leaf-outline"
            label="Dietary"
            value={dietaryLabels.length > 0 ? dietaryLabels.join(', ') : 'None'}
            isLast
          />
        </View>

        <View className="flex-1" />

        <View className="pb-8">
          <Button
            title="Continue"
            onPress={handleFinish}
            loading={saving}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3.5 ${
        !isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''
      }`}
    >
      <Ionicons name={icon} size={20} color="#64748B" />
      <Text className="text-sm text-slate-500 dark:text-slate-400 ml-3 w-24">
        {label}
      </Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white flex-1">
        {value}
      </Text>
    </View>
  );
}
