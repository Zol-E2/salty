/**
 * @file stores/onboardingStore.ts
 * Zustand store for onboarding state — the user's meal preferences collected
 * during the 6-step onboarding flow and reused throughout the app.
 *
 * Data flow:
 *   1. The user sets preferences during onboarding (goal, budget, skill, diet,
 *      language, currency).
 *   2. `markComplete()` persists them to SecureStore and sets `onboardingComplete`.
 *   3. On app launch, `loadOnboardingState()` restores them from SecureStore.
 *   4. If the user is authenticated, `app/(auth)/verify.tsx` syncs this data to
 *      the Supabase `profiles` table.
 *   5. `app/settings.tsx` reads from both Supabase profile AND this store (profile
 *      takes priority when authenticated).
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';
import { DietaryRestriction } from '../lib/types';

/** SecureStore key where onboarding data is persisted. */
const ONBOARDING_KEY = 'salty_onboarding';

// ---------------------------------------------------------------------------
// Zod schema for stored data validation
// ---------------------------------------------------------------------------

/**
 * Validates the raw JSON object retrieved from SecureStore.
 * Uses `.optional()` with `.default()` to tolerate partially-written or
 * upgraded records without crashing. On schema failure we fall back to
 * defaults rather than surfacing a parse error to the user.
 */
const storedOnboardingSchema = z.object({
  goal: z.string().optional().default(''),
  weekly_budget: z.number().optional().default(50),
  skill_level: z.string().optional().default(''),
  dietary_restrictions: z.array(z.string()).optional().default([]),
  onboardingComplete: z.boolean().optional().default(false),
  // Language and currency added in v2 — defaults let old stored records upgrade seamlessly
  language: z.string().optional().default('en'),
  currency: z.string().optional().default('USD'),
  // Nutrition fields added in v3 — all optional so old stored records are not invalidated
  weight_kg: z.number().nullable().optional().default(null),
  nutrition_goal: z.enum(['lose', 'maintain', 'gain']).nullable().optional().default(null),
  daily_calories: z.number().nullable().optional().default(null),
  favorite_foods: z.array(z.string()).optional().default([]),
  foods_to_avoid: z.array(z.string()).optional().default([]),
  meals_per_day: z.number().optional().default(4),
});

// ---------------------------------------------------------------------------
// State interface
// ---------------------------------------------------------------------------

/** Shape of the onboarding Zustand store. */
interface OnboardingState {
  /** The user's primary goal key (e.g. `'save_money'`). Empty string if unset. */
  goal: string;
  /** Weekly grocery budget in USD. Defaults to 50. */
  weekly_budget: number;
  /** Cooking skill level key (e.g. `'beginner'`). Empty string if unset. */
  skill_level: string;
  /** Active dietary restriction keys. Empty array if none selected. */
  dietary_restrictions: DietaryRestriction[];
  /** True once the user has completed all onboarding steps. */
  onboardingComplete: boolean;
  /**
   * True once `loadOnboardingState` has finished (success or failure).
   * `FlowGuard` waits for this before routing, preventing a flash to onboarding.
   */
  isLoaded: boolean;
  /** BCP 47 language code chosen during onboarding (e.g. `'en'`, `'hu'`). */
  language: string;
  /** ISO 4217 currency code chosen during onboarding (e.g. `'USD'`, `'HUF'`). */
  currency: string;

  // --- Nutrition fields (from onboarding step 4) ---

  /** Body weight in kilograms, or null if not provided. */
  weight_kg: number | null;
  /** Body-composition goal, or null if not provided. */
  nutrition_goal: 'lose' | 'maintain' | 'gain' | null;
  /** Daily calorie target, or null if not provided. */
  daily_calories: number | null;
  /** Foods the user enjoys — AI incorporates them often. */
  favorite_foods: string[];
  /** Foods to exclude from all plans. */
  foods_to_avoid: string[];
  /** How many meals per day to generate (2–6). Defaults to 4. */
  meals_per_day: number;

  // --- Actions ---

