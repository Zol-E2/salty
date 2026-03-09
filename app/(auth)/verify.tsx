/**
 * @file app/(auth)/verify.tsx
 * OTP verification screen — accepts the 8-digit code sent to the user's email.
 *
 * Route: `/(auth)/verify?email=<address>`
 * Key behaviours:
 *   - Codes expire after 5 minutes (`CODE_EXPIRY_SECONDS = 300`); a countdown
 *     timer disables the Verify button and shows "Code expired" when it hits 0.
 *   - The Resend button has a 60-second cooldown (`RESEND_COOLDOWN_SECONDS`)
 *     to prevent abuse; tapping it resets both the cooldown and the expiry timer.
 *   - On successful verification, onboarding data is synced to the Supabase
 *     `profiles` table (if `onboardingComplete` is true) before navigating to
 *     the calendar tab.
 *   - The session is established via `onAuthStateChange` in `app/_layout.tsx`;
 *     this screen does not manually set auth state.
 */

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
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const RESEND_COOLDOWN_SECONDS = 60;
const CODE_EXPIRY_SECONDS = 300; // 5 minutes

export default function VerifyScreen() {
  const { t } = useTranslation();
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();

  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiryTime, setExpiryTime] = useState(CODE_EXPIRY_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (expiryTime <= 0) return;
    const timer = setTimeout(() => setExpiryTime((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [expiryTime]);

  const handleVerify = async () => {
    if (code.length !== 8) {
      setError('Please enter the 8-digit code');
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

    // Sync onboarding data to Supabase profile
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const onboardingData = useOnboardingStore.getState();
      if (onboardingData.onboardingComplete) {
        await supabase.from('profiles').update({
          goal: onboardingData.goal || null,
          weekly_budget: onboardingData.weekly_budget,
          skill_level: onboardingData.skill_level || null,
          dietary_restrictions: onboardingData.dietary_restrictions,
        }).eq('id', user.id);
      }
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
      Alert.alert(t('common.error'), resendError.message);
      return;
    }

    setCooldown(RESEND_COOLDOWN_SECONDS);
    setExpiryTime(CODE_EXPIRY_SECONDS);
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
              {t('auth.checkEmail')}
            </Text>
            <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
              {t('auth.codeSentTo')}{'\n'}
              <Text className="font-semibold text-slate-700 dark:text-slate-300">
                {email}
              </Text>
            </Text>
            {/* Format mm:ss countdown for the expiry timer */}
            <Text className={`text-sm mt-2 ${expiryTime > 0 ? 'text-slate-400 dark:text-slate-500' : 'text-rose-500 dark:text-rose-400'}`}>
              {expiryTime > 0
                ? t('auth.codeExpires', {
                    time: `${Math.floor(expiryTime / 60)}:${(expiryTime % 60).toString().padStart(2, '0')}`,
                  })
                : t('auth.codeExpired')}
            </Text>
          </View>

          <Input
            label={t('auth.verificationCode')}
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
            title={t('auth.verify')}
            onPress={handleVerify}
            loading={verifying}
            disabled={code.length !== 8 || expiryTime <= 0}
            size="lg"
            className="mb-4"
          />

          <Button
            title={cooldown > 0 ? t('auth.resendCodeTimer', { seconds: cooldown }) : t('auth.resendCode')}
            onPress={handleResend}
            loading={resending}
            disabled={cooldown > 0}
            variant="outline"
            size="sm"
            className="mb-3"
          />

          <Button
            title={t('auth.useDifferentEmail')}
            onPress={() => router.back()}
            variant="ghost"
            size="sm"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
