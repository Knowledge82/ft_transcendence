import { getAccessToken } from './client';

// Native fetch is used here instead of our axios instance because axios
// in the browser buffers the whole response before exposing it — we need
// access to chunks as they arrive, which requires reading the raw stream.
export async function* streamConfession(
  makefile: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const response = await fetch('/api/ai/confess', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ makefile }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.message ?? `Error ${response.status}`);
  }

  if (!response.body) {
    throw new Error('El navegador no admite streaming de respuestas');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    yield decoder.decode(value, { stream: true });
  }
}
