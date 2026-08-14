import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes';
import { PageContainer, BackLink } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getDateLocale } from '../utils/dateLocale';

export function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation();
  const lastUpdated = new Date().toLocaleDateString(getDateLocale(i18n.language));

  return (
    <PageContainer className="px-4 py-16">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.LANDING} />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-semibold text-gold-500 mt-6 mb-8">
          {t('legal.privacyTitle')}
        </h1>

        <div className="space-y-6 text-cream-100 leading-relaxed text-sm">
          <p className="text-cream-400">
            {t('legal.lastUpdated', { date: lastUpdated })}
          </p>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS1Title')}
            </h2>
            <p>{t('legal.privacyS1Body')}</p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS2Title')}
            </h2>
            <p>{t('legal.privacyS2Body')}</p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS3Title')}
            </h2>
            <p>{t('legal.privacyS3Body')}</p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS4Title')}
            </h2>
            <p>{t('legal.privacyS4Body')}</p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS5Title')}
            </h2>
            <p>{t('legal.privacyS5Body')}</p>
          </section>

          <section>
            <h2 className="text-lg text-gold-400 font-medium mb-2">
              {t('legal.privacyS6Title')}
            </h2>
            <p>{t('legal.privacyS6Body')}</p>
          </section>
        </div>
      </div>
    </PageContainer>
  );
}
