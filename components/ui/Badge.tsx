/**
 * @file components/ui/Badge.tsx
 * Small pill-shaped label component for displaying tags, meal types, and
 * difficulty levels on meal cards and the meal detail screen.
 */

import { View, Text } from 'react-native';

/** Props accepted by the Badge component. */
interface BadgeProps {
  /** Text displayed inside the badge. */
  label: string;
  /**
   * Optional hex colour string. When provided:
   *   - The badge background is set to `color + '20'` (12% opacity tint).
   *   - The label text is set to `color` at full opacity.
   * When omitted, no inline styles are applied (use `className` for custom colours).
   */
  color?: string;
  /** Additional NativeWind class names for the outer container. */
  className?: string;
}

/**
 * Badge renders a compact pill with a semi-transparent tinted background.
 * Used for meal type labels (breakfast, lunch, etc.), difficulty, and AI tags.
 *
 * @param props - See `BadgeProps`.
 */
export function Badge({ label, color, className = '' }: BadgeProps) {
  return (
    <View
      className={`px-2.5 py-1 rounded-full ${className}`}
      style={color ? { backgroundColor: color + '20' } : undefined}
    >
      <Text
        className="text-xs font-semibold"
        style={color ? { color } : undefined}
      >
        {label}
      </Text>
    </View>
  );
}
