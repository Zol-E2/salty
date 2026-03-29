/**
 * @file app/settings.tsx
 * Settings screen — lets authenticated users update their meal preferences,
 * change the app theme, choose language and currency, and access the danger
 * zone (delete plans / account).
 *
 * State initialisation:
 *   Local state is seeded once from the Supabase profile (if authenticated) or
 *   from `onboardingStore` (if offline / unauthenticated). The `initialized`
 *   flag prevents re-seeding on subsequent re-renders.
 *
 * Save behaviour:
 *   `handleSave` writes to both Supabase (authenticated users) and the local
 *   `onboardingStore`, keeping them in sync.
 *
 * Danger zone:
 *   Both "Delete All Meal Plans" and "Delete Account" show a double-confirm
 *   Alert chain before performing any irreversible action.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useDeleteAllMealPlans } from '../hooks/useMealPlan';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GoalOption } from '../components/onboarding/GoalOption';
import { PreferencesForm } from '../components/forms/PreferencesForm';
import { DietaryRestriction, Profile } from '../lib/types';
import { LANGUAGES, CURRENCIES } from '../lib/constants';
import { changeLanguage } from '../lib/i18n';
import { useTriggerTranslations } from '../hooks/useTranslation';

/** Goal options displayed in the Goal card. Labels resolved via t() at render time. */
const GOAL_DATA: {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'save_money', icon: 'wallet-outline' },
  { key: 'eat_healthy', icon: 'heart-outline' },
  { key: 'learn_to_cook', icon: 'flame-outline' },
  { key: 'save_time', icon: 'time-outline' },
];

