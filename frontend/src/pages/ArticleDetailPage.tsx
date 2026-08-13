import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getArticleById } from '../api/articles';
import type { Article } from '../api/articles';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Avatar } from '../components/ui';

export function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getArticleById(Number(id))
      .then(setArticle)
      .catch(() => setError('No se pudo encontrar este tratado'))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !article) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">{error ?? 'Tratado no encontrado'}</p>
        <BackLink to={ROUTES.LIBRARY} label="← Volver a la Biblioteca" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <BackLink to={ROUTES.LIBRARY} label="← Volver a la Biblioteca" />

        <Card className="mt-6">
          <h1 className="text-2xl font-semibold text-gold-500 mb-4">{article.title}</h1>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-ink-800">
            <Avatar
              avatarUrl={article.author.avatarUrl}
              fallbackText={article.author.displayName ?? '?'}
              size={40}
            />
            <div>
              <p className="text-sm text-cream-100">
                {article.author.displayName ?? `Usuario ${article.author.id}`}
              </p>
              <p className="text-xs text-cream-400">
                {new Date(article.createdAt).toLocaleDateString('es-ES', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="space-y-4 text-cream-100 leading-relaxed">
            {article.content.split('\n').filter(Boolean).map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </Card>
      </div>
    </PageContainer>
  );
}
