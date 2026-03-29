/**
 * @file hooks/useTranslation.ts
 * Hook for triggering on-demand translation of saved meals after a language switch.
 *
 * Flow:
 *   1. `trigger(targetLanguage)` calls the `meals_needing_translation` Supabase RPC
 *      to retrieve meal IDs whose text is not yet in the target language.
 *   2. For each result, it invokes the `translate-meal` edge function which
 *      generates translated text and upserts a row into `meal_translations`.
 *   3. Progress is tracked as `{ done, total }` so the caller can render an indicator.
 *   4. On completion, the `['meals']` query key is invalidated to refresh any
 *      open meal list or detail screens.
 *
 * Caveats:
 *   - Translation calls are sequential (not parallel) to avoid hitting edge function
 *     rate limits when the user has many saved meals.
 *   - Errors on individual meals are logged but do not abort the batch.
 */

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Progress snapshot returned to the caller during a batch translation run. */
interface TranslationProgress {
  /** Number of meals successfully translated so far. */
  done: number;
  /** Total meals that need translation in this batch. */
  total: number;
}

/** Return value of `useTriggerTranslations`. */
interface UseTriggerTranslationsResult {
  /** True while the translation batch is in progress. */
  isTranslating: boolean;
  /** Current batch progress, or null when no batch is active. */
  progress: TranslationProgress | null;
  /**
   * Starts translating all meals that are not yet available in `targetLanguage`.
   *
   * @param targetLanguage - BCP 47 language code to translate into (e.g. `'hu'`).
   */
  trigger: (targetLanguage: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns a `trigger` function that batch-translates saved meals into a new language.
 * Expose `isTranslating` and `progress` to show a non-blocking loading indicator
 * while the batch runs.
 *
 * @returns `{ isTranslating, progress, trigger }`
 */
export function useTriggerTranslations(): UseTriggerTranslationsResult {
  const queryClient = useQueryClient();
  const [isTranslating, setIsTranslating] = useState(false);
  const [progress, setProgress] = useState<TranslationProgress | null>(null);

  const trigger = useCallback(async (targetLanguage: string) => {
    if (isTranslating) return;

    setIsTranslating(true);
    setProgress(null);

    try {
      // 1. Ask the DB which meals need translation — RLS ensures we only see our own.
      const { data: needsTranslation, error: rpcError } = await supabase
        .rpc('meals_needing_translation', { p_target_language: targetLanguage });

      if (rpcError) {
        console.error('[useTranslation] RPC error:', rpcError.message);
        return;
      }

      const pending: { meal_id: string; original_language: string }[] =
        needsTranslation ?? [];

      if (pending.length === 0) return;

      setProgress({ done: 0, total: pending.length });

      // 2. Translate each meal sequentially to avoid rate limits.
      for (let i = 0; i < pending.length; i++) {
        const { meal_id } = pending[i];
        try {
          const { error } = await supabase.functions.invoke('translate-meal', {
            body: { meal_id, target_language: targetLanguage },
          });
          if (error) {
            console.error(`[useTranslation] Failed to translate meal ${meal_id}:`, error.message);
          }
        } catch (e) {
          console.error(`[useTranslation] Exception translating meal ${meal_id}:`, e);
        }
        // Update progress even on failure so the indicator keeps moving.
        setProgress({ done: i + 1, total: pending.length });
      }

      // 3. Invalidate meal queries so screens re-fetch with translated text.
      queryClient.invalidateQueries({ queryKey: ['meals'] });
    } finally {
      setIsTranslating(false);
      setProgress(null);
    }
  }, [isTranslating, queryClient]);

  return { isTranslating, progress, trigger };
}
