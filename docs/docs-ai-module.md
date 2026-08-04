# AiModule — El Confesor (LLM system interface)

## Qué módulo del enunciado cubre

De las cuatro opciones Major de la categoría Artificial Intelligence (AI Opponent, RAG, LLM system interface, Recommendation system), se eligió **"Complete LLM system interface"**: generación de texto a partir de la entrada del usuario, respuestas en streaming, manejo de errores y rate limiting. Encaja de forma natural con la temática del proyecto — un "Confesor" que analiza fragmentos de Makefile y señala sus "herejías" técnicas.

Se descartaron las otras tres opciones: AI Opponent y sus estadísticas requieren un juego (todavía no implementado), y RAG/Recommendation exigen infraestructura adicional (base de conocimiento con recuperación por similitud, o datos de comportamiento acumulados) que no aporta valor inmediato en esta fase.

## Elección del proveedor — Google Gemini API

Se evaluaron varias opciones. OpenAI y la API de Anthropic no ofrecen un nivel gratuito permanente (requieren tarjeta o crédito de prueba limitado). Se optó por **Gemini API**, con un nivel gratuito real y sin necesidad de tarjeta — adecuado para un proyecto académico que no debe depender de un gasto continuo.

**Cómo conseguir la clave:** [aistudio.google.com](https://aistudio.google.com) → "Get API key" → "Create API key". Se guarda en `.env` como `GEMINI_API_KEY`, y debe añadirse explícitamente a la sección `environment` del servicio `backend` en `docker-compose.yml` (Docker Compose no reenvía automáticamente todo el contenido del `.env` al contenedor; cada variable que el código necesita debe declararse ahí).

## Instalación

```bash
npm install @google/generative-ai
```

SDK oficial de Node.js para la API de Gemini.

## Lección aprendida: nombres de modelo "-latest" en vez de versiones fijas

El primer intento usó `gemini-2.5-flash`, que resultó estar retirado para cuentas nuevas. Probar con una versión más nueva (`gemini-3.5-flash`) funcionó, pero se decidió usar en su lugar el alias **`gemini-flash-latest`** — Google mantiene este nombre apuntando siempre a su modelo flash recomendado actual, evitando que el código se rompa cada vez que una versión concreta quede obsoleta.

Para consultar en cualquier momento qué modelos están realmente disponibles para una clave concreta (más fiable que confiar en documentación que puede quedar desactualizada), se puede llamar directamente al endpoint de listado de la API:
```
GET https://generativelanguage.googleapis.com/v1beta/models?key=TU_CLAVE
```

## La personalidad del Confesor — system prompt

Se define una instrucción de sistema separada del mensaje del usuario, que fija el tono y el criterio de análisis de forma permanente:

```typescript
const SYSTEM_PROMPT = `Eres el Confesor de La Iglesia del Verdadero Relink...
1. Señala cualquier "herejía" real... con lenguaje ritual/religioso pero
   técnicamente correcto.
2. Si el Makefile está bien escrito, reconócelo con solemnidad...
3. Explica siempre técnicamente POR QUÉ...
4. Responde en español, en un párrafo o dos, no más.`;
```

Importante: se le exige explícitamente justificar técnicamente cada señalamiento, no limitarse a etiquetar cosas como "herejía" sin fundamento — así el resultado es entretenido en el tono pero correcto en el contenido, verificable en la evaluación.

## Streaming — cómo funciona

A diferencia de una respuesta HTTP normal (todo el contenido de una vez, al final), aquí la conexión permanece abierta y el servidor escribe fragmentos de texto a medida que van llegando desde Gemini.

**En el servicio**, se usa un generador asíncrono:
```typescript
async *streamConfession(makefileContent: string): AsyncGenerator<string> {
  ...
  const result = await model.generateContentStream(makefileContent);
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
}
```

**En el controlador**, en vez de dejar que NestJS construya la respuesta automáticamente, se toma control manual sobre el objeto `Response` de Express:
```typescript
@Post('confess')
async confess(@Body('makefile') makefile: string, @Res() res: Response) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('X-Accel-Buffering', 'no');
  for await (const chunk of this.aiService.streamConfession(makefile)) {
    res.write(chunk);
  }
  res.end();
}
```

`X-Accel-Buffering: no` es necesario específicamente por nginx: por defecto puede almacenar en búfer toda la respuesta antes de reenviarla al navegador, lo que anularía el efecto del streaming.

**Nota:** no se trata de Server-Sent Events (SSE) formal — SSE exige un formato concreto (`Content-Type: text/event-stream`, mensajes con el prefijo `data: `). Aquí se envía texto plano en crudo, más simple, pensado para leerse en el frontend con `fetch` + `ReadableStream` en vez del `EventSource` del navegador (que además no admite peticiones POST con cuerpo, algo que aquí es imprescindible para enviar el contenido del Makefile).

## Manejo de errores durante el streaming

Como la respuesta ya pudo empezar a enviarse como texto plano antes de que ocurra un error, no siempre es posible "cambiar de opinión" y responder con JSON:
```typescript
if (!res.headersSent) {
  // Aún no se envió nada: se puede responder con un código de error normal
} else {
  // Ya se envió parte del streaming: solo se puede añadir un marcador
  // de error visible y cerrar la conexión
}
```

## Rate limiting

Se usa `@nestjs/throttler`, aplicado únicamente al endpoint `/ai/confess` (no a todo el módulo) — es el único que tiene un coste real asociado a una cuota externa compartida:

```typescript
ThrottlerModule.forRoot([{ ttl: 60000, limit: 5 }]) // 5 peticiones por minuto
```

**Decisión de diseño — contar por usuario, no por IP:** el comportamiento por defecto de `ThrottlerGuard` limita por dirección IP. En una red compartida (como el campus, donde varios estudiantes salen por la misma IP pública/NAT), esto penalizaría a todo el mundo por el uso de una sola persona. Se sobrescribió el método de seguimiento para usar el `userId` del JWT en su lugar:

```typescript
export class UserThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.user?.userId?.toString() ?? req.ip;
  }
}
```

## Verificación

Un detalle útil para probar el límite de forma fiable: los Guards de NestJS se ejecutan **antes** de que el código del controlador llegue a invocar al servicio — así que basta con enviar dos peticiones seguidas (sin ni siquiera esperar a que la primera termine) para comprobar el rechazo con `429 Too Many Requests`, sin necesidad de esperar respuestas completas de Gemini ni consumir cuota real en las pruebas.

Comprobado: primera petición cursada normalmente, segunda petición dentro de la misma ventana de tiempo rechazada inmediatamente con:
```json
{ "statusCode": 429, "message": "ThrottlerException: Too Many Requests" }
```


[VOLVER](../README.md)
