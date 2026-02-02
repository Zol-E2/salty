import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useThemeStore } from '../../stores/themeStore';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GOALS, SKILL_LEVELS, DIETARY_OPTIONS } from '../../lib/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { mode, setMode } = useThemeStore();
  const onboarding = useOnboardingStore();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  // Use Supabase profile if authenticated, otherwise local onboarding data
  const goalLabel =
    GOALS.find((g) => g.key === (profile?.goal ?? onboarding.goal))?.label ?? '-';
  const skillLabel =
    SKILL_LEVELS.find(
      (s) => s.key === (profile?.skill_level ?? onboarding.skill_level)
    )?.label ?? '-';
  const restrictions = profile?.dietary_restrictions ?? onboarding.dietary_restrictions;
  const dietaryLabels =
    restrictions
      ?.map((r) => DIETARY_OPTIONS.find((d) => d.key === r)?.label ?? r)
      .join(', ') || 'None';
  const budget = profile?.weekly_budget ?? onboarding.weekly_budget;

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
        <View className="pt-4 pb-6">
          <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
            Profile
          </Text>
          <Text className="text-sm text-slate-500 dark:text-slate-400">
            {isAuthenticated ? user?.email : 'Not signed in'}
          </Text>
        </View>

        {/* Sign in prompt */}
        {!isAuthenticated && (
          <Card className="mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-10 h-10 bg-primary-50 dark:bg-primary-400/10 rounded-xl items-center justify-center mr-3">
                <Ionicons name="person-outline" size={20} color="#10B981" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold text-slate-900 dark:text-white">
                  Sign in to sync your data
                </Text>
                <Text className="text-sm text-slate-500 dark:text-slate-400">
                  Keep your meals and plans across devices
                </Text>
              </View>
            </View>
            <Button
              title="Sign In"
              onPress={() => router.push('/(auth)/login')}
              size="md"
              icon={<Ionicons name="log-in-outline" size={18} color="white" />}
            />
          </Card>
        )}

        {/* Preferences */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Preferences
          </Text>
          <ProfileRow icon="flag-outline" label="Goal" value={goalLabel} />
          <ProfileRow
            icon="wallet-outline"
            label="Budget"
            value={`$${budget}/week`}
          />
          <ProfileRow icon="flame-outline" label="Skill" value={skillLabel} />
          <ProfileRow
            icon="leaf-outline"
            label="Dietary"
            value={dietaryLabels}
            isLast
          />
        </Card>

        {/* Appearance */}
        <Card className="mb-4">
          <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
            Appearance
          </Text>
          <View className="flex-row gap-2">
            {(['system', 'light', 'dark'] as const).map((m) => {
              const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
                system: 'phone-portrait-outline',
                light: 'sunny-outline',
                dark: 'moon-outline',
              };
              return (
                <TouchableOpacity
                  key={m}
                  onPress={() => setMode(m)}
                  className={`flex-1 py-3 rounded-xl border-2 items-center ${
                    mode === m
                      ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                      : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
                  }`}
                >
                  <Ionicons
                    name={icons[m]}
                    size={20}
                    color={mode === m ? '#10B981' : '#64748B'}
                  />
                  <Text
                    className={`text-xs font-medium mt-1 ${
                      mode === m
                        ? 'text-primary-600 dark:text-primary-400'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Sign out (only if signed in) */}
        {isAuthenticated && (
          <View className="mt-4 mb-8">
            <Button
              title="Sign Out"
              onPress={handleSignOut}
              variant="outline"
              size="md"
              icon={
                <Ionicons name="log-out-outline" size={18} color="#10B981" />
              }
            />
          </View>
        )}

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  isLast = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center py-3 ${
        !isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''
      }`}
    >
      <Ionicons name={icon} size={18} color="#64748B" />
      <Text className="text-sm text-slate-500 dark:text-slate-400 ml-3 w-16">
        {label}
      </Text>
      <Text className="text-sm font-medium text-slate-900 dark:text-white flex-1">
        {value}
      </Text>
    </View>
  );
}
