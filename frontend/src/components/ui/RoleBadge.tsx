import { getGenderedRole } from '../../utils/genderedRole';

interface RoleBadgeProps {
  role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
  gender: 'MASCULINO' | 'FEMENINO';
}

export function RoleBadge({ role, gender }: RoleBadgeProps) {
  return (
    <p className="text-xs text-gold-500 uppercase tracking-wide">
      {getGenderedRole(role, gender)}
    </p>
  );
}
