# Crónica pública multi-idioma (`CommunityEvent`)

## El problema de partida

Antes, cada evento de la crónica se guardaba en la base de datos como una frase ya completa, en el idioma que estuviera activo en ese momento ("**Valeria** ha alcanzado el rango de ARZOBISPA."). Una vez guardada así, la frase quedaba "congelada" en ese idioma para siempre — cambiar el idioma de la interfaz no podía afectar a algo que ya se había renderizado y guardado como texto final.

La solución: dejar de guardar la frase terminada, y guardar en su lugar de qué tipo de evento se trata y los datos en bruto necesarios para construirla. La frase final se ensambla en el frontend, en el idioma que cada persona tenga activo en ese momento, cada vez que se muestra.

## Las tres fuentes de mensajes, y cómo se traduce cada una

### 1. Eventos "reales" (registro, amistad, artículos, cambio de rango)

Tienen una estructura clara: una frase con "huecos" que se rellenan con datos concretos (un nombre, un rango, el título de un artículo). Se reutiliza exactamente el mismo mecanismo de interpolación de i18next que ya usábamos en otros sitios de la aplicación (por ejemplo, el contador de miembros del chat: `"Hermanos ({{online}}/{{total}})"`).

En base de datos se guarda el tipo de evento, cuál de las variantes de frase se escogió al azar (`templateIndex`), y los parámetros en bruto:

```json
{ "type": "ROLE_CHANGED", "templateIndex": 2, "params": { "name": "Valeria", "role": "ARZOBISPO", "gender": "FEMENINO" } }
```

En el frontend, se busca la plantilla correspondiente en los archivos de traducción (`community.roleChanged.2`) y se rellena con los parámetros:

```typescript
t('community.roleChanged.2', { name: 'Valeria', role: 'Archbishop' }) // en inglés, por ejemplo
```

Un detalle importante: el rango (`role`) se guarda en bruto (`ARZOBISPO` + `FEMENINO`), no ya con la forma de género aplicada — la palabra correcta en cada idioma ("ARZOBISPA" en español, "Archbishop" en inglés, sin cambio por género) se calcula en el momento de mostrarla, usando la misma utilidad multi-idioma de rangos que ya se aplicó al resto de la aplicación.

### 2. Frases ficticias fijas (el "sabor" decorativo, ~26 frases sobre monjes y Makefiles)

Al ser un conjunto cerrado y conocido de antemano (no hay nombres ni datos variables, cada frase es una oración completa), no hace falta ninguna interpolación — basta con guardar qué número de frase se sorteó:

```json
{ "type": "FICTIONAL_STATIC", "templateIndex": 7, "params": {} }
```

Las 26 frases se tradujeron al inglés y al árabe manteniendo exactamente la misma posición en los tres archivos — la frase número 7 en español, en inglés y en árabe son la misma broma, solo en idiomas distintos. El frontend simplemente busca `community.fictionalStatic.7` en el idioma activo.

### 3. Frases generadas por IA (Groq, el evento "sorpresa" que aparece cada ~30 minutos)

Este caso es distinto de los otros dos: el texto lo escribe el modelo de lenguaje en el momento, es contenido libre, no hay ninguna plantilla ni parámetros que rellenar. Además, el evento se genera una sola vez y se retransmite en vivo a todas las personas conectadas simultáneamente, sin importar el idioma de cada una — así que no sirve con generarlo en un solo idioma.

La solución: en el momento de generar el evento, se hacen tres llamadas a Groq en paralelo, una por idioma, cada una con su propio prompt (pidiendo explícitamente una frase original en ese idioma, no una traducción mecánica de las otras). Los tres resultados se guardan juntos:

```json
{ "type": "FICTIONAL_AI", "templateIndex": null, "params": { "es": "...", "en": "...", "ar": "..." } }
```

El frontend simplemente lee `params[idioma_actual]`. El coste de este enfoque: triplica las llamadas a Groq específicamente para este mecanismo (de ~48 al día a ~144 al día) — un volumen que sigue siendo modesto dentro de los límites gratuitos de la API.

## Cambios en el esquema de base de datos

```prisma
model CommunityEvent {
  id            Int      @id @default(autoincrement())
  type          String
  templateIndex Int?
  params        Json?
  createdAt     DateTime @default(now())
}
```

El campo `message` (la frase ya renderizada) desapareció por completo, sustituido por `templateIndex` y `params`.

## Un detalle técnico durante la implementación

Al principio, el método `createEvent` aceptaba `params` como `Record<string, unknown>` — TypeScript/Prisma rechazó ese tipo porque no puede garantizar que un valor "unknown" (que podría ser cualquier cosa, incluida una función) sea JSON válido. Como en la práctica todos los parámetros que se envían son siempre cadenas de texto (nombres, rangos, títulos), se ajustó el tipo a `Record<string, string>` — más preciso y compatible sin perder ninguna funcionalidad real.

## Dónde está en el código

Backend: `prisma/schema.prisma`, `src/community/community.service.ts` (reescrito por completo — ya no contiene ningún texto en español, solo el tamaño de cada pool de variantes y los prompts de generación por idioma), `src/admin/admin.controller.ts` (pasa el rango y el género en bruto, no ya con género aplicado)

Frontend: `src/i18n/locales/{es,en,ar}.json` (nuevo namespace `community`, con las plantillas de los 7 tipos de eventos reales más las 26 frases fijas, en los tres idiomas), `src/components/ActivityTicker.tsx` (la función `renderEvent`, que ensambla la frase final según el tipo de evento y el idioma activo), `src/api/community.ts` (tipo `CommunityEvent` actualizado a `type`/`templateIndex`/`params`)


[VOLVER](../README.md)
