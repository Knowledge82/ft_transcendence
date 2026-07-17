import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAccessToken as setClientAccessToken } from '../api/client';
import {
  loginRequest,
  registerRequest,
  refreshRequest,
  logoutRequest,
} from '../api/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean; // true while the initial silent refresh is in progress
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // On every app load (including page refresh), try to silently restore
  // the session using the httpOnly refresh cookie the browser already has
  useEffect(() => {
    refreshRequest()
      .then(({ accessToken }) => {
        setClientAccessToken(accessToken);
        setIsAuthenticated(true);
      })
      .catch(() => {
        // No valid cookie, or it expired — the user simply isn't logged in
        setClientAccessToken(null);
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { accessToken } = await loginRequest(email, password);
    setClientAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  async function register(email: string, password: string, displayName: string) {
    const { accessToken } = await registerRequest(email, password, displayName);
    setClientAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  async function logout() {
    await logoutRequest();
    setClientAccessToken(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook: lets components do `const { login } = useAuth();`
// instead of importing useContext + AuthContext everywhere
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
