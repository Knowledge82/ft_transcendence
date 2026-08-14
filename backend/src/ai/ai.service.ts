import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import Groq from 'groq-sdk';

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
4. Responde en español. Tu respuesta completa debe tener como máximo 90
   palabras, repartidas en uno o dos párrafos cortos. Termina siempre con
   una frase completa — nunca dejes una idea a medias. Sé conciso desde
   la primera frase, no te extiendas antes de llegar al punto.`;

const MAX_INPUT_LENGTH = 4000;
// This is a safety net, NOT the primary length control — the prompt
// above (a concrete word count) is what actually keeps responses short.
// Set generously above what ~90 words normally needs, so a well-behaved
// response never gets cut off mid-sentence; it only kicks in if the
// model ignores the instruction and starts rambling.
const MAX_OUTPUT_TOKENS = 700;
// Configurable via .env — Groq retires specific model versions over time
// too (it already happened once, in June 2026), so this avoids having to
// touch code again when it happens next.
const MODEL_NAME = process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b';

const ARTICLE_CHECK_PROMPT = `Eres el Oráculo de La Iglesia del Verdadero Relink, una entidad
mística e impersonal (no un hermano ni un cargo humano) encargada de
revisar que los artículos escritos por la comunidad sean aceptables.

Se te mostrará el título y el contenido de un artículo. RECHAZA el
artículo si ocurre CUALQUIERA de estas condiciones:

1. El CONTENIDO no trata temas legítimos: programación, C/C++, Makefiles,
   compilación, herramientas de desarrollo, o la vida académica en 42
   Barcelona relacionada con estos temas.
2. El TÍTULO no guarda relación clara con el contenido o con estos mismos
   temas — un título gracioso, vulgar o completamente ajeno al tema NO es
   aceptable, incluso si el contenido en sí es válido.
3. El título O el contenido contienen lenguaje vulgar, ofensivo, sexual,
   o inapropiado — esto también descalifica el artículo aunque el tema
   de fondo sea correcto.

Solo aprueba si el título Y el contenido son, ambos, temáticamente
apropiados Y decorosos.

Responde EXACTAMENTE en este formato, sin nada más antes o después:

Primera línea: la palabra APROBADO o RECHAZADO, y nada más en esa línea.
Si es RECHAZADO: en la línea siguiente, un reproche breve (máximo 40
palabras), severo y en tono de inquisidor medieval, explicando por qué
el artículo no es aceptable — menciona específicamente si el problema
está en el título, en el contenido, o en ambos.
Si es APROBADO: no escribas nada más después de la primera línea.`;

@Injectable()
export class AiService {
  private readonly groq: Groq;

  constructor() {
    this.groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
  }

  // Non-streaming — we need one complete verdict, not text that "types
  // itself out" like the Confesor's response
  async checkArticleRelevance(
    title: string,
    content: string,
  ): Promise<{ approved: boolean; rejectionMessage: string | null }> {
    try {
      const completion = await this.groq.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: ARTICLE_CHECK_PROMPT },
          { role: 'user', content: `Título: ${title}\n\nContenido: ${content}` },
        ],
        max_tokens: 600,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? '';

      // Don't rely on the model splitting verdict and reason onto two
      // separate lines — smaller/faster models often ignore that and
      // write both in one line (e.g. "RECHAZADO: el título no..."). We
      // just check whether the word APROBADO appears at all near the
      // start of the reply, and treat EVERYTHING else as the reason,
      // regardless of how it's laid out.
      const normalized = raw.toUpperCase();
      const approved = normalized.startsWith('APROBADO');

      let rejectionMessage: string | null = null;
      if (!approved) {
        // Strip a leading "RECHAZADO" (with or without a following colon
        // or dash) from wherever it appears, so we're left with just the
        // actual reason text — whether it was on the same line or the next
        rejectionMessage =
          raw
            .replace(/^RECHAZADO\s*[:\-–]?\s*/i, '')
            .trim() || 'El Oráculo ha rechazado este artículo por no ser conforme a la doctrina.';
      }

      return { approved, rejectionMessage };
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status === 429) {
        throw new HttpException(
          { code: 'ORACLE_RATE_LIMITED' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw error;
    }
  }

  async *streamConfession(makefileContent: string): AsyncGenerator<string> {
    if (!makefileContent || !makefileContent.trim()) {
      throw new BadRequestException({ code: 'EMPTY_MAKEFILE' });
    }
    if (makefileContent.length > MAX_INPUT_LENGTH) {
      throw new BadRequestException({ code: 'MAKEFILE_TOO_LONG', max: MAX_INPUT_LENGTH });
    }

    try {
      const stream = await this.groq.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: makefileContent },
        ],
        max_tokens: MAX_OUTPUT_TOKENS,
        stream: true,
      });

      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) {
          yield text;
        }
      }
    } catch (error) {
      const status = (error as { status?: number })?.status;
      const errorMessage = (error as { message?: string })?.message ?? 'unknown';

      if (status === 429) {
        throw new HttpException(
          { code: 'CONFESSOR_RATE_LIMITED' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      // Log the raw error server-side so we can see the EXACT reason
      // (token limit, invalid request, etc.) the next time something
      // like "no response for a large Makefile" happens — the generic
      // catch in the controller only logs what we pass it, and without
      // this we'd be guessing at the cause instead of reading it directly
      console.error(`Groq error (status: ${status}):`, errorMessage);
      throw error;
    }
  }
}
