/**
 * @file supabase/functions/translate-meal/index.ts
 * Edge function that translates a single meal's text fields into a target language.
 *
 * Input:  `{ meal_id: string, target_language: string }`
 * Output: `{ ok: true }` on success
 *
 * Flow:
 *   1. Authenticate the caller via JWT (shared `verifyUser` helper).
 *   2. Validate input (meal_id UUID, target_language enum).
 *   3. Fetch the original meal text from `meals` using the service role key
 *      (bypasses RLS so the function runs as the system, but we verify the
 *      meal belongs to the authenticated user before proceeding).
 *   4. Call Gemini 2.5 Flash with a translation prompt for the text fields.
 *   5. Upsert the result into `meal_translations(meal_id, language)`.
 *
 * Note: numeric/structural fields (calories, cost, macros, times) are
 * language-independent and are NOT included in the translation.
 */

import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3.22.4';
import { getCorsHeaders } from '../_shared/cors.ts';
import { verifyUser, AuthError } from '../_shared/auth.ts';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

const VALID_LANGUAGES = ['en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi'] as const;

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', hu: 'Hungarian', de: 'German', fr: 'French', es: 'Spanish',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', el: 'Greek', fi: 'Finnish',
};

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

/** Validates the translation request body. */
const TranslateMealSchema = z.object({
  meal_id: z.string().uuid('meal_id must be a valid UUID'),
  target_language: z.enum(VALID_LANGUAGES),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strips markdown code fences from a Gemini response if present.
 *
 * @param raw - Raw text from Gemini `parts[0].text`.
 * @returns Trimmed JSON string without fence markers.
 */
function extractJSON(raw: string): string {
  const text = raw.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/);
  return fenceMatch ? fenceMatch[1].trim() : text;
}

/**
 * Builds the Gemini translation prompt for a meal's text fields.
 *
 * @param meal - The original meal row fetched from Supabase.
 * @param targetLanguageName - Human-readable target language (e.g. `'Hungarian'`).
 * @returns Prompt string to send to Gemini.
 */
function buildTranslationPrompt(
  meal: {
    name: string;
    description: string;
    ingredients: { name: string; quantity: string; unit: string; estimated_cost: number }[];
    instructions: { step: number; text: string }[];
    tags: string[];
  },
  targetLanguageName: string
): string {
  return `Translate the following meal data into ${targetLanguageName}.
Translate ONLY the text fields: name, description, ingredient names (not quantity/unit/cost), instruction text, and tags.
Return ONLY valid JSON, no markdown, no explanation.

Input:
${JSON.stringify({
  name: meal.name,
  description: meal.description,
  ingredients: meal.ingredients,
  instructions: meal.instructions,
  tags: meal.tags,
}, null, 2)}

Return JSON in this exact format:
{
  "name": "<translated name>",
  "description": "<translated description>",
  "ingredients": [{"name": "<translated name>", "quantity": "<same>", "unit": "<same>", "estimated_cost": <same>}],
  "instructions": [{"step": <same>, "text": "<translated text>"}],
  "tags": ["<translated tag>"]
}`;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const { userId } = await verifyUser(req.headers.get('Authorization'));

    // 2. Parse and validate input
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const parseResult = TranslateMealSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { meal_id, target_language } = parseResult.data;

    // 3. Fetch original meal using service role (bypasses RLS)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: meal, error: fetchError } = await supabaseAdmin
      .from('meals')
      .select('id, user_id, name, description, ingredients, instructions, tags, language')
      .eq('id', meal_id)
      .single();

    if (fetchError || !meal) {
      return new Response(
        JSON.stringify({ error: 'Meal not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the authenticated user owns this meal
    if (meal.user_id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Skip translation if the meal is already in the target language
    if (meal.language === target_language) {
      return new Response(
        JSON.stringify({ ok: true, skipped: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Build and send the Gemini translation prompt
    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Translation service temporarily unavailable.' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const targetLanguageName = LANGUAGE_NAMES[target_language] ?? target_language;
    const prompt = buildTranslationPrompt(meal, targetLanguageName);

    const geminiResponse = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: 'Translation failed. Please try again.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geminiData = await geminiResponse.json();
    const textContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      return new Response(
        JSON.stringify({ error: 'No translation returned.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Parse translation result
    let translated: {
      name: string;
      description: string;
      ingredients: typeof meal.ingredients;
      instructions: typeof meal.instructions;
      tags: string[];
    };
    try {
      translated = JSON.parse(extractJSON(textContent));
    } catch {
      console.error('Failed to parse translation JSON:', textContent.slice(0, 300));
      return new Response(
        JSON.stringify({ error: 'Failed to parse translation response.' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 6. Upsert translation row — unique on (meal_id, language)
    const { error: upsertError } = await supabaseAdmin
      .from('meal_translations')
      .upsert(
        {
          meal_id,
          language: target_language,
          name: translated.name,
          description: translated.description ?? null,
          ingredients: translated.ingredients ?? [],
          instructions: translated.instructions ?? [],
          tags: translated.tags ?? [],
        },
        { onConflict: 'meal_id,language' }
      );

    if (upsertError) {
      console.error('Failed to upsert translation:', upsertError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save translation.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.error('translate-meal error:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
