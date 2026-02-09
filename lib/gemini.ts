// Meal plan generation via Supabase Edge Function
// The Gemini API key is stored server-side only - never exposed to the client

import { supabase } from './supabase';
import { GenerateMealPlanRequest, GeneratedMeal } from './types';
import { generateMealPlanSchema, validate } from './validation';

async function callEdgeFunction(
  body: GenerateMealPlanRequest
): Promise<GeneratedMeal[]> {
  const { data, error } = await supabase.functions.invoke(
    'generate-meal-plan',
    { body }
  );

  if (error) {
    console.error('Edge function error:', JSON.stringify(error, null, 2));

    const status = (error as any).context?.status;

    if (status === 401) {
      throw new Error('Your session has expired. Please sign in again.');
    }

    if (status === 429) {
      throw new Error(
        'You have generated too many meal plans recently. Please wait a bit and try again.'
      );
    }

    if (status === 422) {
      throw new Error(
        'Response was cut short. Try generating a shorter meal plan (e.g. "day" instead of "week").'
      );
    }

    if (status === 400) {
      throw new Error(
        'Invalid request. Please check your inputs and try again.'
      );
    }

    throw new Error('Failed to generate meal plan. Please try again.');
  }

  if (!data?.meals) {
    throw new Error('No meals were generated. Please try again.');
  }

  return data.meals as GeneratedMeal[];
}

export async function generateMealPlan(
  request: GenerateMealPlanRequest,
  onProgress?: (current: number, total: number) => void
): Promise<GeneratedMeal[]> {
  // Validate input (including prompt injection checks) before sending
  const validatedRequest = validate(generateMealPlanSchema, request);

  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('You must be signed in to generate meals.');
  }

  // Monthly plans are too large for a single edge function call (timeout).
  // Split into 4 weekly chunks and combine results.
  if (validatedRequest.timeframe === 'month') {
    const allMeals: GeneratedMeal[] = [];
    const weeklyBudget = Math.round((validatedRequest.budget / 4) * 100) / 100;

    for (let week = 0; week < 4; week++) {
      onProgress?.(week + 1, 4);

      const weekRequest: GenerateMealPlanRequest = {
        ...validatedRequest,
        timeframe: 'week',
        budget: weeklyBudget,
      };

      const meals = await callEdgeFunction(weekRequest);
      const offsetMeals = meals.map(m => ({ ...m, day: m.day + week * 7 }));
      allMeals.push(...offsetMeals);
    }

    return allMeals;
  }

  return callEdgeFunction(validatedRequest);
}
