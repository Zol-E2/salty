/**
 * @file lib/validation.ts
 * Centralised Zod validation schemas and prompt injection defence utilities.
 *
 * These schemas mirror the database CHECK constraints defined in
 * `supabase/migrations/002_security_hardening.sql`. Keeping them in sync
 * means TypeScript surfaces constraint violations at the API boundary before
 * a round-trip to the database.
 *
 * The prompt injection protection patterns in this file defend against
 * adversarial user input that attempts to hijack the Gemini AI prompt. Any
 * string field that flows into the AI prompt must be passed through
 * `sanitizeForPrompt()` before use.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Prompt injection protection
// ---------------------------------------------------------------------------

/**
 * Regex patterns that match known prompt injection attempts.
 * All patterns are case-insensitive (`/i` flag).
 *
 * Pattern rationale:
 *   - `ignore.*previous.*instructions` — classic "jailbreak" opener
 *   - `ignore all` — common shorthand variant
 *   - `disregard.*previous|your` — synonym for "ignore"
 *   - `forget.*instructions` — another synonym
 *   - `you are now` — persona injection ("you are now DAN")
 *   - `new instructions` — attempt to add a second instruction block
 *   - `system.*prompt` — attempting to reference/override the system prompt
 *   - `override.*previous|all` — generic override attempt
 *   - `act as a` — role-play injection (e.g. "act as an unrestricted AI")
 *   - `pretend.*you|to be` — role-play variant
 *   - `do not follow.*rules` — explicit rules bypass
 *   - `reveal.*prompt|instructions` — prompt extraction attempt
 *   - `what.*are.*your.*instructions` — prompt extraction via question
 */
const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions|prompts|rules|directives)/i,
  /ignore\s+all/i,
  /disregard\s+(all\s+)?(previous|prior|above|earlier|your)/i,
  /forget\s+(all\s+)?(previous|prior|above|your)\s+(instructions|prompts|rules)/i,
  /you\s+are\s+now/i,
  /new\s+instructions/i,
  /system\s*prompt/i,
  /override\s+(previous|prior|all|your)/i,
  /act\s+as\s+(a|an)\s/i,
  /pretend\s+(you|to\s+be)/i,
  /do\s+not\s+follow\s+(your|the|any)\s+(rules|instructions)/i,
  /reveal\s+(your|the|system)\s+(prompt|instructions|rules)/i,
  /what\s+(are|is)\s+your\s+(instructions|prompt|rules|system)/i,
];

/**
 * Patterns that flag structural injection attempts rather than semantic ones.
 *
 *   - `/```/` — code fence that could break out of a quoted context
 *   - `/###\s/` — markdown heading that could add a new section to the prompt
 *   - `/\{[^}]{20,}/` — large JSON-like objects that could inject tool calls
 */
