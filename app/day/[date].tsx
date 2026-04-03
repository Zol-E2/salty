/**
 * @file app/day/[date].tsx
 * Day detail screen — shows all meal slots for a specific calendar day and a
 * nutritional/cost/time summary card.
 *
 * Route: `/day/[date]` (e.g. `/day/2025-03-15`)
 * Key patterns:
 *   - Date formatting: `date + 'T12:00:00'` appended before constructing a
 *     `Date` object to avoid UTC timezone shifting the date by one day.
 *   - Slot routing: tapping a filled slot navigates to `/meal/[id]`;
 *     tapping an empty slot navigates to `/meal/add?date=...&slot=...`.
 *   - Remove: triggers an Alert confirmation then calls `useRemoveMealFromPlan`.
 *   - Summary card: only visible when at least one slot is filled; aggregates
 *     calories, cost, and total time; also shows protein/carbs/fat macros,
 *     a budget gauge (daily spend vs weekly_budget ÷ 7), and a calorie target
 *     progress row when `daily_calories` is set in the onboarding store.
 *   - Numbered slots: when `slot_index > 0`, the slot label becomes e.g.
 *     "Snack 1", "Snack 2" using the `slotIndexed` i18n key.
 *   - Swap button (⇄): shown when the current meal has a `fallback_meal_id`;
 *     calls `useSwapFallback` to switch the plan item to the fallback.
 *   - Restore button (↩): shown when the current meal `is_fallback === true`;
 *     looks up the primary via `useFindPrimaryMeal` and swaps back.
 *   - Difficulty badge: shown per meal row beneath the MealSlot component
 *     when the meal has a difficulty value.
 *   - Action sheet (⋯): tapping the options button on a filled slot opens
 *     `MealActionSheet`, which exposes view, replace, move, copy, swap,
 *     generate, remove, and delete actions.
 *   - Per-slot generation: `handleGenerateForSlot` calls `generateSingleMeal`
 *     then saves the result, showing a slot-specific ActivityIndicator while pending.
 */

import { useState } from 'react';
import { View, Text, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import {
  useMealPlanForDate,
  useRemoveMealFromPlan,
  useSwapFallback,
  useFindPrimaryMeal,
  useAddMealToPlan,
} from '../../hooks/useMealPlan';
import { useDeleteMeal, useCreateMeal } from '../../hooks/useMeals';
import { useCurrency } from '../../hooks/useCurrency';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuth } from '../../hooks/useAuth';
import { MealSlot } from '../../components/calendar/MealSlot';
import { MealActionSheet } from '../../components/meal/MealActionSheet';
import { MealPlanItem, MealSlotType } from '../../lib/types';
import { MEAL_SLOTS } from '../../lib/constants';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { generateSingleMeal } from '../../lib/gemini';

