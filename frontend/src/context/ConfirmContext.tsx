import { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ReactNode, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

// Usage: const confirm = useConfirm(); if (!(await confirm(message))) return;
// — same shape as the native window.confirm(), but asynchronous (opens
// a real React modal and waits for a click, rather than blocking the
// whole browser tab synchronously the way the native dialog does).
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return ctx;
}

interface PendingConfirm {
  message: string;
  resolve: (value: boolean) => void;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ message, resolve });
    });
  }, []);

  function handleClose(result: boolean) {
    pending?.resolve(result);
    setPending(null);
  }

  // A minimal focus trap — with only two interactive elements in the
  // dialog, Tab/Shift+Tab just needs to bounce between them, never
  // letting focus escape to whatever page is sitting behind the modal
  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose(false);
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      const isOnCancel = document.activeElement === cancelRef.current;
      (isOnCancel ? confirmRef.current : cancelRef.current)?.focus();
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4"
          onClick={() => handleClose(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-describedby="confirm-dialog-message"
            className="bg-ink-900 border border-border-default rounded-xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={handleKeyDown}
          >
            <p id="confirm-dialog-message" className="text-cream-100 mb-6">
              {pending.message}
            </p>
            <div className="flex justify-end gap-3">
              <button
                ref={cancelRef}
                autoFocus
                onClick={() => handleClose(false)}
                className="text-sm text-cream-400 hover:text-cream-100 px-4 py-2"
              >
                {t('common.cancel')}
              </button>
              <button
                ref={confirmRef}
                onClick={() => handleClose(true)}
                className="text-sm bg-gold-500 text-gold-on font-medium px-4 py-2 rounded-md hover:bg-gold-400"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
