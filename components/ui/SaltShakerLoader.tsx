/**
 * @file components/ui/SaltShakerLoader.tsx
 * Animated loading screen featuring a shaking salt shaker emoji with a
 * particle system that simulates salt falling out.
 *
 * Particle system approach:
 *   Rather than pre-creating a fixed pool of particles, this component uses a
 *   React state array (`particles`) as a live queue. A "burst" of
 *   `PARTICLE_BURST_COUNT` particles is spawned at the start of each shake
 *   cycle, staggered by `PARTICLE_STAGGER` ms each. Each particle runs its
 *   own animation independently via `SaltParticle` (a memoised sub-component)
 *   and calls `onComplete` when it finishes, removing itself from the array.
 *   This keeps the particle count bounded and avoids memory leaks.
 *
 * Animation lifecycle:
 *   1. `shakeSequence` — 3 dampening flicks (12°, 10°, 8°) + settle + 1s rest.
 *   2. `scaleLoop` — continuous breathing scale (1.0 ↔ 1.04) on the shaker container.
 *   3. Per-particle gravity fall + horizontal drift + fade-out.
 *
 * The `mountedRef` guard prevents state updates after unmount, which would
 * otherwise trigger React's "Can't perform a state update on an unmounted
 * component" warning.
 */

import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { TypewriterTips } from './TypewriterTips';
import { GenerationPhases } from './GenerationPhases';

/** Props accepted by SaltShakerLoader. */
interface SaltShakerLoaderProps {
  /**
   * Primary loading message shown below the shaker.
   * Pass an empty string to hide the message entirely.
   */
  message?: string;
  /**
   * Secondary message shown below `message`.
   * Pass an empty string to hide. Ignored when `showTips` or `timeframe` is set.
   */
  submessage?: string;
  /** When true, renders `TypewriterTips` below the shaker instead of `submessage`. */
  showTips?: boolean;
  /**
   * When set, renders `GenerationPhases` instead of a plain message.
   * Used during multi-week meal plan generation to show phase progress.
   */
  timeframe?: 'day' | 'week' | 'month';
}

/** Minimal descriptor for a live particle in the state array. */
interface ParticleDescriptor {
  /** Unique sequential ID used as the React list key. */
  id: number;
}

/** Starting rotation angle of the shaker (degrees). Tilted as if pouring. */
const BASE_ANGLE = -130;
/** Number of salt particles spawned per shake cycle. */
const PARTICLE_BURST_COUNT = 10;
/** Milliseconds between consecutive particle spawns within a burst. */
const PARTICLE_STAGGER = 55;
/** Colour palette for individual salt particles — off-whites to simulate real salt. */
const SALT_COLORS = ['#FFFFFF', '#F5F5F0', '#E8E5E0', '#D4D4CC'];

// ---------------------------------------------------------------------------
// SaltParticle — individual particle (memoised to prevent unnecessary re-renders)
// ---------------------------------------------------------------------------

/**
 * SaltParticle renders a single animated salt grain. Each instance:
 *   - Falls downward under simulated gravity (accelerating easing).
 *   - Drifts left with sinusoidal easing (following the pour direction).
 *   - Fades in quickly then gradually fades out.
 *
 * All physics values (size, distance, drift, duration, colour) are randomised
 * once on mount via `useRef` to prevent re-randomisation on re-render.
 *
 * The `onComplete` callback fires when the animation finishes, allowing the
 * parent to remove the particle from the state array.
 */
