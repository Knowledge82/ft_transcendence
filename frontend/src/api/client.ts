import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';

export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// AuthContext registers a callback here so this plain module can notify it
// when the session truly ends (refresh failed) — a plain TS file can't use
// React state directly, so we bridge with a simple callback reference.
let onSessionExpired: (() => void) | null = null;

export function setOnSessionExpired(callback: () => void) {
  onSessionExpired = callback;
}

// Attach the access token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

// If several requests get a 401 at the same time, we only want ONE real
// call to /auth/refresh — not one per failed request (our refresh tokens
// rotate, so a second concurrent refresh call would fail against an
// already-used token). All callers share this single in-flight promise.
let refreshPromise: Promise<string> | null = null;

async function performRefresh(): Promise<string> {
  // Plain axios call here (not apiClient) so this request doesn't pass
  // through our own response interceptor and risk an infinite loop
  const { data } = await axios.post<{ accessToken: string }>(
    '/api/auth/refresh',
    {},
    { withCredentials: true },
  );
  return data.accessToken;
}

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;
    const isRefreshCall = originalRequest?.url === '/auth/refresh';

    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall;

    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }

    // Mark this request so we never retry it more than once, even if
    // the retried call somehow fails with 401 again
    originalRequest._retry = true;

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
      const newAccessToken = await refreshPromise;
      setAccessToken(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest); // retry the original request
    } catch (refreshError) {
      // The refresh cookie itself is invalid or expired — the session
      // is really over, nothing left to try
      setAccessToken(null);
      onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  },
);
