import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { GenerateMealPlanRequest, DietaryRestriction } from '../../lib/types';
import { DIETARY_OPTIONS } from '../../lib/constants';
import { useProfile } from '../../hooks/useProfile';

interface GenerateFormProps {
  onSubmit: (request: GenerateMealPlanRequest) => void;
  loading: boolean;
}

export function GenerateForm({ onSubmit, loading }: GenerateFormProps) {
  const { data: profile } = useProfile();

  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [budget, setBudget] = useState(profile?.weekly_budget?.toString() ?? '50');
  const [maxCookTime, setMaxCookTime] = useState('30');
  const [servings, setServings] = useState('1');
  const [ingredients, setIngredients] = useState('');
  const [dietary, setDietary] = useState<DietaryRestriction[]>(
    profile?.dietary_restrictions ?? []
  );

  const handleSubmit = () => {
    onSubmit({
      timeframe,
      budget: parseFloat(budget) || 50,
      max_cook_time: parseInt(maxCookTime) || 30,
      servings: parseInt(servings) || 1,
      dietary_restrictions: dietary,
      available_ingredients: ingredients
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      skill_level: profile?.skill_level ?? 'beginner',
    });
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Timeframe */}
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Plan duration
      </Text>
      <View className="flex-row gap-2 mb-6">
        {(['day', 'week', 'month'] as const).map((tf) => (
          <TouchableOpacity
            key={tf}
            onPress={() => setTimeframe(tf)}
            className={`flex-1 py-3 rounded-xl border-2 items-center ${
              timeframe === tf
                ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${
                timeframe === tf
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {tf.charAt(0).toUpperCase() + tf.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Budget */}
      <Input
        label={`Budget ($${timeframe === 'day' ? '/day' : timeframe === 'week' ? '/week' : '/month'})`}
        placeholder="50"
        value={budget}
        onChangeText={setBudget}
        keyboardType="numeric"
        className="mb-6"
      />

      {/* Cook time */}
      <Input
        label="Max cook time per meal (minutes)"
        placeholder="30"
        value={maxCookTime}
        onChangeText={setMaxCookTime}
        keyboardType="numeric"
        className="mb-6"
      />

      {/* Servings */}
      <Input
        label="Servings per meal"
        placeholder="1"
        value={servings}
        onChangeText={setServings}
        keyboardType="numeric"
        className="mb-6"
      />

      {/* Ingredients */}
      <Input
        label="Available ingredients (optional, comma-separated)"
        placeholder="rice, chicken, broccoli, eggs..."
        value={ingredients}
        onChangeText={setIngredients}
        multiline
        className="mb-6"
      />

      {/* Dietary */}
      <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
        Dietary restrictions
      </Text>
      <View className="flex-row flex-wrap gap-2 mb-8">
        {DIETARY_OPTIONS.map((option) => {
          const selected = dietary.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              onPress={() =>
                setDietary((prev) =>
                  selected
                    ? prev.filter((r) => r !== option.key)
                    : [...prev, option.key]
                )
              }
              className={`px-4 py-2 rounded-full border-2 ${
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

      <Button
        title="Generate Meal Plan"
        onPress={handleSubmit}
        loading={loading}
        size="lg"
        icon={<Ionicons name="sparkles" size={20} color="white" />}
      />

      <View className="h-8" />
    </ScrollView>
  );
}
