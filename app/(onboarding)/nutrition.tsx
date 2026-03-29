/**
 * @file app/(onboarding)/nutrition.tsx
 * Onboarding step 4 of 7 — collects optional nutrition and body-composition
 * preferences that help the AI generate more personalised meal plans.
 *
 * All fields are optional. The user may tap "Skip" to proceed without filling
 * in any values; the store retains the null/empty defaults set in
 * `onboardingStore.ts`.
 *
 * Fields collected:
 *   - Weight (kg/lbs toggle) → stored always as kg
 *   - Nutrition goal chip (Lose / Maintain / Gain)
 *   - Daily calorie target (free text, optional)
 *   - Meals per day stepper (2–6)
 *   - Favourite foods (tag input, comma/Enter separated)
 *   - Foods to avoid (tag input, comma/Enter separated)
 *
 * Navigation: Back → `preferences`; Next/Skip → `complete`
 */

import { useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { useOnboardingStore } from '../../stores/onboardingStore';

// ---------------------------------------------------------------------------
// Private helper components
// ---------------------------------------------------------------------------

/**
 * TagInput renders a list of string tags with an × button to remove each, plus
 * a text input that adds a new tag when the user presses Enter or the comma key.
 *
 * @param props.tags - Current list of tag strings.
 * @param props.onChangeTags - Called with the updated array on every add/remove.
 * @param props.placeholder - Placeholder shown in the text input.
 */
function TagInput({
  tags,
  onChangeTags,
  placeholder,
}: {
  tags: string[];
  onChangeTags: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState('');

  /** Splits the current input on commas, trims each part, and appends non-empty, non-duplicate tags. */
  const commitInput = () => {
    const parts = inputValue
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !tags.includes(s));
    if (parts.length > 0) {
      onChangeTags([...tags, ...parts]);
    }
    setInputValue('');
  };

  return (
    <View>
      <View className="flex-row flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <View
            key={tag}
            className="flex-row items-center bg-emerald-100 dark:bg-emerald-900/30 rounded-full px-3 py-1"
          >
            <Text className="text-sm text-emerald-700 dark:text-emerald-300 mr-1">{tag}</Text>
            <TouchableOpacity onPress={() => onChangeTags(tags.filter((t) => t !== tag))}>
              <Ionicons name="close-circle" size={16} color="#10B981" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
      <TextInput
        value={inputValue}
        onChangeText={setInputValue}
        onSubmitEditing={commitInput}
        onBlur={commitInput}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        returnKeyType="done"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm"
      />
    </View>
  );
}

/**
 * NutritionGoalChip renders a single selectable chip for the body-composition goal.
 *
 * @param props.label - Display label (translated).
 * @param props.isSelected - Whether this chip is currently selected.
 * @param props.onPress - Called when the chip is tapped.
 */
function NutritionGoalChip({
  label,
  isSelected,
  onPress,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-1 py-3 rounded-xl items-center border ${
        isSelected
          ? 'bg-emerald-500 border-emerald-500'
          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${
          isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
        }`}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

/** Onboarding step 4: nutrition goals, weight, calorie target, food preferences. */
export default function NutritionScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    weight_kg,
    nutrition_goal,
    daily_calories,
    favorite_foods,
    foods_to_avoid,
    meals_per_day,
    setWeightKg,
    setNutritionGoal,
    setDailyCalories,
    setFavoriteFoods,
    setFoodsToAvoid,
    setMealsPerDay,
  } = useOnboardingStore();

  // --- Weight unit toggle: kg / lbs ---
  // We always store in kg; the lbs display is a local UI conversion.
  const [useLbs, setUseLbs] = useState(false);
  const [weightInput, setWeightInput] = useState(
    weight_kg != null ? String(weight_kg) : ''
  );

  const handleWeightChange = (text: string) => {
    setWeightInput(text);
    const num = parseFloat(text);
    if (!isNaN(num) && num > 0) {
      // Convert to kg before storing
      const kg = useLbs ? num / 2.20462 : num;
      setWeightKg(Math.round(kg * 10) / 10);
    } else {
      setWeightKg(null);
    }
  };

  const handleUnitToggle = (toLbs: boolean) => {
    setUseLbs(toLbs);
    if (weight_kg != null) {
      // Convert the displayed value when the unit switches
      const displayed = toLbs
        ? (weight_kg * 2.20462).toFixed(1)
        : String(weight_kg);
      setWeightInput(displayed);
    }
  };

  const handleCaloriesChange = (text: string) => {
    const num = parseInt(text, 10);
    setDailyCalories(!isNaN(num) && num > 0 ? num : null);
  };

  // Stepper: clamp between 2 and 6
  const handleMealsStepChange = (delta: number) => {
    const next = Math.min(6, Math.max(2, meals_per_day + delta));
    setMealsPerDay(next);
  };

  const handleNext = () => {
    router.push('/(onboarding)/complete');
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 mb-8">
          {/* Step 4 of 7 */}
          <ProgressDots total={7} current={4} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('onboarding.nutrition.title')}
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          {t('onboarding.nutrition.subtitle')}
        </Text>

        {/* --- Weight --- */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t('onboarding.nutrition.weight')}
            </Text>
            {/* kg / lbs toggle */}
            <View className="flex-row items-center gap-2">
              <Text
                className={`text-sm ${!useLbs ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}
              >
                kg
              </Text>
              <Switch
                value={useLbs}
                onValueChange={handleUnitToggle}
                trackColor={{ false: '#10B981', true: '#64748b' }}
                thumbColor="#ffffff"
              />
              <Text
                className={`text-sm ${useLbs ? 'text-emerald-500 font-semibold' : 'text-slate-400'}`}
              >
                lbs
              </Text>
            </View>
          </View>
          <TextInput
            value={weightInput}
            onChangeText={handleWeightChange}
            keyboardType="decimal-pad"
            placeholder={useLbs ? '154' : '70'}
            placeholderTextColor="#94a3b8"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm"
          />
        </View>

        {/* --- Nutrition goal chips --- */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.nutrition.nutritionGoal')}
          </Text>
          <View className="flex-row gap-2">
            {(['lose', 'maintain', 'gain'] as const).map((key) => (
              <NutritionGoalChip
                key={key}
                label={t(`onboarding.nutrition.goals.${key}`)}
                isSelected={nutrition_goal === key}
                onPress={() =>
                  // Toggle off if already selected
                  setNutritionGoal(nutrition_goal === key ? null : key)
                }
              />
            ))}
          </View>
        </View>

        {/* --- Daily calorie target --- */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.nutrition.dailyCalories')}
          </Text>
          <TextInput
            value={daily_calories != null ? String(daily_calories) : ''}
            onChangeText={handleCaloriesChange}
            keyboardType="number-pad"
            placeholder="2000"
            placeholderTextColor="#94a3b8"
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm"
          />
        </View>

        {/* --- Meals per day stepper --- */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.nutrition.mealsPerDay')}
          </Text>
          <View className="flex-row items-center gap-4">
            <TouchableOpacity
              onPress={() => handleMealsStepChange(-1)}
              disabled={meals_per_day <= 2}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
            >
              <Ionicons
                name="remove"
                size={20}
                color={meals_per_day <= 2 ? '#94a3b8' : '#10B981'}
              />
            </TouchableOpacity>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white w-8 text-center">
              {meals_per_day}
            </Text>
            <TouchableOpacity
              onPress={() => handleMealsStepChange(1)}
              disabled={meals_per_day >= 6}
              className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center"
            >
              <Ionicons
                name="add"
                size={20}
                color={meals_per_day >= 6 ? '#94a3b8' : '#10B981'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- Favourite foods --- */}
        <View className="mb-6">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.nutrition.favoriteFoods')}
          </Text>
          <TagInput
            tags={favorite_foods}
            onChangeTags={setFavoriteFoods}
            placeholder="chicken, pasta, eggs..."
          />
        </View>

        {/* --- Foods to avoid --- */}
        <View className="mb-8">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            {t('onboarding.nutrition.foodsToAvoid')}
          </Text>
          <TagInput
            tags={foods_to_avoid}
            onChangeTags={setFoodsToAvoid}
            placeholder="mushrooms, olives..."
          />
        </View>
      </ScrollView>

      <View className="px-6 pb-8 pt-4 bg-stone-50 dark:bg-slate-950 gap-3">
        <Button title={t('common.continue')} onPress={handleNext} size="lg" />
        <Button
          title={t('onboarding.nutrition.skip')}
          onPress={handleNext}
          variant="ghost"
          size="md"
        />
      </View>
    </SafeAreaView>
  );
}
