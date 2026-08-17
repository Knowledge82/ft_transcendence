import { PrismaService } from '../prisma/prisma.service';

type Language = 'es' | 'en' | 'ar';
type Gender = 'MASCULINO' | 'FEMENINO';

// A curated pool of obscure, rarely-used archaic names per language and
// gender — deliberately chosen so two random suggestions are very
// unlikely to already be taken by someone else on the platform.
const NAME_POOLS: Record<Language, Record<Gender, string[]>> = {
  es: {
    MASCULINO: [
      'Anselmo',
      'Casimiro',
      'Cipriano',
      'Primitivo',
      'Eulogio',
      'Bernardo',
      'Toribio',
      'Prudencio',
      'Sexto',
    ],
    FEMENINO: [
      'Escolástica',
      'Engracia',
      'Perpetua',
      'Sagrario',
      'Crescencia',
      'Teófila',
      'Hermenegilda',
      'Valeriana',
    ],
  },
  en: {
    MASCULINO: ['Bede', 'Cuthbert', 'Gideon', 'Ebenezer', 'Thaddeus', 'Silas', 'Dunstan', 'Wulfran'],
    FEMENINO: [
      'Scholastica',
      'Millicent',
      'Etheldreda',
      'Hildegard',
      'Melisande',
      'Wansburga',
      'Ermengarde',
      'Constantia',
    ],
  },
  ar: {
    MASCULINO: ['Al-Kindi', 'Ibn Rushd', 'Khashy', 'Suhail', 'Tariq', 'Zayd', 'Hakim', 'Baqir'],
    FEMENINO: ['Wallada', 'Zubayda', 'Rabia', "Na'ila", 'Tarub', 'Lubna', 'Umm Kulthum', 'Gazala'],
  },
};

export function resolveLanguage(language?: string): Language {
  return language === 'en' || language === 'ar' ? language : 'es';
}

function resolveGender(gender?: string): Gender {
  return gender === 'FEMENINO' ? 'FEMENINO' : 'MASCULINO';
}

// Picks `count` names from the current language+gender pool that are NOT
// already taken, checked one by one in random order. The availability
// check is explicitly CASE-INSENSITIVE (mode: 'insensitive') — matching
// how uniqueness itself is enforced — otherwise a candidate could be
// wrongly suggested as "free" just because it differs in capitalization
// from an existing, functionally-identical name already in use.
export async function suggestAvailableNames(
  prisma: PrismaService,
  language?: string,
  gender?: string,
  count = 3,
): Promise<string[]> {
  const pool = [...NAME_POOLS[resolveLanguage(language)][resolveGender(gender)]].sort(
    () => Math.random() - 0.5,
  );
  const available: string[] = [];

  for (const candidate of pool) {
    if (available.length >= count) {
      break;
    }
    const taken = await prisma.user.findFirst({
      where: { displayName: { equals: candidate, mode: 'insensitive' } },
    });
    if (!taken) {
      available.push(candidate);
    }
  }

  return available;
}
