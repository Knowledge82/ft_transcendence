# Renovación automática del Access Token

## El problema

Nuestro access token vive solo **15 minutos**. Pasado ese tiempo, cualquier petición a un endpoint protegido (por ejemplo `GET /api/users/me`) recibirá un `401 Unauthorized` del backend, aunque el usuario siga con la sesión activa (su refresh token, en la cookie httpOnly, sigue siendo válido durante 7 días).

Sin ninguna solución, esto significa: **el usuario sería expulsado silenciosamente cada 15 minutos**, viendo errores o pantallas rotas, sin ninguna razón visible para él — su sesión "real" (la cookie) sigue viva, pero el frontend no sabe pedir un token nuevo.

## Simulación paso a paso — sin solución

1. `10:00:00` — el usuario hace login. Recibe un `accessToken` (válido hasta las `10:15:00`) y una cookie `refreshToken` (válida 7 días).
2. `10:00:00` a `10:14:59` — todas las peticiones funcionan con normalidad, el `accessToken` es válido.
3. `10:15:01` — el usuario hace clic en algo que llama a `GET /api/users/me`.
4. El backend responde `401 Unauthorized` — el token ya caducó.
5. **Sin ninguna lógica adicional, aquí se acaba la historia**: el usuario ve un error, aunque su sesión (la cookie) sigue siendo perfectamente válida.

## La solución — interceptar la respuesta 401 y renovar en silencio

La idea: cuando cualquier petición recibe un `401`, en lugar de mostrar el error directamente, el cliente HTTP:
1. Llama a `/api/auth/refresh` (la cookie httpOnly se envía automáticamente, sin que el código tenga que hacer nada especial)
2. Obtiene un `accessToken` nuevo
3. **Repite** la petición original que había fallado, ahora con el token nuevo
4. El usuario nunca ve el error — todo ocurre de forma transparente

### Simulación paso a paso — con la solución

1. `10:15:01` — `GET /api/users/me` → `401`
2. El interceptor de respuesta detecta el 401 y **pausa** esa petición fallida
3. Llama a `POST /api/auth/refresh` → recibe `accessToken` nuevo
4. Guarda el nuevo token
5. Vuelve a ejecutar `GET /api/users/me`, esta vez con el token nuevo → `200 OK`
6. El código que originalmente pidió los datos del usuario recibe la respuesta correcta, sin enterarse de que hubo un paso intermedio

## El segundo problema — peticiones simultáneas

Imagina que la página, al cargar, hace **tres** peticiones a la vez: perfil, lista de amigos, notificaciones. Si el token caducó, las tres reciben `401` casi al mismo tiempo.

**Sin protección adicional**, cada una de las tres intentaría llamar a `/auth/refresh` por su cuenta — es decir, **tres llamadas de refresh casi simultáneas**.

Esto es un problema real en nuestro caso concreto porque **nuestros refresh tokens rotan**: cada vez que se usa un refresh token para pedir un `accessToken` nuevo, el token usado se marca como revocado en la base de datos y se emite uno nuevo. Si dos peticiones de refresh casi simultáneas usan la misma cookie:
- La primera tiene éxito, obtiene un token nuevo, y el token viejo queda revocado
- La segunda, que salió una fracción de segundo después con el token **ya revocado**, recibe un `401` del propio endpoint de refresh
- Como consecuencia, una de las tres peticiones originales fallaría de verdad, sin remedio

### La solución al segundo problema — una única llamada de refresh compartida

Se usa un patrón de "promesa compartida": la primera petición que detecta el 401 inicia la llamada a `/auth/refresh` y guarda esa promesa (no el resultado, sino "la operación en curso") en una variable compartida. Cualquier otra petición que también reciba un 401 mientras ese refresh sigue en curso **no inicia una llamada nueva** — simplemente espera el resultado de la que ya está en marcha.

### Simulación paso a paso — con la protección de llamada única

1. `10:15:01.000` — `GET /api/users/me` → `401` → inicia refresh (guarda la promesa compartida)
2. `10:15:01.050` — `GET /api/friends` → `401` → ve que ya hay un refresh en curso → **no llama de nuevo**, se limita a esperar
3. `10:15:01.080` — `GET /api/notifications` → `401` → mismo caso, espera la misma promesa
4. `10:15:01.300` — el refresh original termina, con un `accessToken` nuevo
5. Las tres peticiones, ahora con el token nuevo, se repiten y tienen éxito

