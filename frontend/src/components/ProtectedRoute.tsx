//Why it's needed: Without it, anyone could open https://localhost:8443/ directly, even without being logged in, and see the HomePage. 
//ProtectedRoute is a "login check" that decides whether to allow the user to this screen or send them to login.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ReactNode } from 'react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  // Still checking the session (silent refresh in progress) — show nothing
  // yet rather than flashing a redirect to /login before we actually know
  if (isLoading) {
    return <p>Cargando...</p>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
 // <>...</> is a React Fragment, an "invisible wrapper" needed because React requires a component to return a single root element, and {children} itself can be anything without a single common tag - Fragment solves this technicality without adding an extra <div> to the resulting HTML.
