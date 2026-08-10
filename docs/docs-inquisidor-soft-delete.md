# El Inquisidor y el borrado suave de mensajes

## Renombrado de rango: `GUARDIAN` → `INQUISIDOR`

El rango intermedio, hasta ahora sin ninguna función real más allá de un nombre, pasa a llamarse `INQUISIDOR` — encaja con las dos capacidades que se le asignan a partir de ahora: revisar la ortodoxia de los artículos escritos por la comunidad (próximo módulo) y moderar el chat eliminando mensajes heréticos.

## Cambio de comportamiento: moderar ya no es un privilegio personal

Antes, cualquier `HERMANO` podía eliminar sus propios mensajes. Ahora esa capacidad desaparece por completo para los `HERMANO` — eliminar un mensaje pasa a ser exclusivamente un acto de moderación, reservado a `INQUISIDOR` y `ARZOBISPO`, incluso sobre mensajes propios.

## De borrado físico a borrado "con lápida"

Antes, eliminar un mensaje lo hacía desaparecer para siempre de la base de datos, y de la pantalla de quienes estuvieran conectados en ese momento — pero al recargar la página, ya no había ningún rastro. Ahora el mensaje permanece en la base de datos: su contenido se vacía, pero se guarda quién lo eliminó y cuándo. En su lugar se muestra, para siempre y para todo el mundo, una lápida:

> 🔥 Herejía eliminada por INQUISIDOR **Nombre**

### Por qué el modelo de datos necesitó dos relaciones distintas hacia `User`

Un mensaje ahora puede referenciar a dos usuarios distintos: quien lo escribió (`senderId`) y quien lo eliminó (`deletedById`). Prisma exige nombrar explícitamente cada relación cuando hay más de una hacia el mismo modelo:

```prisma
sender    User  @relation("MessageSender", fields: [senderId], references: [id], onDelete: Cascade)
deletedBy User? @relation("MessageDeletedBy", fields: [deletedById], references: [id], onDelete: SetNull)
```

`onDelete: SetNull` en `deletedBy` es intencional: si la cuenta del moderador que eliminó el mensaje se borra más adelante, la lápida sigue existiendo (solo pierde la referencia a quién fue exactamente) — no se arrastra el borrado en cadena de todo el historial de mensajes por ese motivo.

## Evento de WebSocket renombrado

`messageDeleted` (que solo avisaba "ID borrado, quítalo de la vista") se sustituyó por `messageUpdated`, que envía el mensaje completo ya actualizado. El frontend ya no elimina el mensaje de la lista — lo reemplaza por su versión con la lápida, con el mismo componente visual.

## Dónde está en el código

- `prisma/schema.prisma` — enum `Role` actualizado, campos `deletedAt`/`deletedById` y relación `deletedBy` en `Message`
- `src/chat/chat.service.ts` — `deleteMessage` reescrito como borrado suave (además de eliminar el archivo adjunto físico, si lo había)
- `src/chat/chat.controller.ts` — solo `INQUISIDOR`/`ARZOBISPO` pueden invocar el borrado; ya no se comprueba autoría
- `src/pages/ChatPage.tsx` — renderizado condicional de la lápida, botón de eliminar visible únicamente para moderadores

## Nota operativa importante

Renombrar el enum obligó a resetear la base de datos de desarrollo (`prisma migrate reset`) por un conflicto de migraciones. Como consecuencia, hay que volver a asignarse el rango `ARZOBISPO` a mano tras cualquier reseteo — el procedimiento está documentado por separado en `docs-primer-arzobispo.md`.
