// Turns the technical role value (always stored/checked in its masculine
// form — HERMANO, INQUISIDOR, ARZOBISPO — permissions never depend on
// gender) into the grammatically correct form for display.
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
