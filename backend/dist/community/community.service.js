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
const chat_gateway_1 = require("../chat/chat.gateway");
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
    'Un hermano juró haber visto un `Makefile.bak` moverse solo entre los archivos.',
    'Se avistó a un novicio leyendo la documentación de GNU Make a la luz de una vela.',
    'El Capítulo celebró un minuto de silencio por cada `rm -rf` ejecutado sin confirmación.',
    'Alguien propuso sustituir las campanas por el sonido de un build exitoso. Fue rechazado por unanimidad.',
    'Un hermano fue visto susurrándole a su terminal antes de ejecutar `make`.',
    'Se ha encontrado una inscripción antigua: "El que relinka sin necesidad, relinka en vano".',
    'El Arzobispo declaró el jueves como el día oficial de revisión de `.gitignore`.',
    'Un peregrino llegó pidiendo perdón por haber usado un IDE con autocompletado de Makefiles.',
    'Se rumorea que en las catacumbas del Capítulo hay un `Makefile` sin una sola tabulación mal puesta.',
    'Tres hermanos discutieron durante horas sobre si `.PHONY` es dogma o simple recomendación.',
    'El Consejo aprobó una nueva vidriera dedicada a la memoria del primer `Segmentation fault` bien depurado.',
    'Un novicio preguntó qué es el linker. El silencio que siguió fue considerado respuesta suficiente.',
    'Se celebró una vigilia nocturna esperando que terminara una compilación particularmente larga.',
    'Un hermano fue sorprendido comentando código en inglés y hablando de él en español. Se le perdonó.',
    'El Capítulo adquirió una réplica exacta del primer terminal que mostró "Segmentation fault (core dumped)".',
    'Se debate si escribir `make clean && make` antes de dormir cuenta como oración nocturna.',
];
const AI_EVENTS_PER_DAY = 48;
const STATIC_EVENTS_PER_DAY = 288;
const DAY_MS = 24 * 60 * 60 * 1000;
const FRIENDSHIP_ACCEPTED_TEMPLATES = [
    (a, b) => `**${a}** y **${b}** han jurado hermandad ante el Verdadero Relink.`,
    (a, b) => `**${a}** y **${b}** han sellado un pacto de hermandad ante el altar del Makefile.`,
    (a, b) => `Se ha registrado un nuevo vínculo fraternal entre **${a}** y **${b}**.`,
    (a, b) => `**${a}** y **${b}** compartieron pan y un \`git diff\` en señal de hermandad.`,
    (a, b) => `El Capítulo da la bienvenida a la nueva hermandad entre **${a}** y **${b}**.`,
    (a, b) => `**${a}** y **${b}** han jurado no relinkar el uno contra el otro, jamás.`,
];
const FRIENDSHIP_BROKEN_TEMPLATES = [
    (a, b) => `**${a}** y **${b}** han roto su hermandad. Se rumorea que fue por un \`touch Makefile\`.`,
    (a, b) => `El vínculo entre **${a}** y **${b}** se ha disuelto ante el Capítulo, en silencio.`,
    (a, b) => `**${a}** y **${b}** ya no se consideran hermanos. Nadie pregunta por qué.`,
    (a, b) => `Se ha declarado el cisma entre **${a}** y **${b}**. Que el linker los perdone.`,
    (a, b) => `**${a}** y **${b}** han decidido seguir caminos separados dentro del Capítulo.`,
];
const ROLE_CHANGED_TEMPLATES = [
    (name, role) => `**${name}** ha alcanzado el rango de ${role}.`,
    (name, role) => `El Capítulo reconoce a **${name}** con el rango de ${role}.`,
    (name, role) => `**${name}** asciende a ${role} ante la mirada de sus hermanos.`,
];
const USER_REGISTERED_TEMPLATES = [
    (name) => `**${name}** ha llamado a las puertas del Verdadero Relink y ha sido recibido como novicio.`,
    (name) => `Un nuevo novicio, **${name}**, se ha unido al Capítulo.`,
    (name) => `**${name}** ha jurado nunca más relinkar innecesariamente. Bienvenido seas.`,
];
function pickRandom(items) {
    return items[Math.floor(Math.random() * items.length)];
}
let CommunityService = class CommunityService {
    prisma;
    chatGateway;
    groq;
    constructor(prisma, chatGateway) {
        this.prisma = prisma;
        this.chatGateway = chatGateway;
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
        const event = await this.prisma.communityEvent.create({ data: { type, message } });
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
    async createUserRegisteredEvent(name) {
        return this.createEvent('USER_REGISTERED', pickRandom(USER_REGISTERED_TEMPLATES)(name));
    }
    async createRoleChangedEvent(name, role) {
        return this.createEvent('ROLE_CHANGED', pickRandom(ROLE_CHANGED_TEMPLATES)(name, role));
    }
    async createFriendshipAcceptedEvent(nameA, nameB) {
        return this.createEvent('FRIENDSHIP_ACCEPTED', pickRandom(FRIENDSHIP_ACCEPTED_TEMPLATES)(nameA, nameB));
    }
    async createFriendshipBrokenEvent(nameA, nameB) {
        return this.createEvent('FRIENDSHIP_BROKEN', pickRandom(FRIENDSHIP_BROKEN_TEMPLATES)(nameA, nameB));
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        chat_gateway_1.ChatGateway])
], CommunityService);
//# sourceMappingURL=community.service.js.map