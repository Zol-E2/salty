import { TouchableOpacity, View, Text, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MealPlanItem, MealSlotType } from '../../lib/types';
import { SLOT_COLORS } from '../../lib/constants';

interface MealSlotProps {
  slot: MealSlotType;
  item?: MealPlanItem;
  onPress: () => void;
  onRemove?: () => void;
}

const SLOT_LABELS: Record<MealSlotType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

const SLOT_ICONS: Record<MealSlotType, keyof typeof Ionicons.glyphMap> = {
  breakfast: 'sunny-outline',
  lunch: 'partly-sunny-outline',
  dinner: 'moon-outline',
  snack: 'nutrition-outline',
};

export function MealSlot({ slot, item, onPress, onRemove }: MealSlotProps) {
  const color = SLOT_COLORS[slot];

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2"
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mr-3"
        style={{ backgroundColor: color + '20' }}
      >
        <Ionicons name={SLOT_ICONS[slot]} size={20} color={color} />
      </View>

      {item?.meal ? (
        <View className="flex-1 flex-row items-center">
          {item.meal.image_url ? (
            <Image
              source={{ uri: item.meal.image_url }}
              className="w-10 h-10 rounded-lg mr-3"
            />
          ) : null}
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
        <View className="flex-1">
          <Text className="text-xs font-medium uppercase tracking-wider mb-0.5" style={{ color }}>
            {SLOT_LABELS[slot]}
          </Text>
          <Text className="text-sm text-slate-400 dark:text-slate-500">
            Tap to add meal
          </Text>
        </View>
      )}

      {!item?.meal && (
        <Ionicons name="add-circle-outline" size={22} color={color} />
      )}
    </TouchableOpacity>
  );
}
