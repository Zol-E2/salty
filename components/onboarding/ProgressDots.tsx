import { View } from 'react-native';

interface ProgressDotsProps {
  total: number;
  current: number;
}

export function ProgressDots({ total, current }: ProgressDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={`h-2 rounded-full ${
            i === current
              ? 'w-8 bg-primary-500 dark:bg-primary-400'
              : i < current
                ? 'w-2 bg-primary-300 dark:bg-primary-600'
                : 'w-2 bg-slate-200 dark:bg-slate-700'
          }`}
        />
      ))}
    </View>
  );
}
