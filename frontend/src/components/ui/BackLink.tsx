import { Link } from 'react-router-dom';

interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackLink({ to, label = '← Volver', className = '' }: BackLinkProps) {
  return (
    <Link to={to} className={`text-sm text-gold-500 hover:text-gold-400 ${className}`}>
      {label}
    </Link>
  );
}
