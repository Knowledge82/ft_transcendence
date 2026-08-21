import { useState, useEffect, FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { apiClient } from '../api/client';
import {
  setupTwoFactorRequest,
  confirmTwoFactorRequest,
  disableTwoFactorRequest,
} from '../api/auth';
import type { TwoFactorSetup } from '../api/auth';
import { PageContainer, Card, LoadingScreen, BackLink, Input, Button } from '../components/ui';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ROUTES } from '../routes';
import { useConfirm } from '../context/ConfirmContext';

interface MeResponse {
  hasPassword: boolean;
  twoFactorEnabled: boolean;
}

export function TwoFactorSetupPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();

  const [isLoading, setIsLoading] = useState(true);
  const [hasPassword, setHasPassword] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [confirmCode, setConfirmCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [disablePassword, setDisablePassword] = useState('');
  const [isDisabling, setIsDisabling] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  useEffect(() => {
    apiClient.get<MeResponse>('/users/me').then((res) => {
      setHasPassword(res.data.hasPassword);
      setIsEnabled(res.data.twoFactorEnabled);
      setIsLoading(false);
    });
  }, []);

  async function handleStartSetup() {
    setConfirmError(null);
    try {
      const result = await setupTwoFactorRequest();
      setSetup(result);
    } catch (err) {
      setConfirmError(t('security.setupError'));
    }
  }

  async function handleConfirm(event: FormEvent) {
    event.preventDefault();
    setConfirmError(null);
    setIsConfirming(true);
    try {
      await confirmTwoFactorRequest(confirmCode.trim());
      setIsEnabled(true);
      setSetup(null);
      setConfirmCode('');
    } catch (err) {
      setConfirmError(t('security.invalidCode'));
    } finally {
      setIsConfirming(false);
    }
  }

  async function handleDisable(event: FormEvent) {
    event.preventDefault();
    setDisableError(null);

    if (!(await confirm(t('security.confirmDisable')))) {
      return;
    }

    setIsDisabling(true);
    try {
      await disableTwoFactorRequest(disablePassword);
      setIsEnabled(false);
      setDisablePassword('');
    } catch (err) {
      setDisableError(t('security.invalidPassword'));
    } finally {
      setIsDisabling(false);
    }
  }

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <PageContainer className="px-4 py-10">
      <div className="max-w-sm mx-auto">
        <div className="flex justify-between items-center">
          <BackLink to={ROUTES.HOME} />
          <LanguageSwitcher />
        </div>

        <h1 className="text-2xl font-semibold text-gold-500 mt-4 mb-8 text-center">
          {t('security.title')}
        </h1>

        {!hasPassword ? (
          <Card>
            <p className="text-sm text-cream-100 text-center">
              {t('security.requiresPassword')}
            </p>
          </Card>
        ) : isEnabled ? (
          <Card>
            <p className="text-sm text-cream-100 mb-4 text-center">{t('security.enabledInfo')}</p>
            <form onSubmit={handleDisable} className="space-y-4">
              <div>
                <label
                  htmlFor="disablePassword"
                  className="block text-sm font-medium text-cream-400 mb-1"
                >
                  {t('login.password')}
                </label>
                <Input
                  id="disablePassword"
                  type="password"
                  dir="ltr"
                  autoComplete="current-password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              {disableError && (
                <p role="alert" className="text-sm text-error-500 text-center">
                  {disableError}
                </p>
              )}
              <Button
                type="submit"
                variant="secondary"
                disabled={isDisabling || disablePassword.length === 0}
                className="w-full"
              >
                {isDisabling ? t('security.disabling') : t('security.disableButton')}
              </Button>
            </form>
          </Card>
        ) : setup ? (
          <Card>
            <p className="text-sm text-cream-400 mb-4 text-center">
              {t('security.scanInstructions')}
            </p>
            <img
              src={setup.qrCodeDataUrl}
              alt={t('security.qrAlt')}
              className="mx-auto mb-4 rounded-md border border-border-default"
              width={200}
              height={200}
            />
            <p className="text-xs text-cream-400 mb-1 text-center">
              {t('security.manualEntryHint')}
            </p>
            <p className="text-xs text-gold-500 mb-6 text-center break-all font-mono" dir="ltr">
              {setup.secret}
            </p>

            <form onSubmit={handleConfirm} className="space-y-4">
              <div>
                <label
                  htmlFor="confirmCode"
                  className="block text-sm font-medium text-cream-400 mb-1"
                >
                  {t('login.twoFactorCodeLabel')}
                </label>
                <Input
                  id="confirmCode"
                  type="text"
                  inputMode="numeric"
                  dir="ltr"
                  autoComplete="one-time-code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center tracking-[0.3em] text-lg"
                />
              </div>
              {confirmError && (
                <p role="alert" className="text-sm text-error-500 text-center">
                  {confirmError}
                </p>
              )}
              <Button
                type="submit"
                disabled={isConfirming || confirmCode.length !== 6}
                className="w-full"
              >
                {isConfirming ? t('security.confirming') : t('security.confirmButton')}
              </Button>
            </form>
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-cream-100 mb-6 text-center">
              {t('security.disabledInfo')}
            </p>
            {confirmError && (
              <p role="alert" className="text-sm text-error-500 text-center mb-4">
                {confirmError}
              </p>
            )}
            <Button onClick={handleStartSetup} className="w-full">
              {t('security.startSetup')}
            </Button>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
