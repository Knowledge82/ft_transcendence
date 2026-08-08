# Sistema de notificaciones personales

## Qué cierra este módulo

Completa el módulo bonus Minor de la categoría Web: *"A complete notification system for all creation, update, and deletion actions."* Junto con la crónica pública (`CommunityEvent`, ya documentada por separado), forma las dos mitades de un mismo sistema: la crónica es el registro compartido de la comunidad; esto es el buzón personal de cada usuario, con estado de leído/no leído.

## Diseño: un método que persiste y notifica en vivo a la vez

```typescript
async createNotification(userId: number, type: string, message: string) {
  const notification = await this.prisma.notification.create({
    data: { userId, type, message },
  });
  this.chatGateway.notifyUser(userId, 'notificationCreated', notification);
  return notification;
}
```

Cada notificación queda guardada en base de datos (sigue ahí aunque el usuario estuviera desconectado en el momento) y, si tiene una sesión activa, la ve aparecer al instante vía WebSocket — el mismo patrón ya usado en `CommunityService.createEvent`.

## Dónde se generan notificaciones

- **Solicitud de amistad recibida** — al destinatario
- **Solicitud de amistad aceptada** — a quien la envió originalmente
- **Amistad rota** — a la otra persona, solo si la amistad ya estaba aceptada (rechazar una solicitud pendiente no genera notificación, no hay "ruptura" real que anunciar)
- **Cambio de rango** — al usuario afectado

En cada uno de estos puntos, la notificación personal se suma a lo que ya existía (el evento en tiempo real específico de esa función, y en algunos casos la entrada en la crónica pública) — no lo sustituye. Son tres mecanismos con destinatarios distintos: un elemento concreto de la interfaz, toda la comunidad, y el buzón de una persona en particular.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/notifications` | Lista las últimas 30 notificaciones del usuario |
| `GET` | `/notifications/unread-count` | Devuelve cuántas están sin leer |
| `PATCH` | `/notifications/:id/read` | Marca una notificación como leída (verifica que pertenezca al usuario) |
| `PATCH` | `/notifications/read-all` | Marca todas como leídas de golpe |

## El componente `NotificationBell`

Un icono de campana con un contador de no leídas, que despliega un panel con la lista al hacer clic. Se actualiza en tiempo real (nuevas notificaciones aparecen sin recargar) y permite marcar una o todas como leídas. Se cierra automáticamente al hacer clic fuera del panel.

**Ubicación actual:** solo visible en `/celda` (el panel de perfil), no de forma global en todas las páginas — queda como posible mejora futura si se quiere tener acceso desde cualquier pantalla.

## Dónde está en el código

- `prisma/schema.prisma` — modelo `Notification` (ya estaba definido desde antes)
- `src/notifications/` — `notifications.service.ts`, `notifications.controller.ts`, `notifications.module.ts`
- Puntos de integración: `friends.controller.ts` (tres llamadas), `admin.controller.ts` (una llamada), y sus respectivos `.module.ts` (ahora importan `NotificationsModule`)
- Frontend: `src/api/notifications.ts`, `src/components/NotificationBell.tsx`, integrado en `HomePage.tsx`
