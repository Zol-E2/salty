/**
 * @file app/meal/edit.tsx
 * Modal screen for editing the core fields of a saved meal.
 *
 * Route: `/meal/edit?id=<UUID>`
 * Presentation: modal (slide_from_bottom), registered in `app/_layout.tsx`.
 *
 * Query params:
 *   - `id` — the UUID of the meal to edit
 *
 * Loads the current meal with `useMeal(id)`, pre-fills all editable fields,
 * and persists changes via `useUpdateMeal`. Tags are stored as `string[]` but
 * displayed and edited as a comma-separated text string for simplicity.
 *
 * The estimated cost field is kept in USD (the storage currency). The currency
 * code is shown in the label purely as a visual reminder — no conversion is
 * applied on save.
 */

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useMeal, useUpdateMeal } from '../../hooks/useMeals';
import { useCurrency } from '../../hooks/useCurrency';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// --- Difficulty type ---

/** The three valid difficulty levels matching the `meals` table constraint. */
type Difficulty = 'easy' | 'medium' | 'hard';

// --- Main component ---

/**
 * EditMealScreen lets users update the core fields of a saved meal:
 * name, estimated cost, nutritional macros, prep/cook times, difficulty, and tags.
 *
 * Ingredients and instructions are intentionally excluded — those require a
 * richer editing experience than a simple form can provide.
 *
 * @returns A modal screen with a scrollable form pre-populated from the current meal.
 */
export default function EditMealScreen() {
  const { t } = useTranslation();
  const { currency } = useCurrency();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: meal, isLoading } = useMeal(id);
  const updateMeal = useUpdateMeal();

  // --- Form state ---
  const [name, setName] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tags, setTags] = useState('');

  // Pre-fill all fields once the meal data arrives from the query cache / network
  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setEstimatedCost(String(meal.estimated_cost));
      setCalories(String(meal.calories));
      setProtein(String(meal.protein_g));
      setCarbs(String(meal.carbs_g));
      setFat(String(meal.fat_g));
      setPrepTime(String(meal.prep_time_min));
      setCookTime(String(meal.cook_time_min));
      setDifficulty(meal.difficulty);
      // Join tag array into comma-separated string for the text input
      setTags(meal.tags.join(', '));
    }
  }, [meal]);

  // --- Save handler ---

  /**
   * Validates the name field, builds the patch object, and calls updateMeal.
   * Tags are split on commas and trimmed; empty segments are filtered out.
   * All numeric fields fall back to 0 if the user clears them.
   */
  const handleSave = async () => {
    if (!meal) return;
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('meal.name') + ' is required.');
      return;
    }
    try {
      await updateMeal.mutateAsync({
        id: meal.id,
        patch: {
          name: name.trim(),
          estimated_cost: parseFloat(estimatedCost) || 0,
          calories: parseInt(calories, 10) || 0,
          protein_g: parseFloat(protein) || 0,
          carbs_g: parseFloat(carbs) || 0,
          fat_g: parseFloat(fat) || 0,
          prep_time_min: parseInt(prepTime, 10) || 0,
          cook_time_min: parseInt(cookTime, 10) || 0,
          difficulty,
          // Split comma-separated string back to array, dropping blank entries
          tags: tags
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        },
      });
      router.back();
    } catch {
      Alert.alert(t('common.error'), t('meal.saveError'));
    }
  };

  // --- Loading / error states ---

  if (isLoading || !meal) {
    return <LoadingSpinner message={t('meal.loading')} />;
  }

  // --- Difficulty pill helper ---

  /**
   * DifficultyPill renders a selectable pill for one difficulty level.
   *
   * @param props.level - The difficulty level this pill represents.
   */
  function DifficultyPill({ level }: { level: Difficulty }) {
    const isSelected = difficulty === level;
    return (
      <TouchableOpacity
        onPress={() => setDifficulty(level)}
        className={`flex-1 py-2.5 rounded-xl items-center border ${
          isSelected
            ? 'bg-primary-500 border-primary-500'
            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
        }`}
      >
        <Text
          className={`text-sm font-medium capitalize ${
            isSelected ? 'text-white' : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {t(`meal.${level}`)}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* --- Header --- */}
        <View className="px-5 pt-4 pb-2 flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <View className="flex-row items-center flex-1 mr-3">
            <TouchableOpacity onPress={() => router.back()} className="mr-3">
              <Ionicons name="arrow-back" size={24} color="#64748B" />
            </TouchableOpacity>
            <Text
              className="text-xl font-bold text-slate-900 dark:text-white"
              numberOfLines={1}
            >
              {t('meal.editTitle')}
            </Text>
          </View>
          {updateMeal.isPending ? (
            <ActivityIndicator color="#10B981" />
          ) : (
            <Button
              title={t('common.save')}
              onPress={handleSave}
              size="sm"
            />
          )}
        </View>

        {/* --- Scrollable form --- */}
        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* --- Name --- */}
          <View className="mt-5">
            <Input
              label={t('meal.name')}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* --- Estimated cost --- */}
          <View className="mt-4">
            <Input
              label={t('meal.estimatedCost', { currency })}
              value={estimatedCost}
              onChangeText={setEstimatedCost}
              keyboardType="numeric"
            />
          </View>

          {/* --- Nutrition macros (2×2 grid) --- */}
          <View className="mt-5">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('meal.nutrition')}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label={t('day.calories')}
                  value={calories}
                  onChangeText={setCalories}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t('meal.proteinG')}
                  value={protein}
                  onChangeText={setProtein}
                  keyboardType="numeric"
                />
              </View>
            </View>
            <View className="flex-row gap-3 mt-3">
              <View className="flex-1">
                <Input
                  label={t('meal.carbsG')}
                  value={carbs}
                  onChangeText={setCarbs}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t('meal.fatG')}
                  value={fat}
                  onChangeText={setFat}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* --- Prep & cook times side-by-side --- */}
          <View className="mt-5">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('day.time')}
            </Text>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label={t('meal.prepMin')}
                  value={prepTime}
                  onChangeText={setPrepTime}
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  label={t('meal.cookMin')}
                  value={cookTime}
                  onChangeText={setCookTime}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </View>

          {/* --- Difficulty segmented picker --- */}
          <View className="mt-5">
            <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('meal.level')}
            </Text>
            <View className="flex-row gap-2">
              <DifficultyPill level="easy" />
              <DifficultyPill level="medium" />
              <DifficultyPill level="hard" />
            </View>
          </View>

          {/* --- Tags (comma-separated) --- */}
          <View className="mt-5 mb-10">
            <Input
              label={t('meal.tags')}
              value={tags}
              onChangeText={setTags}
              placeholder={t('meal.tagsPlaceholder')}
              autoCapitalize="none"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
