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

function excerpt(text: string, maxLength = 90): string {
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
          <div className="grid grid-cols-2 gap-4">
            {organizations.map((org) =>
              org.bannerUrl ? (
                <Link key={org.id} to={ROUTES.ORGANIZATION(org.id)}>
                  <div
                    className="relative aspect-square rounded-xl overflow-hidden border border-border-default hover:border-gold-500 transition-colors bg-cover bg-center"
                    style={{ backgroundImage: `url(${org.bannerUrl})` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    <div className="relative z-10 h-full flex flex-col justify-end p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: org.color }}
                          aria-hidden="true"
                        />
                        <h2 className="text-sm font-semibold text-white truncate">{org.name}</h2>
                      </div>
                      <p className="text-xs text-cream-100 mb-1">
                        {t('organizations.memberCount', { count: org._count.members })}
                      </p>
                      <p className="text-xs text-cream-100 line-clamp-2">
                        {org.manifesto ? excerpt(org.manifesto) : t('organizations.noManifesto')}
                      </p>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link key={org.id} to={ROUTES.ORGANIZATION(org.id)}>
                  <Card className="aspect-square flex flex-col justify-center hover:border-gold-500 transition-colors">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: org.color }}
                        aria-hidden="true"
                      />
                      <h2 className="text-sm font-semibold text-gold-500 truncate">{org.name}</h2>
                    </div>
                    <p className="text-xs text-cream-100 mb-1">
                      {t('organizations.memberCount', { count: org._count.members })}
                    </p>
                    <p className="text-xs text-cream-400 line-clamp-3">
                      {org.manifesto ? excerpt(org.manifesto) : t('organizations.noManifesto')}
                    </p>
                  </Card>
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
