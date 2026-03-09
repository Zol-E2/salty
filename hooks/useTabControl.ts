/**
 * @file hooks/useTabControl.ts
 * React context and hook for programmatic tab switching inside the swipeable
 * PagerView tab layout.
 *
 * Usage (from any screen rendered inside the (tabs) layout):
 *   const { setPage } = useTabControl();
 *   setPage(0); // jump to Calendar
 *
 * This context is provided by `app/(tabs)/_layout.tsx` and is consumed by
 * screens that need to switch tabs programmatically without calling
 * `router.navigate('/(tabs)/...')`, which does not work when the layout
 * bypasses Expo Router's <Tabs> component.
 *
 * Tab index mapping (must stay in sync with the TABS array in _layout.tsx):
 *   0 → Calendar
 *   1 → Generate
 *   2 → Profile
 */

import { createContext, useContext } from 'react';

// --- Types ---

/**
 * The control surface exposed by the swipeable tab layout to its child screens.
 *
 * @property setPage - Navigate to a tab by zero-based index.
 *                     0 = Calendar, 1 = Generate, 2 = Profile.
 */
export interface TabControl {
  setPage: (index: number) => void;
}

// --- Context ---

/**
 * Default no-op context value — safe to call if a screen is somehow rendered
 * outside a TabControlContext.Provider (e.g. in an isolated unit test).
 */
export const TabControlContext = createContext<TabControl>({
  setPage: () => {},
});

// --- Hook ---

/**
 * Returns the tab control interface from the nearest SwipeableTabs layout.
 * Must be called inside a component rendered within `app/(tabs)/_layout.tsx`.
 *
 * @returns {TabControl} Object with `setPage(index)` for programmatic tab switching.
 *
 * @example
 * const { setPage } = useTabControl();
 * setPage(0); // jump to Calendar tab
 */
export function useTabControl(): TabControl {
  return useContext(TabControlContext);
}
