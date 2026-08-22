import type { ReactNode, CSSProperties } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <div
      className={`bg-ink-900 border border-border-default rounded-xl p-8 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
