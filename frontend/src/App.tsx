import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { ChatPage } from './pages/ChatPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsOfServicePage } from './pages/TermsOfServicePage';
import { AdminPage } from './pages/AdminPage';
import { ConfesionarioPage } from './pages/ConfesionarioPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { ArticlesListPage } from './pages/ArticlesListPage';
import { ArticleDetailPage } from './pages/ArticleDetailPage';
import { NewArticlePage } from './pages/NewArticlePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { OAuthSuccessPage } from './pages/OAuthSuccessPage';
import { OAuthCompletePage } from './pages/OAuthCompletePage';
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <ConfirmProvider>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route
                path="/celda"
                element={
                  <ProtectedRoute>
                    <HomePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/santuario"
                element={
                  <ProtectedRoute>
                    <AdminPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/confesionario"
                element={
                  <ProtectedRoute>
                    <ConfesionarioPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/perfil/:id"
                element={
                  <ProtectedRoute>
                    <UserProfilePage />
                  </ProtectedRoute>
                }
              />
              {/* IMPORTANT: /biblioteca/nueva must stay declared BEFORE
                  /biblioteca/:id — otherwise "nueva" would be captured by
                  the :id param, same route-ordering rule we've hit before
                  on the backend controllers */}
              <Route
                path="/biblioteca"
                element={
                  <ProtectedRoute>
                    <ArticlesListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/biblioteca/nueva"
                element={
                  <ProtectedRoute>
                    <NewArticlePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/biblioteca/:id/editar"
                element={
                  <ProtectedRoute>
                    <NewArticlePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/biblioteca/:id"
                element={
                  <ProtectedRoute>
                    <ArticleDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/oauth/exito" element={<OAuthSuccessPage />} />
              <Route path="/oauth/completar" element={<OAuthCompletePage />} />
              {/* Catch-all — MUST stay last, React Router matches routes in
                  declaration order and "*" would otherwise swallow every
                  other path declared after it */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </ConfirmProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
