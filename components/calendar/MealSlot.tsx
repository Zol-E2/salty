/**
 * @file components/calendar/MealSlot.tsx
 * Individual meal slot row for the day detail screen (`app/day/[date].tsx`).
 *
 * Each slot represents one of the four daily meal positions (breakfast, lunch,
 * dinner, snack). The component renders one of two branches:
 *   - **Filled** (`item?.meal` is set): shows the meal name, calorie count,
 *     total time, and an optional remove button.
 *   - **Empty** (`item?.meal` is undefined): shows a "Tap to add meal" prompt
 *     and an add-circle icon.
 *
 * Pressing the slot triggers `onPress`, which the parent routes to either
 * the meal detail screen or the add-meal screen depending on whether it's filled.
 */

import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealPlanItem, MealSlotType } from '../../lib/types';
import { SLOT_COLORS } from '../../lib/constants';

/** Props accepted by MealSlot. */
interface MealSlotProps {
  /** Which meal slot this row represents. */
  slot: MealSlotType;
  /**
   * The meal plan item assigned to this slot, if any.
   * When provided and `item.meal` is populated (joined), the filled branch renders.
   * When undefined, the empty branch renders.
   */
  item?: MealPlanItem;
  /**
   * Called when the slot row is tapped.
   * The parent decides whether to navigate to the meal detail or add-meal screen.
   */
  onPress: () => void;
  /**
   * Optional remove callback. When provided, a close-circle icon is shown on the
   * filled branch that triggers this callback (shows an Alert in the parent).
   */
  onRemove?: () => void;
}

/** Human-readable labels for each slot type. */
const SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

/** Ionicons glyph for each slot's time-of-day icon. */
const SLOT_ICONS: Record<MealSlotType, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

/**
 * MealSlot renders a single row in the day detail meal list.
 * The slot colour (from `SLOT_COLORS`) is used for the icon background tint,
 * the slot label text, and the add-circle icon.
 *
 * @param props - See `MealSlotProps`.
 */
export function MealSlot({ slot, item, onPress, onRemove }: MealSlotProps) {
  const color = SLOT_COLORS[slot];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2"
    >
      {/* Slot icon with a tinted background */}
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: color + '20' }}
      >
        <Ionicons name={SLOT_ICONS[slot]} size={20} color={color} />
      </View>

      {/* --- Filled branch: meal is assigned --- */}
      {item?.meal ? (
        <View className="flex-1 flex-row items-center">
          <View className="flex-1">
            <Text className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color }}>
              {SLOT_LABELS[slot]}
            </Text>
            <Text
              className="text-sm font-semibold text-slate-900 dark:text-white"
              numberOfLines={1}
            >
              {item.meal.name}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {item.meal.calories} cal · {item.meal.prep_time_min + item.meal.cook_time_min} min
            </Text>
          </View>
          {onRemove && (
            <TouchableOpacity
              onPress={onRemove}
              hitSlop={8}
              className="p-1"
            >
              <Ionicons name="close-circle" size={20} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        /* --- Empty branch: no meal assigned --- */
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color }}>
            {SLOT_LABELS[slot]}
          </Text>
          <Text className="text-sm text-slate-400 dark:text-slate-500">
            Tap to add meal
          </Text>
        </View>
      )}

      {/* Add icon shown only on the empty branch */}
      {!item?.meal && (
        <Ionicons name="add-circle-outline" size={22} color={color} />
      )}
    </TouchableOpacity>
  );
}
