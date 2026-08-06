"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
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
let CommunityService = class CommunityService {
    prisma;
    groq;
    constructor(prisma) {
        this.prisma = prisma;
        this.groq = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY ?? '' });
    }
    onModuleInit() {
        const aiIntervalMs = DAY_MS / AI_EVENTS_PER_DAY;
        setInterval(() => {
            this.generateAiFictionalEvent().catch((err) => console.error('No se pudo generar evento ficticio con IA:', err.message));
        }, aiIntervalMs);
        const staticIntervalMs = DAY_MS / STATIC_EVENTS_PER_DAY;
        setInterval(() => {
            this.createStaticFictionalEvent().catch((err) => console.error('No se pudo crear evento ficticio estático:', err.message));
        }, staticIntervalMs);
    }
    async createEvent(type, message) {
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
    async generateAiFictionalEvent() {
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
};
exports.CommunityService = CommunityService;
exports.CommunityService = CommunityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CommunityService);
//# sourceMappingURL=community.service.js.map