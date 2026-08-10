# Sistema de adjuntos en el chat

## Qué cierra este módulo

Cubre el bonus Minor "File upload and management system" del enunciado — reinterpretado de forma temática como adjuntos en las conversaciones privadas del chat, en vez de una zona de subida de archivos genérica y desconectada del resto de la aplicación.

## Decisión de diseño: solo en conversaciones privadas

Los archivos adjuntos están permitidos únicamente en conversaciones directas (`DIRECT`), nunca en el canal general (`Capítulo`). Sigue la misma filosofía que ya aplicamos a los mensajes privados: son un privilegio de la hermandad, no algo abierto a toda la comunidad — además de mantener el canal compartido limpio y fácil de moderar. La regla se aplica en el backend (`ChatService.saveMessage`), así que aunque alguien manipulara la interfaz, el servidor la rechazaría igualmente.

## Qué cumple de los requisitos del enunciado

- ✅ Varios tipos de archivo: imágenes (jpeg/png/webp/gif) y PDF
- ✅ Validación en cliente y servidor (tipo y tamaño, máximo 10MB)
- ✅ Almacenamiento seguro con control de acceso — los archivos no se sirven como contenido estático público; solo los participantes de la conversación correspondiente pueden acceder a ellos
- ✅ Vista previa: las imágenes se muestran directamente en el mensaje; los PDF aparecen como un icono con el nombre del archivo
- ✅ Indicador de progreso durante la subida
- ✅ Eliminación de archivos subidos — al eliminar un mensaje con adjunto, se borra también el archivo del disco

## El control de acceso — por qué no es una simple carpeta estática

A diferencia del avatar (público por naturaleza), un adjunto de chat puede pertenecer a una conversación privada. Servirlo como archivo estático (como nginx hace con los avatares) significaría que cualquiera con el enlace podría verlo, sin comprobar si es participante de esa conversación. En su lugar, se sirve a través de una ruta de NestJS que verifica la pertenencia antes de entregar el archivo.

## Un obstáculo técnico interesante: `<img>` no puede llevar cabecera de autenticación

Nuestras peticiones normales llevan el token JWT en la cabecera `Authorization`, añadida automáticamente por nuestro cliente axios. Pero una etiqueta `<img src="...">` o `<a href="...">` la carga el propio navegador, sin pasar por axios — no hay forma de añadirle esa cabecera.

Solución: un guard personalizado (`JwtQueryOrHeaderGuard`) que acepta el token tanto en la cabecera de siempre como en un parámetro `?token=...` en la URL, usado exclusivamente en la ruta que sirve los archivos. El frontend añade el token a la URL con una pequeña función (`withAuthToken`) antes de usarla en `src`/`href`.

## Moderación de mensajes

Se añadió la posibilidad de eliminar mensajes: el propio autor, o cualquier usuario con rango `GUARDIAN` o `ARZOBISPO`, puede borrar un mensaje (y su adjunto, si lo tiene). El botón aparece al pasar el ratón sobre el mensaje, y la eliminación se propaga en tiempo real a todos los presentes en la conversación.

## Dos ajustes de infraestructura necesarios por el camino

- nginx limita el cuerpo de las peticiones a 1MB por defecto — se añadió `client_max_body_size 10M;` en `nginx/conf.d/default.conf` para que coincida con el límite ya configurado en el backend.
- El `Makefile` ahora reinicia `nginx` automáticamente en cada `make up`, evitando un `502 Bad Gateway` que puede aparecer si solo se reconstruye un servicio y nginx se queda con su dirección de red antigua en caché.

## Dónde está en el código

**Backend:**
- `prisma/schema.prisma` — campos `attachmentFilename`, `attachmentType`, `attachmentName` en `Message`
- `src/chat/chat.controller.ts` — `POST /chat/upload`, `DELETE /chat/messages/:id`
- `src/chat/attachments.controller.ts` — `GET /chat/attachments/:filename` (ruta separada, sin el guard de clase habitual)
- `src/chat/jwt-query-or-header.guard.ts`
- `src/chat/chat.service.ts` y `chat.gateway.ts` — lógica de guardado, restricción a conversaciones privadas, difusión en tiempo real

**Frontend:**
- `src/api/chat.ts` — `uploadAttachment`, `deleteMessage`, `withAuthToken`
- `src/pages/ChatPage.tsx` — botón de adjuntar (oculto en el canal general), vista previa antes de enviar, renderizado de adjuntos, botón de eliminar mensaje


[VOLVER](../README.md)
