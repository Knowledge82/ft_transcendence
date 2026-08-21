import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { setAccessToken as setClientAccessToken, setOnSessionExpired } from '../api/client';
import {
  loginRequest,
  registerRequest,
  refreshRequest,
  logoutRequest,
  completeOAuthRegistrationRequest,
  verifyTwoFactorRequest,
} from '../api/auth';

interface LoginOutcome {
  requiresTwoFactor: boolean;
  pendingToken?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginOutcome>;
  verifyTwoFactor: (pendingToken: string, code: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    gender: 'MASCULINO' | 'FEMENINO',
  ) => Promise<void>;
  completeOAuthRegistration: (
    pendingToken: string,
    gender: 'MASCULINO' | 'FEMENINO',
    displayName: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

  async function login(email: string, password: string): Promise<LoginOutcome> {
    const result = await loginRequest(email, password);

    if (result.requiresTwoFactor) {
      return { requiresTwoFactor: true, pendingToken: result.pendingToken };
    }

    setClientAccessToken(result.accessToken);
    setIsAuthenticated(true);
    return { requiresTwoFactor: false };
  }

  async function verifyTwoFactor(pendingToken: string, code: string) {
    const { accessToken } = await verifyTwoFactorRequest(pendingToken, code);
    setClientAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
    gender: 'MASCULINO' | 'FEMENINO',
  ) {
    const { accessToken } = await registerRequest(email, password, displayName, gender);
    setClientAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  async function completeOAuthRegistration(
    pendingToken: string,
    gender: 'MASCULINO' | 'FEMENINO',
    displayName: string,
  ) {
    const { accessToken } = await completeOAuthRegistrationRequest(
      pendingToken,
      gender,
      displayName,
    );
    setClientAccessToken(accessToken);
    setIsAuthenticated(true);
  }

  async function logout() {
    await logoutRequest();
    setClientAccessToken(null);
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        login,
        verifyTwoFactor,
        register,
        completeOAuthRegistration,
        logout,
      }}
    >
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
