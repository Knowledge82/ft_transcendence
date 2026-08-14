type Role = 'HERMANO' | 'INQUISIDOR' | 'ARZOBISPO';

// English and Arabic don't necessarily have a direct grammatical-gender
// equivalent for every title (e.g. "Archbishop" doesn't inflect in
// English), but we still give each language its own natural word choice
// per gender rather than mechanically reusing the Spanish forms.
const ROLE_NAMES: Record<string, Record<Role, { MASCULINO: string; FEMENINO: string }>> = {
  es: {
    HERMANO: { MASCULINO: 'HERMANO', FEMENINO: 'HERMANA' },
    INQUISIDOR: { MASCULINO: 'INQUISIDOR', FEMENINO: 'INQUISIDORA' },
    ARZOBISPO: { MASCULINO: 'ARZOBISPO', FEMENINO: 'ARZOBISPA' },
  },
  en: {
    HERMANO: { MASCULINO: 'Brother', FEMENINO: 'Sister' },
    INQUISIDOR: { MASCULINO: 'Inquisitor', FEMENINO: 'Inquisitor' },
    ARZOBISPO: { MASCULINO: 'Archbishop', FEMENINO: 'Archbishop' },
  },
  ar: {
    HERMANO: { MASCULINO: 'أخ', FEMENINO: 'أخت' },
    INQUISIDOR: { MASCULINO: 'محقق', FEMENINO: 'محققة' },
    ARZOBISPO: { MASCULINO: 'مطران', FEMENINO: 'مطرانة' },
  },
};

export function getGenderedRole(role: string, gender: string, language: string): string {
  const roleNames = ROLE_NAMES[language] ?? ROLE_NAMES.es;
  const forms = roleNames[role as Role];
  if (!forms) {
    return role;
  }
  return gender === 'FEMENINO' ? forms.FEMENINO : forms.MASCULINO;
}