## Otros dos detalles de seguridad en la implementación

**Evitar bucles infinitos:** cada petición fallida se marca (`_retry = true`) la primera vez que se reintenta. Si por algún motivo la petición vuelve a fallar con 401 después de reintentarla, no se vuelve a intentar un refresh — se deja fallar de verdad, en lugar de entrar en un bucle sin fin.

**Evitar recursión sobre el propio refresh:** si la llamada que falla con 401 es la propia llamada a `/auth/refresh` (es decir, la cookie ya no es válida en absoluto), no tiene sentido "renovar el refresh" — en ese caso se asume que la sesión ha terminado de verdad, se limpia el token en memoria, y se notifica a la aplicación para que trate al usuario como no autenticado (esto redirige automáticamente a la pantalla de login, gracias a `ProtectedRoute`).

## Dónde vive esta lógica

Todo el mecanismo está en `frontend/src/api/client.ts`, en un interceptor de respuesta de axios — se ejecuta automáticamente para **cualquier** petición que pase por nuestro cliente HTTP configurado, sin que cada parte del código tenga que preocuparse de gestionar tokens caducados por su cuenta.

--- 

# `client.ts` — explicación línea por línea

Este documento explica cada línea de `frontend/src/api/client.ts`, el cliente HTTP que gestiona automáticamente el access token, incluyendo su renovación silenciosa cuando caduca.

## Imports

```typescript
import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
```

- `axios` — la exportación por defecto del paquete, el objeto principal de la librería.
- `{ AxiosError, InternalAxiosRequestConfig }` — exportaciones nombradas, pero en este caso son **tipos** de TypeScript (existen solo en tiempo de compilación, no generan código JS real). `AxiosError` describe la forma de un objeto de error de axios. `InternalAxiosRequestConfig` describe la forma de la configuración de una petición (URL, headers, método, etc.).

## Cliente configurado

```typescript
export const apiClient = axios.create({
  baseURL: '/api',
  withCredentials: true,
});
```

- `export` — hace que `apiClient` pueda importarse desde otros archivos.
- `const` — no se reasignará este objeto a otro distinto.
- `axios.create({...})` — crea una **instancia configurada** de cliente HTTP; no envía ninguna petición, solo prepara la plantilla que se reutilizará.
- `baseURL: '/api'` — cualquier ruta relativa usada con esta instancia (`apiClient.get('/users/me')`) se completa automáticamente con este prefijo.
- `withCredentials: true` — indica al navegador que adjunte cookies (incluida nuestra cookie httpOnly `refreshToken`) en las peticiones hechas con esta instancia. Sin esto, el navegador no envía cookies en peticiones iniciadas por JavaScript, aunque sea el mismo origen.

## Almacenamiento del access token

```typescript
let accessToken: string | null = null;
```

- `let` — variable reasignable (a diferencia de `const`), necesario porque su valor cambiará (tras login, tras refresh, al hacer logout).
- `: string | null` — el tipo puede ser una cadena (el token real) o `null` (sin sesión).

```typescript
export function setAccessToken(token: string | null) {
  accessToken = token;
}
```

Función "setter": su único trabajo es actualizar la variable `accessToken`, que no está exportada y por tanto no es accesible directamente desde otros archivos — solo a través de esta función.

## Puente hacia React para el fin de sesión

```typescript
let onSessionExpired: (() => void) | null = null;
```

- `(() => void) | null` — el tipo es: o bien una función sin argumentos que no devuelve nada (`() => void`), o bien `null`.

```typescript
export function setOnSessionExpired(callback: () => void) {
  onSessionExpired = callback;
}
```

Mismo patrón "setter", pero aquí el parámetro es una función completa, no un valor simple. Este archivo es un módulo TypeScript normal, no un componente de React — no puede llamar directamente a `setIsAuthenticated(false)` dentro de `AuthContext`. En su lugar, `AuthContext` "conecta" aquí su propia función mediante `setOnSessionExpired(...)`, y este archivo simplemente la invoca cuando corresponde, sin saber qué ocurre al otro lado.

## Interceptor de peticiones

```typescript
apiClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});
```

