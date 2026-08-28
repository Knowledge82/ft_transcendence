import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatGateway } from '../chat/chat.gateway';
import Groq from 'groq-sdk';
import { withModelFallback } from '../ai/model-fallback';

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
  ORGANIZATION_FOUNDED: 3,
  ORGANIZATION_DISSOLVED: 3,
  ORGANIZATION_JOINED: 3,
  ORGANIZATION_ARTICLE_PUBLISHED: 3,
};

function randomIndex(type: string): number {
  const size = TEMPLATE_POOL_SIZES[type] ?? 1;
  return Math.floor(Math.random() * size);
}

const AI_EVENTS_PER_DAY = 48;
const STATIC_EVENTS_PER_DAY = 288;
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PHRASE_LENGTH = 500;
const FICTIONAL_MAX_TOKENS = 2000;

function isValidPhrase(text: string): boolean {
  return text.length > 0 && text.length <= MAX_PHRASE_LENGTH;
}

const FICTIONAL_EVENT_TYPES = ['FICTIONAL_STATIC', 'FICTIONAL_AI'];
const TODAY_FEED_LIMIT = 100;

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
    this.clearOldFictionalEvents().catch((err) =>
      console.error('No se pudieron limpiar los eventos ficticios antiguos:', err.message),
    );

    return event;
  }
  private async clearOldFictionalEvents() {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    await this.prisma.communityEvent.deleteMany({
      where: {
        type: { in: FICTIONAL_EVENT_TYPES },
        createdAt: { lt: startOfDay },
      },
    });
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
      take: TODAY_FEED_LIMIT,
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

  async createUserExecutedEvent(name: string) {
    return this.createEvent('USER_EXECUTED', randomIndex('USER_EXECUTED'), { name });
  }

  async createOrganizationFoundedEvent(organization: string, founder: string) {
    return this.createEvent('ORGANIZATION_FOUNDED', randomIndex('ORGANIZATION_FOUNDED'), {
      organization,
      founder,
    });
  }

  async createOrganizationDissolvedEvent(organization: string) {
    return this.createEvent('ORGANIZATION_DISSOLVED', randomIndex('ORGANIZATION_DISSOLVED'), {
      organization,
    });
  }

  async createOrganizationJoinedEvent(organization: string, member: string) {
    return this.createEvent('ORGANIZATION_JOINED', randomIndex('ORGANIZATION_JOINED'), {
      organization,
      member,
    });
  }

  // Only the title is ever shown publicly, never the content — this
  // works more as advertising for the faction (drawing in new members
  // curious about what they're writing) than as any real leak of
  // anything actually private
  async createOrganizationArticlePublishedEvent(name: string, title: string, organization: string) {
    return this.createEvent(
      'ORGANIZATION_ARTICLE_PUBLISHED',
      randomIndex('ORGANIZATION_ARTICLE_PUBLISHED'),
      { name, title, organization },
    );
  }

  private async generateAiFictionalEvent() {
    const languages = ['es', 'en', 'ar'] as const;

    const results = await Promise.all(
      languages.map((lang) =>
        withModelFallback((model) =>
          this.groq.chat.completions.create({
            model,
            messages: [{ role: 'system', content: FICTIONAL_PROMPTS[lang] }],
            max_tokens: FICTIONAL_MAX_TOKENS,
          }),
        ).then((completion) => completion.choices[0]?.message?.content?.trim() ?? ''),
      ),
    );

    const [es, en, ar] = results;
    if (!isValidPhrase(es) || !isValidPhrase(en) || !isValidPhrase(ar)) {
      console.warn(
        `Evento ficticio descartado por longitud (es:${es.length} en:${en.length} ar:${ar.length}, max ${MAX_PHRASE_LENGTH})`,
      );
      return;
    }

    await this.createEvent('FICTIONAL_AI', null, { es, en, ar });
    console.log(
      `Evento ficticio con IA generado con éxito (es:${es.length} en:${en.length} ar:${ar.length}).`,
);
  }
}
