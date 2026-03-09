/**
 * @file components/meal/MealCard.tsx
 * Reusable card component for displaying a single saved meal.
 *
 * Two variants:
 *   - Default: large card with image placeholder, description, and stats row.
 *   - Compact: slim row for use in lists (e.g. AddMealScreen, CalendarScreen).
 *
 * Currency display uses `useCurrency()` so costs render in the user's chosen
 * currency rather than a hardcoded `$` symbol.
 */

import { TouchableOpacity, View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Meal } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { SLOT_COLORS } from '../../lib/constants';
import { useCurrency } from '../../hooks/useCurrency';

/** Props for {@link MealCard}. */
interface MealCardProps {
  /** The saved meal object to render. */
  meal: Meal;
  /** Called when the card is tapped. */
  onPress: () => void;
  /** When true, renders the compact single-row layout. Defaults to false. */
  compact?: boolean;
}

/**
 * Displays a meal in either full-card or compact-row format.
 *
 * @param props.meal - The meal to display.
 * @param props.onPress - Tap handler.
 * @param props.compact - If true, uses the compact row layout.
 * @returns A touchable card or row representing the meal.
 */
export function MealCard({ meal, onPress, compact = false }: MealCardProps) {
  const { format } = useCurrency();

  if (compact) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800"
      >
        <View className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-900 items-center justify-center">
          <Ionicons name="restaurant" size={20} color="#10B981" />
        </View>
        <View className="flex-1 ml-3">
          <Text
            className="text-sm font-semibold text-slate-900 dark:text-white"
            numberOfLines={1}
          >
            {meal.name}
          </Text>
          <Text className="text-xs text-slate-500 dark:text-slate-400">
            {meal.calories} cal · {format(meal.estimated_cost)}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden"
    >
      <View className="w-full h-40 bg-primary-50 dark:bg-primary-900/30 items-center justify-center">
        <Ionicons name="restaurant" size={40} color="#10B981" />
      </View>
      <View className="p-4">
        <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
          {meal.name}
        </Text>
        {meal.description ? (
          <Text
            className="text-sm text-slate-500 dark:text-slate-400 mb-3"
            numberOfLines={2}
          >
            {meal.description}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center">
            <Ionicons name="flame-outline" size={14} color="#64748B" />
            <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              {meal.calories} cal
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#64748B" />
            <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              {meal.prep_time_min + meal.cook_time_min} min
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={14} color="#64748B" />
            <Text className="text-xs text-slate-500 dark:text-slate-400 ml-1">
              {format(meal.estimated_cost)}
            </Text>
          </View>
        </View>
        <View className="flex-row mt-3 gap-1.5">
          {meal.meal_type.map((type) => (
            <Badge
              key={type}
              label={type.charAt(0).toUpperCase() + type.slice(1)}
              color={SLOT_COLORS[type]}
            />
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
}
