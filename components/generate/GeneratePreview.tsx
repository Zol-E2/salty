/**
 * @file components/generate/GeneratePreview.tsx
 * Preview component showing AI-generated meals grouped by day before saving.
 *
 * Displays a summary banner (total cost, avg calories, optional calorie target
 * note, optional budget warning) and a per-day list of generated meals.
 *
 * Each meal row is tappable — tapping expands the row to reveal the meal
 * description and a simple ingredient list so the user can review the full
 * recipe before saving. Tapping again collapses the row.
 *
 * Uses `useTranslation()` for all labels and `useCurrency()` for cost display
 * so amounts respect the user's currency selection.
 * Uses `useOnboardingStore` to read `daily_calories`, `meals_per_day`, and
 * `weekly_budget` for the calorie target note and budget warning.
 *
 * Difficulty color mapping (same as MealCard):
 *   easy → #10B981 (emerald), medium → #F59E0B (amber), hard → #F43F5E (rose)
 */

import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { GeneratedMeal } from '../../lib/types';
import { SLOT_COLORS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { AnimatedCard } from '../ui/AnimatedCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useOnboardingStore } from '../../stores/onboardingStore';

// --- Constants ---

/** Maps difficulty value to a display colour. */
const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#10B981',
  medium: '#F59E0B',
  hard: '#F43F5E',
};

// --- Types ---

/** Props for {@link GeneratePreview}. */
interface GeneratePreviewProps {
  /** The AI-generated meals to preview. */
  meals: GeneratedMeal[];
  /** Called when the user confirms and saves all meals to the calendar. */
  onSave: () => void;
  /** Called when the user discards the generated meals. */
  onDiscard: () => void;
  /** Called to re-run generation with the same parameters. */
  onTryAgain: () => void;
  /** When true, the save button shows a loading spinner. */
  saving: boolean;
  /**
   * Called when the user requests regeneration of a single meal.
   * The parent replaces the meal in its state while keeping others intact.
   */
  onRegenerate?: (meal: GeneratedMeal) => Promise<void>;
}

// --- Component ---

/**
 * Renders a scrollable preview of generated meals grouped by day.
 *
 * The summary banner shows total cost, avg calories, an optional calorie
 * target note (when `daily_calories` is set), and an amber budget warning
 * when `totalCost > weekly_budget`.
 *
 * Each meal row shows: meal type dot, name, difficulty label, tags (up to 3),
 * and a metric line (calories · cost · total time). Tapping a row expands it
 * to show the description (if any) and the full ingredient list.
 *
 * @param props.meals - Generated meals to display.
 * @param props.onSave - Save handler; shows spinner while saving.
 * @param props.onDiscard - Discard all generated meals.
 * @param props.onTryAgain - Re-run generation with the same request.
 * @param props.saving - Whether a save is currently in progress.
 * @returns A scrollable preview with action buttons.
 */
