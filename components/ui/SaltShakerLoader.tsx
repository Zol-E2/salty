import { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface SaltShakerLoaderProps {
  message?: string;
  submessage?: string;
}

const PARTICLE_COUNT = 6;

function SaltParticle({ index }: { index: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  const offsetX = (index - PARTICLE_COUNT / 2) * 6 + (index % 2 === 0 ? 2 : -2);
  const initialDelay = index * 120;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.loop(
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: 50,
            duration: 700,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.timing(opacity, {
              toValue: 0.7,
              duration: 0,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 700,
              easing: Easing.out(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }, initialDelay);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: '#10B981',
          transform: [{ translateX: offsetX }, { translateY }],
          opacity,
        },
      ]}
    />
  );
}

export function SaltShakerLoader({
  message = 'Generating your meals...',
  submessage = 'Our AI is crafting the perfect plan\nbased on your preferences',
}: SaltShakerLoaderProps) {
  const rotation = useRef(new Animated.Value(0)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(rotation, {
          toValue: -18,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 18,
          duration: 600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(rotation, {
          toValue: 0,
          duration: 300,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
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
    ).start();
  }, []);

  const rotateInterpolation = rotation.interpolate({
    inputRange: [-18, 18],
    outputRange: ['-18deg', '18deg'],
  });

  return (
    <View className="flex-1 items-center justify-center">
      <View style={{ alignItems: 'center', position: 'relative' }}>
        <Animated.View
          style={[
            {
              width: 80,
              height: 80,
              borderRadius: 40,
              alignItems: 'center',
              justifyContent: 'center',
              transform: [{ scale: containerScale }],
            },
          ]}
          className="bg-primary-50 dark:bg-primary-400/10"
        >
          <Animated.View style={{ transform: [{ rotate: rotateInterpolation }] }}>
            <MaterialCommunityIcons name="shaker-outline" size={36} color="#10B981" />
          </Animated.View>
        </Animated.View>
        <View
          style={{
            position: 'absolute',
            bottom: -8,
            alignItems: 'center',
            width: 40,
            height: 50,
          }}
        >
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <SaltParticle key={i} index={i} />
          ))}
        </View>
      </View>
      <Text className="text-lg font-semibold text-slate-900 dark:text-white mb-2 mt-6">
        {message}
      </Text>
      <Text className="text-sm text-slate-500 dark:text-slate-400 text-center">
        {submessage}
      </Text>
    </View>
  );
}
