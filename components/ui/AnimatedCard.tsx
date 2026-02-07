import { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  staggerMs?: number;
  className?: string;
}

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
