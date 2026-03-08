/**
 * @file components/forms/PreferencesForm.tsx
 * Shared presentational form for weekly budget, cooking skill level, and
 * dietary restriction preferences.
 *
 * Used in two places:
 *   - `app/(onboarding)/preferences.tsx` — step 3 of 6 in the onboarding flow
 *   - `app/settings.tsx` — the settings screen for returning users
 *
 * This component is purely presentational. All state lives in the parent and
 * flows in via props; changes flow out via callbacks (props-in / callbacks-out).
 * This prevents the budget/skill/dietary UI from being duplicated across screens.
 */

import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DIETARY_OPTIONS, SKILL_LEVELS } from '../../lib/constants';
import { DietaryRestriction } from '../../lib/types';

/**
 * The available weekly grocery budget options in USD.
 * Exported so callers can initialize their local state from this list.
 */
export const BUDGET_OPTIONS = [30, 40, 50, 75, 100] as const;

/** Props accepted by PreferencesForm. */
interface PreferencesFormProps {
  /** Currently selected weekly grocery budget in USD. */
  weeklyBudget: number;
  /**
   * Called when the user taps a budget chip.
   * @param budget - The selected budget amount.
   */
  onBudgetChange: (budget: number) => void;
  /** Currently selected cooking skill level key (e.g. `'beginner'`). */
  skillLevel: string;
  /**
   * Called when the user taps a skill level row.
   * @param level - The selected skill key (`'beginner' | 'intermediate' | 'advanced'`).
   */
  onSkillLevelChange: (level: string) => void;
  /** Currently active dietary restrictions. */
  dietaryRestrictions: DietaryRestriction[];
  /**
   * Called when the user taps a dietary restriction chip to toggle it on or off.
   * @param restriction - The restriction key that was tapped.
   */
  onDietaryRestrictionToggle: (restriction: DietaryRestriction) => void;
}

/**
 * PreferencesForm renders three preference sections:
 * 1. Budget — a horizontal chip row of dollar amounts from `BUDGET_OPTIONS`.
 * 2. Skill Level — a vertical list of tappable rows from `SKILL_LEVELS`.
 * 3. Dietary Restrictions — a wrapping chip row from `DIETARY_OPTIONS`.
 *
 * The active selection in each section is highlighted with emerald primary
 * styles; inactive items use neutral slate styles.
 *
 * @param props - See `PreferencesFormProps`.
 */
export function PreferencesForm({
  weeklyBudget,
  onBudgetChange,
  skillLevel,
  onSkillLevelChange,
  dietaryRestrictions,
  onDietaryRestrictionToggle,
}: PreferencesFormProps) {
  return (
    <View>
      {/* --- Budget --- */}
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Weekly grocery budget
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {BUDGET_OPTIONS.map((amount) => (
          <TouchableOpacity
            key={amount}
            onPress={() => onBudgetChange(amount)}
            className={`px-5 py-3 rounded-xl border-2 ${
              weeklyBudget === amount
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                weeklyBudget === amount
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              ${amount}/wk
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Skill Level --- */}
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Cooking skill level
      </Text>
      <View className="mb-8">
        {SKILL_LEVELS.map((level) => (
          <TouchableOpacity
            key={level.key}
            onPress={() => onSkillLevelChange(level.key)}
            className={`flex-row items-center p-4 rounded-xl border-2 mb-2 ${
              skillLevel === level.key
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <View className="flex-1">
              <Text
                className={`text-base font-semibold ${
                  skillLevel === level.key
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-900 dark:text-white'
                }`}
              >
                {level.label}
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                {level.description}
              </Text>
            </View>
            {skillLevel === level.key && (
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* --- Dietary Restrictions --- */}
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Dietary restrictions
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        Select all that apply (optional)
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {DIETARY_OPTIONS.map((option) => {
          const selected = dietaryRestrictions.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onDietaryRestrictionToggle(option.key)}
              className={`px-4 py-2.5 rounded-full border-2 ${
                selected
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selected
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
