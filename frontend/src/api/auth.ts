import { apiClient } from './client';

interface AuthResponse {
  accessToken: string;
}

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

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login', {
    email,
    password,
  });
  return data;
}

export async function refreshRequest(): Promise<AuthResponse> {
  // No body needed: the refreshToken travels automatically via httpOnly cookie
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
