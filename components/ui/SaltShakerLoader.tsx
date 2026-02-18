import { useEffect, useRef, useState, useCallback, memo } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { TypewriterTips } from './TypewriterTips';
import { GenerationPhases } from './GenerationPhases';

interface SaltShakerLoaderProps {
  message?: string;
  submessage?: string;
  showTips?: boolean;
  timeframe?: 'day' | 'week' | 'month';
}

interface ParticleDescriptor {
  id: number;
}

const BASE_ANGLE = -130;
const PARTICLE_BURST_COUNT = 10;
const PARTICLE_STAGGER = 55;
const SALT_COLORS = ['#FFFFFF', '#F5F5F0', '#E8E5E0', '#D4D4CC'];

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

  const removeParticle = useCallback((id: number) => {
    if (mountedRef.current) {
      setParticles((prev) => prev.filter((p) => p.id !== id));
    }
  }, []);

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

    // Build the shake sequence (3 dampening flicks + settle + rest)
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
      // Flick 2 (10° amplitude)
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
      // Flick 3 (8° amplitude, dampening)
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
      // Settle overshoot
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
      // Rest pause
      Animated.delay(1000),
    ]);

    // Recursive cycle: animation + particle burst start together
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

    // Breathing scale effect
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
