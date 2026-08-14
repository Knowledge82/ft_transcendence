import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createArticle, updateArticle, getArticleById } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Input, Textarea, Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { translateApiError } from '../utils/apiErrors';

const MODERATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];
const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 2000;

export function NewArticlePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [isLoading, setIsLoading] = useState(true);
  const [notAllowed, setNotAllowed] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const meRequest = apiClient.get<{ id: number; role: string }>('/users/me');

    if (isEditMode && id) {
      Promise.all([meRequest, getArticleById(Number(id))]).then(([me, article]) => {
        setTitle(article.title);
        setContent(article.content);

        const isAuthor = me.data.id === article.author.id;
        const isArzobispo = me.data.role === 'ARZOBISPO';
        setNotAllowed(!isAuthor && !isArzobispo);
        setIsLoading(false);
      });
    } else {
      meRequest.then((me) => {
        setNotAllowed(!MODERATOR_ROLES.includes(me.data.role));
        setIsLoading(false);
      });
    }
  }, [id, isEditMode]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPublishing(true);

    try {
      const article = isEditMode
        ? await updateArticle(Number(id), title.trim(), content.trim())
        : await createArticle(title.trim(), content.trim());
      navigate(ROUTES.ARTICLE(article.id));
    } catch (err) {
      const data = (err as { response?: { data?: { code?: string; message?: string | string[] } } })
        ?.response?.data;
      setError(translateApiError(data, t, t('articles.defaultRejection')));
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (notAllowed) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">
          {isEditMode ? t('articles.notAllowedEdit') : t('articles.notAllowedNew')}
        </p>
        <BackLink to={ROUTES.LIBRARY} label={t('articles.backToLibrary')} />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.LIBRARY} label={t('articles.backToLibrary')} />
          <LanguageSwitcher />
        </div>

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-2">
          {isEditMode ? t('articles.editHeading') : t('articles.newHeading')}
        </h1>
        <p className="text-sm text-cream-400 mb-8">
          {isEditMode ? t('articles.oracleIntroEdit') : t('articles.oracleIntroNew')}
        </p>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-cream-400 mb-1">
                {t('articles.titleLabel')}
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              />
              <span className="text-xs text-cream-400">
                {title.length}/{MAX_TITLE_LENGTH}
              </span>
            </div>

            <div>
              <label htmlFor="content" className="block text-sm font-medium text-cream-400 mb-1">
                {t('articles.contentLabel')}
              </label>
              <Textarea
                id="content"
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX_CONTENT_LENGTH))}
              />
              <span className="text-xs text-cream-400">
                {content.length}/{MAX_CONTENT_LENGTH}
              </span>
            </div>

            {error && (
              <div className="bg-ink-950 border border-error-500 rounded-md p-3">
                <p className="text-sm text-error-500">🔥 {error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={isPublishing || title.trim().length < 3 || content.trim().length < 50}
              className="w-full"
            >
              {isPublishing
                ? t('articles.judging')
                : isEditMode
                ? t('articles.saveChanges')
                : t('articles.publish')}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
