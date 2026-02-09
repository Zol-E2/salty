// Centralized validation schemas using Zod
// These mirror the database CHECK constraints from 002_security_hardening.sql
// and include prompt injection protection for AI-bound inputs

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Prompt injection protection
// ---------------------------------------------------------------------------

// Known prompt injection patterns (case-insensitive)
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

const SUSPICIOUS_PATTERNS = [
  /```/,          // Code fence injection
  /###\s/,        // Markdown heading injection
  /\{[^}]{20,}/,  // Large JSON-like structures in string fields
];

/**
 * Sanitize a user-provided string before it's sent to the AI prompt.
 * Strips control characters, collapses whitespace, rejects prompt injection.
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

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(320, 'Email is too long')
  .email('Please enter a valid email address');

// ---------------------------------------------------------------------------
// Meal generation request (with prompt injection checks on string fields)
// ---------------------------------------------------------------------------

const safeIngredientString = z
  .string()
  .max(100, 'Each ingredient must be 100 characters or less')
  .transform((val) => sanitizeForPrompt(val.trim()))
  .pipe(z.string().min(1, 'Ingredient cannot be empty'));

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
});

// ---------------------------------------------------------------------------
// Profile update (strict - rejects unexpected fields like id, email, created_at)
// ---------------------------------------------------------------------------

export const profileUpdateSchema = z
  .object({
    display_name: z.string().max(100).trim().optional().nullable(),
    goal: z.enum(VALID_GOALS).optional(),
    weekly_budget: z.number().min(0).max(10000).optional(),
    skill_level: z.enum(VALID_SKILL_LEVELS).optional(),
    dietary_restrictions: z.array(z.enum(VALID_DIETARY)).max(7).optional(),
    onboarding_complete: z.boolean().optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Meal creation
// ---------------------------------------------------------------------------

const ingredientSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.string().max(50),
  unit: z.string().max(50),
  estimated_cost: z.number().min(0).max(10000),
});

const instructionStepSchema = z.object({
  step: z.number().int().min(1),
  text: z.string().min(1).max(2000),
});

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
});

// ---------------------------------------------------------------------------
// Meal plan item
// ---------------------------------------------------------------------------

export const mealPlanItemSchema = z.object({
  meal_id: z.string().uuid('Invalid meal ID'),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD format'),
  slot: z.enum(VALID_MEAL_TYPES),
});

// ---------------------------------------------------------------------------
// Search query
// ---------------------------------------------------------------------------

export const searchQuerySchema = z.string().max(200).trim();

// ---------------------------------------------------------------------------
// Helper: validate and return typed result or throw user-friendly error
// ---------------------------------------------------------------------------

export function validate<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const firstError = result.error.issues[0];
    throw new Error(firstError.message);
  }
  return result.data;
}