  /** @param goal - New goal key to store. */
  setGoal: (goal: string) => void;
  /** @param budget - New weekly budget in USD. */
  setBudget: (budget: number) => void;
  /** @param level - New skill level key. */
  setSkillLevel: (level: string) => void;
  /**
   * Toggles a single dietary restriction on or off.
   * @param restriction - The restriction key to toggle.
   */
  toggleDietaryRestriction: (restriction: DietaryRestriction) => void;
  /**
   * Replaces the entire dietary restrictions array.
   * Used by settings screen when syncing from Supabase profile.
   * @param restrictions - The full replacement array.
   */
  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  /**
   * Sets the UI display language.
   * @param lang - BCP 47 language code (e.g. `'en'`, `'de'`).
   */
  setLanguage: (lang: string) => void;
  /**
   * Sets the display currency.
   * @param currency - ISO 4217 currency code (e.g. `'USD'`, `'HUF'`).
   */
  setCurrency: (currency: string) => void;
  /**
   * Sets the user's body weight in kg (null to clear).
   * @param kg - Weight in kilograms, or null.
   */
  setWeightKg: (kg: number | null) => void;
  /**
   * Sets the body-composition goal (null to clear).
   * @param goal - `'lose'`, `'maintain'`, `'gain'`, or `null`.
   */
  setNutritionGoal: (goal: 'lose' | 'maintain' | 'gain' | null) => void;
  /**
   * Sets the daily calorie target (null to clear).
   * @param cal - Calories per day, or null.
   */
  setDailyCalories: (cal: number | null) => void;
  /**
   * Replaces the favourite foods list.
   * @param foods - Array of food name strings.
   */
  setFavoriteFoods: (foods: string[]) => void;
  /**
   * Replaces the foods-to-avoid list.
   * @param foods - Array of food name strings.
   */
  setFoodsToAvoid: (foods: string[]) => void;
  /**
   * Sets the number of meals per day to generate.
   * @param count - Integer 2–6.
   */
  setMealsPerDay: (count: number) => void;
  /**
   * Persists current preferences to SecureStore and sets `onboardingComplete`.
   * Called when the user reaches the final onboarding step.
   */
  markComplete: () => Promise<void>;
  /**
   * Reads persisted onboarding data from SecureStore and hydrates the store.
   * Validates with `storedOnboardingSchema` via `safeParse` — if validation
   * fails (e.g. corrupt data), logs a warning and sets defaults.
   * Always sets `isLoaded: true` on completion regardless of success/failure.
   */
  loadOnboardingState: () => Promise<void>;
  /**
   * Clears SecureStore and resets all preferences to their initial defaults.
   * Called during account deletion (`app/settings.tsx`).
   */
  reset: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store implementation
// ---------------------------------------------------------------------------

export const useOnboardingStore = create<OnboardingState>((set, get) => ({
  goal: '',
  weekly_budget: 50,
  skill_level: '',
  dietary_restrictions: [],
  onboardingComplete: false,
  isLoaded: false,
  language: 'en',
  currency: 'USD',
  // Nutrition defaults: all optional — null/empty until the user fills the step
  weight_kg: null,
  nutrition_goal: null,
  daily_calories: null,
  favorite_foods: [],
  foods_to_avoid: [],
  meals_per_day: 4,

  setGoal: (goal) => set({ goal }),
  setBudget: (weekly_budget) => set({ weekly_budget }),
  setSkillLevel: (skill_level) => set({ skill_level }),
  setLanguage: (language) => set({ language }),
  setCurrency: (currency) => set({ currency }),
  setWeightKg: (weight_kg) => set({ weight_kg }),
  setNutritionGoal: (nutrition_goal) => set({ nutrition_goal }),
  setDailyCalories: (daily_calories) => set({ daily_calories }),
  setFavoriteFoods: (favorite_foods) => set({ favorite_foods }),
  setFoodsToAvoid: (foods_to_avoid) => set({ foods_to_avoid }),
  setMealsPerDay: (meals_per_day) => set({ meals_per_day }),

  toggleDietaryRestriction: (restriction) =>
    set((state) => ({
      dietary_restrictions: state.dietary_restrictions.includes(restriction)
        ? state.dietary_restrictions.filter((r) => r !== restriction)
        : [...state.dietary_restrictions, restriction],
    })),

  setDietaryRestrictions: (dietary_restrictions) => set({ dietary_restrictions }),

  markComplete: async () => {
    const {
      goal, weekly_budget, skill_level, dietary_restrictions, language, currency,
      weight_kg, nutrition_goal, daily_calories, favorite_foods, foods_to_avoid, meals_per_day,
    } = get();
    const data = JSON.stringify({
      goal,
      weekly_budget,
      skill_level,
      dietary_restrictions,
      onboardingComplete: true,
      language,
      currency,
      weight_kg,
      nutrition_goal,
      daily_calories,
      favorite_foods,
      foods_to_avoid,
      meals_per_day,
    });
    await SecureStore.setItemAsync(ONBOARDING_KEY, data);
    set({ onboardingComplete: true });
  },

  loadOnboardingState: async () => {
    try {
      const raw = await SecureStore.getItemAsync(ONBOARDING_KEY);
      if (raw) {
        // Use safeParse so malformed or outdated stored data never crashes the app.
        // On failure we log a warning and let the user restart onboarding from defaults.
        const result = storedOnboardingSchema.safeParse(JSON.parse(raw));
        if (!result.success) {
          console.warn(
            '[onboardingStore] Stored data failed validation, resetting to defaults:',
            result.error.issues
          );
          set({ isLoaded: true });
          return;
        }
        const data = result.data;
        set({
          goal: data.goal,
          weekly_budget: data.weekly_budget,
          skill_level: data.skill_level,
          // Cast is safe: validated values come from the same DietaryRestriction union
          dietary_restrictions: data.dietary_restrictions as DietaryRestriction[],
          onboardingComplete: data.onboardingComplete,
          language: data.language,
          currency: data.currency,
          weight_kg: data.weight_kg ?? null,
          nutrition_goal: data.nutrition_goal ?? null,
          daily_calories: data.daily_calories ?? null,
          favorite_foods: data.favorite_foods ?? [],
          foods_to_avoid: data.foods_to_avoid ?? [],
          meals_per_day: data.meals_per_day ?? 4,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch (error) {
      console.error('[onboardingStore] Failed to load onboarding state:', error);
      set({ isLoaded: true });
    }
  },

  reset: async () => {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    set({
      goal: '',
      // Reset to 50, matching the initial default — not 0, which has no
      // corresponding budget chip in PreferencesForm and would show as unselected.
      weekly_budget: 50,
      skill_level: '',
      dietary_restrictions: [],
      onboardingComplete: false,
      language: 'en',
      currency: 'USD',
      weight_kg: null,
      nutrition_goal: null,
      daily_calories: null,
      favorite_foods: [],
      foods_to_avoid: [],
      meals_per_day: 4,
    });
  },
}));
