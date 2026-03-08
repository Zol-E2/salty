/**
 * @file lib/supabase.ts
 * Creates and exports the singleton Supabase client used throughout the app.
 *
 * Auth token storage:
 *   By default, `@supabase/supabase-js` uses `localStorage` for session
 *   persistence, which does not exist in React Native. `ExpoSecureStoreAdapter`
 *   bridges the gap by implementing the `storage` interface using
 *   `expo-secure-store`, which encrypts values using the device's secure enclave.
 *
 * Session configuration:
 *   - `autoRefreshToken: true` — the client proactively refreshes the JWT
 *     before it expires so requests never fail due to a stale token.
 *   - `persistSession: true` — the session survives app restarts.
 *   - `detectSessionInUrl: false` — disabled because deep-link OAuth callbacks
 *     are not used; magic link OTP flow is handled manually in `app/(auth)/verify.tsx`.
 */

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './constants';

/**
 * Storage adapter that persists Supabase auth tokens in `expo-secure-store`.
 * Implements the `StorageAdapter` interface expected by `createClient`.
 *
 * All three methods are thin wrappers; SecureStore handles encryption and
 * device keychain / secure enclave access transparently.
 */
const ExpoSecureStoreAdapter = {
  /** @param key - The storage key. @returns The stored value, or null if absent. */
  getItem: (key: string) => SecureStore.getItemAsync(key),
  /** @param key - The storage key. @param value - The value to persist. */
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  /** @param key - The storage key to remove. */
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

/**
 * The singleton Supabase client. Import this wherever you need to query the
 * database, call an edge function, or interact with auth.
 *
 * @example
 * import { supabase } from '../lib/supabase';
 * const { data, error } = await supabase.from('meals').select('*');
 */
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    // Deep-link OAuth not used — OTP tokens are verified manually
    detectSessionInUrl: false,
  },
});
