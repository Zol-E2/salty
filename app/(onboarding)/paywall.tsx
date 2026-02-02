import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    highlight: false,
    features: [
      '3 AI meal plans / week',
      'Basic recipes',
      'Calendar view',
    ],
    missing: [
      'Unlimited AI generations',
      'Detailed macros & nutrition',
      'Grocery list export',
    ],
  },
  {
    name: 'Pro',
    price: '$4.99',
    period: '/month',
    highlight: true,
    badge: 'Most Popular',
    features: [
      'Unlimited AI meal plans',
      'Detailed macros & nutrition',
      'Grocery list export',
      'Priority support',
    ],
    missing: [],
  },
  {
    name: 'Pro+',
    price: '$9.99',
    period: '/month',
    highlight: false,
    features: [
      'Everything in Pro',
      'Meal prep batch planning',
      'Share plans with roommates',
      'Custom recipe import',
    ],
    missing: [],
  },
];

export default function PaywallScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="px-6 pt-8">
          <ProgressDots total={6} current={4} />
        </View>

        <View className="px-6 pt-8 pb-4 items-center">
          <View className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl items-center justify-center mb-4">
            <Ionicons name="star" size={28} color="#F59E0B" />
          </View>
          <Text className="text-2xl font-bold text-slate-900 dark:text-white text-center mb-2">
            Unlock the full experience
          </Text>
          <Text className="text-base text-slate-500 dark:text-slate-400 text-center">
            Choose a plan that fits your budget
          </Text>
        </View>

        <View className="px-6 gap-3 pb-4">
          {PLANS.map((plan) => (
            <View
              key={plan.name}
              className={`rounded-2xl p-4 border-2 ${
                plan.highlight
                  ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-400/10'
                  : 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900'
              }`}
            >
              <View className="flex-row items-center justify-between mb-2">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={`text-lg font-bold ${
                      plan.highlight
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {plan.name}
                  </Text>
                  {plan.badge && (
                    <View className="bg-primary-500 dark:bg-primary-400 px-2 py-0.5 rounded-full">
                      <Text className="text-xs font-bold text-white">
                        {plan.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-baseline">
                  <Text
                    className={`text-xl font-bold ${
                      plan.highlight
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {plan.price}
                  </Text>
                  <Text className="text-sm text-slate-500 dark:text-slate-400">
                    {plan.period}
                  </Text>
                </View>
              </View>

              {plan.features.map((feature) => (
                <View key={feature} className="flex-row items-center mt-1.5">
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                    {feature}
                  </Text>
                </View>
              ))}

              {plan.missing?.map((feature) => (
                <View key={feature} className="flex-row items-center mt-1.5">
                  <Ionicons name="close-circle" size={16} color="#CBD5E1" />
                  <Text className="text-sm text-slate-400 dark:text-slate-500 ml-2">
                    {feature}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-8 pt-4 gap-3 bg-stone-50 dark:bg-slate-950">
        <Button
          title="Continue"
          onPress={() => router.push('/(auth)/login')}
          size="lg"
        />
        <Button
          title="Skip for now"
          onPress={() => router.replace('/(tabs)/calendar')}
          variant="ghost"
          size="sm"
        />
      </View>
    </SafeAreaView>
  );
}
