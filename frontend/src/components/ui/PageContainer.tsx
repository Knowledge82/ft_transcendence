import type { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return <div className={`min-h-screen bg-ink-950 ${className}`}>{children}</div>;
}
