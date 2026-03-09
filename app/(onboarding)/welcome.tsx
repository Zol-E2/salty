/**
 * @file app/(onboarding)/welcome.tsx
 * Onboarding step 0 of 6 — the first screen a new user sees.
 *
 * Route: `/(onboarding)/welcome`
 * Displays the Salty logo, app name, and a brief tagline. Tapping "Get Started"
 * advances to the goals selection screen (`/(onboarding)/goals`).
 * No state is modified here; this is a purely presentational entry point.
 */

import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <View className="flex-1 px-6">
        <View className="pt-8">
          <ProgressDots total={6} current={0} />
        </View>

        <View className="flex-1 items-center justify-center">
          <View className="w-28 h-28 bg-primary-500 rounded-[32px] items-center justify-center mb-8">
            <Ionicons name="restaurant" size={56} color="white" />
          </View>

          <Text className="text-3xl font-bold text-slate-900 dark:text-white text-center mb-3">
            {t('onboarding.welcome.title')}
          </Text>

          <Text className="text-lg text-slate-500 dark:text-slate-400 text-center leading-7 mb-2">
            {t('onboarding.welcome.subtitle')}{'\n'}
            {t('onboarding.welcome.tagline')}
          </Text>
        </View>

        <View className="pb-8">
          <View className="flex-row items-center bg-primary-50 dark:bg-primary-400/10 rounded-2xl p-4 mb-6">
            <Ionicons name="sparkles" size={20} color="#10B981" />
            <Text className="text-sm text-primary-700 dark:text-primary-300 ml-3 flex-1">
              {t('onboarding.welcome.hint')}
            </Text>
          </View>

          {/* Navigate to locale step first so the rest of onboarding uses the chosen language */}
          <Button
            title={t('onboarding.welcome.getStarted')}
            onPress={() => router.push('/(onboarding)/locale')}
            size="lg"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
