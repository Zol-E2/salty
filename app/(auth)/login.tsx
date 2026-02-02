import { useState } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSendMagicLink = async () => {
    if (!email.trim()) return;

    const redirectTo = makeRedirectUri();

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setSent(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          <View className="items-center mb-12">
            <View className="w-20 h-20 bg-primary-500 rounded-3xl items-center justify-center mb-6">
              <Ionicons name="restaurant" size={40} color="white" />
            </View>
            <Text className="text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Salty
            </Text>
            <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
              Meal planning made easy for students
            </Text>
          </View>

          {!sent ? (
            <View>
              <Input
                label="Email address"
                placeholder="you@university.edu"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="mb-4"
              />

              <Button
                title="Send Magic Link"
                onPress={handleSendMagicLink}
                loading={loading}
                disabled={!email.trim()}
                size="lg"
                className="mb-4"
              />

              <Text className="text-sm text-slate-400 dark:text-slate-500 text-center mb-6">
                We'll send you a sign-in link. No password needed.
              </Text>

              <Button
                title="Skip for now"
                onPress={() => router.replace('/(tabs)/calendar')}
                variant="ghost"
                size="sm"
              />
            </View>
          ) : (
            <View className="items-center">
              <View className="w-16 h-16 bg-primary-100 dark:bg-primary-900 rounded-full items-center justify-center mb-4">
                <Ionicons name="mail" size={32} color="#10B981" />
              </View>
              <Text className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Check your email
              </Text>
              <Text className="text-base text-slate-500 dark:text-slate-400 text-center mb-6">
                We sent a magic link to{'\n'}
                <Text className="font-semibold text-slate-700 dark:text-slate-300">
                  {email}
                </Text>
              </Text>

              <Button
                title="Send again"
                onPress={() => {
                  setSent(false);
                  handleSendMagicLink();
                }}
                variant="outline"
                size="sm"
                className="mb-3"
              />

              <Button
                title="Use a different email"
                onPress={() => setSent(false)}
                variant="ghost"
                size="sm"
              />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
