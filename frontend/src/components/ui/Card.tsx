import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-ink-900 border border-ink-800 rounded-xl p-8 ${className}`}>
      {children}
    </div>
  );
}
