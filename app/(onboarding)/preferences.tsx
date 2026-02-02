import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { DIETARY_OPTIONS, SKILL_LEVELS } from '../../lib/constants';
import { DietaryRestriction } from '../../lib/types';

export default function PreferencesScreen() {
  const router = useRouter();
  const {
    weekly_budget,
    skill_level,
    dietary_restrictions,
    setBudget,
    setSkillLevel,
    toggleDietaryRestriction,
  } = useOnboardingStore();

  const budgetOptions = [30, 40, 50, 75, 100];

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 mb-8">
          <ProgressDots total={4} current={2} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Your preferences
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          Help us find the perfect meals for you
        </Text>

        {/* Budget */}
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          Weekly grocery budget
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {budgetOptions.map((amount) => (
            <TouchableOpacity
              key={amount}
              onPress={() => setBudget(amount)}
              className={`px-5 py-3 rounded-xl border-2 ${
                weekly_budget === amount
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <Text
                className={`text-base font-semibold ${
                  weekly_budget === amount
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                ${amount}/wk
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Skill Level */}
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          Cooking skill level
        </Text>
        <View className="mb-8">
          {SKILL_LEVELS.map((level) => (
            <TouchableOpacity
              key={level.key}
              onPress={() => setSkillLevel(level.key)}
              className={`flex-row items-center p-4 rounded-xl border-2 mb-2 ${
                skill_level === level.key
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <View className="flex-1">
                <Text
                  className={`text-base font-semibold ${
                    skill_level === level.key
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
              {skill_level === level.key && (
                <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Dietary Restrictions */}
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          Dietary restrictions
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
          Select all that apply (optional)
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-8">
          {DIETARY_OPTIONS.map((option) => {
            const selected = dietary_restrictions.includes(option.key);
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => toggleDietaryRestriction(option.key)}
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
      </ScrollView>

      <View className="px-6 pb-8 pt-4 bg-stone-50 dark:bg-slate-950">
        <Button
          title="Continue"
          onPress={() => router.push('/(onboarding)/complete')}
          disabled={!skill_level}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
