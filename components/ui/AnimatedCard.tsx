/**
 * @file components/ui/AnimatedCard.tsx
 * Wrapper that slides its children in from below and fades them in on mount.
 *
 * Used on list screens (day detail, calendar preview) to give each item a
 * staggered entrance animation that makes the UI feel less static.
 *
 * Stagger formula:
 *   `delay = delay ?? index * staggerMs`
 *
 *   Pass `index` (0-based position in the list) and `staggerMs` to get
 *   automatic stagger without managing timers in the parent. Pass an explicit
 *   `delay` to override and use an absolute millisecond delay instead.
 */

import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

/** Props accepted by AnimatedCard. */
interface AnimatedCardProps {
  /** Content to animate in. */
  children: React.ReactNode;
  /**
   * 0-based position in a list. Combined with `staggerMs` to compute the
   * entry delay: `index * staggerMs`. Defaults to 0 (no stagger).
   */
  index?: number;
  /**
   * Explicit delay in milliseconds. If provided, overrides the computed
   * `index * staggerMs` value.
   */
  delay?: number;
  /**
   * Milliseconds between each list item's entrance. Defaults to 80ms.
   * Lower values make the stagger faster; 0 makes all items animate together.
   */
  staggerMs?: number;
  /** Additional NativeWind class names for the animated container. */
  className?: string;
}

/**
 * AnimatedCard slides its children up 20dp and fades them from 0→1 opacity
 * over ~350ms using a cubic ease-out curve, after an optional stagger delay.
 *
 * The animation runs once on mount and cleans up the timeout on unmount.
 *
 * @param props - See `AnimatedCardProps`.
 */
export function AnimatedCard({
  children,
  index = 0,
  delay,
  staggerMs = 80,
  className = '',
}: AnimatedCardProps) {
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Use explicit delay if provided, otherwise compute from list position
    const staggerDelay = delay ?? index * staggerMs;

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }, staggerDelay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{ transform: [{ translateY }], opacity }}
      className={className}
    >
      {children}
    </Animated.View>
  );
}
