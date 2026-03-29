-- ============================================================================
-- 004_nutrition_fallbacks_translations.sql
-- Adds: nutrition goal fields, fallback meals (FK), meal translations table,
--       flexible meal slots, localized meals view
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. PROFILES: Nutrition & preference columns
-- ---------------------------------------------------------------------------
-- These map directly to the new prompt inputs: weight_kg, goal, daily_calories,
-- favorite_foods, foods_to_avoid, meals_per_day.
-- The existing `goal` column tracks the *app motivation* (save_money, eat_healthy…).
-- `nutrition_goal` is a separate column for the *body composition* goal (lose/maintain/gain).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_kg        numeric,
  ADD COLUMN IF NOT EXISTS nutrition_goal   text,
  ADD COLUMN IF NOT EXISTS daily_calories   integer,
  ADD COLUMN IF NOT EXISTS favorite_foods   text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS foods_to_avoid   text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS meals_per_day    integer DEFAULT 4;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_weight_kg_range
    CHECK (weight_kg IS NULL OR (weight_kg >= 30 AND weight_kg <= 300)),
  ADD CONSTRAINT profiles_nutrition_goal_check
    CHECK (nutrition_goal IS NULL OR nutrition_goal IN ('lose', 'maintain', 'gain')),
  ADD CONSTRAINT profiles_daily_calories_range
    CHECK (daily_calories IS NULL OR (daily_calories >= 800 AND daily_calories <= 10000)),
  ADD CONSTRAINT profiles_meals_per_day_range
    CHECK (meals_per_day >= 2 AND meals_per_day <= 6),
  ADD CONSTRAINT profiles_favorite_foods_length
    CHECK (array_length(favorite_foods, 1) IS NULL OR array_length(favorite_foods, 1) <= 30),
  ADD CONSTRAINT profiles_foods_to_avoid_length
    CHECK (array_length(foods_to_avoid, 1) IS NULL OR array_length(foods_to_avoid, 1) <= 30);


-- ---------------------------------------------------------------------------
-- 2. MEALS: Language tracking + fallback meal support
-- ---------------------------------------------------------------------------
-- `language`         — records which language the text fields were generated in.
-- `is_fallback`      — true for quick-alternative meals created by the prompt.
-- `fallback_meal_id` — on a primary meal, points to its fallback meal row.

ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS language         text    NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS is_fallback      boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallback_meal_id uuid;

-- FK: primary meal → its fallback meal.
-- ON DELETE SET NULL so deleting a fallback doesn't cascade-delete the primary.
ALTER TABLE public.meals
  ADD CONSTRAINT meals_fallback_meal_fk
    FOREIGN KEY (fallback_meal_id)
    REFERENCES public.meals(id)
    ON DELETE SET NULL;

-- Language must be one of the supported codes (keep in sync with profiles).
ALTER TABLE public.meals
  ADD CONSTRAINT meals_language_check
    CHECK (language IN ('en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi'));

-- A fallback meal should never itself have a fallback (no chains).
ALTER TABLE public.meals
  ADD CONSTRAINT meals_fallback_no_chain
    CHECK (NOT (is_fallback AND fallback_meal_id IS NOT NULL));

-- Sparse index for fallback lookups.
CREATE INDEX IF NOT EXISTS idx_meals_fallback_meal_id
  ON public.meals(fallback_meal_id)
  WHERE fallback_meal_id IS NOT NULL;

-- Index for filtering by language (useful for translation-needed queries).
CREATE INDEX IF NOT EXISTS idx_meals_language
  ON public.meals(user_id, language);


-- ---------------------------------------------------------------------------
-- 2a. TRIGGER: Cascade-delete fallback when its primary meal is deleted
-- ---------------------------------------------------------------------------
-- Since the FK direction is primary → fallback, deleting the primary does NOT
-- automatically remove the orphaned fallback. This trigger handles that.

CREATE OR REPLACE FUNCTION public.cascade_delete_fallback()
RETURNS trigger AS $$
BEGIN
  IF OLD.fallback_meal_id IS NOT NULL THEN
    DELETE FROM public.meals WHERE id = OLD.fallback_meal_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BEFORE DELETE so the fallback is removed before FK checks.
DROP TRIGGER IF EXISTS meals_cascade_delete_fallback ON public.meals;
CREATE TRIGGER meals_cascade_delete_fallback
  BEFORE DELETE ON public.meals
  FOR EACH ROW
  WHEN (OLD.is_fallback = false AND OLD.fallback_meal_id IS NOT NULL)
  EXECUTE FUNCTION public.cascade_delete_fallback();


-- ---------------------------------------------------------------------------
-- 3. MEAL TRANSLATIONS TABLE
-- ---------------------------------------------------------------------------
-- Stores translated text for meals in languages other than the original.
-- Numeric/structural fields (calories, cost, macros, times) are language-
-- independent and stay on the meals table — only text is translated.
--
-- Query pattern:
--   SELECT COALESCE(mt.name, m.name) ...
--   FROM meals m
--   LEFT JOIN meal_translations mt ON mt.meal_id = m.id AND mt.language = $userLang
--
-- If no translation row exists → the app shows the original language text
-- and can trigger a translation job (lightweight Gemini/translation API call).

CREATE TABLE IF NOT EXISTS public.meal_translations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id     uuid        NOT NULL REFERENCES public.meals(id) ON DELETE CASCADE,
  language    text        NOT NULL,
  name        text        NOT NULL,
  description text,
  ingredients jsonb       DEFAULT '[]',   -- translated ingredient names only
  instructions jsonb      DEFAULT '[]',   -- translated step text only
  tags        text[]      DEFAULT '{}',
  created_at  timestamptz DEFAULT now(),
  UNIQUE (meal_id, language)
);

