import { useEffect, useRef } from 'react';
import { Animated, useColorScheme } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../stores/themeStore';

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

export default function TabsLayout() {
  const themeMode = useThemeStore((s) => s.mode);
  const systemScheme = useColorScheme();
  const isDark =
    themeMode === 'dark' || (themeMode === 'system' && systemScheme === 'dark');

  return (
    <Tabs
      initialRouteName="generate"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        tabBarActiveTintColor: isDark ? '#34D399' : '#10B981',
        tabBarInactiveTintColor: isDark ? '#64748B' : '#94A3B8',
        tabBarStyle: {
          backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
          borderTopColor: isDark ? '#1E293B' : '#F1F5F9',
          borderTopWidth: 1,
          paddingTop: 4,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="calendar-outline" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="generate"
        options={{
          title: 'Generate',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="sparkles-outline" size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <AnimatedTabIcon name="person-outline" size={size} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
