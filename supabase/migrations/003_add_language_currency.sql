-- Migration: 003_add_language_currency
-- Adds language and currency columns to the profiles table.
--
-- Both columns have safe defaults so existing rows remain valid without
-- a data backfill. The CHECK constraints mirror the LANGUAGES and CURRENCIES
-- arrays in lib/constants.ts — keep them in sync when adding new options.
--
-- language: BCP 47 language code (e.g. 'en', 'hu').
-- currency: ISO 4217 currency code (e.g. 'USD', 'HUF').

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD';

-- Enforce that only supported language codes are stored.
-- Add new codes here when extending LANGUAGES in lib/constants.ts.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_language_check
  CHECK (language IN ('en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi'));

-- Enforce that only supported currency codes are stored.
-- Add new codes here when extending CURRENCIES in lib/constants.ts.
ALTER TABLE profiles
  ADD CONSTRAINT profiles_currency_check
  CHECK (currency IN ('USD', 'EUR', 'GBP', 'HUF'));

-- Update the updated_at trigger to fire on these new columns as well.
-- The trigger already fires on any UPDATE to the row, so no change needed.
