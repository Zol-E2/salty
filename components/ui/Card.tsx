/**
 * @file components/ui/Card.tsx
 * Simple container component with the app's standard card styling:
 * white/dark background, rounded corners, a subtle shadow, and a border.
 */

import { View } from 'react-native';

/** Props accepted by the Card component. */
interface CardProps {
  /** Content to render inside the card. */
  children: React.ReactNode;
  /** Additional NativeWind class names to merge onto the card container. */
  className?: string;
}

/**
 * Card renders its children inside a consistently styled surface.
 * Pass `className` to override individual properties (e.g. `border-rose-200`
 * for the danger zone card in settings).
 *
 * @param props - See `CardProps`.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <View
      className={`bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 ${className}`}
    >
      {children}
    </View>
  );
}
