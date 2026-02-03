import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { DietaryRestriction } from '../lib/types';

const ONBOARDING_KEY = 'salty_onboarding';

interface OnboardingState {
  goal: string;
  weekly_budget: number;
  skill_level: string;
  dietary_restrictions: DietaryRestriction[];
  onboardingComplete: boolean;
  isLoaded: boolean;
  setGoal: (goal: string) => void;
  setBudget: (budget: number) => void;
  setSkillLevel: (level: string) => void;
  toggleDietaryRestriction: (restriction: DietaryRestriction) => void;
  setDietaryRestrictions: (restrictions: DietaryRestriction[]) => void;
  markComplete: () => Promise<void>;
  loadOnboardingState: () => Promise<void>;
  reset: () => Promise<void>;
}

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
        const data = JSON.parse(raw);
        set({
          goal: data.goal ?? '',
          weekly_budget: data.weekly_budget ?? 50,
          skill_level: data.skill_level ?? '',
          dietary_restrictions: data.dietary_restrictions ?? [],
          onboardingComplete: data.onboardingComplete ?? false,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },
  reset: async () => {
    await SecureStore.deleteItemAsync(ONBOARDING_KEY);
    set({
      goal: '',
      weekly_budget: 0,
      skill_level: '',
      dietary_restrictions: [],
      onboardingComplete: false,
    });
  },
}));
