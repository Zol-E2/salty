/**
 * @file app/(tabs)/generate.tsx
 * AI meal generation tab — a 3-state finite state machine (FSM).
 *
 * Route: `/(tabs)/generate`
 * States:
 *   1. **form** (`!loading && !generatedMeals`) — `GenerateForm` collects
 *      budget, cook time, servings, dietary restrictions, and ingredients.
 *   2. **loading** (`loading === true`) — `SaltShakerLoader` with optional
 *      monthly progress indicator (`progress.current / progress.total`).
 *   3. **preview** (`generatedMeals !== null`) — `GeneratePreview` shows the
 *      generated meals; the user can save, discard, or try again.
 *
 * Save behaviour (`handleSave`):
 *   For each generated meal the following steps occur:
 *     1. Insert the fallback meal (if present) with `is_fallback: true`.
 *     2. Insert the primary meal with `is_fallback: false` and
 *        `fallback_meal_id` pointing to the fallback row (if any).
 *     3. Compute `slot_index` from a `Map<"day-slot", number>` that tracks how
 *        many meals of the same type have already been assigned on that day.
 *     4. Insert a `meal_plan_items` row for the primary meal only.
 *
 *   Note: `meal_type: [meal.meal_type]` wraps the single `MealSlotType` in an
 *   array because `Meal.meal_type` is defined as `MealSlotType[]`.
 *   Fallback meals are stored but NOT added to `meal_plan_items` — they are
 *   surfaced in the day view via the primary meal's `fallback_meal_id`.
 */

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTabControl } from '../../hooks/useTabControl';
import { SaltShakerLoader } from '../../components/ui/SaltShakerLoader';
import { GenerateForm } from '../../components/generate/GenerateForm';
import { GeneratePreview } from '../../components/generate/GeneratePreview';
import { generateMealPlan } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { GenerateMealPlanRequest, GeneratedMeal, MealSlotType } from '../../lib/types';
import { useQueryClient } from '@tanstack/react-query';

