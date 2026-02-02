import { View, ActivityIndicator, Text } from 'react-native';

interface LoadingSpinnerProps {
  message?: string;
}

export function LoadingSpinner({ message }: LoadingSpinnerProps) {
  return (
    <View className="flex-1 items-center justify-center bg-stone-50 dark:bg-slate-950">
      <ActivityIndicator size="large" color="#10B981" />
      {message && (
        <Text className="text-slate-500 dark:text-slate-400 mt-3 text-sm">
          {message}
        </Text>
      )}
    </View>
  );
}
