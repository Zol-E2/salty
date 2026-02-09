import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Meal } from '../lib/types';
import { mealCreateSchema, searchQuerySchema } from '../lib/validation';

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

export function useCreateMeal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (meal: Omit<Meal, 'id' | 'user_id' | 'created_at'>) => {
      // Validate all meal fields before inserting
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