const SUSPICIOUS_PATTERNS = [
  /```/,          // Code fence injection
  /###\s/,        // Markdown heading injection
  /\{[^}]{20,}/,  // Large JSON-like structures in string fields
];

/**
 * Sanitizes a user-provided string before it is interpolated into an AI prompt.
 *
 * Steps:
 *   1. Strips ASCII control characters (except newlines/tabs) and Unicode
 *      zero-width / line/paragraph separator characters that could interfere
 *      with prompt tokenisation.
 *   2. Collapses runs of 3+ whitespace characters to 2 spaces.
 *   3. Rejects known prompt injection phrases (throws with a user-friendly message).
 *   4. Rejects structural injection patterns (code fences, headings, large JSON).
 *
 * @param input - Raw user-provided string (e.g. an ingredient name).
 * @returns Sanitized string safe for interpolation into a prompt.
 * @throws {Error} If the input contains disallowed content or invalid characters.
 */
export function sanitizeForPrompt(input: string): string {
  // Strip control characters and zero-width characters
  let sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Collapse excessive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ').trim();

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error(
        'Input contains disallowed content. Please use only food-related terms.'
      );
    }
  }

  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error(
        'Input contains invalid characters. Please use only plain text.'
      );
    }
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

const VALID_TIMEFRAMES = ['day', 'week', 'month'] as const;
const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const VALID_DIETARY = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'halal',
  'kosher',
] as const;
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const VALID_GOALS = [
  'save_money',
  'eat_healthy',
  'learn_to_cook',
  'save_time',
] as const;

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

/** Schema for the login email field — trims whitespace and validates RFC format. */
export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(320, 'Email is too long')
  .email('Please enter a valid email address');

// ---------------------------------------------------------------------------
// Meal generation request (with prompt injection checks on string fields)
// ---------------------------------------------------------------------------

/**
 * Per-ingredient string schema: trims, sanitizes for prompt injection,
 * and enforces a 100-character limit. The `.pipe()` re-validates after
 * transformation to catch cases where sanitization produces an empty string.
 */
const safeIngredientString = z
  .string()
  .max(100, 'Each ingredient must be 100 characters or less')
  .transform((val) => sanitizeForPrompt(val.trim()))
  .pipe(z.string().min(1, 'Ingredient cannot be empty'));

// Valid language and currency codes — must stay in sync with LANGUAGES / CURRENCIES in lib/constants.ts
const VALID_LANGUAGES = ['en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi'] as const;
const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'HUF'] as const;

/**
 * Safe string schema for user-provided food names (favorites / avoid lists).
 * Same sanitization pipeline as ingredient strings but with a shorter label.
 */
const safeFoodString = z
  .string()
  .max(100, 'Each food must be 100 characters or less')
  .transform((val) => sanitizeForPrompt(val.trim()))
  .pipe(z.string().min(1, 'Food name cannot be empty'));

/** Validates the full meal generation request before sending to the edge function. */
export const generateMealPlanSchema = z.object({
  timeframe: z.enum(VALID_TIMEFRAMES),
  budget: z
    .number()
    .min(1, 'Budget must be at least $1')
    .max(10000, 'Budget cannot exceed $10,000'),
  max_cook_time: z
    .number()
    .int()
    .min(1, 'Cook time must be at least 1 minute')
    .max(480, 'Cook time cannot exceed 8 hours'),
  servings: z.number().int().min(1, 'At least 1 serving').max(50, 'Max 50 servings'),
  daily_calories: z.number().int().min(500).max(10000).optional(),
  dietary_restrictions: z.array(z.enum(VALID_DIETARY)).max(7),
  available_ingredients: z.array(safeIngredientString).max(50),
  skill_level: z.enum(VALID_SKILL_LEVELS),
  // Optional — defaults handled server-side for backward compatibility
  language: z.enum(VALID_LANGUAGES).optional(),
  currency: z.enum(VALID_CURRENCIES).optional(),
  // --- Nutrition onboarding fields (optional — not all users complete this step) ---
  // weight_kg range matches the DB CHECK constraint (30–300 kg).
  weight_kg: z.number().min(30, 'Weight must be at least 30 kg').max(300, 'Weight cannot exceed 300 kg').nullable().optional(),
  nutrition_goal: z.enum(['lose', 'maintain', 'gain']).nullable().optional(),
  // favorite_foods / foods_to_avoid: max 30 items each, each item sanitized
  favorite_foods: z.array(safeFoodString).max(30).optional(),
  foods_to_avoid: z.array(safeFoodString).max(30).optional(),
  // meals_per_day matches the DB CHECK constraint (2–6).
  meals_per_day: z.number().int().min(2, 'At least 2 meals per day').max(6, 'At most 6 meals per day').nullable().optional(),
});

// ---------------------------------------------------------------------------
// Profile update (strict — rejects unexpected fields)
// ---------------------------------------------------------------------------

/**
 * Validates profile update payloads.
 * `.strict()` rejects any key not listed here (e.g. `id`, `email`,
 * `created_at`) preventing accidental or malicious field injection.
 */
export const profileUpdateSchema = z
  .object({
    display_name: z.string().max(100).trim().optional().nullable(),
    goal: z.enum(VALID_GOALS).optional(),
    weekly_budget: z.number().min(0).max(10000).optional(),
    skill_level: z.enum(VALID_SKILL_LEVELS).optional(),
    dietary_restrictions: z.array(z.enum(VALID_DIETARY)).max(7).optional(),
    onboarding_complete: z.boolean().optional(),
    language: z.enum(VALID_LANGUAGES).optional(),
    currency: z.enum(VALID_CURRENCIES).optional(),
    // --- Nutrition fields (from migration 004) ---
    weight_kg: z.number().min(30).max(300).nullable().optional(),
    nutrition_goal: z.enum(['lose', 'maintain', 'gain']).nullable().optional(),
    // daily_calories: 800–10000 matches the DB CHECK constraint.
    daily_calories: z.number().int().min(800).max(10000).nullable().optional(),
    favorite_foods: z.array(z.string().max(100)).max(30).optional(),
    foods_to_avoid: z.array(z.string().max(100)).max(30).optional(),
    meals_per_day: z.number().int().min(2).max(6).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Meal creation
// ---------------------------------------------------------------------------

/** Schema for a single ingredient object stored in `meals.ingredients`. */
const ingredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(50),
  unit: z.string().max(50),
  estimated_cost: z.number().min(0).max(10000),
});

/** Schema for a single instruction step stored in `meals.instructions`. */
const instructionStepSchema = z.object({
  step: z.number().int().min(1),
  text: z.string().min(1).max(2000),
});

/** Validates the full payload before inserting a new meal into Supabase. */
export const mealCreateSchema = z.object({
  name: z.string().min(1, 'Meal name is required').max(200),
  description: z.string().max(2000).optional().default(''),

  ingredients: z.array(ingredientSchema).max(50),
  instructions: z.array(instructionStepSchema).max(100),
  calories: z.number().int().min(0).max(50000),
  protein_g: z.number().min(0).max(5000),
  carbs_g: z.number().min(0).max(5000),
  fat_g: z.number().min(0).max(5000),
  estimated_cost: z.number().min(0).max(10000),
  prep_time_min: z.number().int().min(0).max(1440),
  cook_time_min: z.number().int().min(0).max(1440),
  difficulty: z.enum(VALID_DIFFICULTIES),
  meal_type: z.array(z.enum(VALID_MEAL_TYPES)).min(1).max(4),
  tags: z.array(z.string().max(50)).max(20).default([]),
  is_ai_generated: z.boolean().default(false),
  // Language of the generated text — must match DB CHECK constraint list.
  language: z.enum(VALID_LANGUAGES).default('en'),
  // Fallback flag — true for quick-alternative meals created by the AI prompt.
  is_fallback: z.boolean().default(false),
  // UUID of the associated fallback meal (primary meals only; null for fallbacks).
  fallback_meal_id: z.string().uuid().nullable().optional(),
});

// ---------------------------------------------------------------------------
// Meal plan item
// ---------------------------------------------------------------------------

/** Validates a meal plan item before upserting into `meal_plan_items`. */
export const mealPlanItemSchema = z.object({
  meal_id: z.string().uuid('Invalid meal ID'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  slot: z.enum(VALID_MEAL_TYPES),
  // slot_index allows multiple meals of the same type per day (e.g. 2 snacks).
  // Range 0–5 matches the DB CHECK constraint.
  slot_index: z.number().int().min(0).max(5).default(0),
});

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

/** Trims and enforces a length cap on search query strings before they hit Supabase. */
export const searchQuerySchema = z.string().max(200).trim();

// ---------------------------------------------------------------------------
// Helper: validate or throw
// ---------------------------------------------------------------------------

/**
 * Parses `data` against `schema` using `safeParse` and returns the typed result.
 * Throws a user-friendly `Error` with the first validation issue's message if
 * parsing fails. Prefer this over calling `.parse()` directly in hooks/screens
 * so error messages are consistent across the app.
 *
 * @param schema - Any Zod schema.
 * @param data - The value to validate.
 * @returns The parsed, typed value.
 * @throws {Error} With the first validation issue message if validation fails.
 */
export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(firstError.message);
  }
  return result.data;
}
