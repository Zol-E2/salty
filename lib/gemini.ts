/**
 * @file lib/gemini.ts
 * Client-side interface for the `generate-meal-plan` Supabase Edge Function.
 *
 * The Gemini API key is stored server-side only (Supabase dashboard env var
 * `GEMINI_API_KEY`). This file never touches the key; it just calls
 * `supabase.functions.invoke()` which attaches the user's JWT automatically.
 *
 * Timeout-avoidance strategy:
 *   Supabase Edge Functions have a wall-clock timeout (~60 s). To keep each
 *   invocation small enough to complete reliably:
 *   - Day plans: single call (4 meals max) — always safe.
 *   - Week plans: single call (28 meals, no fallbacks) — fallbacks are
 *     suppressed by the edge function for non-day timeframes.
 *   - Month plans: 4 sequential weekly calls (each generating 28 meals, no
 *     fallbacks). The `day` field of each week is offset by `week * 7` so
 *     day numbers are globally sequential across the full 28-day span.
 */

import { supabase } from './supabase';
import { GenerateMealPlanRequest, GeneratedMeal } from './types';
import { generateMealPlanSchema, validate } from './validation';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Invokes the `generate-meal-plan` edge function and returns the meal array.
 *
 * HTTP status code mapping:
 *   - `401` — JWT expired or missing; user must sign in again.
 *   - `429` — Rate limit exceeded (10 requests/hour per user, database-backed).
 *   - `422` — Gemini output was truncated mid-JSON; user should try a shorter timeframe.
 *   - `400` — Invalid request payload (schema validation failed server-side).
 *   - Other — Generic server-side error.
 *
 * @param body - Validated meal generation request payload.
 * @returns Array of generated meals from the edge function.
 * @throws {Error} With a user-friendly message for each known status code.
 */
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

    // Attempt to extract the server's own error message from the response body.
    // The Supabase client stores the raw Response in error.context — reading it
    // gives us the JSON payload our edge function returned (e.g. {error: "..."}).
    let serverMessage: string | undefined;
    try {
      const body = await (error as any).context?.json?.();
      if (typeof body?.error === 'string') serverMessage = body.error;
      if (serverMessage) console.error('Edge function error body:', serverMessage);
    } catch {
      // Response body unreadable — fall through to status-based messages
    }

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
        serverMessage ?? 'Invalid request. Please check your inputs and try again.'
      );
    }

    // 546 is returned by the Supabase gateway when the edge function is
    // terminated before it can respond — most commonly a wall-clock timeout
    // caused by a very large Gemini output (e.g. weekly plan with fallbacks).
    if (status === 546) {
      throw new Error(
        'Meal generation timed out. Try a shorter timeframe or reduce meals per day and try again.'
      );
    }

    throw new Error(serverMessage ?? 'Failed to generate meal plan. Please try again.');
  }

  if (!data?.meals) {
    throw new Error('No meals were generated. Please try again.');
  }

  return data.meals as GeneratedMeal[];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Validates the request, checks for an active session, then calls the edge
 * function to generate a meal plan.
 *
 * Monthly plan splitting:
 *   If `request.timeframe === 'month'`, the function makes 4 sequential weekly
 *   calls (each with `budget / 4`), calling `onProgress` before each call so
 *   the UI can display "Generating week 1 of 4…". Meal `day` values from each
 *   week are offset by `week * 7` so they remain globally sequential.
 *   Week and day plans are single calls.
 *
 * @param request - Meal generation parameters (validated with Zod before sending).
 * @param onProgress - Optional callback invoked before each chunk of a monthly plan.
 *   Receives `(current: number, total: number)` — e.g. `(1, 4)` for the first week.
 *   Not called for day or week plans.
 * @returns Array of `GeneratedMeal` objects covering the requested timeframe.
 * @throws {Error} If the user is not authenticated, or if the edge function fails.
 */
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

  // Monthly plans are too large for a single edge function call (timeout risk).
  // Split into 4 weekly chunks with proportional budget, then combine results.
  // Week and day plans are sent as single calls — fallbacks are suppressed by
  // the edge function for non-day timeframes, keeping the response small.
  if (validatedRequest.timeframe === 'month') {
    const allMeals: GeneratedMeal[] = [];
    // Round to 2 decimal places to avoid floating-point budget drift
    const weeklyBudget = Math.round((validatedRequest.budget / 4) * 100) / 100;

    for (let week = 0; week < 4; week++) {
      onProgress?.(week + 1, 4);

      const weekRequest: GenerateMealPlanRequest = {
        ...validatedRequest,
        timeframe: 'week',
        budget: weeklyBudget,
      };

      const meals = await callEdgeFunction(weekRequest);
      // Offset day numbers so week 2 starts at day 8, week 3 at day 15, etc.
      const offsetMeals = meals.map(m => ({ ...m, day: m.day + week * 7 }));
      allMeals.push(...offsetMeals);
    }

    return allMeals;
  }

  return callEdgeFunction(validatedRequest);
}

/**
 * Generates a single replacement meal for a specific slot type.
 *
 * Used by:
 *   - The "Generate new meal here" action in the day view action sheet.
 *   - The "Regenerate this meal" button in the generate preview.
 *
 * Internally calls `callEdgeFunction` with `timeframe: 'day'`, `meals_per_day: 1`,
 * and `target_slot` so Gemini produces exactly one meal of the requested type.
 *
 * @param request - Base generation parameters (budget, dietary restrictions, etc.)
 *   merged with the target slot. Should include `target_slot`.
 * @returns A single `GeneratedMeal` with `day: 1`.
 * @throws {Error} If not authenticated or if the edge function fails.
 */
export async function generateSingleMeal(
  request: GenerateMealPlanRequest
): Promise<GeneratedMeal> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('You must be signed in to generate meals.');
  }

  // Force single-meal mode regardless of what the caller passed
  const singleRequest: GenerateMealPlanRequest = {
    ...request,
    timeframe: 'day',
    meals_per_day: 1,
  };

  const validated = validate(generateMealPlanSchema, singleRequest);
  const meals = await callEdgeFunction(validated);

  if (!meals.length) {
    throw new Error('No meal was generated. Please try again.');
  }

  return meals[0];
}