/** Settings screen — goal, preferences, language/currency, appearance, danger zone. */
export default function SettingsScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isAuthenticated, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAllMealPlans = useDeleteAllMealPlans();
  const onboarding = useOnboardingStore();
  const { mode, setMode } = useThemeStore();

  const { trigger: triggerTranslations, isTranslating } = useTriggerTranslations();

  const [goal, setGoal] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState(50);
  const [skillLevel, setSkillLevel] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<DietaryRestriction[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState(onboarding.language);
  const [selectedCurrency, setSelectedCurrency] = useState(onboarding.currency);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  // Seed local state once from the authoritative source (profile > store)
  useEffect(() => {
    if (initialized) return;
    if (isAuthenticated && profileLoading) return;

    setGoal(profile?.goal ?? onboarding.goal);
    setWeeklyBudget(profile?.weekly_budget ?? onboarding.weekly_budget);
    setSkillLevel(profile?.skill_level ?? onboarding.skill_level);
    setDietaryRestrictions(profile?.dietary_restrictions ?? onboarding.dietary_restrictions);
    // Language and currency from profile DB columns or local store
    setSelectedLanguage((profile as any)?.language ?? onboarding.language ?? 'en');
    setSelectedCurrency((profile as any)?.currency ?? onboarding.currency ?? 'USD');
    setInitialized(true);
  }, [profile, profileLoading, isAuthenticated, initialized]);

  /**
   * Saves all settings to Supabase (if authenticated) and to the local
   * onboarding store. Applies the language change immediately via i18next.
   */
  const handleSave = async () => {
    setSaving(true);
    try {
      if (isAuthenticated) {
        await updateProfile.mutateAsync({
          goal: goal as Profile['goal'],
          weekly_budget: weeklyBudget,
          skill_level: skillLevel as Profile['skill_level'],
          dietary_restrictions: dietaryRestrictions,
          language: selectedLanguage,
          currency: selectedCurrency,
        } as any);
      }

      onboarding.setGoal(goal);
      onboarding.setBudget(weeklyBudget);
      onboarding.setSkillLevel(skillLevel);
      onboarding.setDietaryRestrictions(dietaryRestrictions);
      onboarding.setLanguage(selectedLanguage);
      onboarding.setCurrency(selectedCurrency);
      await onboarding.markComplete();

      // Apply language immediately so the UI relabels without a restart
      await changeLanguage(selectedLanguage);

      // If the language changed, trigger background translation of saved meals.
      // This runs asynchronously without blocking the save confirmation.
      const previousLanguage = profile?.language ?? onboarding.language;
      if (selectedLanguage !== previousLanguage) {
        // Fire-and-forget: errors are logged inside useTriggerTranslations
        triggerTranslations(selectedLanguage);
      }

      Alert.alert(t('settings.saved'), t('settings.savedMsg'));
    } catch {
      Alert.alert(t('common.error'), t('settings.saveError'));
    } finally {
      setSaving(false);
    }
  };

  /**
   * Double-confirm Alert chain before deleting all meal plan items.
   * Does NOT delete the saved meal recipes themselves.
   */
  const handleDeleteAllMealPlans = () => {
    Alert.alert(
      t('settings.deleteAllPlans'),
      t('settings.deleteAllPlansMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.deleteAllPlansSure'),
              t('settings.deleteAllPlansUndo'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('common.delete'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAllMealPlans.mutateAsync();
                      Alert.alert(t('common.done'), t('settings.deleteAllPlansDone'));
                    } catch {
                      Alert.alert(t('common.error'), t('settings.deleteAllPlansError'));
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  /**
   * Double-confirm Alert chain before permanently deleting the user's account.
   * Deletes the profile row from Supabase, resets local onboarding store, then
   * signs out — cascading deletes on the database handle meals and plan items.
   */
  const handleDeleteAccount = () => {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteAccountMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              t('settings.deleteAccountSure'),
              t('settings.deleteAccountSureMsg'),
              [
                { text: t('common.cancel'), style: 'cancel' },
                {
                  text: t('settings.deleteAccountConfirm'),
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const userId = user!.id;
                      await supabase.from('profiles').delete().eq('id', userId);
                      await onboarding.reset();
                      await signOut();
                    } catch {
                      Alert.alert(t('common.error'), t('settings.deleteAccountError'));
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      {/* --- Header --- */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={20} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">
          {t('settings.title')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* --- Goal --- */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            {t('settings.goal')}
          </Text>
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
        </Card>

        {/* --- Budget, Skill Level, Dietary Restrictions (shared form) --- */}
        <Card className="mb-4">
          <PreferencesForm
            weeklyBudget={weeklyBudget}
            onBudgetChange={setWeeklyBudget}
            skillLevel={skillLevel}
            onSkillLevelChange={setSkillLevel}
            dietaryRestrictions={dietaryRestrictions}
            onDietaryRestrictionToggle={(key) =>
              setDietaryRestrictions((prev) =>
                prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
              )
            }
            currency={selectedCurrency}
          />
        </Card>

        {/* --- Language & Currency --- */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            {t('settings.languageCurrency')}
          </Text>

          {/* Language chips */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.locale.languageSection')}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang.key}
                onPress={() => setSelectedLanguage(lang.key)}
                className={`flex-row items-center px-3 py-2 rounded-xl border-2 ${
                  selectedLanguage === lang.key
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <Text className="text-base mr-1">{lang.flag}</Text>
                <Text
                  className={`text-sm font-medium ${
                    selectedLanguage === lang.key
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Currency chips */}
          <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.locale.currencySection')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {CURRENCIES.map((curr) => (
              <TouchableOpacity
                key={curr.key}
                onPress={() => setSelectedCurrency(curr.key)}
                className={`px-4 py-2.5 rounded-xl border-2 ${
                  selectedCurrency === curr.key
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selectedCurrency === curr.key
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {curr.key} {curr.symbol}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* --- Appearance --- */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            {t('settings.appearance')}
          </Text>
          <View className="flex-row gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                system: 'phone-portrait-outline',
                light: 'sunny-outline',
                dark: 'moon-outline',
              };
              const themeLabels: Record<string, string> = {
                system: t('settings.themeSystem'),
                light: t('settings.themeLight'),
                dark: t('settings.themeDark'),
              };
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className={`flex-1 py-3 rounded-xl border-2 items-center ${
                    mode === m
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <Ionicons
                    name={icons[m]}
                    size={20}
                    color={mode === m ? '#10B981' : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-medium mt-1 ${
                      mode === m
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {themeLabels[m]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* --- Save --- */}
        <View className="mb-4">
          <Button
            title={t('settings.saveChanges')}
            onPress={handleSave}
            size="lg"
            loading={saving}
          />
        </View>

        {/* --- About --- */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            {t('settings.about')}
          </Text>
          <SettingsRow
            icon="information-circle-outline"
            label={t('common.version')}
            value={t('settings.versionValue')}
          />
        </Card>

        {/* --- Danger Zone (authenticated users only) --- */}
        {isAuthenticated && (
          <Card className="mb-4 border-rose-200 dark:border-rose-900">
            <Text className="text-base font-semibold text-rose-600 dark:text-rose-400 mb-3">
              {t('settings.dangerZone')}
            </Text>
            <View className="mb-3">
              <Button
                title={t('settings.deleteAllPlans')}
                onPress={handleDeleteAllMealPlans}
                variant="outline"
                size="md"
                icon={<Ionicons name="trash-outline" size={18} color="#E11D48" />}
                className="border-rose-300 dark:border-rose-800"
              />
            </View>
            <Button
              title={t('settings.deleteAccount')}
              onPress={handleDeleteAccount}
              variant="outline"
              size="md"
              icon={<Ionicons name="person-remove-outline" size={18} color="#E11D48" />}
              className="border-rose-300 dark:border-rose-800"
            />
          </Card>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Private components
// ---------------------------------------------------------------------------

/**
 * SettingsRow renders a single label–value row with a leading icon.
 * Used in the About card.
 *
 * @param props.icon - Ionicons glyph name for the leading icon.
 * @param props.label - Row label displayed on the left.
 * @param props.value - Row value displayed on the right.
 */
function SettingsRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-3">
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className="text-sm text-slate-500 dark:text-slate-400 ml-3 flex-1">
        {label}
      </Text>
      <Text className="text-sm text-slate-900 dark:text-white">{value}</Text>
    </View>
  );
}
