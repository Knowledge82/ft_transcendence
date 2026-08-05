import type { ButtonHTMLAttributes } from 'react';

type IconButtonTone = 'gold' | 'danger';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: IconButtonTone;
}

const TONE_CLASSES: Record<IconButtonTone, string> = {
  gold: 'text-gold-500 hover:text-gold-400',
  danger: 'text-error-500 hover:text-red-400',
};

export function IconButton({ tone = 'gold', className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`text-xs flex-shrink-0 disabled:text-cream-400 disabled:cursor-not-allowed ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
