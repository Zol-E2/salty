/**
 * @file stores/exchangeRateStore.ts
 * Zustand store for live USD-based exchange rates from open.er-api.com.
 *
 * Fetch strategy:
 *   1. On app startup, `fetchRates()` is called from `app/_layout.tsx`.
 *   2. The response is cached in SecureStore with a 24-hour TTL. Subsequent
 *      launches within that window skip the network call.
 *   3. If the network call fails (offline, API down), the store retains the
 *      `FALLBACK_RATES` from `lib/currency.ts` — the UI continues to display
 *      approximate conversions without crashing.
 *
 * Usage:
 *   const { rates } = useExchangeRateStore();
 *   formatBudget(50, 'HUF', rates); // → 'Ft 19 500/wk'
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { FALLBACK_RATES } from '../lib/currency';

/** SecureStore key for cached exchange rate data. */
const CACHE_KEY = 'salty_exchange_rates';

/**
 * 24-hour TTL in milliseconds. After this duration the cache is considered
 * stale and a fresh fetch is attempted on the next app launch.
 */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Shape of the exchange rate Zustand store. */
interface ExchangeRateState {
  /** USD-based exchange rates map. Defaults to `FALLBACK_RATES` until fetched. */
  rates: Record<string, number>;
  /** Unix timestamp (ms) of the last successful fetch. `null` if never fetched. */
  lastFetched: number | null;
  /** True while a network fetch is in progress. */
  isLoading: boolean;

  /**
   * Fetches live exchange rates from open.er-api.com (free tier, no API key).
   * Reads cache first — if the cached data is less than 24 hours old it is
   * returned immediately without a network call. On fetch failure the existing
   * `rates` value (fallback or cached) is preserved.
   */
  fetchRates: () => Promise<void>;
}

export const useExchangeRateStore = create<ExchangeRateState>((set) => ({
  // Start with fallback rates so the UI renders correctly on first paint
  rates: FALLBACK_RATES,
  lastFetched: null,
  isLoading: false,

  fetchRates: async () => {
    // --- Check SecureStore cache first ---
    try {
      const cached = await SecureStore.getItemAsync(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { rates: Record<string, number>; timestamp: number };
        // If the cached data is within the 24-hour TTL, use it and skip network
        if (Date.now() - parsed.timestamp < CACHE_TTL_MS) {
          set({ rates: parsed.rates, lastFetched: parsed.timestamp });
          return;
        }
      }
    } catch {
      // Cache miss or corrupt data — fall through to network fetch
    }

    // --- Fetch fresh rates ---
    set({ isLoading: true });
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json() as { rates: Record<string, number> };
      const timestamp = Date.now();

      // Persist to SecureStore for future launches within the TTL window
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify({ rates: data.rates, timestamp }));
      set({ rates: data.rates, lastFetched: timestamp, isLoading: false });
    } catch (error) {
      console.warn('[exchangeRateStore] Failed to fetch live rates, using fallback:', error);
      // Preserve existing rates (fallback or stale cache) — do not crash
      set({ isLoading: false });
    }
  },
}));
