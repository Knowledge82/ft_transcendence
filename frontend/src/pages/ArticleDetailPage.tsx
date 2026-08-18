import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getArticleById, deleteArticle } from '../api/articles';
import type { Article } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Avatar, IconButton } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { getGenderedRole } from '../utils/genderedRole';
import { getDateLocale } from '../utils/dateLocale';
import { useConfirm } from '../context/ConfirmContext';

export function ArticleDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const confirm = useConfirm();

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
      .catch(() => setError(t('articles.loadError')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const isArzobispo = ownRole === 'ARZOBISPO';
  const isAuthor = article !== null && ownUserId === article.author.id;
  const canEdit = isAuthor || isArzobispo;

  async function handleDelete() {
    if (!article) return;
    if (!(await confirm(t('articles.confirmDelete')))) {
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
        <p className="text-cream-100">{error ?? t('articles.notFound')}</p>
        <BackLink to={ROUTES.LIBRARY} label={t('articles.backToLibrary')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.LIBRARY} label={t('articles.backToLibrary')} />
          <div className="flex items-center gap-4">
            {canEdit && (
              <div className="flex gap-3">
                <Link
                  to={`${ROUTES.ARTICLE(article.id)}/editar`}
                  className="text-xs text-gold-500 hover:text-gold-400"
                >
                  {t('articles.edit')}
                </Link>
                {isArzobispo && (
                  <IconButton tone="danger" onClick={handleDelete}>
                    {t('articles.delete')}
                  </IconButton>
                )}
              </div>
            )}
            <LanguageSwitcher />
          </div>
        </div>

        <Card className="mt-6">
          <h1 className="text-2xl font-semibold text-gold-500 mb-4">{article.title}</h1>

          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border-default">
            <Avatar
              avatarUrl={article.author.avatarUrl}
              fallbackText={article.author.displayName ?? '?'}
              size={40}
            />
            <div>
              <p className="text-sm text-cream-100">
                {getGenderedRole(article.author.role, article.author.gender, i18n.language)}{' '}
                {article.author.displayName ?? `${t('common.user')} ${article.author.id}`}
              </p>
              <p className="text-xs text-cream-400">
                {new Date(article.createdAt).toLocaleDateString(getDateLocale(i18n.language), {
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
