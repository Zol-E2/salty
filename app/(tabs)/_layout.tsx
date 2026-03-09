/**
 * @file app/(tabs)/_layout.tsx
 * Instagram-style swipeable tab layout powered by react-native-pager-view.
 *
 * Architecture:
 *   PagerView renders the three tab screens (Calendar, Generate, Profile) as
 *   adjacent native pages. Dragging horizontally reveals the next/previous
 *   screen in real time — the same native primitive (ViewPager2 on Android,
 *   UIScrollView on iOS) used by Instagram for its tab navigation.
 *
 *   A custom bottom tab bar sits below the pager and syncs bidirectionally:
 *     • Tap a tab icon  → pager.setPage(index) via ref
 *     • Swipe to a page → activePage state updates via onPageSelected
 *
 *   TabControlContext is provided here so child screens can programmatically
 *   switch tabs (via useTabControl) without calling router.navigate, which
 *   does not work because this layout does not render Expo Router's <Tabs>.
 *
 * Why no <Tabs> from expo-router?
 *   @react-navigation/bottom-tabs renders each screen in its own View
 *   (show/hide). There is no shared horizontal scroll axis, so swipe gestures
 *   cannot be added on top of it. Rendering screens directly inside PagerView
 *   gives us the native scroll axis required for real-time drag tracking.
 *
 *   All three tab screens (calendar, generate, profile) only use useRouter
 *   from expo-router — they do NOT use useFocusEffect, useIsFocused, or
 *   useNavigation — so they work correctly as plain React components rendered
 *   inside a PagerView while remaining inside the Expo Router provider context.
 *   Note: TabsLayout itself IS a proper screen in the root Stack and DOES use
 *   useFocusEffect — see the Android back-handler section below for why.
 *
 * Safe area:
 *   useSafeAreaInsets() provides the bottom inset (home-indicator on iPhone X+).
 *   The custom tab bar applies paddingBottom = max(insets.bottom, 8) to ensure
 *   content is never hidden behind the home indicator.
 *   Tab screens must use edges={['top', 'left', 'right']} on their SafeAreaView
 *   so the bottom inset is not double-applied inside the screen content.
 *
 * Android back button (tab history):
 *   PagerView has no native navigation history, so the Android hardware back
 *   button would exit the app immediately. We maintain a manual history stack
 *   (tabHistory ref) and intercept BackHandler to navigate to the previous tab
 *   before falling through to the OS default (app exit).
 *
 *   History management uses onPageScrollStateChanged to distinguish swipe-driven
 *   navigation from programmatic setPage calls:
 *     • 'dragging' only fires when the user physically initiates a swipe — never
 *       for programmatic setPage(). We use this as a reliable, race-condition-free
 *       signal to set isUserSwiping=true.
 *     • 'idle' resets the flag after any scroll (user or programmatic) finishes.
 *     • onPageSelected only pushes to history when isUserSwiping is true, which
 *       prevents double-entries when tap and swipe both fire for the same move.
 *
 *   setPage (tap / TabControlContext) pushes to history directly and synchronously
 *   before calling pagerRef.setPage(), so rapid taps cannot interleave with
 *   onPageSelected callbacks to corrupt the stack.
 *
 *   BackHandler pops synchronously and calls pagerRef.setPage() without pushing,
 *   so the settling/idle cycle from the resulting animation never adds entries.
 *
 *   iOS has no hardware back button; its swipe-back gesture applies to the
 *   native Stack in app/_layout.tsx, not to PagerView tabs. No change needed.
 *   The history stack still accumulates on iOS so TabControlContext consumers
 *   (e.g. GenerateScreen after a save) can jump tabs correctly.
 *
 *   Why useFocusEffect instead of useEffect for the BackHandler:
 *   BackHandler uses a LIFO listener stack. With useEffect the listener was
 *   registered once on mount and stayed alive even when push screens like
 *   day/[date] were on top. Because our listener fired before React Navigation's
 *   it consumed the event (returned true) when tabHistory.length > 1, so the
 *   stack screen never received the back press and could not pop itself.
 *   useFocusEffect registers the listener only while TabsLayout is focused, and
 *   removes it the moment a push screen takes focus. React Navigation's listener
 *   then handles the event correctly and pops the stack screen.
 *
 * Tab index mapping (stable — referenced by useTabControl consumers):
 *   0 → Calendar
 *   1 → Generate  (initial page, matches previous initialRouteName="generate")
 *   2 → Profile
 */

