import { useState, useRef, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { streamConfession } from '../api/ai';

const MAX_LENGTH = 4000;

export function ConfesionarioPage() {
  const [makefile, setMakefile] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!makefile.trim() || isStreaming) {
      return;
    }

    setError(null);
    setResponse('');
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      for await (const chunk of streamConfession(makefile, controller.signal)) {
        setResponse((prev) => prev + chunk);
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsStreaming(false);
    }
  }

  function handleCancel() {
    abortRef.current?.abort();
  }

  return (
    <div className="min-h-screen bg-ink-950 px-4 py-10">
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
          <textarea
            value={makefile}
            onChange={(e) => setMakefile(e.target.value.slice(0, MAX_LENGTH))}
            placeholder="all:&#10;&#9;gcc main.c -o program"
            rows={10}
            className="w-full rounded-md bg-ink-900 border border-ink-800 px-3 py-2 text-cream-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 resize-y"
          />
          <div className="flex justify-between items-center text-xs text-cream-400">
            <span>{makefile.length}/{MAX_LENGTH}</span>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isStreaming || !makefile.trim()}
              className="bg-gold-500 text-gold-on font-medium px-6 py-2 rounded-md hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isStreaming ? 'Confesando...' : 'Confesarme'}
            </button>
            {isStreaming && (
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

        {response && (
          <div className="mt-6 bg-ink-900 border border-ink-800 rounded-lg p-6">
            <p className="text-xs uppercase tracking-wide text-gold-500 mb-3">
              El Confesor dice:
            </p>
            <p className="text-cream-100 leading-relaxed whitespace-pre-wrap">
              {response}
              {isStreaming && <span className="animate-pulse">▌</span>}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
