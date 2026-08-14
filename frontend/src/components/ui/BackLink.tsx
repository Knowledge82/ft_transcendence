import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackLink({ to, label, className = '' }: BackLinkProps) {
  const { t } = useTranslation();
  // Falls back to the translated default only if the caller didn't
  // explicitly override it (some pages pass a custom label, like
  // "← Volver a la Biblioteca") — those custom labels are handled
  // separately wherever they're used, this component only owns the
  // generic default.
  return (
    <Link to={to} className={`text-sm text-gold-500 hover:text-gold-400 ${className}`}>
      {label ?? t('common.back')}
    </Link>
  );
}