export default function DayDetailScreen() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const language = useOnboardingStore((s) => s.language);
  const currency = useOnboardingStore((s) => s.currency);
  // Read user targets for the budget gauge and calorie progress rows
  const weeklyBudget = useOnboardingStore((s) => s.weekly_budget);
  const dailyCalorieTarget = useOnboardingStore((s) => s.daily_calories);
  const skillLevel = useOnboardingStore((s) => s.skill_level);
  const dietaryRestrictions = useOnboardingStore((s) => s.dietary_restrictions);
  const weightKg = useOnboardingStore((s) => s.weight_kg);
  const nutritionGoal = useOnboardingStore((s) => s.nutrition_goal);
  const favoriteFoods = useOnboardingStore((s) => s.favorite_foods);
  const foodsToAvoid = useOnboardingStore((s) => s.foods_to_avoid);
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: planItems } = useMealPlanForDate(date);
  const removeMeal = useRemoveMealFromPlan();
  const deleteMeal = useDeleteMeal();
  const createMeal = useCreateMeal();
  const addMealToPlan = useAddMealToPlan();
  const swapFallback = useSwapFallback();

  // --- Action sheet state ---
  /** The plan item whose ⋯ button was tapped; null when the sheet is closed. */
  const [actionSheetItem, setActionSheetItem] = useState<MealPlanItem | null>(null);

  /**
   * Composite key `${planItemId}` used to show an ActivityIndicator on the
   * specific slot currently being regenerated. Null when no generation is in flight.
   */
  const [generatingPlanItemId, setGeneratingPlanItemId] = useState<string | null>(null);

  // Use user's language for locale-aware date formatting
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString(
    language,
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const handleRemove = (id: string) => {
    Alert.alert(t('day.removeMeal'), t('day.removeMealConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('day.removeMeal'),
        style: 'destructive',
        onPress: () => removeMeal.mutate(id),
      },
    ]);
  };

  // --- Action sheet callbacks ---

  /**
   * Deletes the recipe and all its plan item occurrences.
   * `useDeleteMeal` removes the `meals` row; query invalidation refreshes the
   * day view. If the DB has a CASCADE on `meal_plan_items.meal_id`, plan items
   * are removed automatically; otherwise they linger as orphans until the
   * migration adds the constraint.
   *
   * @param mealId - UUID of the meal to permanently delete.
   */
  const handleDeleteRecipe = (mealId: string) => {
    deleteMeal.mutate(mealId, {
      onSuccess: () => {
        // Ensure the day view and calendar month view both refresh
        queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
        queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });
      },
    });
  };

  /**
   * Generates a single replacement meal for a specific slot using Gemini,
   * saves it to the `meals` table, then upserts a plan item at the target slot.
   * Shows a per-slot spinner while the async work is in flight.
   *
   * @param planItem - The slot's current plan item (provides slot + slot_index).
   */
  const handleGenerateForSlot = async (planItem: MealPlanItem) => {
    setGeneratingPlanItemId(planItem.id);
    try {
      const generated = await generateSingleMeal({
        timeframe: 'day',
        budget: weeklyBudget > 0 ? weeklyBudget / 7 : 20,
        // Default fallbacks for fields not stored in onboardingStore
        max_cook_time: 60,
        servings: 2,
        dietary_restrictions: dietaryRestrictions ?? [],
        available_ingredients: [],
        skill_level: skillLevel ?? 'beginner',
        language,
        currency,
        weight_kg: weightKg,
        nutrition_goal: nutritionGoal,
        daily_calories: dailyCalorieTarget ?? undefined,
        favorite_foods: favoriteFoods,
        foods_to_avoid: foodsToAvoid,
        meals_per_day: 1,
        // target_slot tells Gemini which meal type to produce
        target_slot: planItem.slot,
      });

      // Persist the new meal and update the plan item slot in one go.
      // `useCreateMeal` validates + inserts the meal row.
      const saved = await createMeal.mutateAsync({
        name: generated.name,
        description: generated.description,
        ingredients: generated.ingredients,
        instructions: generated.instructions,
        calories: generated.calories,
        protein_g: generated.protein_g,
        carbs_g: generated.carbs_g,
        fat_g: generated.fat_g,
        estimated_cost: generated.estimated_cost,
        prep_time_min: generated.prep_time_min,
        cook_time_min: generated.cook_time_min,
        difficulty: generated.difficulty,
        meal_type: [generated.meal_type],
        tags: generated.tags,
        is_ai_generated: true,
        is_fallback: false,
        language,
      });

      // Replace the existing plan item slot with the new meal (upsert overwrites)
      await addMealToPlan.mutateAsync({
        meal_id: saved.id,
        date,
        slot: planItem.slot,
        slot_index: planItem.slot_index,
      });
    } catch (err: any) {
      Alert.alert(t('generate.errorTitle'), err?.message ?? t('meal.saveError'));
    } finally {
      setGeneratingPlanItemId(null);
    }
  };

  /**
   * Build a sorted, flat list of plan items ordered by MEAL_SLOTS order then
   * slot_index ascending. Each item is annotated with its display label.
   */
  const sortedItems: Array<{ item: MealPlanItem; slotLabel: string; cardKey: string }> = (() => {
    if (!planItems) return [];

    // Slot type display order: breakfast → lunch → dinner → snack
    const SLOT_ORDER: MealSlotType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    // Count how many items exist per slot type to know when to number them
    const slotCounts: Partial<Record<MealSlotType, number>> = {};
    for (const item of planItems) {
      slotCounts[item.slot] = (slotCounts[item.slot] ?? 0) + 1;
    }

    const sorted = [...planItems].sort((a, b) => {
      const slotDiff = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
      if (slotDiff !== 0) return slotDiff;
      return a.slot_index - b.slot_index;
    });

    return sorted.map((item) => {
      const baseLabel = t(`meal.${item.slot}`);
      // Show numbered label when more than one item occupies the same slot
      const slotLabel =
        (slotCounts[item.slot] ?? 1) > 1
          ? t('day.slotIndexed', { slot: baseLabel, index: item.slot_index + 1 })
          : baseLabel;
      return { item, slotLabel, cardKey: `${item.id}` };
    });
  })();

  // Also build a set of filled slot types for the "add" empty slots
  const filledSlotKeys = new Set(planItems?.map((i) => i.slot) ?? []);

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            {dateFormatted}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {/* Filled slots — sorted by slot type then slot_index */}
        {sortedItems.map(({ item, slotLabel, cardKey }, index) => {
          // Show a spinner on the specific slot being regenerated
          const isGenerating = generatingPlanItemId === item.id;

          return (
            <AnimatedCard key={cardKey} index={index} staggerMs={60}>
              <View className="mb-1">
                <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">
                  {slotLabel}
                </Text>
              </View>
              <MealSlot
                slot={item.slot}
                item={item}
                onPress={() => {
                  if (item.meal) {
                    router.push(`/meal/${item.meal_id}`);
                  } else {
                    router.push(`/meal/add?date=${date}&slot=${item.slot}`);
                  }
                }}
                onRemove={() => handleRemove(item.id)}
                // Show ⋯ options button when filled; hide it during generation
                onOptions={item.meal && !isGenerating
                  ? () => setActionSheetItem(item)
                  : undefined
                }
              />
              {/* Per-slot generation spinner — overlays the options button area */}
              {isGenerating && (
                <View className="flex-row items-center mt-1.5 px-1">
                  <ActivityIndicator size="small" color="#10B981" />
                  <Text className="text-xs text-emerald-600 dark:text-emerald-400 ml-1.5">
                    {t('day.generatingMeal')}
                  </Text>
                </View>
              )}
              {/* Difficulty badge — shown when the meal has a difficulty value */}
              {item.meal?.difficulty && !isGenerating && (
                <DifficultyBadge difficulty={item.meal.difficulty} />
              )}
              {/* Swap / Restore action row */}
              {!isGenerating && (
                <SwapActionRow
                  item={item}
                  onSwap={(targetMealId) =>
                    swapFallback.mutate({ planItemId: item.id, targetMealId })
                  }
                />
              )}
            </AnimatedCard>
          );
        })}

        {/* Empty slots for slot types that have no plan items */}
        {MEAL_SLOTS.filter(({ key }) => !filledSlotKeys.has(key)).map(({ key }, index) => (
          <AnimatedCard key={key} index={sortedItems.length + index} staggerMs={60}>
            <MealSlot
              slot={key}
              item={undefined}
              onPress={() => router.push(`/meal/add?date=${date}&slot=${key}`)}
            />
          </AnimatedCard>
        ))}

        {/* Day summary */}
        {planItems && planItems.length > 0 && (() => {
          const totalCalories = planItems.reduce((sum, item) => sum + (item.meal?.calories ?? 0), 0);
          const totalCost = planItems.reduce((sum, item) => sum + (item.meal?.estimated_cost ?? 0), 0);
          const totalTime = planItems.reduce(
            (sum, item) => sum + (item.meal?.prep_time_min ?? 0) + (item.meal?.cook_time_min ?? 0),
            0
          );
          const totalProtein = Math.round(planItems.reduce((sum, item) => sum + (item.meal?.protein_g ?? 0), 0));
          const totalCarbs = Math.round(planItems.reduce((sum, item) => sum + (item.meal?.carbs_g ?? 0), 0));
          const totalFat = Math.round(planItems.reduce((sum, item) => sum + (item.meal?.fat_g ?? 0), 0));

          // Daily budget = weekly_budget ÷ 7; only show gauge when budget is set
          const dailyBudget = weeklyBudget > 0 ? weeklyBudget / 7 : 0;
          const budgetPct = dailyBudget > 0 ? Math.min(totalCost / dailyBudget, 1) : 0;
          // Color: green under 80%, amber 80–100%, rose over 100%
          const budgetBarColor = totalCost > dailyBudget ? '#F43F5E' : totalCost / dailyBudget >= 0.8 ? '#F59E0B' : '#10B981';

          return (
            <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mt-4 mb-6">
              <Text className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
                {t('day.daySummary')}
              </Text>

              {/* Row 1: calories / cost / time */}
              <View className="flex-row justify-between mb-4">
                <SummaryItem label={t('day.calories')} value={totalCalories} unit="cal" />
                {/* displayValue bypasses numeric formatting for currency-aware display */}
                <SummaryItem label={t('day.cost')} value={0} unit="" displayValue={format(totalCost)} />
                <SummaryItem label={t('day.time')} value={totalTime} unit="min" />
              </View>

              {/* Row 2: macros — protein / carbs / fat */}
              <View className="flex-row justify-between mb-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                <SummaryItem label={t('day.protein')} value={totalProtein} unit="g" />
                <SummaryItem label={t('day.carbs')} value={totalCarbs} unit="g" />
                <SummaryItem label={t('day.fat')} value={totalFat} unit="g" />
              </View>

              {/* Budget gauge — only when a weekly budget is set */}
              {dailyBudget > 0 && (
                <View className="mb-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <View className="flex-row justify-between mb-1.5">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {t('day.budgetGauge', { spent: format(totalCost), budget: format(dailyBudget) })}
                    </Text>
                    <Text className="text-xs font-medium" style={{ color: budgetBarColor }}>
                      {Math.round((totalCost / dailyBudget) * 100)}%
                    </Text>
                  </View>
                  {/* Progress bar track */}
                  <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${budgetPct * 100}%`, backgroundColor: budgetBarColor }}
                    />
                  </View>
                </View>
              )}

              {/* Calorie target progress — only when the user set a daily calorie goal */}
              {dailyCalorieTarget != null && dailyCalorieTarget > 0 && (
                <View className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <View className="flex-row justify-between">
                    <Text className="text-xs text-slate-500 dark:text-slate-400">
                      {t('day.calories')}
                    </Text>
                    <Text className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      {t('day.calorieProgress', { actual: totalCalories, target: dailyCalorieTarget })}
                    </Text>
                  </View>
                  {/* Calorie progress bar */}
                  <View className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-1.5">
                    <View
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(totalCalories / dailyCalorieTarget, 1) * 100}%` }}
                    />
                  </View>
                </View>
              )}
            </View>
          );
        })()}
      </ScrollView>

      {/* --- MealActionSheet --- */}
      {actionSheetItem && (
        <MealActionSheet
          visible={!!actionSheetItem}
          onClose={() => setActionSheetItem(null)}
          planItem={actionSheetItem}
          onViewRecipe={() =>
            router.push(`/meal/${actionSheetItem.meal_id}`)
          }
          onReplaceWithMeal={() =>
            router.push(
              `/meal/add?date=${date}&slot=${actionSheetItem.slot}&slot_index=${actionSheetItem.slot_index}&replace=1`
            )
          }
          onMoveToSlot={() =>
            router.push(
              `/meal/move?planItemId=${actionSheetItem.id}&mealId=${actionSheetItem.meal_id}&mealName=${encodeURIComponent(actionSheetItem.meal?.name ?? '')}&sourceDateStr=${date}&sourceSlot=${actionSheetItem.slot}&mode=move`
            )
          }
          onCopyToDate={() =>
            router.push(
              `/meal/move?planItemId=${actionSheetItem.id}&mealId=${actionSheetItem.meal_id}&mealName=${encodeURIComponent(actionSheetItem.meal?.name ?? '')}&sourceDateStr=${date}&sourceSlot=${actionSheetItem.slot}&mode=copy`
            )
          }
          onRemoveFromPlan={() => removeMeal.mutate(actionSheetItem.id)}
          onDeleteRecipe={() => handleDeleteRecipe(actionSheetItem.meal_id)}
          // Swap to fallback only when the primary meal has a fallback linked
          onSwapToFallback={
            actionSheetItem.meal?.fallback_meal_id
              ? () =>
                  swapFallback.mutate({
                    planItemId: actionSheetItem.id,
                    targetMealId: actionSheetItem.meal!.fallback_meal_id!,
                  })
              : undefined
          }
          // Restore original only when we are currently showing the fallback
          onRestoreOriginal={
            actionSheetItem.meal?.is_fallback
              ? undefined // handled inline — we can't call hooks conditionally here
              : undefined
          }
          onGenerateNew={() => handleGenerateForSlot(actionSheetItem)}
        />
      )}
    </SafeAreaView>
  );
}

