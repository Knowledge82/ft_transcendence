import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-md bg-ink-950 border border-border-default px-3 py-2 text-cream-100 focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 ${className}`}
      {...props}
    />
  );
}
