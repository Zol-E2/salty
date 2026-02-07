import { DietaryRestriction, MealSlotType } from './types';

export const MEAL_SLOTS: { key: MealSlotType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
];

export const DIETARY_OPTIONS: { key: DietaryRestriction; label: string }[] = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'nut_free', label: 'Nut-Free' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
];

export const GOALS = [
  { key: 'save_money' as const, label: 'Save Money', icon: 'piggy-bank' as const, description: 'Eat well on a tight budget' },
  { key: 'eat_healthy' as const, label: 'Eat Healthy', icon: 'heart-pulse' as const, description: 'Balanced nutrition & macros' },
  { key: 'learn_to_cook' as const, label: 'Learn to Cook', icon: 'chef-hat' as const, description: 'Build kitchen confidence' },
  { key: 'save_time' as const, label: 'Save Time', icon: 'clock' as const, description: 'Quick & easy meals' },
];

export const SKILL_LEVELS = [
  { key: 'beginner' as const, label: 'Beginner', description: 'Can boil water & use a microwave' },
  { key: 'intermediate' as const, label: 'Intermediate', description: 'Comfortable with basic recipes' },
  { key: 'advanced' as const, label: 'Advanced', description: 'Love experimenting in the kitchen' },
];

export const SLOT_COLORS: Record<MealSlotType, string> = {
  breakfast: '#FBBF24',
  lunch: '#349ED3',
  dinner: '#FB7185',
  snack: '#A78BFA',
};

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
