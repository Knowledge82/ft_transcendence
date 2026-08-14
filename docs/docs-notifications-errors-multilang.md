# Notificaciones multi-idioma y códigos de error

Cierra dos de los últimos huecos abiertos del sistema de internacionalización: las notificaciones personales, y los mensajes de error que antes venían del backend ya escritos en español.

## Parte 1 — Notificaciones personales

### El mismo problema que ya resolvimos en la crónica pública

Antes, `NotificationsService.createNotification` recibía directamente el texto final en español (`"${name} te ha enviado una solicitud de hermandad."`) y lo guardaba tal cual en la base de datos. Exactamente el mismo problema que tenía `CommunityEvent` antes de su refactorización: una vez guardada la frase, quedaba fija en ese idioma para siempre.

### La solución — la misma arquitectura, más simple

A diferencia de la crónica pública (que tiene varias frases "de sabor" distintas por tipo de evento, elegidas al azar), cada notificación tiene una única redacción fija por tipo — no hace falta ningún `templateIndex`, solo el tipo y los parámetros en bruto:

```typescript
async createNotification(userId: number, type: string, params: Record<string, string>) {
  const notification = await this.prisma.notification.create({
    data: { userId, type, params },
  });
  this.chatGateway.notifyUser(userId, 'notificationCreated', notification);
  return notification;
}
```

### Los cuatro puntos de creación, actualizados

En `FriendsController` (tres) y `AdminController` (uno), se dejó de pasar el texto ya construido:

```typescript
// Antes
await this.notificationsService.createNotification(
  addresseeId,
  'FRIEND_REQUEST_RECEIVED',
  `${requesterName} te ha enviado una solicitud de hermandad.`,
);

// Ahora
await this.notificationsService.createNotification(
  addresseeId,
  'FRIEND_REQUEST_RECEIVED',
  { name: requesterName },
);
```

Para el cambio de rango, se dejó de calcular la forma con género ya aplicada (`getGenderedRole(...)`) en el propio backend — ahora se guardan `role` y `gender` en bruto, y es el frontend quien decide la palabra correcta según el idioma activo de cada persona. Esto hizo innecesaria la importación de `getGenderedRole` en `admin.controller.ts`, que se eliminó.

### El frontend — ensamblar la frase en el idioma activo

`NotificationBell.tsx` ahora tiene una función `renderNotification`, calcada de la que ya existía en `ActivityTicker` para la crónica:

```typescript
function renderNotification(n: Notification): string {
  const key = TYPE_TO_KEY[n.type];
  if (!key) return '';

  const params = { ...(n.params ?? {}) };
  if (n.type === 'ROLE_CHANGED' && params.role && params.gender) {
    params.role = getGenderedRole(params.role, params.gender, i18n.language);
  }

  return t(`notifications.${key}`, params);
}
```

También se tradujo el resto de la interfaz del panel de notificaciones ("Notificaciones", "Marcar todas", "No tienes notificaciones.").

## Parte 2 — Códigos de error en vez de frases fijas

### El problema

Algunos errores del backend eran simplemente texto fijo en español, escrito directamente en el código (no generado por IA, a diferencia del contenido del Confesor o el Oráculo):

```typescript
throw new HttpException(
  'El Oráculo está ocupado con otros asuntos. Inténtalo de nuevo en unos minutos.',
  HttpStatus.TOO_MANY_REQUESTS,
);
```

El frontend leía ese texto directamente (`err.response.data.message`) y lo mostraba tal cual — sin ninguna forma de traducirlo.

### La solución — el backend envía un código, no una frase

```typescript
throw new HttpException({ code: 'ORACLE_RATE_LIMITED' }, HttpStatus.TOO_MANY_REQUESTS);
```

Cuando a `HttpException` (o a `BadRequestException`, que hereda de ella) se le pasa un objeto en vez de una cadena de texto, NestJS lo usa tal cual como cuerpo de la respuesta JSON — así que el frontend ahora recibe `{ "code": "ORACLE_RATE_LIMITED" }` en vez de una frase.

