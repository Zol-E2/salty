/**
 * @file lib/constants.ts
 * Application-wide constants for meal slots, dietary options, goals, skill levels,
 * slot colours, and Supabase connection details.
 *
 * Centralising these prevents drift between screens that render the same options
 * (e.g. the same dietary restriction list must appear in onboarding, settings,
 * and the generate form).
 */

import { DietaryRestriction, MealSlotType } from './types';

/**
 * The four meal slots available on each calendar day, in display order.
 * Used by the calendar day view, the meal-plan hooks, and `SLOT_ORDER` on
 * the calendar screen.
 */
export const MEAL_SLOTS: { key: MealSlotType; label: string; emoji: string }[] = [
  { key: 'breakfast', label: 'Breakfast', emoji: '🌅' },
  { key: 'lunch', label: 'Lunch', emoji: '☀️' },
  { key: 'dinner', label: 'Dinner', emoji: '🌙' },
  { key: 'snack', label: 'Snack', emoji: '🍎' },
];

/**
 * All supported dietary restrictions with their display labels.
 * Rendered as chip rows in `PreferencesForm` and the generate form.
 */
export const DIETARY_OPTIONS: { key: DietaryRestriction; label: string }[] = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'gluten_free', label: 'Gluten-Free' },
  { key: 'dairy_free', label: 'Dairy-Free' },
  { key: 'nut_free', label: 'Nut-Free' },
  { key: 'halal', label: 'Halal' },
  { key: 'kosher', label: 'Kosher' },
];

/**
 * User goal options displayed during onboarding and on the profile / settings screens.
 * The `icon` field references MaterialCommunityIcons glyphs used by `GoalOption`.
 */
export const GOALS = [
  { key: 'save_money' as const, label: 'Save Money', icon: 'piggy-bank' as const, description: 'Eat well on a tight budget' },
  { key: 'eat_healthy' as const, label: 'Eat Healthy', icon: 'heart-pulse' as const, description: 'Balanced nutrition & macros' },
  { key: 'learn_to_cook' as const, label: 'Learn to Cook', icon: 'chef-hat' as const, description: 'Build kitchen confidence' },
  { key: 'save_time' as const, label: 'Save Time', icon: 'clock' as const, description: 'Quick & easy meals' },
];

/**
 * Cooking skill level options used in `PreferencesForm` and passed to the AI
 * to influence the complexity of generated recipes.
 */
export const SKILL_LEVELS = [
  { key: 'beginner' as const, label: 'Beginner', description: 'Can boil water & use a microwave' },
  { key: 'intermediate' as const, label: 'Intermediate', description: 'Comfortable with basic recipes' },
  { key: 'advanced' as const, label: 'Advanced', description: 'Love experimenting in the kitchen' },
];

/**
 * Brand colours for each meal slot, used for dot indicators on the calendar,
 * slot header text, and slot icon backgrounds.
 * Values are opaque hex strings; use `color + '20'` for a 12% opacity tint.
 */
export const SLOT_COLORS: Record<MealSlotType, string> = {
  breakfast: '#FBBF24', // amber
  lunch: '#349ED3',     // sky blue
  dinner: '#FB7185',    // rose
  snack: '#A78BFA',     // violet
};

/**
 * Supported UI languages. `key` maps to an i18next locale code and to the
 * value stored in `profiles.language` and `onboardingStore.language`.
 * `flag` is a flag emoji for display only — not used in logic.
 */
export const LANGUAGES = [
  { key: 'en', label: 'English', flag: '🇬🇧' },
  { key: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { key: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { key: 'fr', label: 'Français', flag: '🇫🇷' },
  { key: 'es', label: 'Español', flag: '🇪🇸' },
  { key: 'it', label: 'Italiano', flag: '🇮🇹' },
  { key: 'pt', label: 'Português', flag: '🇵🇹' },
  { key: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { key: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { key: 'fi', label: 'Suomi', flag: '🇫🇮' },
] as const;

/**
 * Supported display currencies. `weekly_budget` is always stored as USD;
 * `symbol` and `key` are used to format amounts via `lib/currency.ts`.
 */
export const CURRENCIES = [
  { key: 'USD', label: 'US Dollar', symbol: '$' },
  { key: 'EUR', label: 'Euro', symbol: '€' },
  { key: 'GBP', label: 'British Pound', symbol: '£' },
  { key: 'HUF', label: 'Hungarian Forint', symbol: 'Ft' },
] as const;

/**
 * Supabase project URL — read from the `EXPO_PUBLIC_SUPABASE_URL` env var.
 * Falls back to an empty string to prevent crashes at import time; the
 * Supabase client will surface an actionable error when a request is made.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';

/**
 * Supabase anonymous (public) API key — read from `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
 * Safe to expose in client bundles; Row Level Security enforces data isolation.
 */
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
