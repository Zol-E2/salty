/**
 * @file components/onboarding/GoalOption.tsx
 * Selectable goal option row used in the onboarding goals step and the
 * settings screen goal picker.
 *
 * When selected, the row highlights with an emerald border and tinted background,
 * the icon background switches to solid emerald, and a checkmark appears on the right.
 */

import { TouchableOpacity, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/** Props accepted by GoalOption. */
interface GoalOptionProps {
  /** The goal's display label (e.g. `'Save Money'`). */
  label: string;
  /** Short description shown below the label (e.g. `'Eat well on a tight budget'`). */
  description: string;
  /** Ionicons glyph name for the leading icon. */
  iconName: keyof typeof Ionicons.glyphMap;
  /** Whether this option is currently selected. */
  selected: boolean;
  /** Called when the user taps this option. */
  onPress: () => void;
}

/**
 * GoalOption renders a tappable row with a large icon, a label, and a
 * description. Visual state (selected vs unselected) is entirely prop-driven.
 *
 * @param props - See `GoalOptionProps`.
 */
export function GoalOption({
  label,
  description,
  iconName,
  selected,
  onPress,
}: GoalOptionProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className={`flex-row items-center p-4 rounded-2xl border-2 mb-3 ${
        selected
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
          : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
      }`}
    >
      {/* Icon container — solid emerald when selected, slate when not */}
      <View
        className={`w-12 h-12 rounded-xl items-center justify-center mr-4 ${
          selected
            ? 'bg-primary-500 dark:bg-primary-400'
            : 'bg-slate-100 dark:bg-slate-800'
        }`}
      >
        <Ionicons
          name={iconName}
          size={24}
          color={selected ? 'white' : '#64748B'}
        />
      </View>

      <View className="flex-1">
        <Text
          className={`text-base font-semibold ${
            selected
              ? 'text-primary-700 dark:text-primary-300'
              : 'text-slate-900 dark:text-white'
          }`}
        >
          {label}
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">
          {description}
        </Text>
      </View>

      {selected && (
        <Ionicons name="checkmark-circle" size={24} color="#10B981" />
      )}
    </TouchableOpacity>
  );
}
