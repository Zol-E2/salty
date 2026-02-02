import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  className?: string;
}

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
