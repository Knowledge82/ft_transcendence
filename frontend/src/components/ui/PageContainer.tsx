import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  // Some pages (like the chat, already tight on horizontal space with
  // two sidebars) opt out of the decorative frame while still using
  // PageContainer for everything else
  showFrame?: boolean;
}

export function PageContainer({ children, className = '', showFrame = true }: PageContainerProps) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-screen bg-ink-950">
      {/* Hidden by default (sr-only), becomes visible only when it
          receives keyboard focus (focus:not-sr-only) — lets keyboard
          users jump straight past any sidebar/navigation to the actual
          page content, without needing to Tab through everything first */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:bg-gold-500 focus:text-gold-on focus:px-4 focus:py-2 focus:rounded-md focus:font-medium"
      >
        {t('common.skipToContent')}
      </a>

      {showFrame && (
        <>
          <img
            src="/frame-left.png"
            alt=""
            aria-hidden="true"
            className="hidden lg:block fixed left-0 top-0 h-screen object-cover pointer-events-none select-none z-0"
            style={{ width: '18vw' }}
          />
          <img
            src="/frame-right.png"
            alt=""
            aria-hidden="true"
            className="hidden lg:block fixed right-0 top-0 h-screen object-cover pointer-events-none select-none z-0"
            style={{ width: '18vw' }}
          />
        </>
      )}
      <div id="main-content" className={`relative z-10 min-h-screen ${className}`}>
        {children}
      </div>
    </div>
  );
}
