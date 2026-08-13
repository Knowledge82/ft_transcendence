import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '../api/articles';
import { apiClient } from '../api/client';
import { ROUTES } from '../routes';
import { PageContainer, Card, LoadingScreen, BackLink, Input, Textarea, Button } from '../components/ui';

const MODERATOR_ROLES = ['INQUISIDOR', 'ARZOBISPO'];
const MAX_TITLE_LENGTH = 150;
const MAX_CONTENT_LENGTH = 5000;

export function NewArticlePage() {
  const navigate = useNavigate();

  const [ownRole, setOwnRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<{ role: string }>('/users/me').then((me) => {
      setOwnRole(me.data.role);
      setIsLoading(false);
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsPublishing(true);

    try {
      const article = await createArticle(title.trim(), content.trim());
      navigate(ROUTES.ARTICLE(article.id));
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
          ?.message ?? 'El Inquisidor ha rechazado esta petición.';
      setError(Array.isArray(message) ? message.join(', ') : message);
    } finally {
      setIsPublishing(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!ownRole || !MODERATOR_ROLES.includes(ownRole)) {
    return (
      <PageContainer className="flex flex-col items-center justify-center gap-4">
        <p className="text-cream-100">No tienes el rango necesario para escribir tratados.</p>
        <BackLink to={ROUTES.LIBRARY} label="← Volver a la Biblioteca" />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <BackLink to={ROUTES.LIBRARY} label="← Volver a la Biblioteca" />

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-2">
          Escribir un tratado
        </h1>
        <p className="text-sm text-cream-400 mb-8">
          El Inquisidor revisará que tu tratado sea conforme a la doctrina antes de
          publicarlo. Si no lo es, tendrás que hacer penitencia y volver a intentarlo.
        </p>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-cream-400 mb-1">
                Título
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
                Contenido
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
              {isPublishing ? 'El Inquisidor está juzgando...' : 'Publicar'}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
