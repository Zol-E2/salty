/**
 * @file components/ui/LoadingSpinner.tsx
 * Full-screen loading placeholder that wraps `SaltShakerLoader`.
 *
 * Provides a simple API for screens that just need a loading state without
 * the full `SaltShakerLoader` configuration (tips, timeframe, etc.).
 */

import { View } from 'react-native';
import { SaltShakerLoader } from './SaltShakerLoader';

/** Props accepted by LoadingSpinner. */
interface LoadingSpinnerProps {
  /**
   * Optional message displayed below the animated shaker.
   * Defaults to an empty string (no message).
   */
  message?: string;
}

/**
 * LoadingSpinner fills its parent container and centres the `SaltShakerLoader`
 * animation. Use this as the loading state for full-screen data fetches
 * (e.g. meal detail, profile).
 *
 * @param props - See `LoadingSpinnerProps`.
 */
export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
      <SaltShakerLoader
        message={message ?? ''}
        submessage=""
      />
    </View>
  );
}
