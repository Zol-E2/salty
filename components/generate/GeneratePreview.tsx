import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GeneratedMeal } from '../../lib/types';
import { SLOT_COLORS } from '../../lib/constants';
import { Button } from '../ui/Button';
import { AnimatedCard } from '../ui/AnimatedCard';

interface GeneratePreviewProps {
  meals: GeneratedMeal[];
  onSave: () => void;
  onDiscard: () => void;
  onTryAgain: () => void;
  saving: boolean;
}

export function GeneratePreview({
  meals,
  onSave,
  onDiscard,
  onTryAgain,
  saving,
}: GeneratePreviewProps) {
  const groupedByDay = meals.reduce(
    (acc, meal) => {
      const day = meal.day;
      if (!acc[day]) acc[day] = [];
      acc[day].push(meal);
      return acc;
    },
    {} as Record<number, GeneratedMeal[]>
  );

  const totalCost = meals.reduce((sum, m) => sum + m.estimated_cost, 0);
  const avgCalories = meals.length
    ? Math.round(meals.reduce((sum, m) => sum + m.calories, 0) / meals.length)
    : 0;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Summary banner */}
      <AnimatedCard index={0}>
      <View className="bg-primary-50 dark:bg-primary-400/10 rounded-2xl p-4 mb-6">
        <View className="flex-row items-center mb-2">
          <Ionicons name="sparkles" size={18} color="#10B981" />
          <Text className="text-base font-semibold text-primary-700 dark:text-primary-300 ml-2">
            Generated {meals.length} meals
          </Text>
        </View>
        <View className="flex-row justify-between">
          <Text className="text-sm text-primary-600 dark:text-primary-400">
            Est. cost: ${totalCost.toFixed(2)}
          </Text>
          <Text className="text-sm text-primary-600 dark:text-primary-400">
            Avg: {avgCalories} cal/meal
          </Text>
        </View>
      </View>
      </AnimatedCard>

      {/* Meals by day */}
      {(() => {
        let globalIndex = 1;
        return Object.entries(groupedByDay)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([day, dayMeals]) => (
            <View key={day} className="mb-5">
              <Text className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Day {day}
              </Text>
              {dayMeals.map((meal, idx) => {
                const cardIndex = globalIndex++;
                return (
                  <AnimatedCard key={idx} index={cardIndex}>
                    <View className="flex-row items-center bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-100 dark:border-slate-800 mb-2">
                      <View className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 items-center justify-center mr-3">
                        <Ionicons name="restaurant" size={18} color="#10B981" />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center mb-0.5">
                          <View
                            className="w-2 h-2 rounded-full mr-1.5"
                            style={{
                              backgroundColor:
                                SLOT_COLORS[meal.meal_type] || '#10B981',
                            }}
                          />
                          <Text className="text-xs text-slate-500 dark:text-slate-400 uppercase">
                            {meal.meal_type}
                          </Text>
                        </View>
                        <Text
                          className="text-sm font-semibold text-slate-900 dark:text-white"
                          numberOfLines={1}
                        >
                          {meal.name}
                        </Text>
                        <Text className="text-xs text-slate-500 dark:text-slate-400">
                          {meal.calories} cal · ${meal.estimated_cost.toFixed(2)} ·{' '}
                          {meal.cook_time_min}m
                        </Text>
                      </View>
                    </View>
                  </AnimatedCard>
                );
              })}
            </View>
          ));
      })()}

      <View className="gap-3 mb-8">
        <Button
          title="Save to Calendar"
          onPress={onSave}
          loading={saving}
          size="lg"
          icon={<Ionicons name="checkmark" size={20} color="white" />}
        />
        <Button
          title="Try Again"
          onPress={onTryAgain}
          variant="outline"
          size="md"
          icon={<Ionicons name="refresh" size={18} color="#10B981" />}
        />
        <Button
          title="Discard"
          onPress={onDiscard}
          variant="danger"
          size="md"
        />
      </View>
    </ScrollView>
  );
}