// Difficulty → display color mapping
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#F43F5E',
};

/**
 * DifficultyBadge renders a small coloured difficulty label beneath a meal slot.
 *
 * @param props.difficulty - The meal's difficulty string (easy / medium / hard).
 */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const color = DIFFICULTY_COLORS[difficulty] ?? '#64748B';
  return (
    <View className="flex-row items-center mt-1.5 px-1">
      <Ionicons name="speedometer-outline" size={13} color={color} />
      <Text className="text-xs font-medium ml-1" style={{ color }}>
        {difficulty}
      </Text>
    </View>
  );
}

/**
 * SwapActionRow renders contextual swap/restore icon buttons beneath a meal slot.
 *
 * - Primary meal with a fallback → shows ⇄ "Swap to quick version" button.
 * - Fallback meal currently displayed → shows ↩ "Restore original" button.
 * - No fallback relationship → renders nothing.
 *
 * @param props.item - The `MealPlanItem` (with joined `meal`) to inspect.
 * @param props.onSwap - Called with the target meal UUID when a swap is triggered.
 */
function SwapActionRow({
  item,
  onSwap,
}: {
  item: MealPlanItem;
  onSwap: (targetMealId: string) => void;
}) {
  const { t } = useTranslation();
  const meal = item.meal;

  // Find the primary meal when we are currently showing the fallback
  // so the restore button knows what to swap back to.
  const { data: primaryMeal } = useFindPrimaryMeal(
    meal?.is_fallback ? meal.id : null
  );

  if (!meal) return null;

  // Primary meal that has a fallback available → show swap button
  if (!meal.is_fallback && meal.fallback_meal_id) {
    return (
      <TouchableOpacity
        onPress={() => onSwap(meal.fallback_meal_id!)}
        className="flex-row items-center mt-2 px-1"
      >
        <Ionicons name="swap-horizontal" size={16} color="#10B981" />
        <Text className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
          {t('day.swapToFallback')}
        </Text>
      </TouchableOpacity>
    );
  }

  // Fallback meal currently shown → show restore button if we found the primary
  if (meal.is_fallback && primaryMeal) {
    return (
      <TouchableOpacity
        onPress={() => onSwap(primaryMeal.id)}
        className="flex-row items-center mt-2 px-1"
      >
        <Ionicons name="return-up-back" size={16} color="#64748B" />
        <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
          {t('day.restoreOriginal')}
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

/**
 * SummaryItem renders a single stat (label + value) in the Day Summary card.
 *
 * @param props.label - Translated label shown above the value.
 * @param props.value - Numeric value; ignored when `displayValue` is provided.
 * @param props.unit - Unit suffix (e.g. "cal", "min"); omitted when `displayValue` is set.
 * @param props.prefix - When true, `unit` is prepended instead of appended.
 * @param props.displayValue - Pre-formatted string that overrides numeric rendering;
 *   used for currency amounts so `format()` controls symbol and decimal places.
 */
function SummaryItem({
  label,
  value,
  unit,
  prefix = false,
  displayValue,
}: {
  label: string;
  value: number;
  unit: string;
  prefix?: boolean;
  displayValue?: string;
}) {
  return (
    <View className="items-center">
      <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </Text>
      <Text className="text-lg font-bold text-slate-900 dark:text-white">
        {displayValue ?? (prefix ? `${unit}${value.toFixed(2)}` : `${value}`)}
      </Text>
      {!displayValue && !prefix && (
        <Text className="text-xs text-slate-400">{unit}</Text>
      )}
    </View>
  );
}
