import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAccessToken as setClientAccessToken, setOnSessionExpired } from '../api/client';
import {
  loginRequest,
  registerRequest,
  refreshRequest,
  logoutRequest,
} from '../api/auth';

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Register the bridge callback ONCE: if a background request refresh
  // fails (the refresh cookie itself expired), client.ts calls this to
  // tell React the session is really over — no direct navigation here,
  // ProtectedRoute reacts to isAuthenticated becoming false on its own
  useEffect(() => {
    setOnSessionExpired(() => {
      setIsAuthenticated(false);
    });
  }, []);

  useEffect(() => {
    refreshRequest()
      .then(({ accessToken }) => {
        setClientAccessToken(accessToken);
        setIsAuthenticated(true);
      })
      .catch(() => {
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
