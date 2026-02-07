import { View } from 'react-native';
import { SaltShakerLoader } from './SaltShakerLoader';

interface LoadingSpinnerProps {
  message?: string;
}

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
