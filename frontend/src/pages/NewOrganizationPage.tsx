import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createOrganization } from '../api/organizations';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Input, Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { translateApiError } from '../utils/apiErrors';

const CREATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];
const MAX_NAME_LENGTH = 50;
const DEFAULT_COLOR = '#c0392b';

export function NewOrganizationPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ role: string }>('/users/me').then((me) => {
      setNotAllowed(!CREATOR_ROLES.includes(me.data.role));
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const org = await createOrganization(name.trim(), color);
      navigate(ROUTES.ORGANIZATION(org.id));
    } catch (err) {
      const data = (
        err as { response?: { data?: { code?: string; message?: string | string[] } } }
      )?.response?.data;
      setError(translateApiError(data, t, t('organizations.createError')));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (notAllowed) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">{t('organizations.notAllowedCreate')}</p>
        <BackLink to={ROUTES.ORGANIZATIONS} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.ORGANIZATIONS} />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-8">
          {t('organizations.createHeading')}
        </h1>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-cream-400 mb-1">
                {t('organizations.nameLabel')}
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              />
              <span className="text-xs text-cream-400" dir="ltr">
                {name.length}/{MAX_NAME_LENGTH}
              </span>
            </div>

            <div>
              <label htmlFor="color" className="block text-sm font-medium text-cream-400 mb-1">
                {t('organizations.colorLabel')}
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-12 h-10 rounded-md border border-border-default bg-ink-950 cursor-pointer"
                />
                <span className="text-sm text-cream-400" dir="ltr">
                  {color}
                </span>
              </div>
            </div>

            {error && (
              <p role="alert" className="text-sm text-error-500">
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting || name.trim().length < 3}
              className="w-full"
            >
              {isSubmitting ? t('organizations.creating') : t('organizations.createSubmit')}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
