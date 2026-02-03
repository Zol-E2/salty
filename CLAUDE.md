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
- `GEMINI_API_KEY` - Set in Supabase Edge Function environment (not in .env.local)

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
- Edge Function `generate-meal-plan` calls Gemini 2.0 Flash to generate structured meal data (JSON mode, temperature 0.7)

### Key Libraries
- **NativeWind v4** for Tailwind CSS styling (configured in `metro.config.js`, `babel.config.js`, `tailwind.config.js`)
- **react-native-calendars** for the calendar widget
- **expo-secure-store** for persisting auth tokens and user preferences
- **react-native-reanimated** for animations

### AI Meal Generation Flow
1. User fills `GenerateForm` with budget, cook time, servings, dietary restrictions, available ingredients
2. Supabase Edge Function receives request, calls Gemini API with engineered prompt
3. Returns array of `GeneratedMeal` objects with nutrition, cost, ingredients, and instructions
4. Unsplash images fetched asynchronously for each meal
5. User previews and saves meals to their plan

### Domain Types
Core types are defined in `lib/types.ts`: `Profile`, `Meal`, `MealPlanItem`, `GeneratedMeal`, `Ingredient`, `InstructionStep`. Meals have nutritional macros (calories, protein, carbs, fat), estimated cost, difficulty level, and meal type slots (breakfast/lunch/dinner/snack).

## Styling Conventions

- All styling uses NativeWind Tailwind classes (not StyleSheet)
- Primary color: emerald `#10B981`
- Dark mode via `dark:` Tailwind prefix, controlled by theme store
- UI components in `components/ui/` use variant props (e.g., Button has primary/secondary/outline/ghost variants)
