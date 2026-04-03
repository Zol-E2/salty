/**
 * @file components/meal/MealActionSheet.tsx
 * Bottom sheet modal exposing all management actions for a filled meal slot.
 *
 * Implemented with React Native's built-in `Modal` (transparent background +
 * `animationType: 'slide'`) so no third-party library is required. A semi-
 * transparent backdrop dismisses the sheet on tap.
 *
 * Action visibility rules:
 *   - `onSwapToFallback` — only shown when the primary meal has a fallback.
 *   - `onRestoreOriginal` — only shown when the current meal is the fallback.
 *   - All other actions are always visible.
 *
 * Destructive actions (Remove from plan, Delete recipe) are coloured amber/rose
 * and each shows a native `Alert` confirmation before calling the callback.
 */

import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { MealPlanItem } from '../../lib/types';

// --- Types ---

/** Props for {@link MealActionSheet}. */
interface MealActionSheetProps {
  /** Whether the sheet is visible. */
  visible: boolean;
  /** Called when the sheet should close (backdrop tap or cancel). */
  onClose: () => void;
  /** The plan item whose meal is being managed. */
  planItem: MealPlanItem;
  /** Navigate to full recipe detail screen. */
  onViewRecipe: () => void;
  /** Open meal picker to replace the current slot assignment. */
  onReplaceWithMeal: () => void;
  /** Open move-to-slot modal. */
  onMoveToSlot: () => void;
  /** Open copy-to-date modal. */
  onCopyToDate: () => void;
  /** Remove from plan (keep recipe). Shown as amber destructive action. */
  onRemoveFromPlan: () => void;
  /** Delete the recipe entirely (and remove from all plan slots). Shown as rose destructive action. */
  onDeleteRecipe: () => void;
  /**
   * Swap the current primary meal to its fallback version.
   * When undefined, the swap row is not rendered.
   */
  onSwapToFallback?: () => void;
  /**
   * Restore the original primary meal from the current fallback.
   * When undefined, the restore row is not rendered.
   */
  onRestoreOriginal?: () => void;
  /** Trigger single-meal AI generation for this slot. */
  onGenerateNew: () => void;
}

// --- Sub-components ---

/**
 * ActionRow renders a single tappable row inside the action sheet.
 *
 * @param props.icon - Ionicons glyph name.
 * @param props.label - Human-readable action label.
 * @param props.onPress - Callback when the row is tapped.
 * @param props.color - Optional text/icon colour override (default slate-700).
 */
function ActionRow({
  icon,
  label,
  onPress,
  color = '#334155',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color?: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center px-5 py-3.5"
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text className="text-sm font-medium ml-3" style={{ color }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** Thin horizontal divider between action groups. */
function Divider() {
  return <View className="h-px bg-slate-100 dark:bg-slate-800 mx-5" />;
}

// --- Main component ---

/**
 * Bottom sheet with all management actions for a filled meal slot.
 *
 * @param props - See {@link MealActionSheetProps}.
 * @returns A transparent modal containing a sliding action sheet panel.
 */
export function MealActionSheet({
  visible,
  onClose,
  planItem,
  onViewRecipe,
  onReplaceWithMeal,
  onMoveToSlot,
  onCopyToDate,
  onRemoveFromPlan,
  onDeleteRecipe,
  onSwapToFallback,
  onRestoreOriginal,
  onGenerateNew,
}: MealActionSheetProps) {
  const { t } = useTranslation();
  const mealName = planItem.meal?.name ?? t('day.optionsSheet');

  // --- Destructive action wrappers ---

  const handleRemove = () => {
    onClose();
    // Defer the Alert so the sheet animates out first
    setTimeout(() => {
      Alert.alert(t('day.removeMeal'), t('day.removeMealConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('day.removeMeal'),
          style: 'destructive',
          onPress: onRemoveFromPlan,
        },
      ]);
    }, 300);
  };

  const handleDelete = () => {
    onClose();
    setTimeout(() => {
      Alert.alert(t('day.deleteRecipe'), t('day.deleteRecipeConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('day.deleteRecipe'),
          style: 'destructive',
          onPress: onDeleteRecipe,
        },
      ]);
    }, 300);
  };

  // --- Helper to close sheet then navigate ---
  const closeAndRun = (fn: () => void) => {
    onClose();
    // Brief delay lets the sheet slide out before the next screen opens
    setTimeout(fn, 250);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Semi-transparent backdrop — tapping it dismisses the sheet */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 bg-black/40" />
      </TouchableWithoutFeedback>

      {/* Action panel slides up from the bottom */}
      <View className="bg-white dark:bg-slate-900 rounded-t-3xl pb-8">
        {/* Drag handle indicator */}
        <View className="items-center pt-3 pb-1">
          <View className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
        </View>

        {/* Sheet title — meal name */}
        <Text
          className="text-base font-semibold text-slate-900 dark:text-white px-5 py-3"
          numberOfLines={1}
        >
          {mealName}
        </Text>

        <Divider />

        {/* Primary actions */}
        <ActionRow
          icon="eye-outline"
          label={t('meal.viewRecipe')}
          onPress={() => closeAndRun(onViewRecipe)}
        />
        <ActionRow
          icon="repeat-outline"
          label={t('day.replaceWithMeal')}
          onPress={() => closeAndRun(onReplaceWithMeal)}
        />
        <ActionRow
          icon="arrow-forward-circle-outline"
          label={t('day.moveToSlot')}
          onPress={() => closeAndRun(onMoveToSlot)}
        />
        <ActionRow
          icon="copy-outline"
          label={t('day.copyToDate')}
          onPress={() => closeAndRun(onCopyToDate)}
        />

        {/* Conditional swap / restore rows */}
        {onSwapToFallback && (
          <ActionRow
            icon="swap-horizontal-outline"
            label={t('day.swapToFallback')}
            onPress={() => closeAndRun(onSwapToFallback)}
          />
        )}
        {onRestoreOriginal && (
          <ActionRow
            icon="arrow-undo-outline"
            label={t('day.restoreOriginal')}
            onPress={() => closeAndRun(onRestoreOriginal)}
          />
        )}

        <ActionRow
          icon="sparkles-outline"
          label={t('day.generateNewMeal')}
          onPress={() => closeAndRun(onGenerateNew)}
        />

        <Divider />

        {/* Destructive actions */}
        <ActionRow
          icon="remove-circle-outline"
          label={t('day.removeMeal')}
          onPress={handleRemove}
          color="#F59E0B"
        />
        <ActionRow
          icon="trash-outline"
          label={t('day.deleteRecipe')}
          onPress={handleDelete}
          color="#F43F5E"
        />
      </View>
    </Modal>
  );
}
