import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';

export function HomePage() {
  const { logout } = useAuth();

  async function checkMe() {
    const { data } = await apiClient.get('/users/me');
    console.log('users/me respondió:', data);
  }

  return (
    <div>
      <h1>La Iglesia del Verdadero Relink</h1>
      <p>Has iniciado sesión correctamente.</p>
      <button onClick={() => checkMe()}>Comprobar /users/me</button>
      <button onClick={() => logout()}>Cerrar sesión</button>
    </div>
  );
}

// () => fn() is a safer, more predictable pattern, especially when the function expects specific arguments rather than a click event.
