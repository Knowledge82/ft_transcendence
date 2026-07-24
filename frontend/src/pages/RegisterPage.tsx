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
    return Object.values(errors).every((error) => error === undefined);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

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
    <div className="min-h-screen flex items-center justify-center bg-ink-950 px-4">
      <div className="w-full max-w-sm bg-ink-900 border border-ink-800 rounded-xl p-8">
        <h1 className="text-2xl font-semibold text-cream-100 mb-6 text-center">
          Registro
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-cream-400 mb-1">
              Nombre
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-md bg-ink-950 border border-ink-800 px-3 py-2 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            {fieldErrors.displayName && (
              <p className="mt-1 text-sm text-error-500">{fieldErrors.displayName}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cream-400 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md bg-ink-950 border border-ink-800 px-3 py-2 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-error-500">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-cream-400 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md bg-ink-950 border border-ink-800 px-3 py-2 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-error-500">{fieldErrors.password}</p>
            )}
          </div>

          {submitError && (
            <p className="text-sm text-error-500 text-center">{submitError}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gold-500 text-gold-on font-medium py-2 rounded-md hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? 'Enviando...' : 'Registrarse'}
          </button>
        </form>

        <p className="mt-6 text-sm text-cream-400 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-gold-500 hover:text-gold-400 font-medium">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
