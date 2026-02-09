// Server-side validation schemas and prompt injection protection
// Uses Zod via Deno import for schema-based validation

import { z } from 'npm:zod@3.22.4';

// ---------------------------------------------------------------------------
// Prompt injection protection
// ---------------------------------------------------------------------------

// Known prompt injection patterns (case-insensitive matching)
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

// Characters that shouldn't appear in food-related input
const SUSPICIOUS_PATTERNS = [
  /```/,          // Code fence injection
  /###\s/,        // Markdown heading injection
  /\{[^}]{20,}/,  // Large JSON-like structures in string fields
];

/**
 * Sanitize a user-provided string before embedding in an AI prompt.
 * Strips control characters, collapses whitespace, and rejects prompt injection attempts.
 * Returns the sanitized string or throws a validation error.
 */
export function sanitizeForPrompt(input: string): string {
  // Strip control characters (except newline/tab) and zero-width characters
  let sanitized = input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200F\u2028-\u202F\uFEFF]/g, '');

  // Collapse excessive whitespace
  sanitized = sanitized.replace(/\s{3,}/g, '  ').trim();

  // Check for prompt injection patterns
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      throw new Error(
        'Input contains disallowed content. Please use only food-related terms.'
      );
    }
  }

  // Check for suspicious formatting patterns
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
// Zod schemas for edge function inputs
// ---------------------------------------------------------------------------

const VALID_TIMEFRAMES = ['day', 'week', 'month'] as const;
const VALID_SKILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const VALID_DIETARY_RESTRICTIONS = [
  'vegan',
  'vegetarian',
  'gluten_free',
  'dairy_free',
  'nut_free',
  'halal',
  'kosher',
] as const;

// Ingredient string: sanitized for prompt injection
const safeIngredientString = z
  .string()
  .max(100, 'Each ingredient must be 100 characters or less')
  .transform((val) => sanitizeForPrompt(val.trim()))
  .pipe(z.string().min(1, 'Ingredient cannot be empty'));

export const GenerateMealPlanSchema = z
  .object({
    timeframe: z.enum(VALID_TIMEFRAMES),
    budget: z.number().min(1, 'Budget must be at least $1').max(10000),
    max_cook_time: z.number().int().min(1).max(480, 'Max 8 hours'),
    servings: z.number().int().min(1).max(50),
    daily_calories: z.number().int().min(500).max(10000).optional(),
    dietary_restrictions: z.array(z.enum(VALID_DIETARY_RESTRICTIONS)).max(7),
    available_ingredients: z.array(safeIngredientString).max(50),
    skill_level: z.enum(VALID_SKILL_LEVELS),
  })
  .strict(); // Reject unexpected fields

export type ValidatedGenerateRequest = z.infer<typeof GenerateMealPlanSchema>;
