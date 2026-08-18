import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ROUTES } from '../routes';
import { useAuth } from '../context/AuthContext';
import { validateDisplayName } from '../utils/validation';
import { PageContainer, Card, Input, Button, FieldError } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

type Gender = 'MASCULINO' | 'FEMENINO';

interface ApiErrorData {
  code?: string;
  suggestions?: string[];
}

interface PendingProfile {
  email?: string;
  displayName?: string;
}

function decodeJwtPayload(token: string): PendingProfile | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function OAuthCompletePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const pendingToken = searchParams.get('token') ?? '';
  const navigate = useNavigate();
  const { completeOAuthRegistration } = useAuth();

  const decoded = decodeJwtPayload(pendingToken);

  const [displayName, setDisplayName] = useState(decoded?.displayName ?? '');
  const [gender, setGender] = useState<Gender | ''>('');
  const [nameError, setNameError] = useState<string | undefined>();
  const [genderError, setGenderError] = useState<string | undefined>();
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingToken || !decoded) {
      navigate(ROUTES.LOGIN, { replace: true });
    }
  }, [pendingToken, decoded, navigate]);

  function handleNameChange(value: string) {
    setDisplayName(value);
    if (nameSuggestions.length > 0) {
      setNameSuggestions([]);
    }
  }

  function applySuggestion(name: string) {
    setDisplayName(name);
    setNameSuggestions([]);
    setNameError(undefined);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);
    setNameSuggestions([]);

    const nameValidation = validateDisplayName(displayName) ?? undefined;
    setNameError(nameValidation);
    setGenderError(gender ? undefined : t('register.genderRequired'));
    if (nameValidation || !gender) {
      return;
    }

    setIsSubmitting(true);
    try {
      await completeOAuthRegistration(pendingToken, gender, displayName);
      navigate(ROUTES.HOME);
    } catch (err) {
      const data = (err as { response?: { data?: ApiErrorData } })?.response?.data;

      if (data?.code === 'DISPLAY_NAME_TAKEN') {
        setNameError(t('register.nameTaken'));
        setNameSuggestions(data.suggestions ?? []);
      } else if (data?.code === 'OAUTH_TOKEN_EXPIRED') {
        setSubmitError(t('register.oauthExpired'));
      } else {
        setSubmitError(t('register.submitError'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!pendingToken || !decoded) {
    return null;
  }

  return (
    <PageContainer className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-end mb-3">
          <LanguageSwitcher />
        </div>
        <Card>
          <h1 className="text-2xl font-semibold text-cream-100 mb-2 text-center">
            {t('register.completeTitle')}
          </h1>
          {decoded.email && (
            <p className="text-sm text-cream-400 mb-6 text-center" dir="ltr">
              {decoded.email}
            </p>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-cream-400 mb-1">
                {t('register.name')}
              </label>
              <Input
                id="displayName"
                type="text"
                autoComplete="nickname"
                value={displayName}
                onChange={(e) => handleNameChange(e.target.value)}
              />
              <FieldError>{nameError}</FieldError>
              {nameSuggestions.length > 0 && (
                <div className="flex justify-around w-full mt-2">
                  {nameSuggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => applySuggestion(name)}
                      className="text-xs px-3 py-1 rounded-full border border-gold-500 text-gold-500 hover:bg-gold-500 hover:text-gold-on transition-colors"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div>
              <span className="block text-sm font-medium text-cream-400 mb-1">
                {t('register.gender')}
              </span>
              <div className="inline-flex w-full rounded-full border border-border-default bg-ink-950 p-1">
                <label
                  className={`flex-1 text-center py-1.5 rounded-full cursor-pointer transition-all duration-200 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-gold-500 focus-within:outline-offset-2 ${
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
                  className={`flex-1 text-center py-1.5 rounded-full cursor-pointer transition-all duration-200 text-sm focus-within:outline focus-within:outline-2 focus-within:outline-gold-500 focus-within:outline-offset-2 ${
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
              <FieldError>{genderError}</FieldError>
            </div>

            {submitError && (
              <p role="alert" className="text-sm text-error-500 text-center">
                {submitError}
              </p>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? t('register.submitting') : t('register.completeSubmit')}
            </Button>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
