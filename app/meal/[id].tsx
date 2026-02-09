import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import { useMeal } from '../../hooks/useMeals';
import { MacroBar } from '../../components/meal/MacroBar';
import { IngredientList } from '../../components/meal/IngredientList';
import { InstructionSteps } from '../../components/meal/InstructionSteps';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SLOT_COLORS } from '../../lib/constants';
import { MealSlotType } from '../../lib/types';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: meal, isLoading } = useMeal(id);

  if (isLoading || !meal) {
    return <LoadingSpinner message="Loading meal..." />;
  }

  const totalCost = meal.ingredients.reduce(
    (sum, ing) => sum + ing.estimated_cost,
    0
  );

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Back button */}
        <View className="px-5 pt-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View className="px-5 pt-5 pb-8">
          {/* Title & badges */}
          <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {meal.name}
          </Text>
          {meal.description ? (
            <Text className="text-base text-slate-500 dark:text-slate-400 mb-4">
              {meal.description}
            </Text>
          ) : null}

          <View className="flex-row flex-wrap gap-2 mb-4">
            {meal.meal_type.map((type) => (
              <Badge
                key={type}
                label={type.charAt(0).toUpperCase() + type.slice(1)}
                color={SLOT_COLORS[type as MealSlotType]}
              />
            ))}
            <Badge label={meal.difficulty} color="#64748B" />
            {meal.is_ai_generated && (
              <Badge label="AI Generated" color="#8B5CF6" />
            )}
          </View>

          {/* Quick stats */}
          <View className="flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 mb-6">
            <QuickStat
              icon="time-outline"
              label="Prep"
              value={`${meal.prep_time_min}m`}
            />
            <QuickStat
              icon="flame-outline"
              label="Cook"
              value={`${meal.cook_time_min}m`}
            />
            <QuickStat
              icon="cash-outline"
              label="Cost"
              value={`$${meal.estimated_cost.toFixed(2)}`}
            />
            <QuickStat
              icon="speedometer-outline"
              label="Level"
              value={meal.difficulty}
              isLast
            />
          </View>

          {/* Macros */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 mb-6">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
              Nutrition
            </Text>
            <MacroBar
              calories={meal.calories}
              protein={meal.protein_g}
              carbs={meal.carbs_g}
              fat={meal.fat_g}
            />
          </View>

          {/* Ingredients */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 mb-6">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                Ingredients
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                ~${totalCost.toFixed(2)}
              </Text>
            </View>
            <IngredientList ingredients={meal.ingredients} />
          </View>

          {/* Instructions */}
          <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-4">
              Instructions
            </Text>
            <InstructionSteps instructions={meal.instructions} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickStat({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-1 items-center ${
        !isLast ? 'border-r border-slate-100 dark:border-slate-800' : ''
      }`}
    >
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className="text-sm font-semibold text-slate-900 dark:text-white mt-1">
        {value}
      </Text>
      <Text className="text-xs text-slate-500 dark:text-slate-400">
        {label}
      </Text>
    </View>
  );
}
