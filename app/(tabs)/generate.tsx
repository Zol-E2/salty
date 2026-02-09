import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SaltShakerLoader } from '../../components/ui/SaltShakerLoader';
import { GenerateForm } from '../../components/generate/GenerateForm';
import { GeneratePreview } from '../../components/generate/GeneratePreview';
import { generateMealPlan } from '../../lib/gemini';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import { GenerateMealPlanRequest, GeneratedMeal, MealSlotType } from '../../lib/types';
import { useQueryClient } from '@tanstack/react-query';

export default function GenerateScreen() {
  const router = useRouter();
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
      router.push('/(tabs)/calendar');
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
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
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
            submessage={progress
              ? `Our AI is building your monthly plan\nweek by week for the best results`
              : "Our AI is crafting the perfect plan\nbased on your preferences"}
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
