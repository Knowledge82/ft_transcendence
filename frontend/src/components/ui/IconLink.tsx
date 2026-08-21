import { Link } from 'react-router-dom';
import type { ComponentProps } from 'react';

type IconLinkTone = 'gold' | 'danger';

interface IconLinkProps extends ComponentProps<typeof Link> {
  tone?: IconLinkTone;
}

const TONE_CLASSES: Record<IconLinkTone, string> = {
  gold: 'text-gold-500 hover:text-gold-400',
  danger: 'text-error-500 hover:text-red-400',
};

export function IconLink({ tone = 'gold', className = '', ...props }: IconLinkProps) {
  return (
    <Link
      className={`text-xs flex-shrink-0 ${TONE_CLASSES[tone]} ${className}`}
      {...props}
    />
  );
}
