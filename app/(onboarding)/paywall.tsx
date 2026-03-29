/**
 * @file app/(onboarding)/paywall.tsx
 * Onboarding step 5 of 6 — subscription plan selection.
 *
 * Shows Free / Pro / Pro+ tiers with feature lists. Plan names and feature
 * strings are translated via `useTranslation()`. Subscription prices ($0,
 * $4.99, $9.99) remain hardcoded in USD — they are not meal costs and must
 * not go through `formatAmount()`.
 */

import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';

/**
 * Static plan configuration. Translated names and features are resolved at
 * render time using `t()` keys. Prices stay hardcoded in USD as they are
 * subscription price points, not meal costs.
 */
const PLAN_CONFIG = [
  {
    nameKey: 'planFree',
    price: '$0',
    periodKey: 'forever',
    highlight: false,
    featureKeys: ['featureFreeAi', 'featureFreeRecipes', 'featureFreeCalendar'],
    missingKeys: ['featureProUnlimited', 'featureProMacros', 'featureProGrocery'],
  },
  {
    nameKey: 'planPro',
    price: '$4.99',
    periodKey: null, // '/month' suffix is a hardcoded string not a locale key
    highlight: true,
    badgeKey: 'mostPopular',
    featureKeys: ['featureProUnlimited', 'featureProMacros', 'featureProGrocery', 'featureProSupport'],
    missingKeys: [],
  },
  {
    nameKey: 'planProPlus',
    price: '$9.99',
    periodKey: null,
    highlight: false,
    featureKeys: ['featureProPlusEverything', 'featureProPlusBatch', 'featureProPlusShare', 'featureProPlusRecipe'],
    missingKeys: [],
  },
];

/** Onboarding step 5: subscription plan selection. */
export default function PaywallScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8">
          {/* Step 5 of 6 — locale step inserted before goals */}
          <ProgressDots total={7} current={6} />
        </View>

        <View className="px-6 pt-8 pb-4 items-center">
          <View className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="star" size={28} color="#F59E0B" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
            {t('onboarding.paywall.title')}
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
            {t('onboarding.paywall.subtitle')}
          </Text>
        </View>

        <View className="px-6 gap-3 pb-4">
          {PLAN_CONFIG.map((plan) => (
            <View
              key={plan.nameKey}
              className={`rounded-2xl p-4 border-2 ${
                plan.highlight
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-lg font-bold ${
                      plan.highlight
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {t(`onboarding.paywall.${plan.nameKey}`)}
                  </Text>
                  {plan.badgeKey && (
                    <View className="bg-primary-500 dark:bg-primary-400 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-bold text-white">
                        {t(`onboarding.paywall.${plan.badgeKey}`)}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-baseline">
                  <Text
                    className={`text-xl font-bold ${
                      plan.highlight
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {plan.price}
                  </Text>
                  {/* Period is localised for 'forever'; '/month' is a hardcoded suffix */}
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                    {plan.periodKey
                      ? ` ${t(`onboarding.paywall.${plan.periodKey}`)}`
                      : ' /month'}
                  </Text>
                </View>
              </View>

              {plan.featureKeys.map((key) => (
                <View key={key} className="flex-row items-center mt-1.5">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                    {t(`onboarding.paywall.${key}`)}
                  </Text>
                </View>
              ))}

              {plan.missingKeys.map((key) => (
                <View key={key} className="flex-row items-center mt-1.5">
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                  <Text className="text-sm text-slate-400 dark:text-slate-500 ml-2">
                    {t(`onboarding.paywall.${key}`)}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-8 pt-4 bg-stone-50 dark:bg-slate-950">
        <Button
          title={t('common.continue')}
          onPress={() => router.push('/(auth)/login')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
