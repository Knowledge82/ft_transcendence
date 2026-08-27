const DEFAULT_MODEL = 'openai/gpt-oss-20b';

export function parseModels(raw: string | undefined = process.env.GROQ_MODEL): string[] {
  const list = (raw ?? DEFAULT_MODEL)
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);

  return list.length ? [...new Set(list)] : [DEFAULT_MODEL];
}

export function isModelFailure(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  if (typeof status !== 'number') {
    return false;
  }
  return status === 400 || status === 404 || status >= 500;
}

export async function withModelFallback<T>(
  run: (model: string) => Promise<T>,
  models: string[] = parseModels(),
): Promise<T> {
  let lastError: unknown;

  for (const model of models) {
    try {
      return await run(model);
    } catch (error) {
      if (!isModelFailure(error)) {
        throw error;
      }
      lastError = error;
      const status = (error as { status?: number })?.status;
      console.warn(`Modelo "${model}" no disponible (status ${status}), probando el siguiente`);
    }
  }

  throw lastError;
}