Se aplicó lo mismo a los cuatro casos que eran texto fijo (no generado por IA): la cuota agotada del Oráculo y del Confesor, el Makefile vacío, y el Makefile demasiado largo (este último con un parámetro adicional, `max`, para poder interpolar el número máximo de caracteres en cualquier idioma).

### El frontend — una función central de traducción, `translateApiError`

Se creó `utils/apiErrors.ts` con una única función reutilizable en cualquier página que consuma estos errores:

```typescript
const CODE_TO_KEY: Record<string, string> = {
  ORACLE_RATE_LIMITED: 'oracleRateLimited',
  CONFESSOR_RATE_LIMITED: 'confessorRateLimited',
  EMPTY_MAKEFILE: 'emptyMakefile',
  MAKEFILE_TOO_LONG: 'makefileTooLong',
  STREAMING_NOT_SUPPORTED: 'streamingNotSupported',
};

export function translateApiError(data, t, fallback) {
  if (data?.code) {
    const key = CODE_TO_KEY[data.code];
    if (key) return t(`errors.${key}`, data.max !== undefined ? { max: data.max } : undefined);
  }
  if (data?.message) {
    return Array.isArray(data.message) ? data.message.join(', ') : data.message;
  }
  return fallback;
}
```

Nota importante: si el error trae un `code` conocido, se traduce. Si en cambio trae un `message` (texto libre, sin código — como la razón concreta de rechazo del Oráculo, que sigue siendo texto creativo escrito por la IA, no un código fijo), se muestra tal cual, sin traducir — ese caso queda pendiente para la Parte 3.

### El caso especial: `STREAMING_NOT_SUPPORTED`

Este código es distinto a los demás: no viene del backend en absoluto. `ConfesionarioPage` usa streaming (la respuesta del Confesor va "escribiéndose" en pantalla, chunk a chunk) mediante `fetch` nativo en vez de nuestro cliente `axios` — y algunos navegadores muy antiguos o con ciertas configuraciones no exponen `response.body` como stream legible. Esa comprobación ocurre enteramente en el navegador del usuario, en `api/ai.ts`:

```typescript
if (!response.body) {
  throw new ApiError({ code: 'STREAMING_NOT_SUPPORTED' }, 0);
}
```

Se le dio la misma forma (`{ code: '...' }`) que a los errores que sí vienen del backend, precisamente para que pueda pasar por la misma función `translateApiError` sin necesitar ninguna lógica especial — desde el punto de vista de quien traduce el error, da igual si el código se originó en el servidor o en el propio navegador.

### Por qué hizo falta una clase `ApiError` en `api/ai.ts`

El código anterior perdía la estructura del error al capturarlo:

```typescript
// Antes: el "code" se pierde, solo queda un texto ya fijo
throw new Error(data?.message ?? `Error ${response.status}`);
```

Un objeto `Error` normal de JavaScript solo tiene `.message` (una cadena) — no hay dónde guardar el `code` para usarlo después. Se creó una clase que extiende `Error` pero conserva también los datos completos:

```typescript
export class ApiError extends Error {
  data: ApiErrorData | null;

  constructor(data: ApiErrorData | null, status: number) {
    const fallbackText = Array.isArray(data?.message)
      ? data.message.join(', ')
      : data?.message ?? data?.code ?? `Error ${status}`;
    super(fallbackText);
    this.data = data;
  }
}
```

`ConfesionarioPage` comprueba si el error capturado es específicamente un `ApiError` (con `instanceof`) para poder acceder a `.data` y traducirlo; si es un `Error` genérico de otro tipo (por ejemplo, la cancelación de la petición), sigue funcionando exactamente igual que antes.

## Qué queda pendiente

El texto realmente creativo que escribe la IA — la respuesta completa del Confesor a un Makefile, y la razón concreta que da el Oráculo al rechazar un artículo — sigue generándose siempre en español, porque el prompt que se le envía al modelo está escrito en español de forma fija. Resolver esto (Parte 3) implica pasar el idioma activo del usuario al backend en cada petición, para que el sistema elija el prompt correspondiente antes de llamar a Groq.
