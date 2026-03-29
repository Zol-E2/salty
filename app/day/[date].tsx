/**
 * @file app/day/[date].tsx
 * Day detail screen — shows all meal slots for a specific calendar day and a
 * nutritional/cost/time summary card.
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
 *   - Numbered slots: when `slot_index > 0`, the slot label becomes e.g.
 *     "Snack 1", "Snack 2" using the `slotIndexed` i18n key.
 *   - Swap button (⇄): shown when the current meal has a `fallback_meal_id`;
 *     calls `useSwapFallback` to switch the plan item to the fallback.
 *   - Restore button (↩): shown when the current meal `is_fallback === true`;
 *     looks up the primary via `useFindPrimaryMeal` and swaps back.
 */

import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import {
  useMealPlanForDate,
  useRemoveMealFromPlan,
  useSwapFallback,
  useFindPrimaryMeal,
} from '../../hooks/useMealPlan';
import { useCurrency } from '../../hooks/useCurrency';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { MealSlot } from '../../components/calendar/MealSlot';
import { MealPlanItem, MealSlotType } from '../../lib/types';
import { MEAL_SLOTS } from '../../lib/constants';
import { AnimatedCard } from '../../components/ui/AnimatedCard';

export default function DayDetailScreen() {
  const { t } = useTranslation();
  const { format } = useCurrency();
  const language = useOnboardingStore((s) => s.language);
  const { date } = useLocalSearchParams<{ date: string }>();
  const router = useRouter();
  const { data: planItems } = useMealPlanForDate(date);
  const removeMeal = useRemoveMealFromPlan();
  const swapFallback = useSwapFallback();

  // Use user's language for locale-aware date formatting
  const dateFormatted = new Date(date + 'T12:00:00').toLocaleDateString(
    language,
    { weekday: 'long', month: 'long', day: 'numeric' }
  );

  const handleRemove = (id: string) => {
    Alert.alert(t('day.removeMeal'), t('day.removeMealConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('day.removeMeal'),
        style: 'destructive',
        onPress: () => removeMeal.mutate(id),
      },
    ]);
  };

  /**
   * Build a sorted, flat list of plan items ordered by MEAL_SLOTS order then
   * slot_index ascending. Each item is annotated with its display label.
   */
  const sortedItems: Array<{ item: MealPlanItem; slotLabel: string; cardKey: string }> = (() => {
    if (!planItems) return [];

    // Slot type display order: breakfast → lunch → dinner → snack
    const SLOT_ORDER: MealSlotType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

    // Count how many items exist per slot type to know when to number them
    const slotCounts: Partial<Record<MealSlotType, number>> = {};
    for (const item of planItems) {
      slotCounts[item.slot] = (slotCounts[item.slot] ?? 0) + 1;
    }

    const sorted = [...planItems].sort((a, b) => {
      const slotDiff = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
      if (slotDiff !== 0) return slotDiff;
      return a.slot_index - b.slot_index;
    });

    return sorted.map((item) => {
      const baseLabel = t(`meal.${item.slot}`);
      // Show numbered label when more than one item occupies the same slot
      const slotLabel =
        (slotCounts[item.slot] ?? 1) > 1
          ? t('day.slotIndexed', { slot: baseLabel, index: item.slot_index + 1 })
          : baseLabel;
      return { item, slotLabel, cardKey: `${item.id}` };
    });
  })();

  // Also build a set of filled slot types for the "add" empty slots
  const filledSlotKeys = new Set(planItems?.map((i) => i.slot) ?? []);

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
        {/* Filled slots — sorted by slot type then slot_index */}
        {sortedItems.map(({ item, slotLabel, cardKey }, index) => (
          <AnimatedCard key={cardKey} index={index} staggerMs={60}>
            <View className="mb-1">
              <Text className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wide">
                {slotLabel}
              </Text>
            </View>
            <MealSlot
              slot={item.slot}
              item={item}
              onPress={() => {
                if (item.meal) {
                  router.push(`/meal/${item.meal_id}`);
                } else {
                  router.push(`/meal/add?date=${date}&slot=${item.slot}`);
                }
              }}
              onRemove={() => handleRemove(item.id)}
            />
            {/* Swap / Restore action row */}
            <SwapActionRow
              item={item}
              onSwap={(targetMealId) =>
                swapFallback.mutate({ planItemId: item.id, targetMealId })
              }
            />
          </AnimatedCard>
        ))}

        {/* Empty slots for slot types that have no plan items */}
        {MEAL_SLOTS.filter(({ key }) => !filledSlotKeys.has(key)).map(({ key }, index) => (
          <AnimatedCard key={key} index={sortedItems.length + index} staggerMs={60}>
            <MealSlot
              slot={key}
              item={undefined}
              onPress={() => router.push(`/meal/add?date=${date}&slot=${key}`)}
            />
          </AnimatedCard>
        ))}

        {/* Day summary */}
        {planItems && planItems.length > 0 && (
          <View className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 mt-4 mb-6">
            <Text className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              {t('day.daySummary')}
            </Text>
            <View className="flex-row justify-between">
              <SummaryItem
                label={t('day.calories')}
                value={planItems.reduce(
                  (sum, item) => sum + (item.meal?.calories ?? 0),
                  0
                )}
                unit="cal"
              />
              {/* displayValue bypasses numeric formatting for currency-aware display */}
              <SummaryItem
                label={t('day.cost')}
                value={0}
                unit=""
                displayValue={format(planItems.reduce(
                  (sum, item) => sum + (item.meal?.estimated_cost ?? 0),
                  0
                ))}
              />
              <SummaryItem
                label={t('day.time')}
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

/**
 * SwapActionRow renders contextual swap/restore icon buttons beneath a meal slot.
 *
 * - Primary meal with a fallback → shows ⇄ "Swap to quick version" button.
 * - Fallback meal currently displayed → shows ↩ "Restore original" button.
 * - No fallback relationship → renders nothing.
 *
 * @param props.item - The `MealPlanItem` (with joined `meal`) to inspect.
 * @param props.onSwap - Called with the target meal UUID when a swap is triggered.
 */
function SwapActionRow({
  item,
  onSwap,
}: {
  item: MealPlanItem;
  onSwap: (targetMealId: string) => void;
}) {
  const { t } = useTranslation();
  const meal = item.meal;

  // Find the primary meal when we are currently showing the fallback
  // so the restore button knows what to swap back to.
  const { data: primaryMeal } = useFindPrimaryMeal(
    meal?.is_fallback ? meal.id : null
  );

  if (!meal) return null;

  // Primary meal that has a fallback available → show swap button
  if (!meal.is_fallback && meal.fallback_meal_id) {
    return (
      <TouchableOpacity
        onPress={() => onSwap(meal.fallback_meal_id!)}
        className="flex-row items-center mt-2 px-1"
      >
        <Ionicons name="swap-horizontal" size={16} color="#10B981" />
        <Text className="text-xs text-emerald-600 dark:text-emerald-400 ml-1">
          {t('day.swapToFallback')}
        </Text>
      </TouchableOpacity>
    );
  }

  // Fallback meal currently shown → show restore button if we found the primary
  if (meal.is_fallback && primaryMeal) {
    return (
      <TouchableOpacity
        onPress={() => onSwap(primaryMeal.id)}
        className="flex-row items-center mt-2 px-1"
      >
        <Ionicons name="return-up-back" size={16} color="#64748B" />
        <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
          {t('day.restoreOriginal')}
        </Text>
      </TouchableOpacity>
    );
  }

  return null;
}

/**
 * SummaryItem renders a single stat (label + value) in the Day Summary card.
 *
 * @param props.label - Translated label shown above the value.
 * @param props.value - Numeric value; ignored when `displayValue` is provided.
 * @param props.unit - Unit suffix (e.g. "cal", "min"); omitted when `displayValue` is set.
 * @param props.prefix - When true, `unit` is prepended instead of appended.
 * @param props.displayValue - Pre-formatted string that overrides numeric rendering;
 *   used for currency amounts so `format()` controls symbol and decimal places.
 */
function SummaryItem({
  label,
  value,
  unit,
  prefix = false,
  displayValue,
}: {
  label: string;
  value: number;
  unit: string;
  prefix?: boolean;
  displayValue?: string;
}) {
  return (
    <View className="items-center">
      <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1">
        {label}
      </Text>
      <Text className="text-lg font-bold text-slate-900 dark:text-white">
        {displayValue ?? (prefix ? `${unit}${value.toFixed(2)}` : `${value}`)}
      </Text>
      {!displayValue && !prefix && (
        <Text className="text-xs text-slate-400">{unit}</Text>
      )}
    </View>
  );
}
