import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackLink({ to, label, className = '' }: BackLinkProps) {
  const { t } = useTranslation();
  return (
    <Link
      to={to}
      className={`text-base text-gold-500 hover:text-gold-400 inline-flex items-center gap-1 ${className}`}
    >
      {/* The arrow is rendered separately from the translated text, and
          flipped via CSS (not baked into any translation string) — this
          way it correctly mirrors for RTL without mixing content and
          layout concerns, unlike our earlier stopgap approach */}
      <span aria-hidden="true" className="rtl:scale-x-[-1]">
        ←
      </span>
      {label ?? t('common.back')}
    </Link>
  );
}
