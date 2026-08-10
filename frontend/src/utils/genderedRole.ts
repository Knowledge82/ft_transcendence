// Mirrors backend/src/common/gendered-role.ts — the role's actual value
// (HERMANO, INQUISIDOR, ARZOBISPO) never changes based on gender, this
// only affects how it's DISPLAYED.
const FEMININE_FORMS: Record<string, string> = {
  HERMANO: 'HERMANA',
  INQUISIDOR: 'INQUISIDORA',
  ARZOBISPO: 'ARZOBISPA',
};

export function getGenderedRole(role: string, gender: string): string {
  if (gender === 'FEMENINO') {
    return FEMININE_FORMS[role] ?? role;
  }
  return role;
}
