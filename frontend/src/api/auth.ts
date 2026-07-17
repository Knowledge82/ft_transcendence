//This file is a classic API layer (Data Access Layer). 
//Its purpose is to isolate React components from the details of network protocols. 
//Components don't need to know what the URL is, what data types the server expects, or how to parse the response. 
//They simply call functions and receive a clean result.

import { apiClient } from './client';

// interface - is a TypeScript construct that describes the shape of an object: "I'll have an object with a string accessToken field, and I won't guarantee anything else." It's similar to struct in C, but for types. It doesn't create an actual structure in memory—it's purely a compile-time verification tool.
interface AuthResponse {
  accessToken: string;
}

export async function registerRequest(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/register', {
    email,
    password,
    displayName,
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

export async function logoutRequest(): Promise<void> {
  await apiClient.post('/auth/logout');
}