import { useRef, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text, TouchableOpacity, useColorScheme, Animated, BackHandler, Platform } from 'react-native';
import PagerView from 'react-native-pager-view';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';
import { TabControlContext } from '../../hooks/useTabControl';

// Direct screen imports — these are plain React components and work correctly
// inside PagerView while still having access to all Expo Router context.
import CalendarScreen from './calendar';
import GenerateScreen from './generate';
import ProfileScreen from './profile';

// --- Constants ---

/**
 * The page shown on cold start.
 * Index 1 = Generate, matching the previous initialRouteName="generate".
 */
const INITIAL_PAGE = 1;

/**
 * Tab descriptors in page order (index 0, 1, 2).
 * Changing this order also changes the indices exposed by useTabControl.
 */
const TABS = [
  { name: 'calendar', title: 'Calendar', icon: 'calendar-outline' as const },
  { name: 'generate', title: 'Generate', icon: 'sparkles-outline' as const },
  { name: 'profile',  title: 'Profile',  icon: 'person-outline'   as const },
] as const;

// --- Private components ---

/**
 * AnimatedTabIcon renders an Ionicons glyph with a spring-bounce scale animation
 * whenever the tab becomes focused. The two-phase sequence (compress → release)
 * gives a satisfying tactile "click" feel that matches the premium aesthetic.
 *
 * @param name    - Ionicons glyph identifier.
 * @param color   - Resolved tint colour (active or inactive).
 * @param size    - Icon size in logical points.
 * @param focused - Whether this tab is currently the active page.
 */
function AnimatedTabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  size: number;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (focused) {
      // Phase 1: compress to 85 % — gives a "press" sensation
      // Phase 2: spring back past 100 % then settle — the "bounce" feel
      Animated.sequence([
        Animated.spring(scale, {
          toValue: 0.85,
          damping: 15,
          stiffness: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 12,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}

// --- Layout ---

/** Root layout for the (tabs) route group. */
export default function TabsLayout() {
  // --- Refs & State ---
  const pagerRef = useRef<PagerView>(null);
  const [activePage, setActivePage] = useState(INITIAL_PAGE);

  // History stack for Android back-button support. Starts with the initial
  // page so the first back press always has a defined "previous" to compare.
  const tabHistory = useRef<number[]>([INITIAL_PAGE]);

  // Tracks whether the current scroll was initiated by the user dragging the
  // pager, as opposed to a programmatic setPage() call. We use this to gate
  // onPageSelected so it only pushes to history for swipe-driven navigation.
  // Using a ref (not state) avoids scheduling a re-render mid-gesture.
  const isUserSwiping = useRef(false);

  // --- Theme ---
  const themeMode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  // Resolve effective dark mode: explicit preference or system fallback
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  // Resolved tint colours — computed once per render to keep JSX clean
  const activeTint   = isDark ? '#34D399' : '#10B981';
  const inactiveTint = isDark ? '#64748B' : '#94A3B8';

  // Bottom inset for devices with a home indicator (iPhone X and later)
  const insets = useSafeAreaInsets();

  // --- Tab control ---

  /**
   * Programmatically jump to a tab. Called both by the tab bar (tap) and by
   * child screens via TabControlContext (e.g. GenerateScreen → Calendar after
   * a successful meal plan save).
   *
   * Also pushes to tabHistory so the Android back button can return to this
   * page. Duplicate entries are avoided: if the user taps the already-active
   * tab we do not push a second copy of the same index.
   *
   * @param index - Zero-based page index (0=Calendar, 1=Generate, 2=Profile).
   */
  const setPage = useCallback((index: number) => {
    // Push to history synchronously before animating — this ensures that
    // if the user taps rapidly the stack is always consistent with the
    // destination, regardless of when onPageSelected fires asynchronously.
    if (tabHistory.current[tabHistory.current.length - 1] !== index) {
      tabHistory.current.push(index);
    }
    // Kick off the animation. The resulting settling/idle scroll state changes
    // will fire onPageScrollStateChanged, but isUserSwiping stays false for
    // programmatic calls so onPageSelected will not push a duplicate entry.
    pagerRef.current?.setPage(index);
    // Update state immediately so the tab bar reflects the target tab without
    // waiting for onPageSelected, which fires only after the animation ends.
    setActivePage(index);
  }, []);

  // --- Android back handler ---

  // useFocusEffect registers the listener only while TabsLayout is the focused
  // screen in the root Stack. When a push screen (day/[date], meal/[id], etc.)
  // is on top, TabsLayout loses focus → listener is removed → React Navigation's
  // own listener handles the press and pops the stack screen correctly.
  // useEffect would keep the listener alive indefinitely, causing it to consume
  // back presses that were meant for stack screens above the tabs.
  useFocusEffect(
    useCallback(() => {
      // iOS has no hardware back button — skip registration entirely.
      // Returning undefined here is valid; useFocusEffect treats it as a no-op.
      if (Platform.OS !== 'android') return;

      const handler = BackHandler.addEventListener('hardwareBackPress', () => {
        if (tabHistory.current.length > 1) {
          // Pop the current page and reveal the previous one.
          tabHistory.current.pop();
          const prev = tabHistory.current[tabHistory.current.length - 1];
          pagerRef.current?.setPage(prev);
          setActivePage(prev);
          // Return true to signal the event is consumed — prevents app exit.
          return true;
        }
        // Only one entry left (the initial page): let the OS handle it (exits app).
        return false;
      });

      return () => handler.remove();
    }, []) // empty deps — only refs and setActivePage (stable) are used
  );

  // --- Render ---

  return (
    <TabControlContext.Provider value={{ setPage }}>
      <View style={{ flex: 1, backgroundColor: isDark ? '#0F172A' : '#FFFFFF' }}>

        {/* --- Pager (content area) --- */}
        <PagerView
          ref={pagerRef}
          style={{ flex: 1 }}
          initialPage={INITIAL_PAGE}
          // Keep 1 adjacent page rendered on each side so swiping never shows
          // a blank flash. With 3 tabs this means all pages are live after the
          // first render — acceptable given the lightweight nature of each screen.
          offscreenPageLimit={1}
          onPageScrollStateChanged={(e) => {
            const state = e.nativeEvent.pageScrollState;
            // 'dragging' fires exclusively for user-initiated swipes — programmatic
            // setPage() goes directly idle → settling → idle, never 'dragging'.
            // This is the canonical way to distinguish the two without a timeout.
            if (state === 'dragging') {
              isUserSwiping.current = true;
            } else if (state === 'idle') {
              isUserSwiping.current = false;
            }
          }}
          onPageSelected={(e) => {
            const pos = e.nativeEvent.position;
            setActivePage(pos);
            // Only push to history for swipe-driven navigation. Tap presses and
            // BackHandler already manage the stack synchronously in setPage /
            // the back handler, so this guard prevents race-condition double-entries.
            if (isUserSwiping.current && tabHistory.current[tabHistory.current.length - 1] !== pos) {
              tabHistory.current.push(pos);
            }
          }}
        >
          {/* Each child must have a unique string key — PagerView uses it for identity. */}
          <View key="calendar" style={{ flex: 1 }}>
            <CalendarScreen />
          </View>
          <View key="generate" style={{ flex: 1 }}>
            <GenerateScreen />
          </View>
          <View key="profile" style={{ flex: 1 }}>
            <ProfileScreen />
          </View>
        </PagerView>

        {/* --- Bottom tab bar --- */}
        <View
          style={{
            flexDirection: 'row',
            backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
            borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
            borderTopWidth: 1,
            paddingTop: 8,
            // Absorb the home-indicator inset on iPhone X+; minimum 8 pt on
            // devices without a home indicator so the bar looks balanced.
            paddingBottom: Math.max(insets.bottom, 8),
          }}
        >
          {TABS.map((tab, index) => {
            const focused = activePage === index;
            const color   = focused ? activeTint : inactiveTint;

            return (
              <TouchableOpacity
                key={tab.name}
                onPress={() => setPage(index)}
                style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
                accessibilityRole="tab"
                accessibilityLabel={tab.title}
                accessibilityState={{ selected: focused }}
              >
                <AnimatedTabIcon name={tab.icon} size={24} color={color} focused={focused} />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color,
                    marginTop: 3,
                  }}
                >
                  {tab.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

      </View>
    </TabControlContext.Provider>
  );
}
