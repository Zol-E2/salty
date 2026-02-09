-- ============================================================================
-- 002_security_hardening.sql
-- Security hardening migration: CHECK constraints, rate limiting, triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES TABLE: Add constraints
-- ---------------------------------------------------------------------------

-- Email must not be null and must be a valid format (RFC 5321 max 320 chars)
ALTER TABLE public.profiles
  ALTER COLUMN email SET NOT NULL;

-- Ensure display_name column exists (may be missing if DB was created before it was added to schema)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS display_name text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_length
    CHECK (char_length(email) <= 320),
  ADD CONSTRAINT profiles_email_format
    CHECK (email ~* '^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT profiles_display_name_length
    CHECK (display_name IS NULL OR char_length(display_name) <= 100),
  ADD CONSTRAINT profiles_weekly_budget_range
    CHECK (weekly_budget >= 0 AND weekly_budget <= 10000);

-- ---------------------------------------------------------------------------
-- 2. MEALS TABLE: Add constraints
-- ---------------------------------------------------------------------------

ALTER TABLE public.meals
  ADD CONSTRAINT meals_name_length
    CHECK (char_length(name) <= 200),
  ADD CONSTRAINT meals_description_length
    CHECK (description IS NULL OR char_length(description) <= 2000),
  ADD CONSTRAINT meals_image_url_length
    CHECK (image_url IS NULL OR char_length(image_url) <= 2048),
  ADD CONSTRAINT meals_calories_range
    CHECK (calories >= 0 AND calories <= 50000),
  ADD CONSTRAINT meals_protein_range
    CHECK (protein_g >= 0 AND protein_g <= 5000),
  ADD CONSTRAINT meals_carbs_range
    CHECK (carbs_g >= 0 AND carbs_g <= 5000),
  ADD CONSTRAINT meals_fat_range
    CHECK (fat_g >= 0 AND fat_g <= 5000),
  ADD CONSTRAINT meals_cost_range
    CHECK (estimated_cost >= 0 AND estimated_cost <= 10000),
  ADD CONSTRAINT meals_prep_time_range
    CHECK (prep_time_min >= 0 AND prep_time_min <= 1440),
  ADD CONSTRAINT meals_cook_time_range
    CHECK (cook_time_min >= 0 AND cook_time_min <= 1440),
  ADD CONSTRAINT meals_ingredients_size
    CHECK (octet_length(ingredients::text) <= 65536),
  ADD CONSTRAINT meals_instructions_size
    CHECK (octet_length(instructions::text) <= 65536),
  ADD CONSTRAINT meals_tags_length
    CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 20),
  ADD CONSTRAINT meals_meal_type_length
    CHECK (array_length(meal_type, 1) IS NULL OR array_length(meal_type, 1) <= 4);

-- Validate JSONB ingredients structure (must be array, max 50 items)
CREATE OR REPLACE FUNCTION public.validate_meal_ingredients(ingredients jsonb)
RETURNS boolean AS $$
BEGIN
  IF jsonb_typeof(ingredients) != 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(ingredients) > 50 THEN RETURN false; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE public.meals
  ADD CONSTRAINT meals_ingredients_valid
    CHECK (validate_meal_ingredients(ingredients));

-- Validate JSONB instructions structure (must be array, max 100 items)
CREATE OR REPLACE FUNCTION public.validate_meal_instructions(instructions jsonb)
RETURNS boolean AS $$
BEGIN
  IF jsonb_typeof(instructions) != 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(instructions) > 100 THEN RETURN false; END IF;
  RETURN true;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

ALTER TABLE public.meals
  ADD CONSTRAINT meals_instructions_valid
    CHECK (validate_meal_instructions(instructions));

-- ---------------------------------------------------------------------------
-- 3. MISSING INDEX: meal_plan_items.meal_id for JOIN performance
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_meal_plan_items_meal_id
  ON public.meal_plan_items(meal_id);

-- ---------------------------------------------------------------------------
-- 4. AUTO updated_at TRIGGERS
-- ---------------------------------------------------------------------------

-- Add updated_at column to tables that lack it
ALTER TABLE public.meals
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.meal_plan_items
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Shared trigger function for auto-setting updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all three tables
CREATE OR REPLACE TRIGGER profiles_set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER meals_set_updated_at
  BEFORE UPDATE ON public.meals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER meal_plan_items_set_updated_at
  BEFORE UPDATE ON public.meal_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 5. RATE LIMITS TABLE (database-backed rate limiting)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL,           -- user_id or IP address
  endpoint text NOT NULL,             -- e.g. 'generate-meal-plan'
  window_start timestamptz NOT NULL,  -- truncated to window boundary
  request_count integer NOT NULL DEFAULT 1,
  UNIQUE (identifier, endpoint, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON public.rate_limits(identifier, endpoint, window_start);

-- RLS enabled, no user-facing policies (only service_role can access)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomic increment function: race-condition safe via INSERT ... ON CONFLICT
CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  p_identifier text,
  p_endpoint text,
  p_window_start timestamptz
) RETURNS integer AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO public.rate_limits (identifier, endpoint, window_start, request_count)
  VALUES (p_identifier, p_endpoint, p_window_start, 1)
  ON CONFLICT (identifier, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup function: purge expired rate limit entries (call via pg_cron or manually)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - interval '2 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
