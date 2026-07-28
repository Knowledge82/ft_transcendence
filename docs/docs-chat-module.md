# ChatModule — Chat en tiempo real (WebSockets)

## Para qué sirve

Implementa el módulo obligatorio de tiempo real del enunciado ("Implement real-time features using WebSockets"). Cubre dos tipos de conversación con la misma infraestructura: un **canal general** (todos los usuarios) y **chats directos** (1 a 1 entre dos usuarios), sentando además la base para el estado online real de los usuarios (pendiente de exponer al resto de la app).

## Por qué WebSockets y no peticiones HTTP normales

En HTTP, el cliente siempre inicia la conversación: pide algo, el servidor responde, la conexión se cierra. El servidor nunca puede "avisar" al cliente de algo por su cuenta. Un WebSocket es una conexión que permanece **abierta**: una vez establecida, tanto cliente como servidor pueden enviarse mensajes en cualquier momento, sin que nadie tenga que "preguntar" primero. Esto es imprescindible para un chat: cuando alguien envía un mensaje, todos los demás participantes deben recibirlo al instante, sin tener que refrescar ni volver a pedir datos.

Se usa **Socket.IO** en vez de la API nativa de WebSocket del navegador: añade reconexión automática, un sistema de eventos con nombre (en vez de mensajes de texto sueltos) y un mecanismo de *fallback* a otros transportes si el WebSocket puro no está disponible en la red del cliente.

## Modelo de datos

Se usa una única estructura para ambos tipos de conversación, evitando duplicar lógica:

- **`Conversation`** — puede ser `DIRECT` (dos participantes) o `CHANNEL` (uno o más). El canal general es simplemente una `Conversation` de tipo `CHANNEL`, creada la primera vez que hace falta.
- **`ConversationParticipant`** — tabla intermedia: quién pertenece a qué conversación. Es la que define, en la práctica, quién tiene permiso para leer y escribir en cada chat.
- **`Message`** — cada mensaje pertenece a una conversación y tiene un remitente. El historial de cualquier chat (general o directo) se consulta de la misma forma.

## Autenticación de la conexión (handshake)

A diferencia de HTTP, donde cada petición lleva su propio token, un socket se autentica **una sola vez**, al conectar. El cliente envía el `accessToken` en `handshake.auth.token`; `ChatGateway.handleConnection` lo verifica con `JwtService`, y si no es válido, corta la conexión inmediatamente (`client.disconnect()`). Si es válido, el `userId` queda guardado en `client.data.userId` — disponible para el resto de la vida de esa conexión, sin tener que re-verificar el token en cada mensaje.

## Salas (rooms) — cómo se evita mandar mensajes a quien no debe recibirlos

Cada conversación tiene su propia "sala" de Socket.IO (`conversation:<id>`). Al conectar, el usuario se une automáticamente a las salas de todas las conversaciones a las que pertenece (el canal general, más cualquier chat directo existente). Al enviar un mensaje, el servidor lo retransmite solo a los sockets de esa sala concreta (`server.to(room).emit(...)`), no a todos los conectados — así un mensaje privado nunca llega a quien no participa en esa conversación.

## Estado online — decisión de diseño

Se mantiene un `Map<userId, Set<socketId>>` en memoria dentro del propio `ChatGateway`. Se usa un `Set` de sockets (no un solo valor) porque un mismo usuario puede tener varias pestañas abiertas a la vez — solo se considera realmente desconectado cuando se cierra la última.

**Limitación conocida:** esto vive en la memoria de una única instancia del backend. Si en el futuro se ejecutara más de una réplica del backend (balanceo de carga), cada instancia tendría su propia versión de quién está online, y habría que compartir ese estado externamente (por ejemplo con Redis). Para el alcance de este proyecto, una sola instancia de backend es suficiente.

## Endpoints REST complementarios

El historial y el arranque de chats no son eventos en tiempo real — son consultas puntuales, mejor resueltas con HTTP normal que forzando todo por WebSocket:

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/chat/general` | Devuelve (creándolo si no existe) el canal general |
| `POST` | `/chat/dm/:userId` | Devuelve la conversación directa con ese usuario, creándola si no existía |
| `GET` | `/chat/:conversationId/messages` | Historial de mensajes de una conversación (rechaza con 403 a quien no participa) |

## Evento de WebSocket

| Evento (cliente → servidor) | Payload | Qué hace |
|---|---|---|
| `sendMessage` | `{ conversationId, content }` | Guarda el mensaje en base de datos y lo retransmite a toda la sala, incluido quien lo envió |

El evento que el servidor emite de vuelta a los clientes es `newMessage`, con el mensaje ya guardado (incluyendo los datos del remitente).

## Un bug real que surgió al probarlo

`getOrCreateGeneralChannel` creaba la `Conversation` del canal general, pero nunca creaba la fila `ConversationParticipant` correspondiente a cada usuario. El usuario se unía a la sala de Socket.IO sin problema, pero al intentar enviar un mensaje, la comprobación de pertenencia contra la base de datos (`isParticipant`) fallaba, porque a nivel de base de datos esa persona técnicamente no figuraba como miembro. Se corrigió añadiendo `ensureParticipant` (una operación *upsert*, seguro de llamar aunque ya exista la fila) al conectar al canal general.

Relacionado con esto: las excepciones de tipo HTTP (`ForbiddenException`, etc.) no se serializan correctamente dentro de un Gateway de WebSocket — el cliente solo veía `"Internal server error"` sin más detalle. La solución fue capturar el error dentro del gateway y relanzarlo como `WsException`, que es el tipo de excepción que el sistema de manejo de errores de los Gateways de NestJS sabe convertir en un evento `'exception'` correctamente formado para el cliente.

## Verificación realizada

Probado con dos usuarios conectados simultáneamente (dos sockets autenticados con tokens distintos, vía consola del navegador): ambos se unen automáticamente al canal general; un mensaje enviado por uno llega en tiempo real al otro, y el remitente recibe también un *acknowledgement* con el mensaje ya guardado en base de datos.


[VOLVER](../README.md)
