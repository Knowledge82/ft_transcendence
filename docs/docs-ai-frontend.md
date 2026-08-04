# AiModule (frontend) — El Confesionario

## Qué se construyó

La interfaz para el Confesor: una página (`/confesionario`) donde el usuario pega un fragmento de Makefile y recibe, en tiempo real, un análisis generado por IA sobre sus "herejías" técnicas — con el texto apareciendo progresivamente en pantalla, tal como se va generando, no de golpe al final.

## Por qué `fetch` nativo en vez de nuestro cliente axios habitual

`api/ai.ts` no usa `apiClient` (nuestra instancia de axios usada en el resto del proyecto). Axios, en el navegador, entrega la respuesta completa de una sola vez — no da acceso a los fragmentos según van llegando. Para leer el streaming real hace falta trabajar directamente con la API de `fetch` del navegador y su `ReadableStream`:

```typescript
const response = await fetch('/api/ai/confess', { ... });
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  yield decoder.decode(value, { stream: true });
}
```

`TextDecoder` con `{ stream: true }` es importante: los fragmentos llegan como bytes crudos, y un carácter multibyte (como una `ñ` o `¡`) podría quedar partido justo en el límite entre dos fragmentos — ese flag le dice al decodificador que guarde cualquier resto incompleto y lo complete con el siguiente fragmento, en vez de corromper el carácter.

Como se usa `fetch` en vez de `apiClient`, no se benefician automáticamente del interceptor de renovación de token — el envío incluye el `accessToken` actual leído directamente vía `getAccessToken()`.

## Cancelación con `AbortController`

El botón "Cancelar" durante la generación usa la API estándar del navegador para interrumpir una petición en curso:

```typescript
const controller = new AbortController();
// ...pasado como { signal: controller.signal } al fetch
controller.abort(); // corta la conexión de verdad, no solo dejamos de "escuchar"
```

Al cancelar, `fetch` lanza una excepción con `name === 'AbortError'`, que se filtra explícitamente para no mostrarla como un error real al usuario — es una acción intencionada, no un fallo.

## Interfaz

- `<textarea>` para pegar el Makefile, con contador de caracteres sincronizado con el límite del backend (4000 caracteres)
- Botón que cambia de texto ("Confesarme" → "Confesando...") y se deshabilita mientras hay una petición en curso
- Área de respuesta que crece con cada fragmento recibido (`setResponse((prev) => prev + chunk)`), con un cursor parpadeante (`▌`) mientras el streaming sigue activo, para reforzar visualmente que el texto se está generando en vivo
- Errores (incluido el `429` de rate limiting) mostrados en un bloque separado, distinguibles del resultado normal

## Dónde está en el código

- `src/api/ai.ts` — función generadora `streamConfession()`
- `src/pages/ConfesionarioPage.tsx` — la página completa
- `src/App.tsx` — ruta protegida `/confesionario`
- `src/pages/HomePage.tsx` — enlace de acceso desde el panel de perfil


[VOLVER](../README.md)
