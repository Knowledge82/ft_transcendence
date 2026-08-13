import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { PageContainer, Card, Input, Button, FieldError } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface FieldErrors {
  email?: string;
  password?: string;
}

export function LoginPage() {
  const { t } = useTranslation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function validate(): boolean {
    const errors: FieldErrors = {
      email: validateEmail(email) ?? undefined,
      password: validatePassword(password) ?? undefined,
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
      await login(email, password);
      navigate(ROUTES.HOME);
    } catch (err) {
      setSubmitError(t('login.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageContainer className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <LanguageSwitcher />
        </div>
        <Card>
        <h1 className="text-2xl font-semibold text-cream-100 mb-6 text-center">
          {t('login.title')}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-cream-400 mb-1">
              {t('login.email')}
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
              {t('login.password')}
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          {submitError && (
            <p className="text-sm text-error-500 text-center">{submitError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        <p className="mt-6 text-sm text-cream-400 text-center">
          {t('login.noAccount')}{' '}
          <Link to="/register" className="text-gold-500 hover:text-gold-400 font-medium">
            {t('login.register')}
          </Link>
        </p>
        </Card>
      </div>
    </PageContainer>
  );
}
