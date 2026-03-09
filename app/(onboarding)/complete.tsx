/**
 * @file app/(onboarding)/complete.tsx
 * Onboarding step 4 of 6 — summary of the user's chosen preferences.
 *
 * Route: `/(onboarding)/complete`
 * Displays goal, budget (in the user's selected currency), skill level,
 * dietary restrictions, language, and currency choices. Tapping Continue calls
 * `markComplete()`, persisting all data to SecureStore, then navigates to the
 * paywall screen.
 */

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useExchangeRateStore } from '../../stores/exchangeRateStore';
import { GOALS, SKILL_LEVELS, DIETARY_OPTIONS, LANGUAGES, CURRENCIES } from '../../lib/constants';
import { formatAmount } from '../../lib/currency';

/** Summary screen shown at the end of onboarding — displays all chosen preferences. */
export default function CompleteScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const {
    goal,
    weekly_budget,
    skill_level,
    dietary_restrictions,
    language,
    currency,
    markComplete,
  } = useOnboardingStore();
  const { rates } = useExchangeRateStore();

  const goalLabel = GOALS.find((g) => g.key === goal)?.label ?? goal;
  const skillLabel = SKILL_LEVELS.find((s) => s.key === skill_level)?.label ?? skill_level;
  const dietaryLabels = dietary_restrictions.map(
    (r) => DIETARY_OPTIONS.find((d) => d.key === r)?.label ?? r
  );
  const languageLabel = LANGUAGES.find((l) => l.key === language)?.label ?? language;
  const currencyLabel = CURRENCIES.find((c) => c.key === currency)?.key ?? currency;

  // Display budget in the user's currency (formatAmount converts from USD base)
  const budgetDisplay = formatAmount(weekly_budget, currency, rates);

  const handleFinish = async () => {
    setSaving(true);
    try {
      await markComplete();
      router.push('/(onboarding)/paywall');
    } catch {
      Alert.alert(t('common.error'), t('onboarding.complete.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8 mb-8">
          <ProgressDots total={6} current={4} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('onboarding.complete.title')}
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          {t('onboarding.complete.subtitle')}
        </Text>

        <View className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 mb-6">
          <SummaryRow icon="flag-outline" label={t('onboarding.complete.goal')} value={goalLabel} />
          <SummaryRow
            icon="wallet-outline"
            label={t('onboarding.complete.budget')}
            value={budgetDisplay}
          />
          <SummaryRow
            icon="flame-outline"
            label={t('onboarding.complete.skill')}
            value={skillLabel}
          />
          <SummaryRow
            icon="leaf-outline"
            label={t('onboarding.complete.dietary')}
            value={dietaryLabels.length > 0 ? dietaryLabels.join(', ') : t('common.none')}
          />
          <SummaryRow
            icon="language-outline"
            label={t('onboarding.complete.language')}
            value={languageLabel}
          />
          <SummaryRow
            icon="cash-outline"
            label={t('onboarding.complete.currency')}
            value={currencyLabel}
            isLast
          />
        </View>

        <View className="flex-1" />

        <View className="pb-8">
          <Button
            title={t('common.continue')}
            onPress={handleFinish}
            loading={saving}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Private components
// ---------------------------------------------------------------------------

/**
 * SummaryRow renders a single label–value row with a leading Ionicon.
 * Used to display each preference in the onboarding summary card.
 *
 * @param props.icon - Ionicons glyph name.
 * @param props.label - Short label on the left (e.g. "Goal").
 * @param props.value - Value displayed on the right.
 * @param props.isLast - When true, suppresses the bottom divider.
 */
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
