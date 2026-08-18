import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ROUTES } from '../routes';

// A custom full-bleed layout, not PageContainer — PageContainer's own
// solid background and decorative side monks would clash with this
// page's own background image, the same reasoning LandingPage follows
// for its hero image.
export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div
      className="relative min-h-screen bg-cover bg-center flex flex-col items-center justify-center px-4 text-center"
      style={{ backgroundImage: "url('/404-hoguera.jpg')" }}
    >
      {/* Dark overlay — the photo itself is busy and high-contrast, the
          text needs a darkened layer beneath it to stay readable */}
      <div className="absolute inset-0 bg-black/60" />

      <div className="fixed top-4 end-4 z-20">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 bg-ink-950/85 border border-border-default rounded-xl p-8 max-w-md">
        <p className="text-6xl font-bold text-gold-500 mb-4" dir="ltr">
          404
        </p>
        <h1 className="text-2xl font-semibold text-cream-100 mb-2">{t('notFound.heading')}</h1>
        <p className="text-sm text-cream-400 mb-8">{t('notFound.body')}</p>

        <Link
          to={ROUTES.LANDING}
          className="inline-block bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
        >
          {t('notFound.backHome')}
        </Link>
      </div>
    </div>
  );
}
