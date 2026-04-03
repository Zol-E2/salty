/**
 * @file app/meal/move.tsx
 * Modal screen for moving or copying a meal to a different date and slot.
 *
 * Route: `/meal/move?planItemId=...&mealId=...&mealName=...&sourceDateStr=...&sourceSlot=...&mode=move|copy`
 * Presentation: modal (slide_from_bottom), registered in `app/_layout.tsx`.
 *
 * Query params:
 *   - `planItemId`   — UUID of the `meal_plan_items` row (required for move)
 *   - `mealId`       — UUID of the meal to place
 *   - `mealName`     — display name shown in the header
 *   - `sourceDateStr`— source date in YYYY-MM-DD (used to highlight today)
 *   - `sourceSlot`   — source slot type (pre-selects the same slot on the target)
 *   - `mode`         — `'move'` removes the source item; `'copy'` keeps it
 *
 * UI layout:
 *   1. Header with title and meal name
 *   2. Scrollable date list — today + next 20 days (21 total)
 *   3. Slot type selector — four pill buttons
 *   4. Confirm button (disabled until both date and slot are selected)
 *
 * Move: calls `useMoveMealInPlan` (deletes source, upserts at target).
 * Copy: calls `useCopyMealInPlan` (upserts at target only).
 */

import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMoveMealInPlan, useCopyMealInPlan } from '../../hooks/useMealPlan';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Button } from '../../components/ui/Button';
import { MealSlotType } from '../../lib/types';
import { SLOT_COLORS } from '../../lib/constants';

// --- Constants ---

/** Number of days to show in the date picker (today + next N days). */
const DAYS_TO_SHOW = 21;

/** Ordered meal slot types for the slot picker. */
const SLOT_TYPES: MealSlotType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Ionicons glyph for each slot's time-of-day icon. */
const SLOT_ICONS: Record<MealSlotType, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

// --- Helpers ---

/**
 * Formats a date object as `YYYY-MM-DD` using local date parts (not UTC).
 * Using local parts avoids timezone-shift bugs where midnight UTC rolls back
 * to the previous day.
 *
 * @param date - The date to format.
 * @returns A `YYYY-MM-DD` string in local time.
 */
function toLocalDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Builds an array of `DAYS_TO_SHOW` consecutive dates starting from today (local).
 *
 * @returns Array of `Date` objects, one per day.
 */
function buildDateRange(): Date[] {
  const today = new Date();
  today.setHours(12, 0, 0, 0); // Noon to avoid DST edge-cases
  return Array.from({ length: DAYS_TO_SHOW }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });
}

// --- Main component ---

/**
 * MoveMealScreen presents a scrollable date list and slot picker, then
 * calls the appropriate mutation (move or copy) when the user confirms.
 *
 * @returns A modal screen with date + slot selection and a confirm button.
 */
export default function MoveMealScreen() {
  const { t } = useTranslation();
  const language = useOnboardingStore((s) => s.language);
  const router = useRouter();

  const {
    planItemId,
    mealId,
    mealName,
    sourceDateStr,
    sourceSlot,
    mode,
  } = useLocalSearchParams<{
    planItemId: string;
    mealId: string;
    mealName: string;
    sourceDateStr: string;
    sourceSlot: string;
    mode: string;
  }>();

  const isCopy = mode === 'copy';
  const moveMeal = useMoveMealInPlan();
  const copyMeal = useCopyMealInPlan();

  // --- Selection state ---
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<MealSlotType | null>(
    // Pre-select the source slot so the user only needs to change the date
    sourceSlot && SLOT_TYPES.includes(sourceSlot as MealSlotType)
      ? (sourceSlot as MealSlotType)
      : null
  );

  const todayStr = toLocalDateStr(new Date());
  const dateRange = buildDateRange();

  // --- Confirm handler ---

  /**
   * Validates selection, calls the move or copy mutation, then navigates back.
   * Uses `mutateAsync` so errors are caught in the try/catch below.
   */
  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;

    try {
      if (isCopy) {
        await copyMeal.mutateAsync({
          mealId,
          targetDate: selectedDate,
          targetSlot: selectedSlot,
        });
      } else {
        await moveMeal.mutateAsync({
          planItemId,
          mealId,
          targetDate: selectedDate,
          targetSlot: selectedSlot,
        });
      }
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('meal.saveError'));
    }
  };

  const isPending = moveMeal.isPending || copyMeal.isPending;
  const canConfirm = !!selectedDate && !!selectedSlot && !isPending;

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      {/* --- Header --- */}
      <View className="px-5 pt-4 pb-3 flex-row items-center border-b border-slate-100 dark:border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            {isCopy ? t('meal.copyTitle') : t('meal.moveTitle')}
          </Text>
          {mealName ? (
            <Text
              className="text-sm text-slate-500 dark:text-slate-400 mt-0.5"
              numberOfLines={1}
            >
              {mealName}
            </Text>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* --- Date picker --- */}
        <View className="px-5 pt-5">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            {t('meal.selectDate')}
          </Text>
          {dateRange.map((date) => {
            const dateStr = toLocalDateStr(date);
            const isToday = dateStr === todayStr;
            const isSource = dateStr === sourceDateStr;
            const isSelected = dateStr === selectedDate;

            // Format using user's locale: "Mon, Apr 7"
            const label = date.toLocaleDateString(language, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            return (
              <TouchableOpacity
                key={dateStr}
                onPress={() => setSelectedDate(dateStr)}
                className={`flex-row items-center justify-between px-4 py-3 rounded-xl mb-2 border ${
                  isSelected
                    ? 'bg-primary-500 border-primary-500'
                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    isSelected ? 'text-white' : 'text-slate-900 dark:text-white'
                  }`}
                >
                  {label}
                  {isToday ? ` · ${t('common.today')}` : ''}
                </Text>
                {isSource && !isSelected && (
                  // Subtle indicator for the meal's current date
                  <Text className="text-xs text-slate-400 dark:text-slate-500">
                    current
                  </Text>
                )}
                {isSelected && (
                  <Ionicons name="checkmark" size={16} color="#fff" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* --- Slot type picker --- */}
        <View className="px-5 pt-4 pb-6">
          <Text className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 uppercase tracking-wider">
            {t('meal.selectSlot')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SLOT_TYPES.map((slot) => {
              const isSelected = selectedSlot === slot;
              const color = SLOT_COLORS[slot];
              return (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setSelectedSlot(slot)}
                  className={`flex-row items-center px-4 py-2.5 rounded-xl border ${
                    isSelected
                      ? 'border-transparent'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`}
                  style={isSelected ? { backgroundColor: color + '20', borderColor: color } : undefined}
                >
                  <Ionicons
                    name={SLOT_ICONS[slot]}
                    size={16}
                    color={isSelected ? color : '#94A3B8'}
                  />
                  <Text
                    className={`text-sm font-medium ml-1.5 capitalize ${
                      isSelected ? '' : 'text-slate-600 dark:text-slate-400'
                    }`}
                    style={isSelected ? { color } : undefined}
                  >
                    {t(`meal.${slot}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* --- Confirm button pinned at bottom --- */}
      <View className="px-5 pb-6 pt-3 border-t border-slate-100 dark:border-slate-800">
        <Button
          title={isCopy ? t('meal.confirmCopy') : t('meal.confirmMove')}
          onPress={handleConfirm}
          disabled={!canConfirm}
          loading={isPending}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}