const SaltParticle = memo(function SaltParticle({
  id,
  onComplete,
}: {
  id: number;
  onComplete: (id: number) => void;
}) {
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  // Randomise physics on mount and freeze values to avoid re-randomisation
  const size = useRef(3 + Math.random() * 2).current;
  const fallDistance = useRef(40 + Math.random() * 25).current;
  const driftX = useRef(-5 + Math.random() * -15).current;
  const fallDuration = useRef(400 + Math.random() * 200).current;
  const color = useRef(SALT_COLORS[Math.floor(Math.random() * SALT_COLORS.length)]).current;

  useEffect(() => {
    Animated.parallel([
      // Gravity fall: accelerating downward
      Animated.timing(translateY, {
        toValue: fallDistance,
        duration: fallDuration,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      // Horizontal drift: biased left (toward pour direction)
      Animated.timing(translateX, {
        toValue: driftX,
        duration: fallDuration,
        easing: Easing.out(Easing.sin),
        useNativeDriver: true,
      }),
      // Opacity: quick fade-in then gradual fade-out
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.8,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: fallDuration - 50,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start(({ finished }) => {
      if (finished) {
        onComplete(id);
      }
    });
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [{ translateX }, { translateY }],
        opacity,
      }}
    />
  );
});

// ---------------------------------------------------------------------------
// SaltShakerLoader — main export
// ---------------------------------------------------------------------------

/**
 * SaltShakerLoader displays an animated salt shaker with falling particles.
 * Used on the initial app load (`FlowGuard`) and during AI meal generation.
 *
 * @param props - See `SaltShakerLoaderProps`.
 */
export function SaltShakerLoader({
  message = 'Generating your meals...',
  submessage = 'Our AI is crafting the perfect plan\nbased on your preferences',
  showTips = false,
  timeframe,
}: SaltShakerLoaderProps) {
  const rotation = useRef(new Animated.Value(BASE_ANGLE)).current;
  const containerScale = useRef(new Animated.Value(1)).current;
  const [particles, setParticles] = useState<ParticleDescriptor[]>([]);
  const nextIdRef = useRef(0);
  const mountedRef = useRef(true);
  const burstTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** Removes a completed particle from the state array. */
  const removeParticle = useCallback((id: number) => {
    if (mountedRef.current) {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

  /**
   * Spawns `PARTICLE_BURST_COUNT` particles staggered by `PARTICLE_STAGGER` ms.
   * Each particle gets a unique sequential ID from `nextIdRef`.
   */
  const spawnParticleBurst = useCallback(() => {
    for (let i = 0; i < PARTICLE_BURST_COUNT; i++) {
      const timer = setTimeout(() => {
        if (mountedRef.current) {
          const id = nextIdRef.current++;
          setParticles((prev) => [...prev, { id }]);
        }
      }, i * PARTICLE_STAGGER);
      burstTimersRef.current.push(timer);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    // Build the shake sequence (3 dampening flicks + settle overshoot + rest pause)
    const shakeSequence = Animated.sequence([
      // Flick 1 (12° amplitude)
      Animated.timing(rotation, {
        toValue: BASE_ANGLE + 12,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: BASE_ANGLE,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Flick 2 (10° amplitude — dampening)
      Animated.timing(rotation, {
        toValue: BASE_ANGLE + 10,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: BASE_ANGLE,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Flick 3 (8° amplitude — dampening)
      Animated.timing(rotation, {
        toValue: BASE_ANGLE + 8,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: BASE_ANGLE,
        duration: 80,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      // Settle overshoot — slight bounce back before coming to rest
      Animated.timing(rotation, {
        toValue: BASE_ANGLE - 3,
        duration: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: BASE_ANGLE,
        duration: 60,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      // Rest pause before the next cycle
      Animated.delay(1000),
    ]);

    // Recursive cycle: spawn particles and run shake animation together
    const runCycle = () => {
      if (!mountedRef.current) return;
      spawnParticleBurst();
      shakeSequence.reset();
      shakeSequence.start(({ finished }) => {
        if (finished && mountedRef.current) {
          runCycle();
        }
      });
    };
    runCycle();

    // Continuous breathing scale effect (subtle 1.0 ↔ 1.04 pulse)
    const scaleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(containerScale, {
          toValue: 1.04,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1.0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    scaleLoop.start();

    return () => {
      mountedRef.current = false;
      shakeSequence.stop();
      scaleLoop.stop();
      burstTimersRef.current.forEach(clearTimeout);
      burstTimersRef.current = [];
    };
  }, []);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [-140, -110],
    outputRange: ['-140deg', '-110deg'],
  });

  return (
    <View className="flex-1 items-center justify-center">
      <View style={{ alignItems: 'center', position: 'relative', width: 150, height: 180 }}>
        <Animated.View
          style={{
            width: 100,
            height: 100,
            borderRadius: 100,
            alignItems: 'center',
            justifyContent: 'center',
            transform: [{ scale: containerScale }],
          }}
          className="bg-primary-50 dark:bg-primary-400/10"
        >
          <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
            <Text style={{ fontSize: 48 }}>🧂</Text>
          </Animated.View>
        </Animated.View>
        {/* Particle emission point — positioned at the shaker's spout */}
        <View
          style={{
            position: 'absolute',
            top: 65,
            left: 52,
            width: 40,
            height: 80,
          }}
        >
          {particles.map((p) => (
            <SaltParticle key={p.id} id={p.id} onComplete={removeParticle} />
          ))}
        </View>
      </View>
      <View className="mt-6 mb-2 items-center">
        {timeframe ? (
          <>
            <GenerationPhases timeframe={timeframe} />
            {message !== 'Generating your meals...' && message !== '' && (
              <Text className="text-sm text-slate-500 dark:text-slate-400 text-center mt-2">
                {message}
              </Text>
            )}
          </>
        ) : message !== '' ? (
          <Text className="text-lg font-semibold text-slate-900 dark:text-white">
            {message}
          </Text>
        ) : null}
      </View>
      {showTips ? (
        <TypewriterTips />
      ) : !timeframe && submessage !== '' ? (
        <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
          {submessage}
        </Text>
      ) : null}
    </View>
  );
}
