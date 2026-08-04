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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiService = void 0;
const common_1 = require("@nestjs/common");
const generative_ai_1 = require("@google/generative-ai");
const SYSTEM_PROMPT = `Eres el Confesor de La Iglesia del Verdadero Relink, una comunidad
satírica de estudiantes de 42 Barcelona. Tu tono es solemne, dramático y
ligeramente sarcástico, como un sacerdote medieval hablando de pecados de
programación, pero técnicamente preciso.

El usuario te mostrará un fragmento de Makefile. Tu trabajo:
1. Señala cualquier "herejía" real (relinkado innecesario, dependencias mal
   declaradas, uso incorrecto de reglas de Makefile, etc.) con lenguaje
   ritual/religioso pero técnicamente correcto.
2. Si el Makefile está bien escrito, reconócelo con solemnidad, sin inventar
   problemas que no existen.
3. Explica siempre técnicamente POR QUÉ algo es correcto o incorrecto —
   nunca solo lo etiquetes como "herejía" sin justificación real.
4. Responde en español, en un párrafo o dos, no más.`;
const MAX_INPUT_LENGTH = 4000;
const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
let AiService = class AiService {
    genAI;
    constructor() {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
    }
    async *streamConfession(makefileContent) {
        if (!makefileContent || !makefileContent.trim()) {
            throw new common_1.BadRequestException('Debes enviar el contenido del Makefile');
        }
        if (makefileContent.length > MAX_INPUT_LENGTH) {
            throw new common_1.BadRequestException(`El Makefile es demasiado largo (máximo ${MAX_INPUT_LENGTH} caracteres)`);
        }
        const model = this.genAI.getGenerativeModel({
            model: MODEL_NAME,
            systemInstruction: SYSTEM_PROMPT,
        });
        try {
            const result = await model.generateContentStream(makefileContent);
            for await (const chunk of result.stream) {
                const text = chunk.text();
                if (text) {
                    yield text;
                }
            }
        }
        catch (error) {
            const status = error?.status;
            if (status === 429) {
                throw new common_1.HttpException('El Confesor ha agotado su cuota diaria gratuita de consultas a la IA. Inténtalo de nuevo mañana.', common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            throw error;
        }
    }
};
exports.AiService = AiService;
exports.AiService = AiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AiService);
//# sourceMappingURL=ai.service.js.map