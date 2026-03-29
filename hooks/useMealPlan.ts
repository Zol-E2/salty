/**
 * @file hooks/useMealPlan.ts
 * TanStack React Query hooks for the `meal_plan_items` table.
 *
 * The `meal_plan_items` table has a unique constraint on
 * `(user_id, date, slot, slot_index)`, meaning only one meal can occupy a
 * slot+index combination per day. Mutations use `upsert` with
 * `onConflict: 'user_id,date,slot,slot_index'` to silently replace the existing
 * item rather than throwing a duplicate-key error.
 *
 * Both the month and day query keys (`['meal-plan', ...]` and `['meal-plan-day', ...]`)
 * are invalidated after every mutation so both the calendar and day views
 * refresh automatically.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { MealPlanItem, MealSlotType } from '../lib/types';
import { mealPlanItemSchema } from '../lib/validation';

/**
 * Fetches all meal plan items for a given calendar month, joined with their
 * associated meal data.
 *
 * Date range construction:
 *   - Start: `YYYY-MM-01` (first day of the month)
 *   - End: `YYYY-(MM+1)-01` (first day of the next month, exclusive)
 *   - December wraps to `(YYYY+1)-01-01`
 *
 * The query uses `.gte('date', start).lt('date', end)` which is compatible with
 * Supabase's Postgres `text` date column format (`YYYY-MM-DD`).
 *
 * @param year - The 4-digit year.
 * @param month - The 1-indexed month (1 = January, 12 = December).
 * @returns React Query result with `data: MealPlanItem[]`.
 */
export function useMealPlanForMonth(year: number, month: number) {
  const { user } = useAuth();

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, '0')}-01`;

  return useQuery({
    queryKey: ['meal-plan', user?.id, year, month],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select('*, meal:meals(*)')
        .eq('user_id', user!.id)
        .gte('date', startDate)
        .lt('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as MealPlanItem[];
    },
    enabled: !!user,
  });
}

/**
 * Fetches all meal plan items for a single calendar day, joined with meal data.
 * Results are ordered by `created_at` ascending.
 *
 * @param date - The day to fetch in `YYYY-MM-DD` format.
 * @returns React Query result with `data: MealPlanItem[]`.
 */
export function useMealPlanForDate(date: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meal-plan-day', user?.id, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select('*, meal:meals(*)')
        .eq('user_id', user!.id)
        .eq('date', date)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as MealPlanItem[];
    },
    enabled: !!user && !!date,
  });
}

/**
 * Mutation hook for adding (or replacing) a meal in a specific slot on a date.
 *
 * Uses `upsert` with `onConflict: 'user_id,date,slot,slot_index'` so that
 * inserting into an occupied slot+index replaces the existing item.
 * Input is validated with `mealPlanItemSchema` (UUID, date format, slot enum,
 * slot_index range) before the upsert.
 *
 * On success, both `['meal-plan']` and `['meal-plan-day']` query keys are
 * invalidated so the calendar month view and the day detail view both refresh.
 *
 * @returns A mutation. Call `.mutateAsync({ meal_id, date, slot, slot_index? })`.
 */
export function useAddMealToPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      meal_id: string;
      date: string;
      slot: MealSlotType;
      /** 0-based index within the slot. Defaults to 0 via schema default. */
      slot_index?: number;
    }) => {
      // Validate UUID format, date format, slot enum, and slot_index range
      const validated = mealPlanItemSchema.parse(input);

      const { data, error } = await supabase
        .from('meal_plan_items')
        .upsert(
          {
            user_id: user!.id,
            meal_id: validated.meal_id,
            date: validated.date,
            slot: validated.slot,
            slot_index: validated.slot_index,
          },
          // The unique constraint now includes slot_index (migration 004)
          { onConflict: 'user_id,date,slot,slot_index' }
        )
        .select('*, meal:meals(*)')
        .single();

      if (error) throw error;
      return data as MealPlanItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });
    },
  });
}

/**
 * Mutation hook that swaps the `meal_id` of a plan item to a different meal.
 *
 * Used in the day view to toggle between the primary meal and its fallback
 * (or back again). The plan item row itself stays in place — only its
 * `meal_id` pointer is updated.
 *
 * On success, `['meal-plan-day']` is invalidated so the day view re-renders.
 *
 * @returns A mutation. Call `.mutateAsync({ planItemId, targetMealId })`.
 */
export function useSwapFallback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planItemId,
      targetMealId,
    }: {
      /** UUID of the `meal_plan_items` row to update. */
      planItemId: string;
      /** UUID of the meal to swap in (either fallback or original). */
      targetMealId: string;
    }) => {
      const { error } = await supabase
        .from('meal_plan_items')
        .update({ meal_id: targetMealId })
        .eq('id', planItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });
    },
  });
}

/**
 * Query hook that finds the primary meal whose fallback is the given meal ID.
 *
 * Used in the day view "restore original" flow: after swapping to the fallback,
 * the user can tap ↩ to find and restore the primary meal.
 *
 * The query is only enabled when `fallbackMealId` is provided and the user
 * is authenticated.
 *
 * @param fallbackMealId - UUID of the fallback meal whose primary we want to find.
 * @returns React Query result with `data: { id: string } | null`.
 */
export function useFindPrimaryMeal(fallbackMealId: string | null | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['primary-meal', user?.id, fallbackMealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('id')
        // Find the primary meal that points to this fallback
        .eq('fallback_meal_id', fallbackMealId!)
        .eq('user_id', user!.id)
        .maybeSingle();

      if (error) throw error;
      return data as { id: string } | null;
    },
    enabled: !!user && !!fallbackMealId,
  });
}

/**
 * Mutation hook for removing a single meal plan item by its UUID.
 *
 * On success, both `['meal-plan']` and `['meal-plan-day']` query keys are
 * invalidated.
 *
 * @returns A mutation. Call `.mutate(id)` with the `meal_plan_items.id` UUID.
 */
export function useRemoveMealFromPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });
    },
  });
}

/**
 * Mutation hook for deleting ALL meal plan items belonging to the current user.
 * Used in the "Delete All Meal Plans" danger zone action in `app/settings.tsx`.
 * Does NOT delete the saved meal recipes.
 *
 * On success, both `['meal-plan']` and `['meal-plan-day']` query keys are
 * invalidated.
 *
 * @returns A mutation. Call `.mutateAsync()` with no arguments.
 */
export function useDeleteAllMealPlans() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('meal_plan_items')
        .delete()
        .eq('user_id', user!.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meal-plan'] });
      queryClient.invalidateQueries({ queryKey: ['meal-plan-day'] });
    },
  });
}
