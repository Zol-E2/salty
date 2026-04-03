/**
 * @file hooks/useWeeklySpend.ts
 * React Query hook that calculates total meal cost for the current ISO week.
 *
 * The "current week" is Monday–Sunday inclusive, using local date arithmetic.
 * Only primary meals (is_fallback = false) are counted to avoid double-counting
 * since fallback meals are alternatives, not additional meals in the plan.
 *
 * @returns `{ totalSpend, isLoading }` — total cost in the user's stored currency units.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

// --- Date helpers ---

/**
 * Returns the Monday of the current ISO week as a `YYYY-MM-DD` string.
 * ISO week starts on Monday (day index 1). Sunday (0) is treated as
 * 6 days after Monday, so we shift it to +1 to land on Monday.
 *
 * @returns Start-of-week date string.
 */
function getWeekStart(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  // Offset so Monday = 0, Sunday = 6
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setDate(now.getDate() - offset);
  return monday.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Returns the Sunday of the current ISO week as a `YYYY-MM-DD` string.
 * Always 6 days after the Monday returned by `getWeekStart`.
 *
 * @returns End-of-week date string.
 */
function getWeekEnd(): string {
  const now = new Date();
  const day = now.getDay();
  const offset = day === 0 ? 0 : 7 - day;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() + offset);
  return sunday.toISOString().slice(0, 10); // YYYY-MM-DD
}

// --- Hook ---

/**
 * Fetches all non-fallback meal plan items for the current ISO week and sums
 * their `estimated_cost` values.
 *
 * The join `meal:meals(estimated_cost, is_fallback)` pulls only the fields
 * needed to compute the total — avoids loading full meal records.
 *
 * @returns `{ totalSpend: number, isLoading: boolean }`.
 */
export function useWeeklySpend(): { totalSpend: number; isLoading: boolean } {
  const { user } = useAuth();
  const weekStart = getWeekStart();
  const weekEnd = getWeekEnd();

  const { data, isLoading } = useQuery({
    // Prefix with 'meal-plan' so existing mutations that invalidate
    // ['meal-plan'] automatically refresh the budget card via prefix matching.
    queryKey: ['meal-plan', 'weekly-spend', user?.id, weekStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .select('meal:meals(estimated_cost, is_fallback)')
        .eq('user_id', user!.id)
        .gte('date', weekStart)
        .lte('date', weekEnd);

      if (error) throw error;

      // Sum only primary meals — filter out fallbacks at query time via JS since
      // Supabase JS client v2 does not support filtering on joined table columns
      // directly in the same select call.
      return (data ?? []).reduce((sum, item) => {
        const meal = item.meal as { estimated_cost: number; is_fallback: boolean } | null;
        if (!meal || meal.is_fallback) return sum;
        return sum + (meal.estimated_cost ?? 0);
      }, 0);
    },
    enabled: !!user,
  });

  return { totalSpend: data ?? 0, isLoading };
}
