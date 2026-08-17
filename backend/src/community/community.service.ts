import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import Groq from 'groq-sdk';

// How many phrase VARIANTS exist per event type — must stay in sync with
// how many "community.<type>.N" keys actually exist in each of
// frontend/src/i18n/locales/{es,en,ar}.json. The phrase TEXT itself no
// longer lives on the backend at all — only this count, needed to pick a
// valid random index.
const TEMPLATE_POOL_SIZES: Record<string, number> = {
  USER_REGISTERED: 3,
  ROLE_CHANGED: 3,
  FRIENDSHIP_ACCEPTED: 6,
  FRIENDSHIP_BROKEN: 5,
  ARTICLE_PUBLISHED: 3,
  ARTICLE_EDITED: 2,
  ARTICLE_DELETED: 2,
  FICTIONAL_STATIC: 26,
  USER_EXECUTED: 3,
};

function randomIndex(type: string): number {
  const size = TEMPLATE_POOL_SIZES[type] ?? 1;
  return Math.floor(Math.random() * size);
}

// Massively increased frequency compared to earlier drafts — the ticker
// on /celda cycles every few seconds, so a sparse pool of events felt
// stale very quickly. Static events are free (no external API call), so
// they can run often; AI-generated ones stay more conservative to avoid
// burning through Groq's quota (especially now that each one costs
// THREE calls instead of one, one per language).
const AI_EVENTS_PER_DAY = 48; // roughly every 30 minutes
const STATIC_EVENTS_PER_DAY = 288; // roughly every 5 minutes
const DAY_MS = 24 * 60 * 60 * 1000;

// One prompt per language — each asks the model to generate FRESH
// creative content directly in that language, rather than generating
// once and mechanically translating afterward (translation would risk
// losing the joke/tone in languages structurally very different from
// Spanish, like Arabic).
const FICTIONAL_PROMPTS: Record<string, string> = {
  es: `Genera UNA sola frase corta (máximo 20 palabras), en español,
sobre un evento cotidiano, ficticio y humorístico de "La Iglesia del
Verdadero Relink", una comunidad satírica de estudiantes de 42 Barcelona
obsesionada con Makefiles y el relinkado correcto. Tono solemne pero
absurdo. Responde SOLO con la frase, sin comillas ni explicaciones.`,
  en: `Generate ONE short sentence (max 20 words), in English, about an
everyday, fictional, humorous event from "La Iglesia del Verdadero
Relink", a satirical community of 42 Barcelona students obsessed with
Makefiles and proper relinking. Solemn but absurd tone. Reply ONLY with
the sentence, no quotes or explanations.`,
  ar: `أنشئ جملة واحدة قصيرة فقط (بحد أقصى 20 كلمة)، باللغة العربية، عن
حدث يومي خيالي وفكاهي في "كنيسة إعادة الربط الحقيقية" (La Iglesia del
Verdadero Relink)، وهي مجتمع ساخر لطلاب 42 برشلونة المهووسين بملفات
Makefile وإعادة الربط الصحيحة. نبرة جادة لكن عبثية. أجب فقط بالجملة، دون
علامات اقتباس أو تفسيرات.`,
};

@Injectable()
export class CommunityService implements OnModuleInit {
  private readonly groq: Groq;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
  ) {
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

  async createEvent(type: string, templateIndex: number | null, params: Record<string, string>) {
    const event = await this.prisma.communityEvent.create({
      data: { type, templateIndex, params },
    });
    this.chatGateway.broadcastToAll('communityEventCreated', event);
    return event;
  }

  async getRecentEvents(limit = 30) {
    return this.prisma.communityEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getTodayEvents() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.communityEvent.findMany({
      where: { createdAt: { gte: startOfDay } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createUserRegisteredEvent(name: string) {
    return this.createEvent('USER_REGISTERED', randomIndex('USER_REGISTERED'), { name });
  }

  async createRoleChangedEvent(name: string, role: string, gender: string) {
    return this.createEvent('ROLE_CHANGED', randomIndex('ROLE_CHANGED'), { name, role, gender });
  }

  async createArticlePublishedEvent(name: string, title: string) {
    return this.createEvent('ARTICLE_PUBLISHED', randomIndex('ARTICLE_PUBLISHED'), {
      name,
      title,
    });
  }

  async createArticleEditedEvent(name: string, title: string) {
    return this.createEvent('ARTICLE_EDITED', randomIndex('ARTICLE_EDITED'), { name, title });
  }

  async createArticleDeletedEvent(name: string, title: string) {
    return this.createEvent('ARTICLE_DELETED', randomIndex('ARTICLE_DELETED'), { name, title });
  }

  async createFriendshipAcceptedEvent(nameA: string, nameB: string) {
    return this.createEvent('FRIENDSHIP_ACCEPTED', randomIndex('FRIENDSHIP_ACCEPTED'), {
      nameA,
      nameB,
    });
  }

  async createFriendshipBrokenEvent(nameA: string, nameB: string) {
    return this.createEvent('FRIENDSHIP_BROKEN', randomIndex('FRIENDSHIP_BROKEN'), {
      nameA,
      nameB,
    });
  }

  async createStaticFictionalEvent() {
    return this.createEvent('FICTIONAL_STATIC', randomIndex('FICTIONAL_STATIC'), {});
  }

  // Fired when a user is deleted (Option C from our design discussion):
  // the account and all its content are genuinely gone — no tombstone
  // profile, no preserved messages/articles — but the FACT that it
  // happened is preserved publicly in the chronicle, the same way an
  // auto-da-fé was a public spectacle meant to be remembered, even
  // though the condemned themselves left nothing behind.
  async createUserExecutedEvent(name: string) {
    return this.createEvent('USER_EXECUTED', randomIndex('USER_EXECUTED'), { name });
  }

  private async generateAiFictionalEvent() {
    const languages = ['es', 'en', 'ar'] as const;

    const results = await Promise.all(
      languages.map((lang) =>
        this.groq.chat.completions
          .create({
            model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
            messages: [{ role: 'system', content: FICTIONAL_PROMPTS[lang] }],
          })
          .then((completion) => completion.choices[0]?.message?.content?.trim() ?? ''),
      ),
    );

    const [es, en, ar] = results;
    if (!es || !en || !ar) {
      return;
    }

    await this.createEvent('FICTIONAL_AI', null, { es, en, ar });
  }
}