export default function GenerateScreen() {
  const { t } = useTranslation();
  const { setPage } = useTabControl();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Read nutrition fields from the store to merge into every generation request
  const {
    weight_kg,
    nutrition_goal,
    daily_calories,
    favorite_foods,
    foods_to_avoid,
    meals_per_day,
    language,
    currency,
  } = useOnboardingStore();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedMeals, setGeneratedMeals] = useState<GeneratedMeal[] | null>(null);
  const [lastRequest, setLastRequest] = useState<GenerateMealPlanRequest | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleGenerate = async (request: GenerateMealPlanRequest) => {
    // Merge nutrition preferences from the store into the request so they are
    // always sent even if GenerateForm does not explicitly collect them.
    const enrichedRequest: GenerateMealPlanRequest = {
      ...request,
      language: request.language ?? language,
      currency: request.currency ?? currency,
      weight_kg: weight_kg ?? undefined,
      nutrition_goal: nutrition_goal ?? undefined,
      // Use the request's daily_calories if set (GenerateForm field), else store value
      daily_calories: request.daily_calories ?? (daily_calories ?? undefined),
      favorite_foods: favorite_foods.length > 0 ? favorite_foods : undefined,
      foods_to_avoid: foods_to_avoid.length > 0 ? foods_to_avoid : undefined,
      meals_per_day: meals_per_day !== 4 ? meals_per_day : undefined,
    };
    setLastRequest(enrichedRequest);
    setLoading(true);
    setProgress(null);
    try {
      const meals = await generateMealPlan(enrichedRequest, (current, total) => {
        setProgress({ current, total });
      });
      setGeneratedMeals(meals);
    } catch (error: any) {
      const message = error.message || 'Something went wrong. Please try again.';
      Alert.alert(
        message.includes('too many') ? t('generate.errorSlowDown') : t('generate.errorTitle'),
        message
      );
    } finally {
      setLoading(false);
      setProgress(null);
    }
  };

  const handleSave = async () => {
    if (!generatedMeals || !user) return;

    setSaving(true);
    try {
      const today = new Date();

      // Track slot_index per (date, meal_type) pair so multiple meals of the
      // same type on the same day get sequential indices: snack@0, snack@1, etc.
      const slotIndexMap = new Map<string, number>();

      for (const meal of generatedMeals) {
        const mealDate = new Date(today);
        mealDate.setDate(today.getDate() + meal.day - 1);
        const dateStr = mealDate.toISOString().split('T')[0];

        // --- Step 1: Insert fallback meal (if Gemini provided one) ---
        let fallbackId: string | null = null;
        if (meal.fallback) {
          const { data: savedFallback, error: fallbackError } = await supabase
            .from('meals')
            .insert({
              user_id: user.id,
              name: meal.fallback.name,
              description: meal.fallback.description,
              ingredients: meal.fallback.ingredients,
              instructions: meal.fallback.instructions,
              calories: meal.fallback.calories,
              protein_g: meal.fallback.protein_g,
              carbs_g: meal.fallback.carbs_g,
              fat_g: meal.fallback.fat_g,
              estimated_cost: meal.fallback.estimated_cost,
              prep_time_min: meal.fallback.prep_time_min,
              cook_time_min: meal.fallback.cook_time_min,
              difficulty: meal.fallback.difficulty,
              // Fallback inherits the same slot as the primary
              meal_type: [meal.meal_type],
              tags: meal.fallback.tags || [],
              is_ai_generated: true,
              language: lastRequest?.language ?? language ?? 'en',
              is_fallback: true,
              // Fallbacks must not themselves have a fallback (DB constraint)
              fallback_meal_id: null,
            })
            .select('id')
            .single();

          if (fallbackError) throw fallbackError;
          fallbackId = savedFallback.id;
        }

        // --- Step 2: Insert primary meal ---
        const { data: savedMeal, error: mealError } = await supabase
          .from('meals')
          .insert({
            user_id: user.id,
            name: meal.name,
            description: meal.description,
            ingredients: meal.ingredients,
            instructions: meal.instructions,
            calories: meal.calories,
            protein_g: meal.protein_g,
            carbs_g: meal.carbs_g,
            fat_g: meal.fat_g,
            estimated_cost: meal.estimated_cost,
            prep_time_min: meal.prep_time_min,
            cook_time_min: meal.cook_time_min,
            difficulty: meal.difficulty,
            // Wrap in array: GeneratedMeal.meal_type is a single MealSlotType,
            // but Meal.meal_type is MealSlotType[] (a meal can suit multiple slots).
            meal_type: [meal.meal_type],
            tags: meal.tags || [],
            is_ai_generated: true,
            language: lastRequest?.language ?? language ?? 'en',
            is_fallback: false,
            fallback_meal_id: fallbackId,
          })
          .select('id')
          .single();

        if (mealError) throw mealError;

        // --- Step 3: Compute slot_index for this (date, meal_type) pair ---
        const slotKey = `${dateStr}-${meal.meal_type}`;
        const currentIndex = slotIndexMap.get(slotKey) ?? 0;
        slotIndexMap.set(slotKey, currentIndex + 1);

        // --- Step 4: Insert plan item for the primary meal only ---
        const { error: planError } = await supabase
          .from('meal_plan_items')
          .upsert(
            {
              user_id: user.id,
              meal_id: savedMeal.id,
              date: dateStr,
              slot: meal.meal_type,
              slot_index: currentIndex,
            },
            // Unique constraint includes slot_index since migration 004
            { onConflict: 'user_id,date,slot,slot_index' }
          );

        if (planError) throw planError;
      }

      // Invalidate queries to refresh calendar
      queryClient.invalidateQueries({ queryKey: ['meals'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });

      setGeneratedMeals(null);
      // Switch to Calendar tab (index 0) via context — router.navigate does not
      // work here because this layout bypasses Expo Router's <Tabs> component.
      setPage(0);
    } catch (error: any) {
      Alert.alert(t('generate.saveFailed'), error.message || t('generate.errorSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setGeneratedMeals(null);
  };

  const handleTryAgain = () => {
    if (!lastRequest) return;
    setGeneratedMeals(null);
    handleGenerate(lastRequest);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-2">
        <View className="flex-row items-center mb-1">
          <Ionicons name="sparkles" size={22} color="#10B981" />
          <Text className="text-2xl font-bold text-slate-900 dark:text-white ml-2">
            {generatedMeals ? t('generate.titlePreview') : t('generate.title')}
          </Text>
        </View>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {generatedMeals ? t('generate.subtitlePreview') : t('generate.subtitle')}
        </Text>
      </View>

      <View className="flex-1 px-5 pt-4">
        {loading ? (
          <SaltShakerLoader
            message={progress
              ? t('generate.generatingWeek', { current: progress.current, total: progress.total })
              : t('generate.generatingMeals')}
            showTips
            timeframe={lastRequest?.timeframe}
          />
        ) : generatedMeals ? (
          <GeneratePreview
            meals={generatedMeals}
            onSave={handleSave}
            onDiscard={handleDiscard}
            onTryAgain={handleTryAgain}
            saving={saving}
          />
        ) : (
          <GenerateForm onSubmit={handleGenerate} loading={loading} />
        )}
      </View>
    </SafeAreaView>
  );
}
