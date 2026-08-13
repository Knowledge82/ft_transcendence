import { useTranslation } from 'react-i18next';

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950">
      <p className="text-cream-400">{t('common.loading')}</p>
    </div>
  );
}
