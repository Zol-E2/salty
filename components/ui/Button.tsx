/**
 * @file components/ui/Button.tsx
 * Reusable animated button component with 5 visual variants and 3 sizes.
 *
 * The press animation uses `Animated.spring` with a shared `SPRING_CONFIG`
 * so all button instances feel physically consistent. The spring parameters
 * are tuned so the button snaps back crisply without over-bouncing:
 *   - `damping: 15` — enough friction to stop oscillation quickly
 *   - `stiffness: 150` — stiff enough for a snappy feel, not so stiff it's jarring
 */

import { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, View, Animated } from 'react-native';

/** Props accepted by the Button component. */
interface ButtonProps {
  /** Text label displayed inside the button. */
  title: string;
  /** Callback fired when the button is pressed. */
  onPress: () => void;
  /**
   * Visual style variant:
   *   - `primary` — solid emerald background, white text (default)
   *   - `secondary` — muted slate background, dark text
   *   - `outline` — transparent background with an emerald border
   *   - `ghost` — no background or border, emerald text
   *   - `danger` — solid red background, white text
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /**
   * Size preset:
   *   - `sm` — smaller padding and text
   *   - `md` — standard size (default)
   *   - `lg` — larger padding and text for primary CTAs
   */
  size?: 'sm' | 'md' | 'lg';
  /** When true, the button is rendered at 50% opacity and non-interactive. */
  disabled?: boolean;
  /** When true, replaces button content with an `ActivityIndicator`. */
  loading?: boolean;
  /** Optional icon rendered to the left of the label. */
  icon?: React.ReactNode;
  /** Additional NativeWind class names applied to the animated container. */
  className?: string;
}

/**
 * Spring configuration shared across all button press animations.
 *   - `damping: 15` — sufficient friction to suppress oscillation
 *   - `stiffness: 150` — snappy response without feeling harsh
 *   - `useNativeDriver: true` — runs on the UI thread for 60 fps performance
 */
const SPRING_CONFIG = { damping: 15, stiffness: 150, useNativeDriver: true };

/**
 * Button renders a pressable element with a spring scale animation on press.
 * The scale shrinks to 0.96× on press-in and returns to 1× on press-out,
 * giving tactile feedback without layout reflow.
 *
 * @param props - See `ButtonProps`.
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
}: ButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, { ...SPRING_CONFIG, toValue: 0.96 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { ...SPRING_CONFIG, toValue: 1 }).start();
  };

  const baseStyles = 'flex-row items-center justify-center rounded-full';

  const sizeStyles = {
    sm: 'px-4 py-2',
    md: 'px-6 py-3.5',
    lg: 'px-8 py-4',
  };

  const variantStyles = {
    primary: 'bg-primary-500 dark:bg-primary-400',
    secondary: 'bg-slate-100 dark:bg-slate-800',
    outline: 'border-2 border-primary-500 dark:border-primary-400',
    ghost: '',
    danger: 'bg-red-500 dark:bg-red-400',
  };

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-slate-900 dark:text-slate-100 font-semibold',
    outline: 'text-primary-500 dark:text-primary-400 font-semibold',
    ghost: 'text-primary-500 dark:text-primary-400 font-medium',
    danger: 'text-white font-semibold',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
    >
      <Animated.View
        style={{ transform: [{ scale }] }}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      >
        {loading ? (
          <ActivityIndicator
            color={variant === 'primary' || variant === 'danger' ? '#fff' : '#10B981'}
            size="small"
          />
        ) : (
          <View className="flex-row items-center gap-2">
            {icon}
            <Text className={`${textVariantStyles[variant]} ${textSizeStyles[size]}`}>
              {title}
            </Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}
