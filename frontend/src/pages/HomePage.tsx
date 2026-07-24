import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export function HomePage() {
  const { logout } = useAuth();

  async function checkMe() {
    const { data } = await apiClient.get('/users/me');
    console.log('users/me respondió:', data);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="text-center">
        <h1 className="text-3xl font-semibold text-gold-500 mb-2">
          La Iglesia del Verdadero Relink
        </h1>
        <p className="text-cream-400 mb-6">Has iniciado sesión correctamente.</p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => checkMe()}
            className="bg-ink-900 border border-ink-800 text-cream-100 font-medium px-4 py-2 rounded-md hover:bg-ink-800 transition-colors"
          >
            Comprobar /users/me
          </button>
          <button
            onClick={() => logout()}
            className="bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