- `apiClient.interceptors.request.use(...)` — registra una función que axios ejecuta automáticamente **antes** de enviar cada petición hecha con `apiClient`.
- `(config) => {...}` — función flecha; `config` es el objeto de configuración de esa petición concreta.
- `if (accessToken)` — si hay un token guardado (una cadena no vacía es "verdadera" en JS, `null` es "falsa").
- `` config.headers.Authorization = `Bearer ${accessToken}`; `` — añade la cabecera `Authorization` con el token, usando un *template literal* (cadena entre comillas invertidas que permite insertar expresiones con `${...}`). El formato `"Bearer <token>"` es el que espera nuestro backend (`ExtractJwt.fromAuthHeaderAsBearerToken()` en `JwtStrategy`).
- `return config;` — obligatorio: si no se devuelve la configuración, axios no sabría con qué parámetros enviar realmente la petición.

## Promesa compartida de refresh

```typescript
let refreshPromise: Promise<string> | null = null;
```

- `Promise<string>` — un tipo genérico: representa una operación asíncrona que, cuando termine, dará como resultado un `string`. No es la cadena en sí, sino una "promesa" de que aparecerá más adelante.
- `| null` — o no hay ninguna operación de refresh en curso ahora mismo.

Esta variable es la clave para que **varias peticiones que fallan con 401 al mismo tiempo** no disparen varias llamadas de refresh simultáneas (ver la sección de abajo).

```typescript
async function performRefresh(): Promise<string> {
```

- `async function` — función asíncrona (contendrá `await` en su interior).
- `(): Promise<string>` — no recibe parámetros; devuelve, envuelto en una promesa (obligatorio para cualquier función `async`), un `string`.

```typescript
  const { data } = await axios.post<{ accessToken: string }>(
    '/api/auth/refresh',
    {},
    { withCredentials: true },
  );
```
- `const { data } = ...` — desestructuración de objeto: del objeto completo de respuesta, se extrae solo el campo `data`.
- `await` — pausa esta función (sin bloquear el resto de la aplicación) hasta que la promesa se resuelva, y "desenvuelve" el resultado.
- `axios.post(...)` — se usa el `axios` **global**, no `apiClient`. Esto es intencional: si se usara `apiClient`, esta misma petición pasaría por nuestro propio interceptor de respuesta (el que se explica más abajo), y si `/auth/refresh` devolviera un 401, se intentaría "refrescar el refresh" — una recursión sin sentido.
- `<{ accessToken: string }>` — tipo genérico: le dice a TypeScript qué forma esperar en la respuesta, solo a efectos de tipado.
- Los tres argumentos de `post`: la URL, el cuerpo de la petición (vacío, `{}`, porque el refresh token viaja en la cookie, no en el body), y la configuración de esa petición concreta.
- `{ withCredentials: true }` — se repite aquí porque esta configuración, al crearse con `axios.create(...)` en `apiClient`, solo aplica a esa instancia — el `axios` global no la conoce, así que sin repetirla aquí la cookie no se enviaría.

```typescript
  return data.accessToken;
}
```

Devuelve solo la cadena del token, extraída del objeto `data`.

## Tipo extendido para marcar reintentos

```typescript
interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}
```

- `interface` — declara un nuevo tipo que describe la forma de un objeto.
- `extends InternalAxiosRequestConfig` — el nuevo tipo contiene todos los campos del tipo original de axios, más lo que se añada.
- `_retry?: boolean;` — campo nuevo, no existente en el tipo original. El `?` lo hace opcional. Sin esta extensión, TypeScript no permitiría escribir `config._retry = true`, porque el tipo estándar de axios no contempla ese campo.

## El interceptor de respuesta

```typescript
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
```

- `interceptors.response.use(...)` — a diferencia del interceptor de peticiones, este acepta **dos** funciones.
- `(response) => response` — se ejecuta si la petición tuvo éxito; no se modifica nada, se devuelve tal cual.
- `async (error: AxiosError) => {...}` — se ejecuta si la petición falló; será asíncrona porque contendrá `await`.

```typescript
    const originalRequest = error.config as ExtendedAxiosRequestConfig | undefined;
```

- `error.config` — la configuración de la petición original que falló (axios la conserva dentro del objeto de error).
- `as ExtendedAxiosRequestConfig | undefined` — *type assertion*: le decimos a TypeScript que trate este valor como si tuviera el tipo extendido (con `_retry`), aunque el tipo estándar de axios no lo incluya.

```typescript
    const isRefreshCall = originalRequest?.url === '/auth/refresh';
```

