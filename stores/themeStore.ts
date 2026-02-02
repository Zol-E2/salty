import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  loadSavedTheme: () => Promise<void>;
}

const THEME_KEY = 'salty_theme_mode';

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: async (mode) => {
    set({ mode });
    await SecureStore.setItemAsync(THEME_KEY, mode);
  },
  loadSavedTheme: async () => {
    const saved = await SecureStore.getItemAsync(THEME_KEY);
    if (saved && ['system', 'light', 'dark'].includes(saved)) {
      set({ mode: saved as ThemeMode });
    }
  },
}));
