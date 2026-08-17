import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border-default py-4 px-4">
      <div className="max-w-2xl mx-auto flex justify-center gap-6 text-xs text-cream-400">
        <Link to="/privacy" className="hover:text-gold-500">
          {t('legal.privacyTitle')}
        </Link>
        <Link to="/terms" className="hover:text-gold-500">
          {t('legal.termsTitle')}
        </Link>
      </div>
    </footer>
  );
}
