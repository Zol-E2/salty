/**
 * @file hooks/useCurrency.ts
 * Convenience hook that provides pre-bound currency formatting functions for
 * the current user's selected currency and exchange rates.
 *
 * Wraps `useOnboardingStore` + `useExchangeRateStore` to avoid repeating the
 * two-store boilerplate in every component that displays monetary values. The
 * pattern mirrors `useAuth.ts` — components import this hook instead of the
 * stores directly.
 *
 * Usage:
 *   const { format, formatBudget, currency } = useCurrency();
 *   format(meal.estimated_cost)   // → "€4.30" / "1 680 Ft" / "$4.50"
 *   formatBudget(50)              // → "$50.00/wk"
 */

import { useOnboardingStore } from '../stores/onboardingStore';
import { useExchangeRateStore } from '../stores/exchangeRateStore';
import { formatAmount, formatBudget as formatBudgetLib } from '../lib/currency';

/**
 * Returns pre-bound currency formatting functions for the user's currently
 * selected currency, using live exchange rates where available.
 *
 * @returns An object with:
 *   - `format(usdAmount)` — converts and formats a USD amount in the user's currency.
 *   - `formatBudget(usdBudget)` — formats a weekly budget with `/wk` suffix.
 *   - `currency` — the ISO 4217 currency code (e.g. `'USD'`, `'HUF'`).
 */
export function useCurrency() {
  const currency = useOnboardingStore((s) => s.currency);
  const rates = useExchangeRateStore((s) => s.rates);

  return {
    format: (usdAmount: number) => formatAmount(usdAmount, currency, rates),
    formatBudget: (usdBudget: number) => formatBudgetLib(usdBudget, currency, rates),
    currency,
  };
}
