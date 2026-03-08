/**
 * @file stores/onboardingStore.ts
 * Zustand store for onboarding state — the user's meal preferences collected
 * during the 6-step onboarding flow and reused throughout the app.
 *
 * Data flow:
 *   1. The user sets preferences during onboarding (goal, budget, skill, diet).
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

  setGoal: (goal) => set({ goal }),
  setBudget: (weekly_budget) => set({ weekly_budget }),
  setSkillLevel: (skill_level) => set({ skill_level }),

  toggleDietaryRestriction: (restriction) =>
    set((state) => ({
      dietary_restrictions: state.dietary_restrictions.includes(restriction)
        ? state.dietary_restrictions.filter((r) => r !== restriction)
        : [...state.dietary_restrictions, restriction],
    })),

  setDietaryRestrictions: (dietary_restrictions) => set({ dietary_restrictions }),

  markComplete: async () => {
    const { goal, weekly_budget, skill_level, dietary_restrictions } = get();
    const data = JSON.stringify({
      goal,
      weekly_budget,
      skill_level,
      dietary_restrictions,
      onboardingComplete: true,
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
    });
  },
}));
