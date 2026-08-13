import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getArticleById, deleteArticle } from '../api/articles';
import type { Article } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Avatar, IconButton } from '../components/ui';
import { getGenderedRole } from '../utils/genderedRole';

export function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [article, setArticle] = useState<Article | null>(null);
  const [ownUserId, setOwnUserId] = useState<number | null>(null);
  const [ownRole, setOwnRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getArticleById(Number(id)),
      apiClient.get<{ id: number; role: string }>('/users/me'),
    ])
      .then(([articleData, me]) => {
        setArticle(articleData);
        setOwnUserId(me.data.id);
        setOwnRole(me.data.role);
      })
      .catch(() => setError('No se pudo encontrar este tratado'))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isArzobispo = ownRole === 'ARZOBISPO';
  const isAuthor = article !== null && ownUserId === article.author.id;
  const canEdit = isAuthor || isArzobispo;

  async function handleDelete() {
    if (!article) return;
    if (!confirm('¿Seguro que quieres retirar este tratado de la biblioteca? Esta acción no se puede deshacer.')) {
      return;
    }
    await deleteArticle(article.id);
    navigate(ROUTES.LIBRARY);
  }

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
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.LIBRARY} label="← Volver a la Biblioteca" />
          {canEdit && (
            <div className="flex gap-3">
              <Link
                to={`${ROUTES.ARTICLE(article.id)}/editar`}
                className="text-xs text-gold-500 hover:text-gold-400"
              >
                Editar
              </Link>
              {isArzobispo && (
                <IconButton tone="danger" onClick={handleDelete}>
                  Eliminar
                </IconButton>
              )}
            </div>
          )}
        </div>

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
                {getGenderedRole(article.author.role, article.author.gender)}{' '}
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
