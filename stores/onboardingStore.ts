import { create } from 'zustand';
import { DietaryRestriction } from '../lib/types';

interface OnboardingState {
  goal: string;
  weekly_budget: number;
  skill_level: string;
  dietary_restrictions: DietaryRestriction[];
  setGoal: (goal: string) => void;
  setBudget: (budget: number) => void;
  setSkillLevel: (level: string) => void;
  toggleDietaryRestriction: (restriction: DietaryRestriction) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  goal: '',
  weekly_budget: 50,
  skill_level: '',
  dietary_restrictions: [],
  setGoal: (goal) => set({ goal }),
  setBudget: (weekly_budget) => set({ weekly_budget }),
  setSkillLevel: (skill_level) => set({ skill_level }),
  toggleDietaryRestriction: (restriction) =>
    set((state) => ({
      dietary_restrictions: state.dietary_restrictions.includes(restriction)
        ? state.dietary_restrictions.filter((r) => r !== restriction)
        : [...state.dietary_restrictions, restriction],
    })),
  reset: () =>
    set({
      goal: '',
      weekly_budget: 50,
      skill_level: '',
      dietary_restrictions: [],
    }),
}));
