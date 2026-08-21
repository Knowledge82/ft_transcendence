import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface BackLinkProps {
  to?: string;
  label?: string;
  className?: string;
}

function ArrowAndLabel({ label }: { label: string }) {
  return (
    <>
      <span aria-hidden="true" className="rtl:scale-x-[-1]">
        ←
      </span>
      {label}
    </>
  );
}

export function BackLink({ to, label, className = '' }: BackLinkProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const resolvedLabel = label ?? t('common.back');
  const sharedClassName = `text-lg font-medium text-gold-500 hover:text-gold-400 inline-flex items-center gap-1.5 ${className}`;

  // When no fixed destination is given, this becomes a REAL "go back"
  // button (browser history), instead of always landing on one hardcoded
  // page regardless of where the person actually came from — used on
  // pages reachable from more than one place, like Privacy/Terms (linked
  // from the landing page AND from the footer on other pages).
  if (!to) {
    return (
      <button onClick={() => navigate(-1)} className={sharedClassName}>
        <ArrowAndLabel label={resolvedLabel} />
      </button>
    );
  }

  return (
    <Link to={to} className={sharedClassName}>
      <ArrowAndLabel label={resolvedLabel} />
    </Link>
  );
}
