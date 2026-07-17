import axios from 'axios';

// withCredentials: true is essential — without it, the browser will NOT
// send the httpOnly refreshToken cookie with requests, even though it's
// the same origin (nginx proxies everything under the same domain, but
// axios doesn't send cookies cross-request by default unless told to)
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

// This will be set by AuthContext once it holds the current access token.
// We use a mutable holder instead of reading from React state directly here,
// because this file is plain TS (not a component) and can't use hooks.
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

// Attach the access token to every outgoing request automatically
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

//Summary: How does this all work together?

// 1. The user visits the website. The accessToken is null.

// 2. The app makes a background request to /auth/refresh (the cookie is automatically sent thanks to withCredentials).

// 3. The backend returns a new accessToken.

// 4. The AuthContext in React takes it and calls setAccessToken(new_token).

// 5. Now, no matter what button the user presses (profile request, game history, sending a chat message), the interceptor instantly grabs this token from the variable and adds it to the headers.

//When writing requests to API methods, the frontend developer doesn't need to manually write headers: { Authorization: ... } at all. Everything works completely automatically.
