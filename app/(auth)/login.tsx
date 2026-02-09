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
import { supabase } from '../../lib/supabase';
import { emailSchema } from '../../lib/validation';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSendOtp = async () => {
    // Validate email format and length before sending
    const result = emailSchema.safeParse(email);
    if (!result.success) {
      Alert.alert('Invalid Email', result.error.issues[0].message);
      return;
    }

    const validatedEmail = result.data;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: validatedEmail,
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    router.push({ pathname: '/(auth)/verify', params: { email: validatedEmail } });
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
              title="Send Code"
              onPress={handleSendOtp}
              loading={loading}
              disabled={!email.trim()}
              size="lg"
              className="mb-4"
            />

            <Text className="text-sm text-slate-400 dark:text-slate-500 text-center">
              We'll send you an 8-digit code. No password needed.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
