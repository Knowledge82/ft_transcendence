# Crónica del Capítulo — sistema de eventos públicos

## Qué es y para qué sirve

Un registro público y compartido de la vida de la comunidad, pensado para mostrarse en `/celda`: quién se ha unido, quién ha ascendido de rango, qué amistades se han sellado — mezclado con eventos ficticios y humorísticos que dan ambiente ("los hermanos organizaron una procesión en honor a la nueva versión de CMake").

## Decisión de diseño: dos sistemas separados, no uno

Se planteó inicialmente un único sistema de "notificaciones" con un campo opcional para indicar el destinatario (vacío = público, relleno = privado). Se descartó: una notificación personal necesita estado de leído/no leído, mientras que un evento público no tiene ningún destinatario al que marcarle nada como leído — forzar ambos casos en una sola tabla habría dejado ese campo sin sentido la mitad de las veces.

**Resultado:** se crearon dos modelos separados en la base de datos.

- **`CommunityEvent`** — la crónica pública, sin destinatario. Completamente implementada en esta sesión.
- **`Notification`** — el futuro sistema de notificaciones personales (con destinatario y estado de leído). Solo está definida en el esquema por ahora; su implementación (icono, lista, marcado como leído) queda como siguiente paso, y es la pieza que formalmente cierra el módulo bonus "notification system" del enunciado.

## Cómo se genera el contenido de la crónica

**Eventos reales**, creados automáticamente en el momento exacto en que ocurre la acción correspondiente:
- Registro de un nuevo usuario (`AuthService.register`)
- Cambio de rango (`AdminController.changeRole`)
- Aceptación de una solicitud de amistad (`FriendsController.acceptRequest`)

**Eventos ficticios**, generados automáticamente en segundo plano, sin ninguna acción del usuario:
- Un conjunto de frases curadas a mano (gratis, instantáneo)
- Frases generadas por IA a través de Groq, unas 5 veces al día, con un prompt que le pide al modelo un evento "cotidiano, ficticio y humorístico" de la Iglesia

En total, entre ambas fuentes, se generan aproximadamente 13 eventos ficticios al día, repartidos a lo largo de toda la jornada mediante temporizadores internos del servidor (`onModuleInit` + `setInterval`), sin necesidad de ninguna acción externa ni de un servicio de tareas programadas aparte.

## Dónde está en el código

- `prisma/schema.prisma` — modelos `Notification` y `CommunityEvent`
- `src/community/community.service.ts` — lógica central: creación de eventos, lectura del feed, generación de eventos ficticios (estáticos y por IA)
- `src/community/community.controller.ts` — `GET /community/feed`
- `src/community/community.module.ts`
- Puntos de integración modificados: `auth.service.ts`, `admin.controller.ts`, `friends.controller.ts` (y sus respectivos `.module.ts`, que ahora importan `CommunityModule`)

## Pendiente

- Frontend: componente de la crónica en `/celda`, consumiendo `GET /community/feed`
- Sistema de notificaciones personales (`Notification`) — icono, lista, marcado como leído
- Cuando exista el futuro sistema de artículos escritos por los hermanos, añadir también ese tipo de evento a la crónica


[VOLVER](../README.md)
