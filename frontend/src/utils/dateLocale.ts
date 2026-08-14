const LOCALE_MAP: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  ar: 'ar-SA',
};

export function getDateLocale(language: string): string {
  return LOCALE_MAP[language] ?? 'es-ES';
}
