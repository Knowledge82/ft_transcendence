import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listOrganizations } from '../api/organizations';
import type { OrganizationSummary } from '../api/organizations';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

const CREATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];

function excerpt(text: string, maxLength = 140): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength).trim() + '…';
}

export function OrganizationsListPage() {
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([]);
  const [canCreate, setCanCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      listOrganizations(),
      apiClient.get<{ role: string }>('/users/me'),
    ]).then(([orgList, me]) => {
      setOrganizations(orgList);
      setCanCreate(CREATOR_ROLES.includes(me.data.role));
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.HOME} />
          <LanguageSwitcher />
        </div>

        <div className="flex justify-between items-center mt-4 mb-8">
          <h1 className="text-3xl font-semibold text-gold-500">{t('organizations.title')}</h1>
          {canCreate && (
            <Link to={ROUTES.NEW_ORGANIZATION}>
              <Button>{t('organizations.createButton')}</Button>
            </Link>
          )}
        </div>

        {organizations.length === 0 ? (
          <p className="text-cream-400">{t('organizations.empty')}</p>
        ) : (
          <div className="space-y-4">
            {organizations.map((org) => (
              <Link key={org.id} to={ROUTES.ORGANIZATION(org.id)}>
                <Card className="hover:border-gold-500 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: org.color }}
                      aria-hidden="true"
                    />
                    <h2 className="text-lg font-semibold text-gold-500">{org.name}</h2>
                  </div>
                  <p className="text-xs text-cream-400 mb-3">
                    {t('organizations.memberCount', { count: org._count.members })}
                  </p>
                  <p className="text-sm text-cream-100">
                    {org.manifesto ? excerpt(org.manifesto) : t('organizations.noManifesto')}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
