import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Ingredient } from '../../lib/types';

interface IngredientListProps {
  ingredients: Ingredient[];
}

export function IngredientList({ ingredients }: IngredientListProps) {
  return (
    <View>
      {ingredients.map((ingredient, index) => (
        <View
          key={index}
          className={`flex-row items-center py-3 ${
            index < ingredients.length - 1
              ? 'border-b border-slate-100 dark:border-slate-800'
              : ''
          }`}
        >
          <View className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/30 items-center justify-center mr-3">
            <Ionicons name="leaf-outline" size={14} color="#10B981" />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium text-slate-900 dark:text-white">
              {ingredient.name}
            </Text>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              {ingredient.quantity} {ingredient.unit}
            </Text>
          </View>
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">
            ${ingredient.estimated_cost.toFixed(2)}
          </Text>
        </View>
      ))}
    </View>
  );
}
