# Autenticación remota con OAuth 2.0 — Inicio de sesión con 42

Cierra el Minor de User Management: "Implement remote authentication with OAuth 2.0 (Google, GitHub, 42, etc.)". De los proveedores posibles se eligió 42 — el más coherente temáticamente, dado que este es un proyecto del campus de 42 Barcelona.

## Cómo funciona OAuth 2.0, en términos generales

OAuth es un protocolo que permite a una aplicación (la nuestra) demostrar que una persona es quien dice ser, sin que esa persona tenga que darle nunca su contraseña de 42 — en su lugar, 42 mismo confirma su identidad y le entrega a nuestra aplicación una autorización limitada. El flujo, en sus pasos esenciales:

1. La persona hace clic en "Entrar con 42" — el navegador se redirige a una página de autorización que pertenece a 42, no a nosotros.
2. 42 le pregunta si confía en nuestra aplicación. Si acepta, 42 redirige de vuelta a una URL nuestra, con un código de un solo uso en la propia URL.
3. Nuestro backend, con ese código, hace una petición directa (servidor a servidor, invisible para el navegador) a 42, intercambiándolo por un token de acceso.
4. Con ese token, el backend pide a la API de 42 los datos básicos del perfil (email, nombre de usuario, avatar).
5. A partir de ahí, ya es responsabilidad nuestra: reconocer si esa persona ya tiene cuenta, o crear una nueva.

## El obstáculo real: nuestro esquema exige un dato que 42 no puede dar

El registro normal exige elegir "Hermano" o "Hermana" — un dato puramente temático del proyecto, sin ningún equivalente en el perfil que devuelve la API de 42. Esto obligó a diseñar el flujo en dos fases, en vez de crear la cuenta de inmediato:

- Si la persona ya tiene una cuenta vinculada a su 42 (reconocida por un nuevo campo, intraId), se le da acceso directamente, sin pedirle nada.
- Si es la primera vez, no se crea ninguna cuenta todavía. En su lugar, se emite un token de corta duración (10 minutos) que lleva consigo los datos ya obtenidos de 42, y se redirige a una pantalla propia donde solo falta elegir el género — el resto de la información ya se conoce.

Esta decisión evitó tener que tocar el resto del proyecto: el género sigue siendo un campo obligatorio en la base de datos, exactamente igual que antes, sin necesidad de que ningún otro componente (como las etiquetas de rango con género) tuviera que aprender a manejar un valor ausente.

## Cambios en el esquema

```prisma
model User {
  ...
  passwordHash String?  // antes era obligatorio — una cuenta creada vía 42 nunca tiene contraseña
  intraId      Int?     @unique  // vincula la cuenta con un usuario concreto de la intra de 42
  ...
}
```

Al ser un campo nuevo Int? @unique, todas las cuentas existentes simplemente quedan con intraId en null — Postgres permite múltiples valores NULL en una columna única sin ningún conflicto.

## La estrategia de Passport, sin depender de un paquete específico de 42

En vez de instalar un paquete de terceros dedicado exclusivamente a 42 (con el riesgo de que quede sin mantenimiento), se configuró la estrategia genérica passport-oauth2 apuntando directamente a los endpoints propios de 42:

```typescript
super({
  authorizationURL: 'https://api.intra.42.fr/oauth/authorize',
  tokenURL: 'https://api.intra.42.fr/oauth/token',
  clientID: process.env.FORTYTWO_CLIENT_ID!,
  clientSecret: process.env.FORTYTWO_CLIENT_SECRET!,
  callbackURL: process.env.FORTYTWO_CALLBACK_URL!,
  scope: 'public',
  passReqToCallback: false,
});
```

Un detalle de tipado que costó diagnosticar: los tipos de @types/passport-oauth2 tienen dos formas de opciones superpuestas, y sin indicar explícitamente passReqToCallback: false, TypeScript a veces resuelve a la forma incorrecta y exige una propiedad que en realidad no hacía falta.

## Los tres endpoints nuevos

- GET /auth/oauth/42 — no ejecuta ninguna lógica propia; el AuthGuard de Passport intercepta la petición y redirige automáticamente a 42.
- GET /auth/oauth/42/callback — a donde 42 redirige de vuelta. Passport ya ha intercambiado el código por un token y ha llamado a la API de 42 antes de que este método llegue a ejecutarse; aquí solo queda decidir si la persona ya existe (inicio de sesión normal) o no (redirección a la pantalla de finalización, con el token temporal en la URL).
- POST /auth/oauth/complete — recibe el token temporal, el género elegido y el nombre (que puede ser el sugerido por 42, o uno distinto si el primero ya estaba en uso), y en ese momento —y no antes— crea la cuenta de verdad.

## Por qué el token de acceso nunca viaja en una URL

Cuando una persona ya tiene cuenta, el callback no puede simplemente devolver el token de acceso al navegador como parte de la redirección — quedaría expuesto en el historial del navegador y en las cabeceras Referer de cualquier petición posterior. En su lugar, se reutiliza exactamente el mismo mecanismo que ya existía para el inicio de sesión normal: se coloca el token de refresco en una cookie httpOnly (invisible para JavaScript), y se redirige a una página puente, /oauth/exito.

## La página puente no necesita casi ningún código nuevo

Esta fue la parte más sencilla de todo el frontend, gracias a cómo ya estaba construido AuthContext: en cada carga completa de la aplicación, este contexto intenta automáticamente un refreshRequest(), que lee la cookie disponible en ese momento. Como la redirección de 42 es una navegación de página completa (no un cambio de ruta dentro de la SPA), toda la aplicación se vuelve a montar desde cero al llegar — y ese intento automático de refresco recoge, sin saberlo, la cookie que el backend acaba de dejar. La página puente solo necesita esperar a que ese intento termine, y redirigir según el resultado.

## La pantalla de finalización reutiliza el formulario de registro

En vez de construir un formulario nuevo desde cero, /oauth/completar reutiliza exactamente el mismo patrón visual y de comportamiento que RegisterPage — el mismo selector de género con dos opciones, y las mismas "píldoras" con nombres alternativos si el sugerido ya está en uso. La diferencia es que no pide email ni contraseña, porque ya se conocen.

Para mostrar el nombre sugerido por 42 sin necesidad de otra petición al servidor, se decodifica el token temporal directamente en el navegador:

```typescript
function decodeJwtPayload(token: string) {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}
```

Esto es seguro precisamente porque un JWT no está cifrado, solo firmado — cualquiera puede leer su contenido, pero nadie puede falsificarlo sin conocer la clave secreta. La verificación real de que el token es legítimo ocurre en el servidor, en el momento en que se envía de vuelta al finalizar el formulario — decodificarlo en el navegador es solo para mostrar información, nunca para confiar en ella.

## Un detalle de seguridad en el inicio de sesión normal

login() ahora también debe contemplar que una cuenta puede existir sin contraseña (si se creó vía 42):

```typescript
if (!user || !user.passwordHash) {
  throw new UnauthorizedException('Credenciales inválidas');
}
```

El mensaje es deliberadamente el mismo en ambos casos — que el email no exista, o que exista pero sin contraseña — para no revelar cuál de las dos situaciones es la real.


[Peculiaridades con deploy de proyecto fuera del campus](./docs-oauth-42-network-setup.md)
