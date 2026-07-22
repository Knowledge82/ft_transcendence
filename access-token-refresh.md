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

[VOLVER](./README.md)
