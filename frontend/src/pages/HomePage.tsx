import { useAuth } from '../context/AuthContext';

export function HomePage() {
  const { logout } = useAuth();

  return (
    <div>
      <h1>La Iglesia del Verdadero Relink</h1>
      <p>Has iniciado sesión correctamente.</p>
      <button onClick={() => logout()}>Cerrar sesión</button>
    </div>
  );
}
 // () => fn() is a safer, more predictable pattern, especially when the function expects specific arguments rather than a click event.
