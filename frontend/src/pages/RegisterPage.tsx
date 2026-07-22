import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';

interface FieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
}

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  function validate(): boolean {
    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
      displayName: validateDisplayName(displayName) ?? undefined,
    };
    setFieldErrors(errors);
    
    //"Are all values undefined?" - if yes, there are no errors at all, the form is valid.
    return Object.values(errors).every((error) => error === undefined);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    //This is the essence of the "front-end validation" requirement: before we ever go online, we validate the data locally. 
    //If there are errors, we simply don't send the request, display the errors under the fields, and that's it. 
    //This saves the user time (instant feedback) and unnecessary traffic/load on the backend.
    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, displayName);
      navigate('/');
    } catch (err) {
      setSubmitError('No se pudo completar el registro. Comprueba los datos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <h1>Registro</h1>
      <form onSubmit={handleSubmit} noValidate>
        <div>
          <label htmlFor="displayName">Nombre</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
          {fieldErrors.displayName && (
            <p style={{ color: 'red' }}>{fieldErrors.displayName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {fieldErrors.email && <p style={{ color: 'red' }}>{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {fieldErrors.password && (
            <p style={{ color: 'red' }}>{fieldErrors.password}</p>
          )}
        </div>

        {submitError && <p style={{ color: 'red' }}>{submitError}</p>}

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
