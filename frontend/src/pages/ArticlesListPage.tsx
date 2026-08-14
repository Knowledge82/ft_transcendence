import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getAllArticles } from '../api/articles';
import type { Article } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getGenderedRole } from '../utils/genderedRole';
import { getDateLocale } from '../utils/dateLocale';

const MODERATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];

function excerpt(content: string, maxLength = 180): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength).trim() + '…';
}

export function ArticlesListPage() {
  const { t, i18n } = useTranslation();
  const [articles, setArticles] = useState<Article[]>([]);
  const [canWrite, setCanWrite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getAllArticles(),
      apiClient.get<{ role: string }>('/users/me'),
    ]).then(([articleList, me]) => {
      setArticles(articleList);
      setCanWrite(MODERATOR_ROLES.includes(me.data.role));
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
          <h1 className="text-3xl font-semibold text-gold-500">{t('articles.title')}</h1>
          {canWrite && (
            <Link to={ROUTES.NEW_ARTICLE}>
              <Button>{t('articles.writeButton')}</Button>
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="text-cream-400">{t('articles.empty')}</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link key={article.id} to={ROUTES.ARTICLE(article.id)}>
                <Card className="hover:border-gold-500 transition-colors">
                  <h2 className="text-lg font-semibold text-gold-500 mb-1">
                    {article.title}
                  </h2>
                  <p className="text-xs text-cream-400 mb-3">
                    {getGenderedRole(article.author.role, article.author.gender, i18n.language)}{' '}
                    {article.author.displayName ?? `${t('common.user')} ${article.author.id}`}
                    {' · '}
                    {new Date(article.createdAt).toLocaleDateString(getDateLocale(i18n.language))}
                  </p>
                  <p className="text-sm text-cream-100">{excerpt(article.content)}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
