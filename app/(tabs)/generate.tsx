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
 *   For each generated meal, two Supabase inserts are made:
 *     1. `meals` — stores the full meal recipe.
 *     2. `meal_plan_items` — assigns the meal to `today + meal.day - 1`
 *        in the correct slot.
 *   Note: `meal_type: [meal.meal_type]` wraps the single `MealSlotType` in an
 *   array because `Meal.meal_type` is defined as `MealSlotType[]` in the
 *   database schema. This is intentional — a saved meal can later be assigned
 *   to multiple slots.
 */

import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTabControl } from '../../hooks/useTabControl';
import { SaltShakerLoader } from '../../components/ui/SaltShakerLoader';
import { GenerateForm } from '../../components/generate/GenerateForm';
import { GeneratePreview } from '../../components/generate/GeneratePreview';
import { generateMealPlan } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { GenerateMealPlanRequest, GeneratedMeal, MealSlotType } from '../../lib/types';
import { useQueryClient } from '@tanstack/react-query';

export default function GenerateScreen() {
  const { setPage } = useTabControl();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedMeals, setGeneratedMeals] = useState<GeneratedMeal[] | null>(null);
  const [lastRequest, setLastRequest] = useState<GenerateMealPlanRequest | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const handleGenerate = async (request: GenerateMealPlanRequest) => {
    setLastRequest(request);
    setLoading(true);
    setProgress(null);
    try {
      const meals = await generateMealPlan(request, (current, total) => {
        setProgress({ current, total });
      });
      setGeneratedMeals(meals);
    } catch (error: any) {
      const message = error.message || 'Something went wrong. Please try again.';
      Alert.alert(
        message.includes('too many') ? 'Slow Down' : 'Generation Failed',
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

      for (const meal of generatedMeals) {
        const mealDate = new Date(today);
        mealDate.setDate(today.getDate() + meal.day - 1);
        const dateStr = mealDate.toISOString().split('T')[0];

        // Insert meal
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
            // This is architecturally correct — not a mistake.
            meal_type: [meal.meal_type],
            tags: meal.tags || [],
            is_ai_generated: true,
          })
          .select()
          .single();

        if (mealError) throw mealError;

        // Insert plan item
        const { error: planError } = await supabase
          .from('meal_plan_items')
          .upsert(
            {
              user_id: user.id,
              meal_id: savedMeal.id,
              date: dateStr,
              slot: meal.meal_type,
            },
            { onConflict: 'user_id,date,slot' }
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
      Alert.alert('Save Failed', error.message || 'Could not save meal plan.');
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
            {generatedMeals ? 'Your Meal Plan' : 'AI Generate'}
          </Text>
        </View>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {generatedMeals
            ? 'Review your generated meals before saving'
            : 'Tell us what you need and we\'ll create a plan'}
        </Text>
      </View>

      <View className="flex-1 px-5 pt-4">
        {loading ? (
          <SaltShakerLoader
            message={progress ? `Generating week ${progress.current} of ${progress.total}...` : 'Generating your meals...'}
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
