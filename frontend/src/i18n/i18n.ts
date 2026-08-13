import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

const STORAGE_KEY = 'language';

// Reads any language the user picked on a previous visit — falls back to
// Spanish (the project's original language) if nothing was ever chosen
const savedLanguage = localStorage.getItem(STORAGE_KEY) ?? 'es';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: savedLanguage,
  fallbackLng: 'es',
  interpolation: {
    // React already escapes values when rendering — asking i18next to
    // also escape them would double-escape special characters
    escapeValue: false,
  },
});

// Keeps <html dir="rtl"/"ltr"> and lang="..." in sync with the current
// language — this is what actually makes Arabic render right-to-left,
// not just the text content itself
export function applyDocumentDirection(language: string) {
  const isRtl = language === 'ar';
  document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
  document.documentElement.lang = language;
}

i18n.on('languageChanged', (language) => {
  localStorage.setItem(STORAGE_KEY, language);
  applyDocumentDirection(language);
});

// Apply immediately on first load too, not just on future changes
applyDocumentDirection(savedLanguage);

export default i18n;
