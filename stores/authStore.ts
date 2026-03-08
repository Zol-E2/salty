/**
 * @file stores/authStore.ts
 * Zustand store for Supabase authentication session state.
 *
 * The store is populated by `app/_layout.tsx`, which subscribes to
 * `supabase.auth.onAuthStateChange` and calls `setSession` on every event.
 * All other parts of the app read from this store via `useAuth()` rather than
 * calling Supabase auth methods directly.
 */

import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';

/** Shape of the auth Zustand store. */
interface AuthState {
  /**
   * The active Supabase session, or null if the user is signed out.
   * Contains the JWT, user object, and expiry time.
   */
  session: Session | null;
  /**
   * True while the initial session check (`getSession()`) is in flight.
   * `FlowGuard` waits for this to be false before routing, preventing a
   * momentary flash to the login screen on app launch.
   */
  isLoading: boolean;
  /**
   * Sets the active session and clears the loading flag.
   * Called by `onAuthStateChange` on every auth event (sign in, sign out,
   * token refresh, etc.).
   *
   * @param session - The new session, or null on sign-out.
   */
  setSession: (session: Session | null) => void;
  /**
   * Manually sets the loading flag. Rarely needed; prefer `setSession`.
   *
   * @param loading - New loading state.
   */
  setLoading: (loading: boolean) => void;
}

/**
 * `useAuthStore` — the global authentication state store.
 * Use `useAuth()` from `hooks/useAuth.ts` in components for a richer API.
 */
export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  // Start in the loading state until the initial getSession() resolves
  isLoading: true,
  setSession: (session) => set({ session, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
}));
