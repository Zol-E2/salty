import { TextInput, View, Text } from 'react-native';
import { useState } from 'react';

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'default' | 'email-address' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  error?: string;
  className?: string;
  multiline?: boolean;
}

export function Input({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  error,
  className = '',
  multiline = false,
}: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View className={`${className}`}>
      {label && (
        <Text className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label}
        </Text>
      )}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`bg-slate-50 dark:bg-slate-800 rounded-xl px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 border ${
          error
            ? 'border-rose-500'
            : isFocused
              ? 'border-primary-500 dark:border-primary-400'
              : 'border-slate-200 dark:border-slate-700'
        } ${multiline ? 'min-h-[100px] text-top' : ''}`}
      />
      {error && (
        <Text className="text-xs text-rose-500 mt-1">{error}</Text>
      )}
    </View>
  );
}
