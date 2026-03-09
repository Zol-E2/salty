/**
 * @file lib/currency.ts
 * Currency conversion and formatting utilities for budget display.
 *
 * The app stores all budget values in USD internally. These helpers convert
 * USD amounts to the user's preferred currency for display only — the stored
 * value is never mutated.
 *
 * `FALLBACK_RATES` is used when live exchange rates are unavailable (e.g. first
 * launch in airplane mode). Rates were current as of 2025-03-01 and are
 * intentionally conservative; live rates from `exchangeRateStore` should be
 * preferred whenever available.
 */

// ---------------------------------------------------------------------------
// Static fallback rates (USD → target currency)
// ---------------------------------------------------------------------------

/**
 * USD-based exchange rates used when the live rate fetch has not yet succeeded.
 * Keys are ISO 4217 currency codes. A value of `1` means 1 USD = 1 target unit.
 */
export const FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.93,
  GBP: 0.79,
  HUF: 390,
};

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Returns `true` if the currency code is a "zero decimal" currency — one that
 * is typically displayed without cents (e.g. HUF always rounds to the nearest
 * whole forint in everyday use).
 *
 * @param currency - ISO 4217 currency code.
 */
function isZeroDecimalCurrency(currency: string): boolean {
  // HUF uses 0 decimal places for human-readable prices
  return currency === 'HUF';
}

/**
 * Converts a USD amount to the target currency and formats it using the
 * platform's `Intl.NumberFormat` (so decimal/thousand separators and symbol
 * placement match the user's locale automatically).
 *
 * @param usdAmount - Amount in US dollars.
 * @param currency - ISO 4217 target currency code (e.g. `'HUF'`, `'EUR'`).
 * @param rates - Exchange rate map (USD → target). Falls back to `FALLBACK_RATES`
 *   for any currency not present in the provided map.
 * @returns Formatted string e.g. `'Ft 19 500'` or `'€46.50'`.
 */
export function formatAmount(
  usdAmount: number,
  currency: string,
  rates: Record<string, number>
): string {
  // Use provided rate first, then fallback, then 1:1 if completely unknown
  const rate = rates[currency] ?? FALLBACK_RATES[currency] ?? 1;
  const converted = usdAmount * rate;

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: isZeroDecimalCurrency(currency) ? 0 : 2,
    }).format(converted);
  } catch {
    // Intl.NumberFormat throws for unknown/malformed currency codes; fall back
    // to a simple representation so the UI never crashes.
    const symbol = currency === 'USD' ? '$' : currency;
    return `${symbol}${Math.round(converted)}`;
  }
}

/**
 * Formats a weekly budget amount in the user's currency, appending a `/wk`
 * suffix for display in budget chips and the profile screen.
 *
 * @param usdBudget - Weekly budget in USD.
 * @param currency - ISO 4217 target currency code.
 * @param rates - Exchange rate map. Falls back to `FALLBACK_RATES` for unknown codes.
 * @returns Formatted string e.g. `'Ft 19 500/wk'` or `'$50/wk'`.
 */
export function formatBudget(
  usdBudget: number,
  currency: string,
  rates: Record<string, number>
): string {
  return `${formatAmount(usdBudget, currency, rates)}/wk`;
}
