/**
 * @file app/(onboarding)/goals.tsx
 * Onboarding step 2 of 6 — the user selects their primary meal-planning goal.
 *
 * Goal labels and descriptions come from translation keys so they display in
 * the user's chosen language. Icons use Ionicons names stored locally in
 * `GOAL_DATA`; we do not consolidate with `lib/constants.ts` GOALS which uses
 * MaterialCommunityIcons names.
 */

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { GoalOption } from '../../components/onboarding/GoalOption';
import { useOnboardingStore } from '../../stores/onboardingStore';

/**
 * Goal options with their icon names. Labels and descriptions are fetched via
 * `t()` at render time so they switch language without a restart.
 * Icons use Ionicons — intentionally different from `lib/constants.ts` GOALS
 * which uses MaterialCommunityIcons for a different context.
 */
const GOAL_DATA: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'save_money', icon: 'wallet-outline' },
  { key: 'eat_healthy', icon: 'heart-outline' },
  { key: 'learn_to_cook', icon: 'flame-outline' },
  { key: 'save_time', icon: 'time-outline' },
];

/** Onboarding step 2: goal selection. */
export default function GoalsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { goal, setGoal } = useOnboardingStore();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8 mb-8">
          {/* Step 2 of 6 — locale step was inserted before this one */}
          <ProgressDots total={7} current={2} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('onboarding.goals.title')}
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          {t('onboarding.goals.subtitle')}
        </Text>

        <View className="flex-1">
          {GOAL_DATA.map((g) => (
            <GoalOption
              key={g.key}
              label={t(`onboarding.goals.${g.key}`)}
              description={t(`onboarding.goals.${g.key}_desc`)}
              iconName={g.icon}
              selected={goal === g.key}
              onPress={() => setGoal(g.key)}
            />
          ))}
        </View>

        <View className="pb-8">
          <Button
            title={t('common.continue')}
            onPress={() => router.push('/(onboarding)/preferences')}
            disabled={!goal}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
