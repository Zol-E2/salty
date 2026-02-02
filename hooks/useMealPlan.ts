import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { MealPlanItem, MealSlotType } from '../lib/types';

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

export function useAddMealToPlan() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      meal_id,
      date,
      slot,
    }: {
      meal_id: string;
      date: string;
      slot: MealSlotType;
    }) => {
      const { data, error } = await supabase
        .from('meal_plan_items')
        .upsert(
          { user_id: user!.id, meal_id, date, slot },
          { onConflict: 'user_id,date,slot' }
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
