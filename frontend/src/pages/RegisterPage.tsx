import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ROUTES } from '../routes';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';
import { PageContainer, Card, Input, Button, FieldError } from '../components/ui';

type Gender = 'MASCULINO' | 'FEMENINO';

interface FieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
  gender?: string;
}

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
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
      gender: gender ? undefined : 'Debes elegir Hermano o Hermana',
    };
    setFieldErrors(errors);
    return Object.values(errors).every((error) => error === undefined);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    if (!validate() || !gender) {
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, displayName, gender);
      navigate(ROUTES.HOME);
    } catch (err) {
      setSubmitError('No se pudo completar el registro. Comprueba los datos.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer className="flex items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-cream-100 mb-6 text-center">
          Registro
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-cream-400 mb-1">
              Nombre
            </label>
            <Input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <FieldError>{fieldErrors.displayName}</FieldError>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cream-400 mb-1">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <FieldError>{fieldErrors.email}</FieldError>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-cream-400 mb-1">
              Contraseña
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          <div>
            <span className="block text-sm font-medium text-cream-400 mb-1">Género</span>
            <div className="flex gap-2">
              <label
                className={`flex-1 text-center py-2 rounded-md border cursor-pointer transition-colors ${
                  gender === 'MASCULINO'
                    ? 'bg-gold-500 text-gold-on border-gold-500 font-medium'
                    : 'bg-ink-950 border-ink-800 text-cream-100 hover:bg-ink-800'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value="MASCULINO"
                  checked={gender === 'MASCULINO'}
                  onChange={() => setGender('MASCULINO')}
                  className="sr-only"
                />
                Hermano
              </label>
              <label
                className={`flex-1 text-center py-2 rounded-md border cursor-pointer transition-colors ${
                  gender === 'FEMENINO'
                    ? 'bg-gold-500 text-gold-on border-gold-500 font-medium'
                    : 'bg-ink-950 border-ink-800 text-cream-100 hover:bg-ink-800'
                }`}
              >
                <input
                  type="radio"
                  name="gender"
                  value="FEMENINO"
                  checked={gender === 'FEMENINO'}
                  onChange={() => setGender('FEMENINO')}
                  className="sr-only"
                />
                Hermana
              </label>
            </div>
            <FieldError>{fieldErrors.gender}</FieldError>
          </div>

          {submitError && (
            <p className="text-sm text-error-500 text-center">{submitError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Enviando...' : 'Registrarse'}
          </Button>
        </form>

        <p className="mt-6 text-sm text-cream-400 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-gold-500 hover:text-gold-400 font-medium">
            Inicia sesión
          </Link>
        </p>
      </Card>
    </PageContainer>
  );
}
