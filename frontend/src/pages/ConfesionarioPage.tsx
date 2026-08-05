import { useState, useRef, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { streamConfession } from '../api/ai';
import { PageContainer, Card, Textarea, Button } from '../components/ui';

const MAX_LENGTH = 4000;
// How slowly the text "speaks" on screen, independent of how fast the
// real data actually arrives from Groq (which is nearly instant) — this
// is purely cosmetic, for a more solemn, deliberate pace.
const REVEAL_MS_PER_CHAR = 18;

export function ConfesionarioPage() {
  const [makefile, setMakefile] = useState('');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const [fullText, setFullText] = useState('');
  const [visibleLength, setVisibleLength] = useState(0);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    if (visibleLength >= fullText.length) {
      return;
    }
    const timeoutId = setTimeout(() => {
      setVisibleLength((prev) => prev + 1);
    }, REVEAL_MS_PER_CHAR);
    return () => clearTimeout(timeoutId);
  }, [visibleLength, fullText]);

  const isStreaming = isFetching || visibleLength < fullText.length;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!makefile.trim() || isStreaming) {
      return;
    }

    setError(null);
    setFullText('');
    setVisibleLength(0);
    setIsFetching(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const chunk of streamConfession(makefile, controller.signal)) {
        setFullText((prev) => prev + chunk);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsFetching(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  const visibleResponse = fullText.slice(0, visibleLength);

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <Link to="/altar" className="text-sm text-gold-500 hover:text-gold-400">
          ← Volver
        </Link>

        <h1 className="text-3xl font-semibold text-gold-500 mt-4 mb-2">
          El Confesionario
        </h1>
        <p className="text-sm text-cream-400 mb-8">
          Trae tu Makefile ante el Confesor. Él verá tus pecados... y te dirá la verdad.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            value={makefile}
            onChange={(e) => setMakefile(e.target.value.slice(0, MAX_LENGTH))}
            placeholder={'all:\n\tgcc main.c -o program'}
            rows={10}
          />
          <div className="flex justify-between items-center text-xs text-cream-400">
            <span>{makefile.length}/{MAX_LENGTH}</span>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={isStreaming || !makefile.trim()}>
              {isStreaming ? 'Confesando...' : 'Confesarme'}
            </Button>
            {isFetching && (
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm text-cream-400 hover:text-cream-100"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>

        {error && (
          <div className="mt-6 bg-ink-900 border border-error-500 rounded-lg p-4">
            <p className="text-error-500 text-sm">{error}</p>
          </div>
        )}

        {fullText && (
          <Card className="mt-6">
            <p className="text-xs uppercase tracking-wide text-gold-500 mb-3">
              El Confesor dice:
            </p>
            <p className="text-cream-100 leading-relaxed whitespace-pre-wrap">
              {visibleResponse}
              {isStreaming && <span className="animate-pulse">▌</span>}
            </p>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
