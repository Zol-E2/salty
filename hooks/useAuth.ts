/**
 * @file hooks/useAuth.ts
 * Convenience hook that wraps `useAuthStore` and exposes a richer auth API.
 *
 * Components should import `useAuth` rather than `useAuthStore` directly so
 * that helper derivations (e.g. `user`, `isAuthenticated`) and `signOut` are
 * always available without repeating selector logic.
 */

import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

/**
 * Returns the current authentication state and helper actions.
 *
 * @returns An object with:
 *   - `session` — the full Supabase `Session` object, or `null` if signed out.
 *   - `user` — shorthand for `session?.user ?? null`.
 *   - `isLoading` — true while the initial session check is in flight.
 *   - `isAuthenticated` — true when `session` is non-null (JWT may be expiring soon).
 *   - `signOut` — calls `supabase.auth.signOut()`, triggering `onAuthStateChange`
 *     in `app/_layout.tsx` which sets `session` to null and redirects to login.
 */
export function useAuth() {
  const { session, isLoading } = useAuthStore();

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session,
    signOut,
  };
}
