import type { TextareaHTMLAttributes } from 'react';

export function Textarea({
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`w-full rounded-md bg-ink-900 border border-border-default px-3 py-2 text-cream-100 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-gold-500 resize-y ${className}`}
      {...props}
    />
  );
}
