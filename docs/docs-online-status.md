# Estado online — presencia en tiempo real

## Por qué no es parte exclusiva del chat

Aunque técnicamente se apoya en la misma infraestructura de WebSockets que el chat (`ChatGateway`), el estado online es información sobre **quién está presente en el sistema ahora mismo** — algo que interesa tanto en la lista de amigos como en el panel general de la comunidad, no solo dentro de una conversación abierta. Por eso se documenta como pieza propia, aunque el código viva en gran parte dentro de `ChatModule`.

## Decisión de diseño: visibilidad total, no solo entre amigos

El estado online se transmite a **todos los usuarios conectados**, no únicamente a los amigos de cada persona. Esto es intencional y encaja con la temática del proyecto: en una comunidad de "hermanos y hermanas", no tiene sentido ocultar quién está presente — al contrario, ver cuántos miembros de la congregación están conectados en cada momento es parte de la experiencia.

## Cómo se calcula quién está online

`ChatGateway` mantiene en memoria un registro de conexiones activas (`Map<userId, Set<socketId>>`), ya construido cuando se implementó la autenticación de sockets. Un usuario puede tener varias pestañas abiertas a la vez, así que se cuentan sus conexiones, no solo si "hay una"; solo se considera desconectado cuando cierra la última.

## Dos formas de conocer el estado: consulta puntual y en tiempo real

**Al cargar la página:** los endpoints `GET /friends` y `GET /chat/general/members` devuelven, junto a los datos de cada persona, un campo `isOnline` calculado en el momento de la petición.

**Mientras la página está abierta:** cada vez que alguien se conecta (por primera vez, no en cada pestaña adicional) o se desconecta del todo, el servidor emite un evento `userStatusChanged` a todos los sockets conectados. El frontend escucha este evento y actualiza el estado local sin necesidad de volver a pedir la lista completa.

## Dónde aparece en la interfaz

- **Lista de amigos** (barra lateral izquierda del chat): un punto verde o gris junto a cada nombre
- **Panel de miembros del canal general** (barra lateral derecha, siempre visible): lista completa de quienes han pasado alguna vez por el canal general, ordenada con los conectados primero, con un contador de "conectados / total"

## Dónde está en el código

**Backend:**
- `src/chat/chat.gateway.ts` — registro de conexiones activas (`onlineUsers`), lógica de primera conexión/última desconexión, emisión del evento `userStatusChanged`
- `src/chat/chat.module.ts` — exporta `ChatGateway` para que otros módulos puedan inyectarlo
- `src/chat/chat.service.ts` — `getGeneralChannelMembers()`, obtiene la lista de participantes del canal general
- `src/chat/chat.controller.ts` — endpoint `GET /chat/general/members`, añade `isOnline` a cada miembro
- `src/friends/friends.module.ts` — importa `ChatModule` para tener acceso a `ChatGateway`
- `src/friends/friends.controller.ts` — endpoint `GET /friends`, añade `isOnline` a cada amigo

**Frontend:**
- `src/api/friends.ts` — campo `isOnline` en la interfaz `Friend`
- `src/api/chat.ts` — interfaz `Member` y función `getGeneralMembers()`
- `src/pages/ChatPage.tsx` — estado `members`, listener del evento `userStatusChanged` (`handleStatusChanged`), panel lateral derecho con la lista ordenada y el contador

## Verificación realizada

Comprobado con dos cuentas amigas conectadas simultáneamente en pestañas distintas: el punto de estado aparece correcto nada más cargar la página, y cambia en vivo (sin recargar) al conectar o desconectar cualquiera de las dos sesiones.
