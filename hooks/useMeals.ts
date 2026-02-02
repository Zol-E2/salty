import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { Meal } from '../lib/types';

export function useMeals(search?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['meals', user?.id, search],
    queryFn: async () => {
      let query = supabase
        .from('meals')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.ilike('name', `%${search}%`);
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
      const { data, error } = await supabase
        .from('meals')
        .insert({ ...meal, user_id: user!.id })
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
