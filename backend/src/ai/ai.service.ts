import { Injectable, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '');
  }

  // Returns an async generator that yields text chunks as they arrive from
  // Gemini — the controller will forward each chunk to the client as it
  // comes in, instead of waiting for the full response
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
      model: 'gemini-flash-latest',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContentStream(makefileContent);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield text;
      }
    }
  }
}