- `?.` — *optional chaining*: si `originalRequest` fuera `undefined`, esto no lanza un error, simplemente da `undefined` en vez de intentar leer `.url` de algo inexistente.
- `=== '/auth/refresh'` — comparación estricta: ¿esta petición fallida era, precisamente, la llamada al propio endpoint de refresh?

```typescript
    const shouldAttemptRefresh =
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isRefreshCall;
```

Una condición compuesta con `&&` (verdadera solo si **todas** las partes son verdaderas):
- El código de estado de la respuesta es 401
- Existe información de la petición original
- Esa petición **no** se ha reintentado ya antes (`!originalRequest._retry`)
- No es, ella misma, la llamada a `/auth/refresh` (`!isRefreshCall`)

```typescript
    if (!shouldAttemptRefresh) {
      return Promise.reject(error);
    }
```

Si no se cumplen todas las condiciones anteriores, no hacemos nada especial: `Promise.reject(error)` devuelve una promesa rechazada, dejando que el error siga su curso normal hacia quien hizo la petición originalmente.

```typescript
    originalRequest._retry = true;
```
Marcamos esta petición concreta como "ya intentada una vez" — así, si vuelve a fallar con 401 después del reintento, `shouldAttemptRefresh` será `false` la próxima vez, evitando un bucle infinito.

```typescript
    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null;
        });
      }
```

- `try` — inicia un bloque de manejo de excepciones: si algo dentro falla, la ejecución salta al bloque `catch` de más abajo en vez de romper la aplicación.
- `if (!refreshPromise)` — si no hay ya un refresh en curso (variable en `null`).
- `performRefresh().finally(() => { refreshPromise = null; })` — se llama a `performRefresh()`, y sobre la promesa resultante se encadena `.finally(...)`: una función que se ejecuta cuando la promesa termina, **sea éxito o fracaso**. Esa función libera la variable compartida para futuros refreshes independientes. El resultado de `.finally(...)` (que sigue siendo una promesa) es lo que se guarda en `refreshPromise`.

Este es el mecanismo que evita múltiples llamadas simultáneas: si una segunda petición falla con 401 mientras `refreshPromise` ya tiene un valor, la condición `if (!refreshPromise)` será falsa y no se inicia una nueva llamada — se pasa directamente a la siguiente línea, que espera la promesa ya existente.

```typescript
      const newAccessToken = await refreshPromise;
```
Se espera a que el refresh (el propio, o el de otra petición que llegó primero) termine, y se obtiene el token nuevo.

```typescript
      setAccessToken(newAccessToken);

      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return apiClient(originalRequest); // retry the original request
```

- `setAccessToken(...)` — actualiza el token en memoria; a partir de aquí, cualquier petición nueva lo recibirá automáticamente vía el interceptor de peticiones.
- `originalRequest.headers.Authorization = ...` — añade el token nuevo directamente a la petición que había fallado.
- `apiClient(originalRequest)` — `apiClient` puede invocarse como función, pasándole un objeto de configuración completo — esto reenvía la petición original desde cero, con el token nuevo. Lo que esto devuelva se convierte en el resultado final del interceptor: quien hizo la petición original recibe la respuesta exitosa, como si nunca hubiera habido un error.

```typescript
    } catch (refreshError) {
      setAccessToken(null);
      onSessionExpired?.();
      return Promise.reject(refreshError);
    }
  },
);
```
- `catch (refreshError)` — se ejecuta si algo dentro del `try` lanzó una excepción (lo más probable: el propio `performRefresh()` falló, es decir, ni siquiera el refresh token es válido ya).
- `setAccessToken(null)` — se limpia el token, la sesión ha terminado de verdad.
- `onSessionExpired?.()` — *optional chaining* aplicado a una **llamada de función**: si hay una función registrada, se ejecuta; si sigue siendo `null`, no ocurre nada (sin lanzar error).
- `return Promise.reject(refreshError)` — se propaga el error hacia quien hizo la petición original.

## Resumen del flujo completo

1. Una petición falla con 401
2. Si es candidata a refresh (no es ya un reintento, no es el propio refresh) → se marca como reintentada
3. Si no hay ya un refresh en curso, se inicia uno; si ya lo hay, se espera el mismo
4. Con el token nuevo, se reintenta la petición original automáticamente
5. Si el refresh en sí falla, se limpia la sesión y se notifica a React (`AuthContext`), que a su vez hace que `ProtectedRoute` redirija a `/login`





[VOLVER](./README.md)
