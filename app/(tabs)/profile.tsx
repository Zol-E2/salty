/**
 * @file app/(tabs)/profile.tsx
 * Profile tab — displays the user's current preferences and upgrade prompt.
 *
 * Route: `/(tabs)/profile`
 * Data fallback chain:
 *   Profile data is read from two sources in priority order:
 *   1. Supabase `profiles` table (when authenticated) — always up to date.
 *   2. `onboardingStore` (local SecureStore) — used when offline or during
 *      the initial render before the Supabase query resolves.
 *   This prevents the screen from showing empty values while the query loads.
 *
 * The screen does not allow editing — users tap the settings gear icon to
 * navigate to `app/settings.tsx` for modifications.
 *
 * Sections:
 *   - Preferences (goal, budget, skill, dietary, language, currency)
 *   - Weekly Budget (spend vs budget for the current ISO week with progress bar)
 *   - Nutrition (weight, goal, calories, meals per day; read-only display)
 *   - Pro Upgrade
 *   - Sign Out
 *   - Developer Tools
 */

import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useExchangeRateStore } from '../../stores/exchangeRateStore';
import { useWeeklySpend } from '../../hooks/useWeeklySpend';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GOALS, SKILL_LEVELS, DIETARY_OPTIONS, LANGUAGES, CURRENCIES } from '../../lib/constants';
import { formatAmount } from '../../lib/currency';

