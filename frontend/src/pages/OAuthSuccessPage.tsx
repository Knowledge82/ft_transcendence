import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LoadingScreen } from '../components/ui';
import { ROUTES } from '../routes';

// This page does almost nothing on its own — AuthProvider already tries
// a refreshRequest() on every fresh app load, which will pick up the
// httpOnly cookie the backend just set during the 42 OAuth callback,
// without any new code needed here at all. This page just waits for
// that existing check to finish, then redirects accordingly.
export function OAuthSuccessPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading) {
      navigate(isAuthenticated ? ROUTES.HOME : ROUTES.LOGIN, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return <LoadingScreen />;
}
