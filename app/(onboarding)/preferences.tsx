/**
 * @file app/(onboarding)/preferences.tsx
 * Onboarding step 3 of 7 — collects the user's weekly budget, cooking skill
 * level, and dietary restrictions.
 *
 * State is read from and written to `useOnboardingStore` directly. The form
 * UI is rendered by the shared `PreferencesForm` component, which prevents
 * duplication with `app/settings.tsx`.
 *
 * Navigates to `nutrition` (step 4) on continue. The Continue button is
 * disabled until a skill level is selected (budget and dietary restrictions
 * have sensible defaults so they are always valid).
 */

import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { PreferencesForm } from '../../components/forms/PreferencesForm';
import { useOnboardingStore } from '../../stores/onboardingStore';

/** Step 3 of the onboarding flow: budget, skill level, and dietary preferences. */
export default function PreferencesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    weekly_budget,
    skill_level,
    dietary_restrictions,
    currency,
    setBudget,
    setSkillLevel,
    toggleDietaryRestriction,
  } = useOnboardingStore();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 mb-8">
          {/* Step 3 of 7 — nutrition step added after this */}
          <ProgressDots total={7} current={3} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('onboarding.preferences.title')}
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          {t('onboarding.preferences.subtitle')}
        </Text>

        {/* Shared preferences form — identical UI to settings screen */}
        <PreferencesForm
          weeklyBudget={weekly_budget}
          onBudgetChange={setBudget}
          skillLevel={skill_level}
          onSkillLevelChange={setSkillLevel}
          dietaryRestrictions={dietary_restrictions}
          onDietaryRestrictionToggle={toggleDietaryRestriction}
          currency={currency}
        />
      </ScrollView>

      <View className="px-6 pb-8 pt-4 bg-stone-50 dark:bg-slate-950">
        <Button
          title={t('common.continue')}
          onPress={() => router.push('/(onboarding)/nutrition')}
          disabled={!skill_level}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
