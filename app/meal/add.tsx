/**
 * @file app/meal/add.tsx
 * Modal screen for adding or replacing a meal in a specific slot on a calendar day.
 *
 * Route: `/meal/add?date=YYYY-MM-DD&slot=<MealSlotType>[&slot_index=0][&replace=1]`
 * Presentation: modal (slide_from_bottom) — registered in `app/_layout.tsx`.
 *
 * Query params:
 *   - `date`        — the target day in YYYY-MM-DD format
 *   - `slot`        — the meal slot to fill ('breakfast' | 'lunch' | 'dinner' | 'snack')
 *   - `slot_index`  — 0-based index within the slot; defaults to 0
 *   - `replace`     — when `'1'`, the header says "Replace [slot]" instead of "Add [slot]"
 *                     and a note explains the current meal will be replaced.
 *
 * The screen shows the user's saved meals with a live search bar. Tapping a meal
 * calls `useAddMealToPlan()`, which upserts into `meal_plan_items` keyed on
 * (user_id, date, slot, slot_index) — replacing any previously assigned meal for that
 * slot+index combination. On success it calls `router.back()` to return to the day view.
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '../../hooks/useMeals';
import { useAddMealToPlan } from '../../hooks/useMealPlan';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { MealCard } from '../../components/meal/MealCard';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { MealSlotType } from '../../lib/types';

/**
 * Type guard that narrows an unknown string to a valid MealSlotType.
 * Prevents using an invalid slot string in the mutation.
 *
 * @param value - The raw string from query params.
 * @returns True if value is a valid MealSlotType.
 */
function isMealSlotType(value: string): value is MealSlotType {
  return ['breakfast', 'lunch', 'dinner', 'snack'].includes(value);
}

/**
 * AddMealScreen lets users search their saved meals and assign one to a
 * specific slot on a given date. Opened as a modal from `app/day/[date].tsx`
 * when an empty meal slot is tapped.
 */
export default function AddMealScreen() {
  const { t } = useTranslation();
  const language = useOnboardingStore((s) => s.language);
  const { date, slot, slot_index, replace } = useLocalSearchParams<{
    date: string;
    slot: string;
    slot_index?: string;
    replace?: string;
  }>();

  // `replace=1` switches the header from "Add" to "Replace"
  const isReplace = replace === '1';
  // Parse slot_index; fall back to 0 for backward compatibility
  const slotIndex = slot_index ? parseInt(slot_index, 10) : 0;
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: meals, isLoading } = useMeals(search);
  const addMeal = useAddMealToPlan();

  // Validate slot param before using it in a mutation to prevent silent failures
  const validSlot = slot && isMealSlotType(slot) ? slot : null;

  const slotLabel = validSlot
    ? validSlot.charAt(0).toUpperCase() + validSlot.slice(1)
    : 'Meal';

  /** Validates params, upserts the meal plan item, and navigates back on success. */
  const handleAddMeal = async (mealId: string) => {
    if (!validSlot) {
      Alert.alert(t('common.error'), 'Invalid meal slot. Please try again.');
      return;
    }
    try {
      // slot_index is passed so that replace mode overwrites the correct slot position
      await addMeal.mutateAsync({ meal_id: mealId, date, slot: validSlot, slot_index: slotIndex });
      router.back();
    } catch {
      Alert.alert(t('common.error'), 'Failed to add meal to plan');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      {/* --- Header --- */}
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            {isReplace
              ? t('day.replaceWithMeal')
              : t('meal.addSlotTitle', { slot: slotLabel })}
          </Text>
          {date && (
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {/* Use user's language for locale-aware short date formatting */}
              {new Date(date + 'T12:00:00').toLocaleDateString(language, {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>
      </View>

      {/* --- Search --- */}
      <View className="px-5 pt-3 pb-2">
        <Input
          placeholder={t('meal.searchPlaceholder')}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      {/* --- Meal list --- */}
      <ScrollView
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : meals && meals.length > 0 ? (
          <View className="gap-3 pb-6">
            {meals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                onPress={() => handleAddMeal(meal.id)}
                activeOpacity={0.7}
              >
                <MealCard meal={meal} onPress={() => handleAddMeal(meal.id)} compact />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          // --- Empty / no-results state ---
          <View className="items-center py-12">
            <Ionicons
              name="search-outline"
              size={40}
              color="#CBD5E1"
            />
            <Text className="text-base text-slate-400 dark:text-slate-500 mt-3 text-center">
              {search ? t('meal.noMealsSearch') : t('meal.noMealsYet')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/generate')}
              className="mt-4 flex-row items-center"
            >
              <Ionicons name="sparkles" size={16} color="#10B981" />
              <Text className="text-sm font-semibold text-primary-500 dark:text-primary-400 ml-1">
                {t('meal.generateWithAi')}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