ALTER TABLE public.meal_translations
  ADD CONSTRAINT mt_language_check
    CHECK (language IN ('en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi')),
  ADD CONSTRAINT mt_name_length
    CHECK (char_length(name) <= 200),
  ADD CONSTRAINT mt_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT mt_ingredients_size
    CHECK (octet_length(ingredients::text) <= 65536),
  ADD CONSTRAINT mt_instructions_size
    CHECK (octet_length(instructions::text) <= 65536),
  ADD CONSTRAINT mt_tags_length
    CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20);

CREATE INDEX IF NOT EXISTS idx_meal_translations_lookup
  ON public.meal_translations(meal_id, language);

-- RLS: translations inherit access from the parent meal's user_id.
ALTER TABLE public.meal_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal translations"
  ON public.meal_translations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.meals
    WHERE meals.id = meal_translations.meal_id
      AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own meal translations"
  ON public.meal_translations FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.meals
    WHERE meals.id = meal_translations.meal_id
      AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own meal translations"
  ON public.meal_translations FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.meals
    WHERE meals.id = meal_translations.meal_id
      AND meals.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own meal translations"
  ON public.meal_translations FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.meals
    WHERE meals.id = meal_translations.meal_id
      AND meals.user_id = auth.uid()
  ));


-- ---------------------------------------------------------------------------
-- 4. MEAL PLAN ITEMS: Flexible slots for meals_per_day > 4
-- ---------------------------------------------------------------------------
-- The current schema has UNIQUE(user_id, date, slot) with slot in
-- (breakfast, lunch, dinner, snack). This allows only ONE snack per day.
-- With meals_per_day up to 6, users may need multiple snack slots.
--
-- Solution: add a `slot_index` column (0-based) and update the unique
-- constraint to include it. This lets the same slot appear more than once:
--   (user, 2026-03-29, 'snack', 0) — first snack
--   (user, 2026-03-29, 'snack', 1) — second snack

ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS slot_index integer NOT NULL DEFAULT 0;

ALTER TABLE public.meal_plan_items
  ADD CONSTRAINT mpi_slot_index_range
    CHECK (slot_index >= 0 AND slot_index <= 5);

-- Replace the old unique constraint with the new one that includes slot_index.
ALTER TABLE public.meal_plan_items
  DROP CONSTRAINT IF EXISTS meal_plan_items_user_id_date_slot_key;

ALTER TABLE public.meal_plan_items
  ADD CONSTRAINT meal_plan_items_user_date_slot_idx_key
    UNIQUE (user_id, date, slot, slot_index);


-- ---------------------------------------------------------------------------
-- 5. HELPER VIEW: Localized meals
-- ---------------------------------------------------------------------------
-- Joins meals with the user's preferred language translation (if available).
-- Falls back to the original meal text when no translation exists.
-- The `translation_status` column tells the frontend whether it should
-- trigger a translation job.
--
-- Usage (from Supabase client):
--   supabase.from('meals_localized').select('*')
--
-- security_invoker = true ensures RLS is evaluated as the calling user,
-- not the view owner. Requires PostgreSQL 15+ (Supabase default).

CREATE OR REPLACE VIEW public.meals_localized
WITH (security_invoker = true)
AS
SELECT
  m.id,
  m.user_id,
  -- Text fields: prefer translation, fall back to original
  COALESCE(mt.name,         m.name)         AS name,
  COALESCE(mt.description,  m.description)  AS description,
  COALESCE(mt.ingredients,  m.ingredients)  AS ingredients,
  COALESCE(mt.instructions, m.instructions) AS instructions,
  COALESCE(mt.tags,         m.tags)         AS tags,
  -- Non-translatable fields pass through directly
  m.calories,
  m.protein_g,
  m.carbs_g,
  m.fat_g,
  m.estimated_cost,
  m.prep_time_min,
  m.cook_time_min,
  m.difficulty,
  m.meal_type,
  m.is_ai_generated,
  m.is_fallback,
  m.fallback_meal_id,
  m.language          AS original_language,
  m.created_at,
  m.updated_at,
  -- Metadata for the frontend
  p.language          AS user_language,
  CASE
    WHEN m.language = p.language       THEN 'original'   -- already in user's language
    WHEN mt.meal_id IS NOT NULL        THEN 'translated'  -- translation exists
    ELSE                                    'pending'     -- needs translation
  END                 AS translation_status
FROM public.meals m
JOIN public.profiles p
  ON p.id = m.user_id
LEFT JOIN public.meal_translations mt
  ON mt.meal_id = m.id
  AND mt.language = p.language;


-- ---------------------------------------------------------------------------
-- 6. HELPER FUNCTION: Batch-check which meals need translation
-- ---------------------------------------------------------------------------
-- Call after a language switch to get IDs that need a translation job.
-- Returns only meals belonging to the calling user (RLS-safe via auth.uid()).
--
-- Usage (from edge function / RPC):
--   SELECT * FROM public.meals_needing_translation('hu');

CREATE OR REPLACE FUNCTION public.meals_needing_translation(p_target_language text)
RETURNS TABLE (meal_id uuid, original_language text)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT m.id, m.language
  FROM public.meals m
  WHERE m.user_id = auth.uid()
    AND m.language != p_target_language
    AND NOT EXISTS (
      SELECT 1 FROM public.meal_translations mt
      WHERE mt.meal_id = m.id AND mt.language = p_target_language
    );
$$;
