import { useState, FormEvent } from 'react'; //FormEvent is a TypeScript type for the form submit event so that we can safely work with the event.preventDefault() method.

import { useNavigate, Link } from 'react-router-dom'; //Link is needed for a declarative transition to the login page without reloading the tab, and the useNavigate hook returns a function for programmatically redirecting the user (after successful registration).

import { useAuth } from '../context/AuthContext'; //Our custom hook, which provides access to the application's shared authorization context. From it, we extract the register method.

export function RegisterPage() {
  //Each input field has its own state. 
  //This is called a "controlled component"—the idea is that the value of the <input> field is always taken from React state (value={email}), rather than being stored "by itself" within the DOM, as in regular HTML. 
  //React becomes the single source of truth about what's currently entered.
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); // isSubmitting is a crucial flag for UX (User Experience). It's used to disable the form's submit button while a network request is in progress, preventing accidental duplicate clicks (spam requests to the backend).

  const { register } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault(); //1. Preventing the browser from reloading the page
    setError(null);         //2. Clearing the old error before trying again
    setIsSubmitting(true);  //3. Turn on the sending mode (lock the button)

    try {
      // 4. Call registration from the context. 
      // Under the hood, it will pull our registerRequest from api/auth.ts
      await register(email, password, displayName);
      // 5. If the method didn't throw an error, everything was successful.
      // Redirect the player to the main page, which is protected via ProtectedRoute
      navigate('/');
    } catch (err) {
      // 6. If the backend returned 400 or 409 (for example, the email is already taken), go here
      setError('No se ha podido completar el registro. Comprueba los datos.');
    } finally {
      // 7. In any case (success or error), turn off the send loader
      setIsSubmitting(false);
    }
  }

  // How this relates to the backend: When await register(...) is triggered, the Axios is called within the context. 
  // The server creates the user, sets a cookie, and returns an accessToken. 
  // Once register is successfully completed, the AuthContext already stores the token in memory, and the apiClient is ready for secure requests. 
  // So, we can safely use navigate('/').

  
  //Interface rendering (JSX):
  return (
    <div>
      <h1>Registro</h1>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="displayName">Nombre</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>

        {error && <p style={{ color: 'red' }}>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Enviando...' : 'Registrarse'}
        </button>
      </form>

      <p>
        ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
      </p>
    </div>
  );
}
