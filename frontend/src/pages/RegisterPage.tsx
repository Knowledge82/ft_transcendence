import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes';
import { useAuth } from '../context/AuthContext';
import { validateEmail, validatePassword, validateDisplayName } from '../utils/validation';
import { PageContainer, Card, Input, Button, FieldError, BackLink } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type Gender = 'MASCULINO' | 'FEMENINO';

interface FieldErrors {
  email?: string;
  password?: string;
  displayName?: string;
  gender?: string;
}

export function RegisterPage() {
  const { t } = useTranslation();

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
      gender: gender ? undefined : t('register.genderRequired'),
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
      setSubmitError(t('register.submitError'));
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
          {t('register.title')}
        </h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-cream-400 mb-1">
              {t('register.name')}
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
              {t('login.email')}
            </label>
            <Input
              id="email"
              type="email"
              dir="ltr"
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
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <FieldError>{fieldErrors.password}</FieldError>
          </div>

          <div>
            <span className="block text-sm font-medium text-cream-400 mb-1">
              {t('register.gender')}
            </span>
            <div className="inline-flex w-full rounded-full border border-ink-800 bg-ink-950 p-1">
              <label
                className={`flex-1 text-center py-1.5 rounded-full cursor-pointer transition-all duration-200 text-sm ${
                  gender === 'MASCULINO'
                    ? 'bg-gold-500 text-gold-on font-medium shadow-sm'
                    : 'text-cream-400 hover:text-cream-100'
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
                {t('register.hermano')}
              </label>
              <label
                className={`flex-1 text-center py-1.5 rounded-full cursor-pointer transition-all duration-200 text-sm ${
                  gender === 'FEMENINO'
                    ? 'bg-gold-500 text-gold-on font-medium shadow-sm'
                    : 'text-cream-400 hover:text-cream-100'
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
                {t('register.hermana')}
              </label>
            </div>
            <FieldError>{fieldErrors.gender}</FieldError>
          </div>

          {submitError && (
            <p className="text-sm text-error-500 text-center">{submitError}</p>
          )}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('register.submitting') : t('register.submit')}
          </Button>
        </form>

        <p className="mt-6 text-sm text-cream-400 text-center">
          {t('register.hasAccount')}{' '}
          <Link to="/login" className="text-gold-500 hover:text-gold-400 font-medium">
            {t('register.login')}
          </Link>
        </p>
        </Card>
      </div>
    </PageContainer>
  );
}