/**
 * Renders the Profile tab with user preferences, a Pro upgrade card, sign-out
 * button, and (in dev builds only) a Developer Tools card for resetting the
 * onboarding flow.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, signOut } = useAuth();
  const { data: profile } = useProfile();
  const onboarding = useOnboardingStore();
  const { rates } = useExchangeRateStore();

  const handleSignOut = () => {
    Alert.alert(t('profile.signOutConfirmTitle'), t('profile.signOutConfirmMsg'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('profile.signOut'), style: 'destructive', onPress: signOut },
    ]);
  };

  /** DEV ONLY — resets onboarding so the flow can be re-tested without signing out. */
  const handleRetakeOnboarding = async () => {
    await onboarding.reset();
    // FlowGuard watches onboardingComplete reactively and will redirect to
    // /(onboarding)/welcome automatically once the store update propagates.
  };

  // Use Supabase profile if authenticated, otherwise local onboarding data
  const goalLabel =
    GOALS.find((g) => g.key === (profile?.goal ?? onboarding.goal))?.label ?? '-';
  const skillLabel =
    SKILL_LEVELS.find(
      (s) => s.key === (profile?.skill_level ?? onboarding.skill_level)
    )?.label ?? '-';
  const restrictions = profile?.dietary_restrictions ?? onboarding.dietary_restrictions;
  const dietaryLabels =
    restrictions
      ?.map((r) => DIETARY_OPTIONS.find((d) => d.key === r)?.label ?? r)
      .join(', ') || t('common.none');
  const budget = profile?.weekly_budget ?? onboarding.weekly_budget;

  // Resolve language and currency from profile (DB) or onboarding store
  const activeCurrency = (profile as any)?.currency ?? onboarding.currency ?? 'USD';
  const activeLanguage = (profile as any)?.language ?? onboarding.language ?? 'en';
  const languageLabel = LANGUAGES.find((l) => l.key === activeLanguage)?.label ?? activeLanguage;
  const currencyLabel = CURRENCIES.find((c) => c.key === activeCurrency)?.key ?? activeCurrency;

  // Format budget in the user's selected display currency
  const budgetDisplay = `${formatAmount(budget, activeCurrency, rates)}${t('profile.perWeek')}`;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="pt-4 pb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {t('profile.title')}
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {isAuthenticated ? user?.email : t('profile.notSignedIn')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center"
          >
            <Ionicons name="settings-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Preferences */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            {t('profile.preferences')}
          </Text>
          <ProfileRow icon="flag-outline" label={t('profile.goal')} value={goalLabel} />
          <ProfileRow icon="wallet-outline" label={t('profile.budget')} value={budgetDisplay} />
          <ProfileRow icon="flame-outline" label={t('profile.skill')} value={skillLabel} />
          <ProfileRow icon="leaf-outline" label={t('profile.dietary')} value={dietaryLabels} />
          <ProfileRow icon="language-outline" label={t('profile.language')} value={languageLabel} />
          <ProfileRow
            icon="cash-outline"
            label={t('profile.currency')}
            value={currencyLabel}
            isLast
          />
        </Card>

        {/* Weekly Budget */}
        <WeeklyBudgetCard
          weeklyBudget={budget}
          activeCurrency={activeCurrency}
          rates={rates}
        />

        {/* Nutrition */}
        <NutritionCard profile={profile} onboarding={onboarding} />

        {/* Pro Upgrade */}
        <Card className="mb-4 border-amber-300 dark:border-amber-700">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-amber-100 dark:bg-amber-400/10 rounded-xl items-center justify-center mr-3">
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                {t('profile.proTitle')}
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                {t('profile.proSubtitle')}
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <ProFeature label={t('profile.proFeature1')} />
            <ProFeature label={t('profile.proFeature2')} />
            <ProFeature label={t('profile.proFeature3')} />
          </View>

          <Text className="text-center text-sm text-slate-500 dark:text-slate-400 mb-3">
            {t('profile.proPrice')}
          </Text>

          <Button
            title={t('profile.upgrade')}
            onPress={() =>
              Alert.alert(t('profile.upgradeComingSoon'), t('profile.upgradeComingSoonMsg'))
            }
            size="md"
            icon={<Ionicons name="star" size={18} color="white" />}
          />
        </Card>

        {/* Sign out */}
        <View className="mt-4 mb-8">
          <Button
            title={t('profile.signOut')}
            onPress={handleSignOut}
            variant="outline"
            size="md"
            icon={<Ionicons name="log-out-outline" size={18} color="#10B981" />}
          />
        </View>

        {/* Developer Tools */}
        <Card className="mb-4 border-rose-400 dark:border-rose-600">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-rose-100 dark:bg-rose-400/10 rounded-xl items-center justify-center mr-3">
              <Ionicons name="construct-outline" size={20} color="#F43F5E" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-rose-600 dark:text-rose-400">
                {t('profile.devTools')}
              </Text>
            </View>
          </View>
          <Button
            title={t('profile.retakeOnboarding')}
            onPress={handleRetakeOnboarding}
            variant="outline"
            size="md"
            icon={<Ionicons name="refresh-outline" size={18} color="#F43F5E" />}
          />
        </Card>

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Private components
// ---------------------------------------------------------------------------

/**
 * ProFeature renders a single checkmarked feature row inside the Pro upgrade card.
 *
 * @param props.label - Feature description text.
 */
function ProFeature({ label }: { label: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
      <Text className="text-sm text-slate-700 dark:text-slate-300 ml-2">
        {label}
      </Text>
    </View>
  );
}

/**
 * ProfileRow renders a single label–value row with a leading icon.
 * Used in the Preferences card.
 *
 * @param props.icon - Ionicons glyph name.
 * @param props.label - Short label on the left side.
 * @param props.value - Value text on the right side.
 * @param props.isLast - When true, suppresses the bottom divider line.
 */
function ProfileRow({
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
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className="text-sm text-slate-500 dark:text-slate-400 ml-3 flex-1">
        {label}
      </Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white text-right ml-4 max-w-[55%]">
        {value}
      </Text>
    </View>
  );
}

/**
 * WeeklyBudgetCard shows the user's weekly grocery budget alongside the total
 * spend for the current ISO week (Monday–Sunday) as a progress bar.
 *
 * Data sources:
 *   - `weeklyBudget` — from the Supabase profile / onboarding store (passed in).
 *   - `totalSpend` — from `useWeeklySpend` (React Query, sums meal costs for
 *     non-fallback plan items in the current week).
 *
 * The progress bar turns amber when ≥80% of the budget is used, and rose when
 * over budget (spend > budget). The remaining value is shown in rose when negative.
 *
 * @param props.weeklyBudget - User's weekly budget in their base currency (USD).
 * @param props.activeCurrency - ISO 4217 code for display formatting.
 * @param props.rates - Exchange rates from the exchange rate store.
 */
function WeeklyBudgetCard({
  weeklyBudget,
  activeCurrency,
  rates,
}: {
  weeklyBudget: number;
  activeCurrency: string;
  rates: Record<string, number>;
}) {
  const { t } = useTranslation();
  const { totalSpend, isLoading } = useWeeklySpend();

  // Only render when a budget has been set
  if (weeklyBudget <= 0) return null;

  const pct = Math.min(totalSpend / weeklyBudget, 1);
  const remaining = weeklyBudget - totalSpend;

  // Bar colour: green → amber at 80% → rose when over budget
  const barColor =
    totalSpend > weeklyBudget ? '#F43F5E' : totalSpend / weeklyBudget >= 0.8 ? '#F59E0B' : '#10B981';

  const fmt = (amount: number) => formatAmount(amount, activeCurrency, rates);

  return (
    <Card className="mb-4">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 bg-emerald-100 dark:bg-emerald-400/10 rounded-xl items-center justify-center mr-3">
          <Ionicons name="wallet-outline" size={20} color="#10B981" />
        </View>
        <Text className="text-base font-semibold text-slate-900 dark:text-white flex-1">
          {t('profile.weeklyBudgetTitle')}
        </Text>
      </View>

      {/* Budget row */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {t('profile.budget')}
        </Text>
        <Text className="text-sm font-medium text-slate-900 dark:text-white">
          {fmt(weeklyBudget)}{t('profile.perWeek')}
        </Text>
      </View>

      {/* This week row */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {t('profile.thisWeek')}
        </Text>
        <Text className="text-sm font-medium text-slate-900 dark:text-white">
          {isLoading ? '...' : t('profile.budgetOf', { spent: fmt(totalSpend), budget: fmt(weeklyBudget) })}
        </Text>
      </View>

      {/* Progress bar */}
      <View className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
        <View
          className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: barColor }}
        />
      </View>

      {/* Remaining row */}
      <View className="flex-row justify-between items-center">
        <Text className="text-xs text-slate-400 dark:text-slate-500">
          {t('profile.remaining')}
        </Text>
        <Text
          className="text-xs font-semibold"
          style={{ color: remaining < 0 ? '#F43F5E' : '#10B981' }}
        >
          {isLoading ? '...' : fmt(remaining)}
        </Text>
      </View>
    </Card>
  );
}

/**
 * NutritionCard displays body-composition data from the nutrition onboarding step.
 * Falls back to onboarding store values when the Supabase profile is not yet loaded.
 * All fields are read-only — the user can edit them by re-running the onboarding
 * nutrition step or through a future dedicated settings screen.
 *
 * @param props.profile - Supabase profile row (may be null when loading).
 * @param props.onboarding - Onboarding store state for offline fallback.
 */
function NutritionCard({
  profile,
  onboarding,
}: {
  profile: any;
  onboarding: ReturnType<typeof useOnboardingStore.getState>;
}) {
  const { t } = useTranslation();
  // Resolve values: DB profile takes priority over local store
  const weight = profile?.weight_kg ?? onboarding.weight_kg;
  const goal = profile?.nutrition_goal ?? onboarding.nutrition_goal;
  const calories = profile?.daily_calories ?? onboarding.daily_calories;
  const mealsPerDay = profile?.meals_per_day ?? onboarding.meals_per_day ?? 4;
  const favFoods: string[] = profile?.favorite_foods ?? onboarding.favorite_foods ?? [];
  const avoidFoods: string[] = profile?.foods_to_avoid ?? onboarding.foods_to_avoid ?? [];

  const goalLabel = goal ? t(`onboarding.nutrition.goals.${goal}`) : t('common.none');
  const weightDisplay = weight != null ? `${weight} kg` : t('common.none');
  const caloriesDisplay = calories != null ? `${calories} kcal` : t('common.none');

  // Build the row list dynamically so the last item always gets isLast=true
  const rows: { icon: string; label: string; value: string }[] = [
    { icon: 'body-outline',          label: t('onboarding.nutrition.weight'),        value: weightDisplay },
    { icon: 'trending-down-outline', label: t('onboarding.nutrition.nutritionGoal'), value: goalLabel },
    { icon: 'flame-outline',         label: t('onboarding.nutrition.dailyCalories'), value: caloriesDisplay },
    { icon: 'restaurant-outline',    label: t('onboarding.nutrition.mealsPerDay'),   value: String(mealsPerDay) },
    { icon: 'heart-outline',         label: t('onboarding.nutrition.favoriteFoods'), value: favFoods.join(', ') || t('common.none') },
    { icon: 'ban-outline',           label: t('onboarding.nutrition.foodsToAvoid'),  value: avoidFoods.join(', ') || t('common.none') },
  ];

  return (
    <Card className="mb-4">
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        {t('onboarding.nutrition.title')}
      </Text>
      {rows.map((row, i) => (
        <ProfileRow
          key={row.label}
          icon={row.icon as keyof typeof Ionicons.glyphMap}
          label={row.label}
          value={row.value}
          isLast={i === rows.length - 1}
        />
      ))}
    </Card>
  );
}
