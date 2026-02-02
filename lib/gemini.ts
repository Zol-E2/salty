import { supabase } from './supabase';
import { GenerateMealPlanRequest, GeneratedMeal } from './types';

export async function generateMealPlan(
  request: GenerateMealPlanRequest
): Promise<GeneratedMeal[]> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('Not authenticated');
  }

  const { data, error } = await supabase.functions.invoke('generate-meal-plan', {
    body: request,
  });

  if (error) {
    throw new Error(error.message || 'Failed to generate meal plan');
  }

  return data.meals as GeneratedMeal[];
}
