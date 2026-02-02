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
import { Ionicons } from '@expo/vector-icons';
import { useMeals } from '../../hooks/useMeals';
import { useAddMealToPlan } from '../../hooks/useMealPlan';
import { MealCard } from '../../components/meal/MealCard';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { MealSlotType } from '../../lib/types';

export default function AddMealScreen() {
  const { date, slot } = useLocalSearchParams<{
    date: string;
    slot: MealSlotType;
  }>();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const { data: meals, isLoading } = useMeals(search);
  const addMeal = useAddMealToPlan();

  const handleAddMeal = async (mealId: string) => {
    try {
      await addMeal.mutateAsync({ meal_id: mealId, date, slot });
      router.back();
    } catch {
      Alert.alert('Error', 'Failed to add meal to plan');
    }
  };

  const slotLabel = slot
    ? slot.charAt(0).toUpperCase() + slot.slice(1)
    : 'Meal';

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="px-5 pt-4 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#64748B" />
        </TouchableOpacity>
        <View>
          <Text className="text-xl font-bold text-slate-900 dark:text-white">
            Add {slotLabel}
          </Text>
          {date && (
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>
      </View>

      <View className="px-5 pt-3 pb-2">
        <Input
          placeholder="Search your meals..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <ScrollView
        className="flex-1 px-5 pt-2"
        showsVerticalScrollIndicator={false}
      >
        {isLoading ? (
          <LoadingSpinner />
        ) : meals && meals.length > 0 ? (
          <View className="gap-3 pb-6">
            {meals.map((meal) => (
              <TouchableOpacity
                key={meal.id}
                onPress={() => handleAddMeal(meal.id)}
                activeOpacity={0.7}
              >
                <MealCard meal={meal} onPress={() => handleAddMeal(meal.id)} compact />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center py-12">
            <Ionicons
              name="search-outline"
              size={40}
              color="#CBD5E1"
            />
            <Text className="text-base text-slate-400 dark:text-slate-500 mt-3 text-center">
              {search
                ? 'No meals found. Try a different search.'
                : 'No meals yet. Generate some with AI!'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(tabs)/generate')}
              className="mt-4 flex-row items-center"
            >
              <Ionicons name="sparkles" size={16} color="#10B981" />
              <Text className="text-sm font-semibold text-primary-500 dark:text-primary-400 ml-1">
                Generate meals with AI
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
