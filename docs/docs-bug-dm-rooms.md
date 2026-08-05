# Bug: los mensajes en conversaciones nuevas no aparecían en vivo

## El síntoma

Al iniciar una conversación directa nueva desde el chat (o desde el perfil de alguien) y enviar un mensaje, este se guardaba correctamente en la base de datos, pero **no aparecía en pantalla** hasta recargar la página — como si el mensaje se hubiera "escrito" pero no se "viera".

## La causa raíz

Al conectar un socket, `ChatGateway.handleConnection` calcula **una sola vez** todas las salas (rooms) de Socket.IO a las que ese usuario debe unirse — el canal general más todas sus conversaciones directas ya existentes en ese momento:

```typescript
const conversationIds = await this.chatService.getUserConversationIds(payload.sub);
const allRoomIds = new Set([general.id, ...conversationIds]);
for (const id of allRoomIds) {
  client.join(roomName(id));
}
```

El problema: si se crea una conversación **nueva** después de que el socket ya está conectado (justo lo que ocurre al pulsar "enviar mensaje" a alguien por primera vez), el socket nunca se entera de que existe esa sala nueva — no hay ningún mecanismo que lo una a ella en ese momento.

Cuando después se envía un mensaje con `socket.emit('sendMessage', ...)`, el backend lo guarda correctamente y lo retransmite con `server.to(room).emit('newMessage', ...)` — pero como el propio socket del remitente nunca se unió a esa sala, ni siquiera él mismo recibe su propio mensaje retransmitido. Solo al recargar la página (lo que fuerza una nueva conexión de socket, y por tanto un nuevo cálculo de salas que esta vez sí incluye la conversación ya existente) el mensaje se hace visible.

## La solución

Cuando se crea (o se encuentra) una conversación directa a través del endpoint REST, se fuerza explícitamente a los sockets activos de ambas personas a unirse a la sala correspondiente, en el mismo momento de la creación — sin esperar a una futura reconexión.

**Nuevo método en `ChatGateway`:**
```typescript
joinConversationRoom(userId: number, conversationId: number) {
  const socketIds = this.onlineUsers.get(userId);
  if (!socketIds) return;
  for (const socketId of socketIds) {
    this.server.sockets.sockets.get(socketId)?.join(roomName(conversationId));
  }
}
```

Se reutiliza el mismo registro `onlineUsers` (el mapa `userId → sockets activos`) que ya existía para el estado online — aquí, en vez de emitir un evento a esos sockets, se les hace unirse (`.join()`) a la nueva sala directamente, uno por uno (cubriendo el caso de que la persona tenga varias pestañas abiertas).

**Uso en el controlador:**
```typescript
@Post('dm/:userId')
async startDirectConversation(@Request() req, @Param('userId', ParseIntPipe) otherUserId: number) {
  const conversation = await this.chatService.findOrCreateDirectConversation(req.user.userId, otherUserId);
  this.chatGateway.joinConversationRoom(req.user.userId, conversation.id);
  this.chatGateway.joinConversationRoom(otherUserId, conversation.id);
  return conversation;
}
```

Se une tanto a quien inicia la conversación como al destinatario — así, si alguien abre un chat directo con un amigo, ese amigo queda automáticamente listo para recibir mensajes en tiempo real ahí, aunque él mismo todavía no haya abierto esa conversación ni una sola vez.

## Lección general

Cualquier sala de Socket.IO calculada "una vez, al conectar" necesita un mecanismo explícito para mantenerse actualizada cuando aparecen recursos nuevos después de esa conexión — no basta con que la base de datos sepa que la sala existe; el socket en memoria también tiene que enterarse activamente.


[VOLVER](../README.md)
