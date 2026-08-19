// Single source of truth for route paths — change a route here, and
// every place that imports from ROUTES picks up the change automatically.
// Avoids the exact bug we just hit: renaming a route but missing one of
// several hardcoded string literals scattered across different files.
export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/celda',
  CHAT: '/chat',
  SANCTUARY: '/santuario',
  CONFESSIONAL: '/confesionario',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  PROFILE: (userId: number | string) => `/perfil/${userId}`,
  LIBRARY: '/biblioteca',
  NEW_ARTICLE: '/biblioteca/nueva',
  ARTICLE: (articleId: number | string) => `/biblioteca/${articleId}`,
  ORGANIZATIONS: '/facciones',
  NEW_ORGANIZATION: '/facciones/nueva',
  ORGANIZATION: (organizationId: number | string) => `/facciones/${organizationId}`,
} as const;
