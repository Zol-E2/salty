/**
 * @file stores/themeStore.ts
 * Zustand store for the user's preferred colour scheme (light / dark / system).
 *
 * The selected mode is persisted to SecureStore under `salty_theme_mode` so it
 * survives app restarts. `RootLayout` reads the mode and applies the `dark`
 * class to the root `View`, which NativeWind uses to toggle `dark:` styles.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

/**
 * The three theme mode options.
 *   - `'system'` — follow the device's system appearance setting.
 *   - `'light'` — always use the light colour palette.
 *   - `'dark'` — always use the dark colour palette.
 */
type ThemeMode = 'system' | 'light' | 'dark';

/** Shape of the theme Zustand store. */
interface ThemeState {
  /** Currently active theme mode. Defaults to `'system'`. */
  mode: ThemeMode;
  /**
   * Sets the active theme mode and persists it to SecureStore.
   * @param mode - The new mode to apply.
   */
  setMode: (mode: ThemeMode) => void;
  /**
   * Reads the previously saved theme mode from SecureStore and hydrates the store.
   * Validates the stored value against the known modes before applying it to
   * prevent a stale or corrupted value from breaking the UI.
   */
  loadSavedTheme: () => Promise<void>;
}

/** SecureStore key for the persisted theme preference. */
const THEME_KEY = 'salty_theme_mode';

/**
 * `useThemeStore` — the global theme preference store.
 *
 * @example
 * const { mode, setMode } = useThemeStore();
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: async (mode) => {
    set({ mode });
    await SecureStore.setItemAsync(THEME_KEY, mode);
  },
  loadSavedTheme: async () => {
    const saved = await SecureStore.getItemAsync(THEME_KEY);
    // Only apply the stored value if it is still a valid ThemeMode
    if (saved && ['system', 'light', 'dark'].includes(saved)) {
      set({ mode: saved as ThemeMode });
    }
  },
}));
