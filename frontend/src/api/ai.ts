import { getAccessToken } from './client';
import i18n from '../i18n/i18n';

interface ApiErrorData {
  code?: string;
  message?: string | string[];
  max?: number;
}

// Wraps the raw error data from the backend (or a client-side detection
// like "streaming not supported") in a real Error object, WITHOUT baking
// it into a final display string — the caller decides how to translate
// it, via utils/apiErrors.ts's translateApiError.
export class ApiError extends Error {
  data: ApiErrorData | null;

  constructor(data: ApiErrorData | null, status: number) {
    const fallbackText = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message ?? data?.code ?? `Error ${status}`;
    super(fallbackText);
    this.data = data;
  }
}

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
      'Accept-Language': i18n.language,
      Authorization: `Bearer ${getAccessToken()}`,
    },
    body: JSON.stringify({ makefile }),
    signal,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new ApiError(data, response.status);
  }

  if (!response.body) {
    throw new ApiError({ code: 'STREAMING_NOT_SUPPORTED' }, 0);
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