export function GeneratePreview({
  meals,
  onSave,
  onDiscard,
  onTryAgain,
  saving,
  onRegenerate,
}: GeneratePreviewProps) {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const weeklyBudget = useOnboardingStore((s) => s.weekly_budget);
  const dailyCalories = useOnboardingStore((s) => s.daily_calories);
  const mealsPerDay = useOnboardingStore((s) => s.meals_per_day) ?? 4;

  // Track which meal row is currently expanded (by global index across all days)
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  // Track which meal is currently being regenerated (by global index)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);

  // --- Aggregations ---

  const groupedByDay = meals.reduce(
    (acc, meal) => {
      const day = meal.day;
      if (!acc[day]) acc[day] = [];
      acc[day].push(meal);
      return acc;
    },
    {} as Record<number, GeneratedMeal[]>
  );

  const totalCost = meals.reduce((sum, m) => sum + m.estimated_cost, 0);
  const avgCalories = meals.length
    ? Math.round(meals.reduce((sum, m) => sum + m.calories, 0) / meals.length)
    : 0;

  // Per-meal calorie target: user's daily goal divided by meals per day
  const targetPerMeal = dailyCalories != null && mealsPerDay > 0
    ? Math.round(dailyCalories / mealsPerDay)
    : null;

  // Budget warning: only show when weekly_budget is set and exceeded
  const overBudget = weeklyBudget > 0 && totalCost > weeklyBudget;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* --- Summary banner --- */}
      <AnimatedCard index={0}>
        <View className="bg-primary-50 dark:bg-primary-400/10 rounded-2xl p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Ionicons name="sparkles" size={18} color="#10B981" />
            <Text className="text-base font-semibold text-primary-700 dark:text-primary-300 ml-2">
              {t('generate.generatedMeals', { count: meals.length })}
            </Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm text-primary-600 dark:text-primary-400">
              {t('generate.estCost')} {format(totalCost)}
            </Text>
            <Text className="text-sm text-primary-600 dark:text-primary-400">
              {t('generate.avgCalMeal', { calories: avgCalories })}
            </Text>
          </View>
          {/* Calorie target note — only when user has set a daily calorie goal */}
          {targetPerMeal != null && (
            <Text className="text-xs text-primary-500 dark:text-primary-400 mt-1">
              {t('generate.targetPerMeal', { calories: targetPerMeal })}
            </Text>
          )}
          {/* Budget warning — amber alert when total exceeds weekly budget */}
          {overBudget && (
            <View className="flex-row items-center mt-2">
              <Ionicons name="warning-outline" size={14} color="#F59E0B" />
              <Text className="text-xs font-medium text-amber-600 dark:text-amber-400 ml-1">
                {t('generate.budgetWarning')}
              </Text>
            </View>
          )}
        </View>
      </AnimatedCard>

      {/* --- Meals by day --- */}
      {(() => {
        let globalIndex = 1;
        return Object.entries(groupedByDay)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayMeals]) => (
            <View key={day} className="mb-5">
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                {t('generate.dayLabel', { number: day })}
              </Text>
              {dayMeals.map((meal) => {
                const cardIndex = globalIndex++;
                const isExpanded = expandedIndex === cardIndex;
                const isRegenerating = regeneratingIndex === cardIndex;
                const difficultyColor = DIFFICULTY_COLORS[meal.difficulty] ?? '#64748B';
                const visibleTags = meal.tags?.slice(0, 3) ?? [];

                return (
                  <AnimatedCard key={cardIndex} index={cardIndex}>
                    {/* Meal row — tapping toggles the expanded ingredient view */}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() =>
                        setExpandedIndex(isExpanded ? null : cardIndex)
                      }
                      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 mb-2 overflow-hidden"
                    >
                      {/* Main row */}
                      <View className="flex-row items-center p-3">
                        <View className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 items-center justify-center mr-3">
                          <Ionicons name="restaurant" size={18} color="#10B981" />
                        </View>
                        <View className="flex-1">
                          {/* Meal type indicator */}
                          <View className="flex-row items-center mb-0.5">
                            <View
                              className="w-2 h-2 rounded-full mr-1.5"
                              style={{
                                backgroundColor:
                                  SLOT_COLORS[meal.meal_type] || '#10B981',
                              }}
                            />
                            <Text className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                              {meal.meal_type}
                            </Text>
                          </View>
                          {/* Meal name */}
                          <Text
                            className="text-sm font-semibold text-slate-900 dark:text-white"
                            numberOfLines={1}
                          >
                            {meal.name}
                          </Text>
                          {/* Difficulty + tags row */}
                          <View className="flex-row items-center flex-wrap mt-0.5 gap-x-2">
                            <Text className="text-xs font-medium" style={{ color: difficultyColor }}>
                              {meal.difficulty}
                            </Text>
                            {visibleTags.map((tag) => (
                              <Text
                                key={tag}
                                className="text-xs text-slate-400 dark:text-slate-500"
                              >
                                · {tag}
                              </Text>
                            ))}
                          </View>
                          {/* Metrics: calories · cost · total time */}
                          <Text className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {meal.calories} cal · {format(meal.estimated_cost)} ·{' '}
                            {meal.prep_time_min + meal.cook_time_min}m
                          </Text>
                        </View>
                        {/* Expand/collapse chevron */}
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color="#94A3B8"
                        />
                      </View>

                      {/* Expanded detail panel */}
                      {isExpanded && (
                        <View className="px-4 pb-4 border-t border-slate-100 dark:border-slate-800">
                          {/* Description */}
                          {meal.description ? (
                            <Text className="text-xs italic text-slate-500 dark:text-slate-400 mt-3 mb-2">
                              {meal.description}
                            </Text>
                          ) : null}
                          {/* Ingredients header */}
                          <Text className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                            {t('generate.expandIngredients')}
                          </Text>
                          {/* Ingredient list */}
                          {meal.ingredients.map((ing, i) => (
                            <Text
                              key={i}
                              className="text-xs text-slate-600 dark:text-slate-400 mb-0.5"
                            >
                              · {ing.quantity} {ing.unit} {ing.name}
                            </Text>
                          ))}
                          {/* Regenerate button — only shown when parent supports it */}
                          {onRegenerate && (
                            <TouchableOpacity
                              onPress={async () => {
                                if (isRegenerating) return;
                                setRegeneratingIndex(cardIndex);
                                try {
                                  await onRegenerate(meal);
                                } finally {
                                  setRegeneratingIndex(null);
                                }
                              }}
                              disabled={isRegenerating}
                              className="flex-row items-center justify-center mt-3 py-2 px-3 rounded-lg border border-primary-400 dark:border-primary-500"
                              style={{ opacity: isRegenerating ? 0.6 : 1 }}
                            >
                              {isRegenerating ? (
                                <ActivityIndicator size="small" color="#10B981" />
                              ) : (
                                <Ionicons name="refresh" size={14} color="#10B981" />
                              )}
                              <Text className="text-xs font-semibold text-primary-600 dark:text-primary-400 ml-1.5">
                                {t('generate.regenerateMeal')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  </AnimatedCard>
                );
              })}
            </View>
          ));
      })()}

      {/* --- Action buttons --- */}
      <View className="gap-3 mb-8">
        <Button
          title={t('generate.saveToCalendar')}
          onPress={onSave}
          loading={saving}
          size="lg"
          icon={<Ionicons name="checkmark" size={20} color="white" />}
        />
        <Button
          title={t('generate.tryAgain')}
          onPress={onTryAgain}
          variant="outline"
          size="md"
          icon={<Ionicons name="refresh" size={18} color="#10B981" />}
        />
        <Button
          title={t('generate.discard')}
          onPress={onDiscard}
          variant="danger"
          size="md"
        />
      </View>
    </ScrollView>
  );
}
