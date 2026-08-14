import { useTranslation } from 'react-i18next';
import { getGenderedRole } from '../../utils/genderedRole';

interface RoleBadgeProps {
  role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
  gender: 'MASCULINO' | 'FEMENINO';
}

export function RoleBadge({ role, gender }: RoleBadgeProps) {
  const { i18n } = useTranslation();
  return (
    <p className="text-xs text-gold-500 uppercase tracking-wide">
      {getGenderedRole(role, gender, i18n.language)}
    </p>
  );
}
