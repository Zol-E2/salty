/**
 * @file components/ui/Input.tsx
 * Styled text input with an optional label, focus highlight, and error state.
 */

import { TextInput, View, Text } from 'react-native';
import { useState } from 'react';

/** Props accepted by the Input component. */
interface InputProps {
  /** Optional label rendered above the text field. */
  label?: string;
  /** Placeholder text shown when the input is empty. */
  placeholder?: string;
  /** Controlled value. */
  value: string;
  /** Called on every keystroke with the new text. */
  onChangeText: (text: string) => void;
  /** Keyboard type hint passed to the native input. */
  keyboardType?: 'default' | 'email-address' | 'numeric';
  /** Auto-capitalisation behaviour. */
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  /** When true, the input masks its content. */
  secureTextEntry?: boolean;
  /** Error message rendered in red below the input. Also sets the border to rose. */
  error?: string;
  /** Additional NativeWind class names applied to the outer container. */
  className?: string;
  /** When true, the input expands to multiple lines with a minimum height. */
  multiline?: boolean;
}

/**
 * Input renders a controlled text field with:
 *   - An emerald border when focused.
 *   - A rose border and error message when `error` is set.
 *   - An optional label above the field.
 *
 * @param props - See `InputProps`.
 */
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
