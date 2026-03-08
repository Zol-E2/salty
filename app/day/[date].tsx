/**
 * @file app/day/[date].tsx
 * Day detail screen — shows all four meal slots for a specific calendar day
 * and a nutritional/cost/time summary card.
 *
 * Route: `/day/[date]` (e.g. `/day/2025-03-15`)
 * Key patterns:
 *   - Date formatting: `date + 'T12:00:00'` appended before constructing a
 *     `Date` object to avoid UTC timezone shifting the date by one day.
 *   - Slot routing: tapping a filled slot navigates to `/meal/[id]`;
 *     tapping an empty slot navigates to `/meal/add?date=...&slot=...`.
 *   - Remove: triggers an Alert confirmation then calls `useRemoveMealFromPlan`.
 *   - Summary card: only visible when at least one slot is filled; aggregates
 *     calories, cost, and total time across all items for the day.
 */

import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useMealPlanForDate, useRemoveMealFromPlan } from '../../hooks/useMealPlan';
import { MealSlot } from '../../components/calendar/MealSlot';
import { MealSlotType } from '../../lib/types';
import { MEAL_SLOTS } from '../../lib/constants';
import { AnimatedCard } from '../../components/ui/AnimatedCard';

export default function DayDetailScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { data: planItems, isLoading } = useMealPlanForDate(date);
  const removeMeal = useRemoveMealFromPlan();

  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const getItemForSlot = (slot: MealSlotType) =>
    planItems?.find((item) => item.slot === slot);

  const handleRemove = (id: string) => {
    Alert.alert('Remove meal', 'Remove this meal from your plan?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => removeMeal.mutate(id),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            {dateFormatted}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-5 pt-4" showsVerticalScrollIndicator={false}>
        {MEAL_SLOTS.map(({ key }, index) => {
          const item = getItemForSlot(key);
          return (
            <AnimatedCard key={key} index={index} staggerMs={60}>
              <MealSlot
                slot={key}
                item={item}
                onPress={() => {
                  if (item?.meal) {
                    router.push(`/meal/${item.meal_id}`);
                  } else {
                    router.push(`/meal/add?date=${date}&slot=${key}`);
                  }
                }}
                onRemove={item ? () => handleRemove(item.id) : undefined}
              />
            </AnimatedCard>
          );
        })}

        {/* Day summary */}
        {planItems && planItems.length > 0 && (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mt-4 mb-6">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              Day Summary
            </Text>
            <View className="flex-row justify-between">
              <SummaryItem
                label="Calories"
                value={planItems.reduce(
                  (sum, item) => sum + (item.meal?.calories ?? 0),
                  0
                )}
                unit="cal"
              />
              <SummaryItem
                label="Cost"
                value={planItems.reduce(
                  (sum, item) => sum + (item.meal?.estimated_cost ?? 0),
                  0
                )}
                unit="$"
                prefix
              />
              <SummaryItem
                label="Time"
                value={planItems.reduce(
                  (sum, item) =>
                    sum +
                    (item.meal?.prep_time_min ?? 0) +
                    (item.meal?.cook_time_min ?? 0),
                  0
                )}
                unit="min"
              />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({
  label,
  value,
  unit,
  prefix = false,
}: {
  label: string;
  value: number;
  unit: string;
  prefix?: boolean;
}) {
  return (
    <View className="items-center">
      <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </Text>
      <Text className="text-lg font-bold text-slate-900 dark:text-white">
        {prefix ? `${unit}${value.toFixed(2)}` : `${value}`}
      </Text>
      {!prefix && (
        <Text className="text-xs text-slate-400">{unit}</Text>
      )}
    </View>
  );
}
