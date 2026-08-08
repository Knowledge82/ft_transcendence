import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
  // Some pages (like the chat, already tight on horizontal space with
  // two sidebars) opt out of the decorative frame while still using
  // PageContainer for everything else
  showFrame?: boolean;
}

export function PageContainer({ children, className = '', showFrame = true }: PageContainerProps) {
  return (
    <div className="relative min-h-screen bg-ink-950">
      {showFrame && (
        <>
          <img
            src="/frame-left.png"
            alt=""
            aria-hidden="true"
            className="hidden lg:block fixed left-0 top-0 h-screen w-auto max-w-[18vw] object-cover pointer-events-none select-none z-0"
          />
          <img
            src="/frame-right.png"
            alt=""
            aria-hidden="true"
            className="hidden lg:block fixed right-0 top-0 h-screen w-auto max-w-[18vw] object-cover pointer-events-none select-none z-0"
          />
        </>
      )}
      <div className={`relative z-10 min-h-screen ${className}`}>{children}</div>
    </div>
  );
}
