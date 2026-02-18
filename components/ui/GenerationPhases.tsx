import { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';

const PHASES = [
  'Prepping ingredients',
  'Mixing flavors',
  'Taste testing',
  'Serving up',
];

const ESTIMATED_DURATIONS: Record<string, number> = {
  day: 12000,
  week: 30000,
  month: 100000,
};

interface GenerationPhasesProps {
  timeframe: 'day' | 'week' | 'month';
}

export function GenerationPhases({ timeframe }: GenerationPhasesProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dotPulse = useRef(new Animated.Value(0.4)).current;
  const ellipsis = useEllipsis();

  const totalDuration = ESTIMATED_DURATIONS[timeframe] ?? ESTIMATED_DURATIONS.day;
  const phaseInterval = totalDuration / PHASES.length;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Schedule transitions for phases 0→1, 1→2, 2→3
    for (let i = 1; i < PHASES.length; i++) {
      timers.push(
        setTimeout(() => setActiveIndex(i), phaseInterval * i)
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [phaseInterval]);

  // Pulse animation for active dot
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotPulse, {
          toValue: 1,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(dotPulse, {
          toValue: 0.4,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [dotPulse]);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text className="text-lg font-semibold text-slate-900 dark:text-white">
        {PHASES[activeIndex]}{ellipsis}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
        {PHASES.map((_, i) => {
          if (i < activeIndex) {
            // Completed
            return (
              <View
                key={i}
                className="bg-primary-500"
                style={{ width: 8, height: 8, borderRadius: 4 }}
              />
            );
          }
          if (i === activeIndex) {
            // Active (pulsing)
            return (
              <Animated.View
                key={i}
                className="bg-primary-500"
                style={{ width: 8, height: 8, borderRadius: 4, opacity: dotPulse }}
              />
            );
          }
          // Pending
          return (
            <View
              key={i}
              className="bg-slate-300 dark:bg-slate-600"
              style={{ width: 8, height: 8, borderRadius: 4 }}
            />
          );
        })}
      </View>
    </View>
  );
}

function useEllipsis(interval = 500) {
  const [dots, setDots] = useState('');
  useEffect(() => {
    let count = 0;
    const timer = setInterval(() => {
      count = (count + 1) % 4;
      setDots('.'.repeat(count));
    }, interval);
    return () => clearInterval(timer);
  }, [interval]);
  return dots;
}
