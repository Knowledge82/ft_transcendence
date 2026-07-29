# Frontend — Chat en tiempo real

Documentación de la implementación del cliente de chat: conexión WebSocket, estructura de la página, historial de mensajes y envío en tiempo real.

## `socket.io-client` — instalación y por qué un paquete aparte

```bash
npm install socket.io-client
```

Es un paquete distinto de `socket.io` (que se instaló en el backend) — contiene específicamente la parte cliente del protocolo, pensada para ejecutarse en el navegador.

## `SocketContext` — dónde vive la conexión

Por el mismo motivo que existe `AuthContext` (evitar pasar datos por props a través de todo el árbol de componentes), se creó un Context dedicado a la conexión de socket: `frontend/src/context/SocketContext.tsx`.

**Decisión clave:** la conexión depende de `AuthContext`. `SocketProvider` usa internamente `useAuth()` para saber si hay sesión activa, y por eso debe estar **anidado dentro** de `AuthProvider` en `App.tsx`:

```tsx
<AuthProvider>
  <SocketProvider>
    {/* rutas */}
  </SocketProvider>
</AuthProvider>
```

El `useEffect` que gestiona la conexión tiene `[isAuthenticated]` como dependencia (no un array vacío): se relanza cada vez que el usuario inicia o cierra sesión.

- Al iniciar sesión: se crea la conexión con `io('/', { auth: { token } })`. La URL relativa `'/'` aprovecha que el frontend y el backend comparten origen a través de nginx (la ruta `/socket.io/` que ya se configuró al montar la infraestructura).
- Al cerrar sesión: la función de *cleanup* del `useEffect` (`return () => { newSocket.disconnect(); ... }`) cierra la conexión correctamente en vez de dejarla abierta como fuga de memoria/red.

Se añadió `getAccessToken()` en `api/client.ts` (antes solo existía el *setter*) porque el handshake del socket necesita leer el token vigente en el momento de conectar.

## Estructura de `ChatPage`

Tres piezas de estado principales:
- **`generalChannel`** y **`friends`** — cargados una sola vez al entrar a la página (`Promise.all` para pedir ambos en paralelo)
- **`selectedConversationId`** — qué conversación está abierta ahora mismo (el canal general por defecto)
- **`messages`** — el historial de la conversación seleccionada

La barra lateral lista el canal general y, debajo, cada amigo como un botón — al hacer clic en un amigo, se llama a `startDirectConversation(friendId)` (el backend encuentra el chat directo existente o lo crea la primera vez, de forma transparente para el frontend).

## Historial de mensajes

Un `useEffect` separado, con `[selectedConversationId]` como dependencia, pide el historial cada vez que cambia la conversación activa:

```tsx
useEffect(() => {
  if (!selectedConversationId) return;
  getMessageHistory(selectedConversationId).then((history) => {
    setMessages(history.reverse());
  });
}, [selectedConversationId]);
```

El backend devuelve los mensajes más recientes primero (pensado para paginación futura); se invierte el array aquí para mostrarlos en el orden natural de un chat (más antiguos arriba, más recientes abajo).

## Mensajes en tiempo real

Un tercer `useEffect`, con `[socket, selectedConversationId]` como dependencias, se suscribe al evento `newMessage`:

```tsx
useEffect(() => {
  if (!socket) return;

  function handleNewMessage(message: Message) {
    if (message.conversationId === selectedConversationId) {
      setMessages((prev) => [...prev, message]);
    }
  }

  socket.on('newMessage', handleNewMessage);
  return () => socket.off('newMessage', handleNewMessage);
}, [socket, selectedConversationId]);
```

**Por qué se filtra por `conversationId`:** el socket recibe eventos de todas las salas a las que el usuario pertenece, no solo de la conversación abierta en pantalla — sin este filtro, un mensaje de otro chat aparecería mezclado en la conversación visible.

**Por qué `socket.off(...)` en la función de limpieza:** sin desuscribirse, cada cambio de conversación añadiría un nuevo listener sin quitar el anterior — un mismo mensaje entrante acabaría procesándose varias veces.

**Por qué `setMessages((prev) => [...prev, message])` en vez de `setMessages([...messages, message])`:** dentro del *closure* del manejador de eventos, `messages` podría estar desactualizado respecto al estado real en el momento en que el evento llega. La forma funcional del *setter* de `useState` siempre recibe el estado más reciente, evitando mensajes perdidos por condiciones de carrera entre renders.

## Envío de mensajes

```tsx
function handleSend(event: FormEvent) {
  event.preventDefault();
  if (!draft.trim() || !selectedConversationId || !socket) return;
  socket.emit('sendMessage', {
    conversationId: selectedConversationId,
    content: draft.trim(),
  });
  setDraft('');
}
```

El mensaje no se añade manualmente a `messages` tras enviarlo — se confía en que el propio evento `newMessage` que el backend retransmite (incluyendo al remitente) sea la única fuente de verdad para lo que aparece en pantalla. Esto evita duplicados y mantiene una sola vía de entrada de datos al estado de la conversación.

## Autoscroll al último mensaje

Se usa `useRef` (a diferencia de `useState`, no provoca un re-render al actualizarse) para obtener una referencia directa al nodo del DOM situado al final de la lista de mensajes:

```tsx
const bottomRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  bottomRef.current?.scrollIntoView();
}, [messages]);
```

```tsx
{messages.map((message) => ( ... ))}
<div ref={bottomRef} />
```

Cada vez que `messages` cambia (carga inicial del historial, o llegada de un mensaje nuevo), se desplaza el contenedor para que ese elemento invisible quede a la vista — que, al estar al final de la lista, equivale a mostrar siempre el mensaje más reciente sin que el usuario tenga que hacer scroll manualmente.

## Identificación de mensajes propios

Al cargar la página se pide también `GET /users/me`, guardando el propio `id` en `ownUserId`. Cada mensaje compara `message.senderId === ownUserId` para alinearse a la derecha (dorado) o a la izquierda (oscuro, con el nombre del remitente visible), como en cualquier interfaz de chat convencional.

## Pendiente (fuera del alcance de este bloque)

- Diseño responsive (la barra lateral usa un ancho fijo, sin comportamiento adaptado a pantallas pequeñas)
- Notificaciones de nuevo mensaje cuando la conversación no está abierta
- Paginación del historial (actualmente se cargan siempre los últimos 50 mensajes, sin forma de pedir más antiguos)


[VOLVER](../README.md)
