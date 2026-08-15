# Haciendo que la IA responda en el idioma del usuario

Cierra el último hueco abierto del sistema de internacionalización: el texto que genera la propia IA (el Confesor y el Oráculo) ahora se escribe directamente en el idioma activo de quien hace la petición, en vez de estar siempre fijo en español.

## Por qué este caso era distinto a los anteriores

En la crónica pública y en las notificaciones, el "problema" era mostrar datos ya guardados en el idioma correcto — el contenido en sí no cambiaba, solo su presentación. Aquí es diferente: el Confesor y el Oráculo generan texto creativo, nuevo, en cada petición. No tiene sentido "traducir" ese texto después de generarlo (se perdería el tono, los matices) — lo correcto es pedirle directamente al modelo que escriba en el idioma correspondiente desde el principio.

## Cómo se transmite el idioma: la cabecera HTTP Accept-Language

En vez de inventar un campo personalizado que hubiera que añadir a cada endpoint por separado, se reutiliza una cabecera HTTP estándar, pensada exactamente para este propósito.

- Para la mayoría de peticiones (las que usan nuestro cliente axios), se añadió una línea al interceptor global que ya existía para adjuntar el token de sesión — ahora también adjunta el idioma activo a cada petición saliente, automáticamente, sin que cada función de la API tenga que acordarse de hacerlo.
- Para el Confesor específicamente, que usa fetch nativo en vez de axios (necesario para poder leer la respuesta en streaming, chunk a chunk, según se va generando), la cabecera se añade a mano en ese único punto.

En el backend, cada controlador que necesita esta información simplemente la lee con el decorador `@Headers('accept-language')` de NestJS.

## Los prompts — tres versiones completas, no una traducción mecánica

Tanto el prompt del Confesor como el del Oráculo se reescribieron por completo en los tres idiomas — no es una traducción palabra por palabra, sino una redacción natural en cada idioma que mantiene el mismo tono (solemne, dramático, ligeramente sarcástico) y las mismas reglas de comportamiento.

## El detalle más delicado: el veredicto del Oráculo sigue siendo en español, siempre

El Oráculo responde con un protocolo fijo: la primera línea debe ser la palabra `APROBADO` o `RECHAZADO`, que nuestro propio código del backend analiza para decidir si el artículo se publica o no. Si hubiéramos traducido también esas palabras clave a cada idioma, habríamos tenido que mantener tres versiones distintas de esa lógica de análisis — algo frágil e innecesario.

La solución: en los tres prompts se le indica explícitamente al modelo que esas dos palabras concretas se mantengan siempre en español, como un marcador de protocolo fijo entre nuestro sistema y el modelo — no forman parte del contenido que ve el usuario. Lo único que cambia de idioma es la frase de rechazo en sí, la que sí lee la persona.

## Un error corregido de paso

Al revisar `ai.controller.ts` se encontró que el manejo de errores leía `error.message` en vez de usar `error.getResponse()` — el método oficial de NestJS pensado exactamente para recuperar el cuerpo original de una excepción. Desde que los errores pasaron a ser objetos con un código (`{ code: 'CONFESSOR_RATE_LIMITED' }`) en vez de simples cadenas de texto, `.message` ya no reflejaba de forma fiable lo que realmente se había enviado — se corrigió para usar el método correcto.

## Dónde está en el código

Backend: `src/ai/ai.service.ts` (los tres prompts, la función `resolveLanguage` con su fallback a español), `src/ai/ai.controller.ts`, `src/articles/articles.controller.ts` (ambos leen la cabecera y la pasan al servicio)

Frontend: `src/api/client.ts` (el interceptor global), `src/api/ai.ts` (la cabecera añadida a mano para el streaming)

## Con esto, el módulo de internacionalización queda completo

Interfaz, crónica pública, notificaciones, códigos de error, y ahora también el contenido generado por IA — todo el texto de cara al usuario se adapta al idioma activo. El único límite consciente que queda es el contenido escrito por los propios usuarios (los artículos de la Biblioteca), que se mantiene en el idioma en que cada persona los escribió — la misma distinción entre "interfaz" y "contenido de autor" que aplica cualquier plataforma real.
