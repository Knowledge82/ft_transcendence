import { apiClient } from './client';

interface AuthResponse {
  accessToken: string;
}

export type LoginResult =
  | { requiresTwoFactor: false; accessToken: string }
  | { requiresTwoFactor: true; pendingToken: string };

export async function registerRequest(
  email: string,
  password: string,
  displayName: string,
  gender: 'MASCULINO' | 'FEMENINO',
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
    displayName,
    gender,
  });
  return data;
}

export async function loginRequest(email: string, password: string): Promise<LoginResult> {
  const { data } = await apiClient.post<LoginResult>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function verifyTwoFactorRequest(
  pendingToken: string,
  code: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/2fa/verify', {
    pendingToken,
    code,
  });
  return data;
}

export interface TwoFactorSetup {
  qrCodeDataUrl: string;
  secret: string;
}

export async function setupTwoFactorRequest(): Promise<TwoFactorSetup> {
  const { data } = await apiClient.post<TwoFactorSetup>('/auth/2fa/setup');
  return data;
}

export async function confirmTwoFactorRequest(code: string): Promise<{ enabled: boolean }> {
  const { data } = await apiClient.post<{ enabled: boolean }>('/auth/2fa/confirm', { code });
  return data;
}

export async function disableTwoFactorRequest(password: string): Promise<{ enabled: boolean }> {
  const { data } = await apiClient.post<{ enabled: boolean }>('/auth/2fa/disable', { password });
  return data;
}

export async function refreshRequest(): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/refresh');
  return data;
}

export async function completeOAuthRegistrationRequest(
  pendingToken: string,
  gender: 'MASCULINO' | 'FEMENINO',
  displayName: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/oauth/complete', {
    pendingToken,
    gender,
    displayName,
  });
  return data;
}

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}
