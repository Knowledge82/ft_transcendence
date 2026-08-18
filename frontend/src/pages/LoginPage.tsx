import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword } from '../utils/validation';
import { PageContainer, Card, Input, Button, FieldError, BackLink } from '../components/ui';
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
        <div className="flex justify-between items-center mb-3">
          <BackLink to={ROUTES.LANDING} />
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
              dir="ltr"
              autoComplete="email"
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
              dir="ltr"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-error-500 text-center">{submitError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>

        <div className="my-6 flex items-center gap-3">
          <div className="flex-1 h-px bg-border-default" />
          <span className="text-xs text-cream-400 uppercase">{t('login.orDivider')}</span>
          <div className="flex-1 h-px bg-border-default" />
        </div>

        {/* Plain <a>, not <Link> — this needs a real full-page browser
            navigation to the backend, which itself redirects to 42's
            authorization page. React Router's navigate() only works for
            in-app SPA routes, not for leaving the app entirely. */}
        <a
          href="/api/auth/oauth/42"
          className="w-full flex items-center justify-center gap-2 border border-border-default rounded-md py-2 text-sm text-cream-100 hover:bg-ink-800 transition-colors"
        >
          {t('login.with42')}
        </a>

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
