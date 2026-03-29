/**
 * @file hooks/useMeals.ts
 * TanStack React Query hooks for the `meals` table.
 *
 * All mutations validate their inputs with Zod before touching Supabase,
 * mirroring the database CHECK constraints from
 * `supabase/migrations/002_security_hardening.sql`.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Meal } from '../lib/types';
import { mealCreateSchema, searchQuerySchema } from '../lib/validation';

/**
 * Fetches the authenticated user's saved meals, optionally filtered by name.
 *
 * The search string is sanitized through `searchQuerySchema` (trims whitespace,
 * enforces a 200-character cap) before being used in a Postgres `ilike` query.
 * `ilike` is case-insensitive and supports `%` wildcards.
 *
 * Results are ordered by `created_at` descending so the newest meals appear first.
 *
 * @param search - Optional search string. If provided, filters meals whose `name`
 *   contains the string (case-insensitive).
 * @returns A React Query result with `data: Meal[] | undefined`.
 */
export function useMeals(search?: string) {
  const { user } = useAuth();
  // Sanitize search input: trim and enforce length limit
  const sanitizedSearch = search ? searchQuerySchema.parse(search) : undefined;

  return useQuery({
    queryKey: ['meals', user?.id, sanitizedSearch],
    queryFn: async () => {
      let query = supabase
        .from('meals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (sanitizedSearch) {
        query = query.ilike('name', `%${sanitizedSearch}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Meal[];
    },
    enabled: !!user,
  });
}

/**
 * Fetches a single meal by its UUID.
 *
 * The query includes an `eq('user_id', ...)` guard so users cannot fetch
 * meals belonging to other users even if they know the UUID.
 *
 * @param id - The UUID of the meal to fetch.
 * @returns A React Query result with `data: Meal | undefined`.
 */
export function useMeal(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meal', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;
      return data as Meal;
    },
    enabled: !!user && !!id,
  });
}

/**
 * Mutation hook for inserting a new meal into Supabase.
 *
 * The payload is validated with `mealCreateSchema` before the insert, which
 * enforces ranges, required fields, and array lengths that mirror database
 * CHECK constraints. On success, the `['meals']` query key is invalidated
 * so `useMeals` re-fetches automatically.
 *
 * @returns A React Query `UseMutationResult`. Call `.mutateAsync(meal)` with
 *   a meal object omitting `id`, `user_id`, and `created_at`.
 */
export function useCreateMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meal: Omit<Meal, 'id' | 'user_id' | 'created_at'>) => {
      // Validate all meal fields before inserting.
      // `language`, `is_fallback`, and `fallback_meal_id` are included in the
      // schema so callers can set them directly on the payload.
      const validated = mealCreateSchema.parse(meal);

      const { data, error } = await supabase
        .from('meals')
        .insert({ ...validated, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data as Meal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}

/**
 * Mutation hook for deleting a meal by its UUID.
 *
 * On success, the `['meals']` query key is invalidated.
 *
 * @returns A React Query `UseMutationResult`. Call `.mutate(id)` with the meal UUID.
 */
export function useDeleteMeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('meals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    },
  });
}
