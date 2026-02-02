import { TouchableOpacity, Text, ActivityIndicator, View } from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

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
  };

  const textVariantStyles = {
    primary: 'text-white font-semibold',
    secondary: 'text-slate-900 dark:text-slate-100 font-semibold',
    outline: 'text-primary-500 dark:text-primary-400 font-semibold',
    ghost: 'text-primary-500 dark:text-primary-400 font-medium',
  };

  const textSizeStyles = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? 'opacity-50' : ''} ${className}`}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#fff' : '#10B981'}
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
    </TouchableOpacity>
  );
}
