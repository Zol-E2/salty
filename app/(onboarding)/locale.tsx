/**
 * @file app/(onboarding)/locale.tsx
 * Onboarding step 1 of 6 — language and currency selection.
 *
 * Route: `/(onboarding)/locale`
 * Placed immediately after Welcome so the rest of the onboarding flow is
 * already shown in the user's chosen language.
 *
 * Behaviour:
 *   - Tapping a language row calls `setLanguage` on the onboarding store and
 *     immediately calls `changeLanguage()` on i18next so subsequent screens
 *     re-render in the selected language without any delay.
 *   - Tapping a currency row calls `setCurrency` on the onboarding store.
 *   - The "Continue" button is enabled once both a language and a currency have
 *     been confirmed (both have safe defaults of 'en' / 'USD', so the button
 *     is enabled on first render — the user can always tap Continue directly).
 */

import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { ProgressDots } from '../../components/onboarding/ProgressDots';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { LANGUAGES, CURRENCIES } from '../../lib/constants';
import { changeLanguage } from '../../lib/i18n';

/** Locale selection onboarding step — language and currency pickers. */
export default function LocaleScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { language, currency, setLanguage, setCurrency } = useOnboardingStore();

  /**
   * Handles a language selection: persists to store and immediately applies
   * the new language to i18next so the UI relabels without a reload.
   *
   * @param lang - BCP 47 language code selected by the user.
   */
  const handleSelectLanguage = (lang: string) => {
    setLanguage(lang);
    // Apply language immediately — the rest of the onboarding flow will render
    // in the selected language without waiting for markComplete().
    changeLanguage(lang);
  };

  return (
    <SafeAreaView className="flex-1 bg-stone-50 dark:bg-slate-950">
      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        <View className="pt-8 mb-8">
          <ProgressDots total={6} current={1} />
        </View>

        <Text className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          {t('onboarding.locale.title')}
        </Text>
        <Text className="text-base text-slate-500 dark:text-slate-400 mb-8">
          {t('onboarding.locale.subtitle')}
        </Text>

        {/* --- Language picker --- */}
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          {t('onboarding.locale.languageSection')}
        </Text>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 overflow-hidden">
          {LANGUAGES.map((lang, index) => (
            <LanguageRow
              key={lang.key}
              flag={lang.flag}
              label={lang.label}
              selected={language === lang.key}
              isLast={index === LANGUAGES.length - 1}
              onPress={() => handleSelectLanguage(lang.key)}
            />
          ))}
        </View>

        {/* --- Currency picker --- */}
        <Text className="text-base font-semibold text-slate-900 dark:text-white mb-3">
          {t('onboarding.locale.currencySection')}
        </Text>
        <View className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 mb-8 overflow-hidden">
          {CURRENCIES.map((curr, index) => (
            <CurrencyRow
              key={curr.key}
              symbol={curr.symbol}
              currencyKey={curr.key}
              label={curr.label}
              selected={currency === curr.key}
              isLast={index === CURRENCIES.length - 1}
              onPress={() => setCurrency(curr.key)}
            />
          ))}
        </View>
      </ScrollView>

      <View className="px-6 pb-8 pt-4 bg-stone-50 dark:bg-slate-950">
        <Button
          title={t('common.continue')}
          onPress={() => router.push('/(onboarding)/goals')}
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Private components
// ---------------------------------------------------------------------------

/**
 * LanguageRow renders a single selectable row in the language picker.
 * A checkmark appears on the right when the row is selected.
 *
 * @param props.flag - Flag emoji shown to the left of the label.
 * @param props.label - Native-script language name (e.g. `'Magyar'`).
 * @param props.selected - Whether this row is currently active.
 * @param props.isLast - Omits the bottom border on the last row.
 * @param props.onPress - Called when the user taps the row.
 */
function LanguageRow({
  flag,
  label,
  selected,
  isLast,
  onPress,
}: {
  flag: string;
  label: string;
  selected: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''
      }`}
    >
      <Text className="text-2xl mr-3">{flag}</Text>
      <Text
        className={`flex-1 text-base ${
          selected
            ? 'font-semibold text-primary-600 dark:text-primary-400'
            : 'font-normal text-slate-900 dark:text-white'
        }`}
      >
        {label}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
      )}
    </TouchableOpacity>
  );
}

/**
 * CurrencyRow renders a single selectable row in the currency picker.
 * Shows the ISO code, symbol, and full name; checkmark when selected.
 *
 * @param props.symbol - Currency symbol (e.g. `'Ft'`, `'€'`).
 * @param props.currencyKey - ISO 4217 code shown as secondary label (e.g. `'HUF'`).
 * @param props.label - Full currency name (e.g. `'Hungarian Forint'`).
 * @param props.selected - Whether this row is currently active.
 * @param props.isLast - Omits the bottom border on the last row.
 * @param props.onPress - Called when the user taps the row.
 */
function CurrencyRow({
  symbol,
  currencyKey,
  label,
  selected,
  isLast,
  onPress,
}: {
  symbol: string;
  currencyKey: string;
  label: string;
  selected: boolean;
  isLast: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`flex-row items-center px-4 py-3.5 ${
        !isLast ? 'border-b border-slate-100 dark:border-slate-800' : ''
      }`}
    >
      <View className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl items-center justify-center mr-3">
        <Text
          className={`text-sm font-bold ${
            selected
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-slate-700 dark:text-slate-300'
          }`}
        >
          {symbol}
        </Text>
      </View>
      <View className="flex-1">
        <Text
          className={`text-base ${
            selected
              ? 'font-semibold text-primary-600 dark:text-primary-400'
              : 'font-normal text-slate-900 dark:text-white'
          }`}
        >
          {currencyKey}
        </Text>
        <Text className="text-sm text-slate-500 dark:text-slate-400">{label}</Text>
      </View>
      {selected && (
        <Ionicons name="checkmark-circle" size={22} color="#10B981" />
      )}
    </TouchableOpacity>
  );
}
