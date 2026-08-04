import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

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
// Configurable via .env so a model retirement/quota change never requires
// touching code — just update GEMINI_MODEL and restart the container.
// "gemini-2.0-flash" as default: not the newest (smaller free quota) nor
// a retired version, a reasonable middle ground for a free-tier project.
const MODEL_NAME = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  async *streamConfession(makefileContent: string): AsyncGenerator<string> {
    if (!makefileContent || !makefileContent.trim()) {
      throw new BadRequestException('Debes enviar el contenido del Makefile');
    }
    if (makefileContent.length > MAX_INPUT_LENGTH) {
      throw new BadRequestException(
        `El Makefile es demasiado largo (máximo ${MAX_INPUT_LENGTH} caracteres)`,
      );
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
    } catch (error) {
      // Distinguish Google's own quota/rate-limit response from any other
      // failure, so the controller (and the user) get a message that
      // actually explains what happened instead of a generic "internal error"
      const status = (error as { status?: number })?.status;
      if (status === 429) {
        throw new HttpException(
          'El Confesor ha agotado su cuota diaria gratuita de consultas a la IA. Inténtalo de nuevo mañana.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }
}
