export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  goal: 'save_money' | 'eat_healthy' | 'learn_to_cook' | 'save_time';
  weekly_budget: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  dietary_restrictions: DietaryRestriction[];
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export type DietaryRestriction =
  | 'vegan'
  | 'vegetarian'
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'halal'
  | 'kosher';

export interface Ingredient {
  name: string;
  quantity: string;
  unit: string;
  estimated_cost: number;
}

export interface InstructionStep {
  step: number;
  text: string;
}

export interface Meal {
  id: string;
  user_id: string;
  name: string;
  description: string;

  ingredients: Ingredient[];
  instructions: InstructionStep[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_cost: number;
  prep_time_min: number;
  cook_time_min: number;
  difficulty: 'easy' | 'medium' | 'hard';
  meal_type: MealSlotType[];
  tags: string[];
  is_ai_generated: boolean;
  created_at: string;
}

export type MealSlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealPlanItem {
  id: string;
  user_id: string;
  meal_id: string;
  date: string;
  slot: MealSlotType;
  created_at: string;
  meal?: Meal;
}

export interface GenerateMealPlanRequest {
  timeframe: 'day' | 'week' | 'month';
  budget: number;
  max_cook_time: number;
  servings: number;
  daily_calories?: number;
  dietary_restrictions: DietaryRestriction[];
  available_ingredients: string[];
  skill_level: string;
}

export interface GeneratedMeal {
  name: string;
  description: string;
  meal_type: MealSlotType;
  day: number;
  ingredients: Ingredient[];
  instructions: InstructionStep[];
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  estimated_cost: number;
  prep_time_min: number;
  cook_time_min: number;
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
}
