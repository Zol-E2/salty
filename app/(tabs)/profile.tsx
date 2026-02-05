import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { useProfile } from '../../hooks/useProfile';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { GOALS, SKILL_LEVELS, DIETARY_OPTIONS } from '../../lib/constants';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();
  const { data: profile } = useProfile();
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
        <View className="pt-4 pb-6 flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              Profile
            </Text>
            <Text className="text-sm text-slate-500 dark:text-slate-400">
              {isAuthenticated ? user?.email : 'Not signed in'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center"
          >
            <Ionicons name="settings-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>

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

        {/* Pro Upgrade */}
        <Card className="mb-4 border-amber-300 dark:border-amber-700">
          <View className="flex-row items-center mb-3">
            <View className="w-10 h-10 bg-amber-100 dark:bg-amber-400/10 rounded-xl items-center justify-center mr-3">
              <Ionicons name="star" size={20} color="#F59E0B" />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">
                Upgrade to Salty Pro
              </Text>
              <Text className="text-sm text-slate-500 dark:text-slate-400">
                Unlock the full experience
              </Text>
            </View>
          </View>

          <View className="mb-4">
            <ProFeature label="Unlimited AI meal plans" />
            <ProFeature label="Detailed macros & nutrition" />
            <ProFeature label="Grocery list export" />
          </View>

          <Text className="text-center text-sm text-slate-500 dark:text-slate-400 mb-3">
            $4.99/month
          </Text>

          <Button
            title="Upgrade"
            onPress={() =>
              Alert.alert(
                'Coming Soon',
                'Pro subscriptions will be available in a future update.'
              )
            }
            size="md"
            icon={<Ionicons name="star" size={18} color="white" />}
          />
        </Card>

        {/* Sign out */}
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

        <View className="h-8" />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProFeature({ label }: { label: string }) {
  return (
    <View className="flex-row items-center mb-2">
      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
      <Text className="text-sm text-slate-700 dark:text-slate-300 ml-2">
        {label}
      </Text>
    </View>
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
