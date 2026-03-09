/**
 * @file lib/i18n.ts
 * i18next configuration and `changeLanguage` helper.
 *
 * All 10 locale JSON files are imported statically — React Native does not
 * support dynamic `require()` from a variable path, so we bundle every locale
 * at build time. Each file is keyed to the `translation` namespace (default).
 *
 * The initial language is determined by `expo-localization`: if the device
 * locale matches one of our supported languages it is used; otherwise the app
 * falls back to English. The user can override this in Settings.
 *
 * Usage:
 *   import { useTranslation } from 'react-i18next';
 *   const { t } = useTranslation();
 *   t('common.cancel') // → 'Cancel' (or translated equivalent)
 */

import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// --- Locale JSON imports ---
import en from '../locales/en.json';
import hu from '../locales/hu.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import es from '../locales/es.json';
import it from '../locales/it.json';
import pt from '../locales/pt.json';
import nl from '../locales/nl.json';
import el from '../locales/el.json';
import fi from '../locales/fi.json';

/** All supported language codes — used for runtime validation. */
export const SUPPORTED_LANGUAGES = ['en', 'hu', 'de', 'fr', 'es', 'it', 'pt', 'nl', 'el', 'fi'];

// Resolve device locale to one of our supported languages.
// `getLocales()` returns an ordered list; we check the primary language code.
const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
const initialLang = SUPPORTED_LANGUAGES.includes(deviceLang) ? deviceLang : 'en';

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hu: { translation: hu },
    de: { translation: de },
    fr: { translation: fr },
    es: { translation: es },
    it: { translation: it },
    pt: { translation: pt },
    nl: { translation: nl },
    el: { translation: el },
    fi: { translation: fi },
  },
  lng: initialLang,
  fallbackLng: 'en',
  interpolation: {
    // React already escapes output — disable i18next's escaping to avoid double-encoding
    escapeValue: false,
  },
});

/**
 * Changes the active i18next language at runtime.
 * Call this immediately after the user selects a new language in Settings or
 * the locale onboarding step so the UI re-renders in the chosen language.
 *
 * @param lang - BCP 47 language code (must be one of `SUPPORTED_LANGUAGES`).
 * @returns Promise that resolves once i18next has loaded the new language resources.
 */
export async function changeLanguage(lang: string): Promise<void> {
  await i18next.changeLanguage(lang);
}

export default i18next;
