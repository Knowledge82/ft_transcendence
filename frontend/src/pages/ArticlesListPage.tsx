import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAllArticles } from '../api/articles';
import type { Article } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Button } from '../components/ui';

const MODERATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];

function excerpt(content: string, maxLength = 180): string {
  if (content.length <= maxLength) {
    return content;
  }
  return content.slice(0, maxLength).trim() + '…';
}

export function ArticlesListPage() {
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
        <BackLink to={ROUTES.HOME} />

        <div className="flex justify-between items-center mt-4 mb-8">
          <h1 className="text-3xl font-semibold text-gold-500">Biblioteca</h1>
          {canWrite && (
            <Link to={ROUTES.NEW_ARTICLE}>
              <Button>Escribir un tratado</Button>
            </Link>
          )}
        </div>

        {articles.length === 0 ? (
          <p className="text-cream-400">Todavía no se ha escrito ningún tratado.</p>
        ) : (
          <div className="space-y-4">
            {articles.map((article) => (
              <Link key={article.id} to={ROUTES.ARTICLE(article.id)}>
                <Card className="hover:border-gold-500 transition-colors">
                  <h2 className="text-lg font-semibold text-gold-500 mb-1">
                    {article.title}
                  </h2>
                  <p className="text-xs text-cream-400 mb-3">
                    {article.author.displayName ?? `Usuario ${article.author.id}`} ·{' '}
                    {new Date(article.createdAt).toLocaleDateString('es-ES')}
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
