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
import { useAuth } from '../hooks/useAuth';
import { useProfile, useUpdateProfile } from '../hooks/useProfile';
import { useDeleteAllMealPlans } from '../hooks/useMealPlan';
import { useOnboardingStore } from '../stores/onboardingStore';
import { useThemeStore } from '../stores/themeStore';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { GoalOption } from '../components/onboarding/GoalOption';
import { SKILL_LEVELS, DIETARY_OPTIONS } from '../lib/constants';
import { DietaryRestriction, Profile } from '../lib/types';

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

const BUDGET_OPTIONS = [30, 40, 50, 75, 100];

export default function SettingsScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const deleteAllMealPlans = useDeleteAllMealPlans();
  const onboarding = useOnboardingStore();
  const { mode, setMode } = useThemeStore();

  const [goal, setGoal] = useState('');
  const [weeklyBudget, setWeeklyBudget] = useState(50);
  const [skillLevel, setSkillLevel] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState<
    DietaryRestriction[]
  >([]);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialized) return;
    if (isAuthenticated && profileLoading) return;

    setGoal(profile?.goal ?? onboarding.goal);
    setWeeklyBudget(profile?.weekly_budget ?? onboarding.weekly_budget);
    setSkillLevel(profile?.skill_level ?? onboarding.skill_level);
    setDietaryRestrictions(
      profile?.dietary_restrictions ?? onboarding.dietary_restrictions
    );
    setInitialized(true);
  }, [profile, profileLoading, isAuthenticated, initialized]);

  const toggleRestriction = (key: DietaryRestriction) => {
    setDietaryRestrictions((prev) =>
      prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (isAuthenticated) {
        await updateProfile.mutateAsync({
          goal: goal as Profile['goal'],
          weekly_budget: weeklyBudget,
          skill_level: skillLevel as Profile['skill_level'],
          dietary_restrictions: dietaryRestrictions,
        });
      }

      onboarding.setGoal(goal);
      onboarding.setBudget(weeklyBudget);
      onboarding.setSkillLevel(skillLevel);
      onboarding.setDietaryRestrictions(dietaryRestrictions);
      await onboarding.markComplete();

      Alert.alert('Saved', 'Your settings have been updated.');
    } catch {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAllMealPlans = () => {
    Alert.alert(
      'Delete All Meal Plans?',
      'This will remove all meals from your calendar. Your saved meal recipes will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This action cannot be undone.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteAllMealPlans.mutateAsync();
                      Alert.alert(
                        'Done',
                        'All meal plans have been deleted.'
                      );
                    } catch {
                      Alert.alert(
                        'Error',
                        'Failed to delete meal plans. Please try again.'
                      );
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account?',
      'This will permanently delete your profile, all saved meals, and meal plans.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'This cannot be undone. Are you absolutely sure?',
              'All your data will be permanently removed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const userId = user!.id;

                      await supabase
                        .from('profiles')
                        .delete()
                        .eq('id', userId);

                      await onboarding.reset();
                      await signOut();
                    } catch {
                      Alert.alert(
                        'Error',
                        'Failed to delete account. Please try again.'
                      );
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
      {/* Header */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center mr-3"
        >
          <Ionicons name="arrow-back" size={20} color="#64748B" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-900 dark:text-white">
          Settings
        </Text>
      </View>

      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        {/* Goal */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Goal
          </Text>
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
        </Card>

        {/* Budget & Skill */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Weekly grocery budget
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-6">
            {BUDGET_OPTIONS.map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => setWeeklyBudget(amount)}
                className={`px-5 py-3 rounded-xl border-2 ${
                  weeklyBudget === amount
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <Text
                  className={`text-base font-semibold ${
                    weeklyBudget === amount
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}
                >
                  ${amount}/wk
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Cooking skill level
          </Text>
          <View>
            {SKILL_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.key}
                onPress={() => setSkillLevel(level.key)}
                className={`flex-row items-center p-4 rounded-xl border-2 mb-2 ${
                  skillLevel === level.key
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                    : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                }`}
              >
                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      skillLevel === level.key
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {level.label}
                  </Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                    {level.description}
                  </Text>
                </View>
                {skillLevel === level.key && (
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Dietary Restrictions */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Dietary restrictions
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            Select all that apply (optional)
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {DIETARY_OPTIONS.map((option) => {
              const selected = dietaryRestrictions.includes(option.key);
              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => toggleRestriction(option.key)}
                  className={`px-4 py-2.5 rounded-full border-2 ${
                    selected
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <Text
                    className={`text-sm font-medium ${
                      selected
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Appearance */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Appearance
          </Text>
          <View className="flex-row gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                system: 'phone-portrait-outline',
                light: 'sunny-outline',
                dark: 'moon-outline',
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
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Save */}
        <View className="mb-4">
          <Button
            title="Save Changes"
            onPress={handleSave}
            size="lg"
            loading={saving}
          />
        </View>

        {/* About */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            About
          </Text>
          <SettingsRow
            icon="information-circle-outline"
            label="Version"
            value="Salty v1.0.0"
          />
        </Card>

        {/* Danger Zone */}
        {isAuthenticated && (
          <Card className="mb-4 border-rose-200 dark:border-rose-900">
            <Text className="text-base font-semibold text-rose-600 dark:text-rose-400 mb-3">
              Danger Zone
            </Text>
            <View className="mb-3">
              <Button
                title="Delete All Meal Plans"
                onPress={handleDeleteAllMealPlans}
                variant="outline"
                size="md"
                icon={
                  <Ionicons name="trash-outline" size={18} color="#E11D48" />
                }
                className="border-rose-300 dark:border-rose-800"
              />
            </View>
            <Button
              title="Delete Account"
              onPress={handleDeleteAccount}
              variant="outline"
              size="md"
              icon={
                <Ionicons name="person-remove-outline" size={18} color="#E11D48" />
              }
              className="border-rose-300 dark:border-rose-800"
            />
          </Card>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

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
