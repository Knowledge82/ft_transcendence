# Cambio de proveedor a Groq y ritmo "solemne" de respuesta

## Por qué se cambió de Gemini a Groq

Durante las pruebas se agotó repetidamente la cuota diaria gratuita de Gemini (incluso probando distintos modelos y proyectos nuevos), sin poder determinar la causa exacta ni conseguir que se restableciera de forma fiable. Se optó por **Groq** como proveedor: nivel gratuito con cuota notablemente más generosa, e inferencia extremadamente rápida gracias a su hardware propio (LPU — Language Processing Unit).

## Migración del servicio

Gracias a que la lógica del proveedor de IA estaba aislada dentro de `AiService`, el cambio de proveedor no requirió tocar ni el controlador, ni el guard de rate limiting, ni el frontend — solo la implementación interna del servicio.

**Diferencias principales frente al SDK de Gemini:**

- Formato de conversación: Groq (compatible con la interfaz de OpenAI) espera un array de mensajes con roles, no un campo `systemInstruction` separado:
  ```typescript
  messages: [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: makefileContent },
  ]
  ```
- Formato de cada fragmento del streaming: `chunk.choices[0]?.delta?.content`, en vez de `chunk.text()` como en Gemini.

## Nombre de modelo configurable, otra vez

Igual que con Gemini, el nombre del modelo se lee de una variable de entorno (`GROQ_MODEL`, por defecto `openai/gpt-oss-20b`) en vez de estar fijado en el código. Justo antes de esta migración, Groq había retirado sus modelos Llama anteriores (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`) — la misma lección que ya se aprendió con Gemini: los nombres de modelo de proveedores de IA no son estables a largo plazo, así que nunca deben quedar escritos directamente en el código.

## Cada desarrollador necesita su propia clave de Groq

Se añadieron `GROQ_API_KEY` y `GROQ_MODEL` al `.env` (y a `docker-compose.yml`), siguiendo la misma norma que con Gemini: **cada persona del equipo genera su propia clave gratuita** en console.groq.com, nunca se comparte una sola clave entre todos.

## El ritmo "solemne" de la respuesta

La velocidad de Groq, siendo una ventaja técnica real, jugaba en contra del tono del personaje: el Confesor "hablando" a la velocidad de un motor de inferencia optimizado para latencia mínima no encajaba con su carácter solemne y ceremonioso.

**La solución separa dos cosas que antes estaban unidas: la velocidad a la que llegan los datos, y la velocidad a la que se muestran.**

```typescript
const [fullText, setFullText] = useState('');      // datos reales, tal como llegan
const [visibleLength, setVisibleLength] = useState(0); // cuánto se muestra, a ritmo controlado

useEffect(() => {
  if (visibleLength >= fullText.length) return;
  const timeoutId = setTimeout(() => {
    setVisibleLength((prev) => prev + 1);
  }, REVEAL_MS_PER_CHAR);
  return () => clearTimeout(timeoutId);
}, [visibleLength, fullText]);
```

`fullText` crece tan rápido como realmente responde Groq (casi instantáneo). `visibleLength` avanza por separado, un carácter cada `REVEAL_MS_PER_CHAR` milisegundos, mediante un bucle que se relanza solo: cada vez que `visibleLength` avanza, el `useEffect` se vuelve a ejecutar y programa el siguiente carácter — y si mientras tanto sigue llegando más texto real (`fullText` sigue creciendo), el objetivo simplemente se aleja un poco más, sin que haga falta ninguna lógica adicional para manejarlo.

El texto mostrado en pantalla es siempre `fullText.slice(0, visibleLength)` — nunca se muestra el dato real directamente.

**Estado "ocupado" recalculado:** antes, `isStreaming` reflejaba solo si la petición de red seguía en curso. Ahora:
```typescript
const isStreaming = isFetching || visibleLength < fullText.length;
```
Sigue siendo "true" aunque la red ya haya terminado, mientras la revelación del texto en pantalla no haya alcanzado a los datos reales — así el cursor parpadeante y el estado del botón reflejan lo que el usuario ve, no lo que ya ocurrió en el servidor.


[VOLVER](../README.md)
