import { useState, useEffect } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the 6-digit code');
      return;
    }

    setError('');
    setVerifying(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });

    setVerifying(false);

    if (verifyError) {
      setError(verifyError.message);
      return;
    }

    // Session is now established via onAuthStateChange in _layout.tsx.
    router.replace('/(tabs)/calendar');
  };

  const handleResend = async () => {
    setResending(true);
    setError('');

    const { error: resendError } = await supabase.auth.signInWithOtp({
      email,
    });

    setResending(false);

    if (resendError) {
      Alert.alert('Error', resendError.message);
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-8">
            <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-4">
              <Ionicons name="mail" size={32} color="#10B981" />
            </View>
            <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              Check your email
            </Text>
            <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
              We sent a 6-digit code to{'\n'}
              <Text className="font-semibold text-slate-700 dark:text-slate-300">
                {email}
              </Text>
            </Text>
          </View>

          <Input
            label="Verification code"
            placeholder="00000000"
            value={code}
            onChangeText={(text) => {
              setCode(text.replace(/[^0-9]/g, '').slice(0, 8));
              if (error) setError('');
            }}
            keyboardType="numeric"
            autoCapitalize="none"
            error={error}
            className="mb-6"
          />

          <Button
            title="Verify"
            onPress={handleVerify}
            loading={verifying}
            disabled={code.length !== 8}
            size="lg"
            className="mb-4"
          />

          <Button
            title={cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
            onPress={handleResend}
            loading={resending}
            disabled={cooldown > 0}
            variant="outline"
            size="sm"
            className="mb-3"
          />

          <Button
            title="Use a different email"
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
