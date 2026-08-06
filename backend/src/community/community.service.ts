import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import Groq from 'groq-sdk';

// Curated fallback pool — used most of the time, since it's free and
// instant. No repeats within a short span thanks to random pick + the
// occasional AI-generated one keeping things fresh.
const FICTIONAL_EVENTS = [
  'Los hermanos organizaron una procesión en honor a la nueva versión de CMake.',
  'Un novicio fue sorprendido añadiendo el Makefile a las dependencias. Se le impuso penitencia.',
  'El Arzobispo bendijo tres binarios recién compilados sin ningún warning.',
  'Se ha encontrado un `touch Makefile` olvidado en un pasillo. Nadie lo reclama.',
  'La biblioteca del Capítulo adquirió un ejemplar original del primer `-Wall -Wextra -Werror`.',
  'Un hermano confesó haber usado `make -B` "solo una vez, por curiosidad".',
  'Las campanas del Capítulo repicaron: alguien logró un build limpio a la primera.',
  'Se celebró la Vigilia del Linker, en silencio, esperando que no se ejecutara innecesariamente.',
  'Un peregrino llegó desde otro campus preguntando por la diferencia entre recompilar y relinkar.',
  'El Consejo debate si `make re` en mitad de la noche cuenta como herejía o como penitencia.',
];

const AI_EVENTS_PER_DAY = 5;
const STATIC_EVENTS_PER_DAY = 8;
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CommunityService implements OnModuleInit {
  private readonly groq: Groq;

  constructor(private readonly prisma: PrismaService) {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  }

  onModuleInit() {
    const aiIntervalMs = DAY_MS / AI_EVENTS_PER_DAY;
    setInterval(() => {
      this.generateAiFictionalEvent().catch((err) =>
        console.error('No se pudo generar evento ficticio con IA:', err.message),
      );
    }, aiIntervalMs);

    const staticIntervalMs = DAY_MS / STATIC_EVENTS_PER_DAY;
    setInterval(() => {
      this.createStaticFictionalEvent().catch((err) =>
        console.error('No se pudo crear evento ficticio estático:', err.message),
      );
    }, staticIntervalMs);
  }

  async createEvent(type: string, message: string) {
    return this.prisma.communityEvent.create({ data: { type, message } });
  }

  async getRecentEvents(limit = 30) {
    return this.prisma.communityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async createStaticFictionalEvent() {
    const message = FICTIONAL_EVENTS[Math.floor(Math.random() * FICTIONAL_EVENTS.length)];
    return this.createEvent('FICTIONAL', message);
  }

  private async generateAiFictionalEvent() {
    const completion = await this.groq.chat.completions.create({
      model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
      messages: [
        {
          role: 'system',
          content: `Genera UNA sola frase corta (máximo 20 palabras), en español,
sobre un evento cotidiano, ficticio y humorístico de "La Iglesia del
Verdadero Relink", una comunidad satírica de estudiantes de 42 Barcelona
obsesionada con Makefiles y el relinkado correcto. Tono solemne pero
absurdo. Responde SOLO con la frase, sin comillas ni explicaciones.`,
        },
      ],
    });

    const message = completion.choices[0]?.message?.content?.trim();
    if (message) {
      await this.createEvent('FICTIONAL', message);
    }
  }
}
