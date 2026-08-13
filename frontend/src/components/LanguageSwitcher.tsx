import { useTranslation } from 'react-i18next';

const LANGUAGES = [
  { code: 'es', label: 'ES' },
  { code: 'en', label: 'EN' },
  { code: 'ar', label: 'ع' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="inline-flex rounded-full border border-ink-800 bg-ink-950 p-1">
      {LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
            i18n.language === lang.code
              ? 'bg-gold-500 text-gold-on font-medium'
              : 'text-cream-400 hover:text-cream-100'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
