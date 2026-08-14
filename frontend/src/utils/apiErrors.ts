const CODE_TO_KEY: Record<string, string> = {
  ORACLE_RATE_LIMITED: 'oracleRateLimited',
  CONFESSOR_RATE_LIMITED: 'confessorRateLimited',
  EMPTY_MAKEFILE: 'emptyMakefile',
  MAKEFILE_TOO_LONG: 'makefileTooLong',
  STREAMING_NOT_SUPPORTED: 'streamingNotSupported',
};

interface ApiErrorData {
  code?: string;
  message?: string | string[];
  max?: number;
}

// Backend errors now come in two shapes: a fixed, translatable CODE
// (rate limits, validation) which we translate here, or free creative
// text written by the LLM itself (e.g. the Oráculo's specific rejection
// reason) — shown as-is for now, still an open question until the
// language-aware prompt work is done.
export function translateApiError(
  data: ApiErrorData | undefined,
  t: (key: string, params?: Record<string, unknown>) => string,
  fallback: string,
): string {
  if (data?.code) {
    const key = CODE_TO_KEY[data.code];
    if (key) {
      return t(`errors.${key}`, data.max !== undefined ? { max: data.max } : undefined);
    }
  }
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return fallback;
}
