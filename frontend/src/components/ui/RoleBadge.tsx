interface RoleBadgeProps {
  role: 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';
}

export function RoleBadge({ role }: RoleBadgeProps) {
  return <p className="text-xs text-gold-500 uppercase tracking-wide">{role}</p>;
}
