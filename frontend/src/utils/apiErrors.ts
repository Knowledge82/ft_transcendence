const CODE_TO_KEY: Record<string, string> = {
  ORACLE_RATE_LIMITED: 'oracleRateLimited',
  CONFESSOR_RATE_LIMITED: 'confessorRateLimited',
  EMPTY_MAKEFILE: 'emptyMakefile',
  MAKEFILE_TOO_LONG: 'makefileTooLong',
  STREAMING_NOT_SUPPORTED: 'streamingNotSupported',
  CANNOT_CHANGE_OWN_ROLE: 'cannotChangeOwnRole',
  CANNOT_DELETE_OWN_ACCOUNT: 'cannotDeleteOwnAccount',
  INSUFFICIENT_RANK_FOR_ORGANIZATION: 'insufficientRankForOrganization',
  ALREADY_IN_ORGANIZATION: 'alreadyInOrganization',
};

interface ApiErrorData {
  code?: string;
  message?: string | string[];
  max?: number;
}

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
