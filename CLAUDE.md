# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Salty is an AI-powered meal planning mobile app for budget-conscious university students. Built with React Native (Expo) and Supabase backend, it uses Google Gemini AI to generate personalized meal plans based on dietary preferences, budget, and cooking skill level.

## Development Commands

```bash
npm install              # Install dependencies
npm start                # Start Expo dev server (scan QR with Expo Go)
npm run android          # Run on Android emulator/device
npm run ios              # Run on iOS simulator/device
npm run web              # Run in web browser
```

No test runner or linter is currently configured.

## Environment Setup

Requires `.env.local` with:
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY` - Unsplash API key for food images
- `EXPO_PUBLIC_GEMINI_API_KEY` - Google Gemini API key for AI meal generation

## Architecture

### Routing (Expo Router - file-based)
- `app/(auth)/` - Login and email verification screens (magic link auth)
- `app/(onboarding)/` - 6-step onboarding flow (welcome → goals → preferences → paywall → complete)
- `app/(tabs)/` - Main app with bottom tabs: Calendar, Generate, Profile
- `app/day/[date].tsx` - Day detail view with meals
- `app/meal/[id].tsx` - Individual meal detail; `app/meal/add.tsx` - Add meal to plan
- Root `_layout.tsx` handles auth state detection and routes to the correct group via FlowGuard

### State Management
- **Zustand stores** (`stores/`): `authStore` (session), `onboardingStore` (user preferences, persisted to SecureStore), `themeStore` (light/dark/system, persisted to SecureStore)
- **TanStack React Query** (`hooks/`): Server state for meals, meal plans, and profiles with automatic cache invalidation after mutations

### Backend (Supabase)
- Auth: Passwordless magic link via `supabase.auth.signInWithOtp()`
- Database tables: `profiles`, `meals`, `meal_plan_items`

### Key Libraries
- **NativeWind v4** for Tailwind CSS styling (configured in `metro.config.js`, `babel.config.js`, `tailwind.config.js`)
- **react-native-calendars** for the calendar widget
- **expo-secure-store** for persisting auth tokens and user preferences
- **react-native-reanimated** for animations

### AI Meal Generation Flow
1. User fills `GenerateForm` with budget, cook time, servings, dietary restrictions, available ingredients
2. `lib/gemini.ts` constructs the prompt and calls the Gemini 2.0 Flash API directly via fetch (JSON mode, temperature 0.7)
3. Parses JSON response and returns array of `GeneratedMeal` objects with nutrition, cost, ingredients, and instructions
4. Unsplash images fetched asynchronously for each meal
5. User previews and saves meals to their plan

### Domain Types
Core types are defined in `lib/types.ts`: `Profile`, `Meal`, `MealPlanItem`, `GeneratedMeal`, `Ingredient`, `InstructionStep`. Meals have nutritional macros (calories, protein, carbs, fat), estimated cost, difficulty level, and meal type slots (breakfast/lunch/dinner/snack).

## Styling Conventions

- All styling uses NativeWind Tailwind classes (not StyleSheet)
- Primary color: emerald `#10B981`
- Dark mode via `dark:` Tailwind prefix, controlled by theme store
- UI components in `components/ui/` use variant props (e.g., Button has primary/secondary/outline/ghost variants)

## Coding Standards

These standards apply to all new and modified code in this project. They are non-negotiable.

### File-Level Header Comments
Every file must begin with a `/** ... */` JSDoc block describing what the file contains,
key usage notes, and any caveats specific to that file.

### JSDoc on All Exports
Every exported function, component, interface, type, and constant must have a JSDoc comment:
- `@param` — what each argument is for
- `@returns` — what is returned and under what conditions
- `@throws` — any errors the function can throw

### Inline Comments for Complex Logic
Non-obvious code must explain the **why**, not just the what. Required for:
- Date arithmetic and timezone handling
- Zod schema constraint decisions
- Animation configuration values
- Routing/navigation decisions (FlowGuard, etc.)
- Database query patterns (upsert vs insert, conflict keys)

### Section Comments
Group related code within a file using:
```
// --- Section Name ---
```

### Private Components
Helper components defined within a file (e.g. `SummaryItem`, `QuickStat`) need JSDoc
even though they are not exported.
