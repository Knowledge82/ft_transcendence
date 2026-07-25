# FriendsModule — Sistema de amigos

## Para qué sirve

Permite a los usuarios enviarse solicitudes de amistad, aceptarlas, ver su lista de amigos, y romper una amistad existente. Es un requisito obligatorio del enunciado (parte de "User interaction" en la sección Web, y de "Standard user management" en User Management).

## Decisión de modelado — una sola tabla, no una lista de IDs

Una amistad no es un simple hecho binario: tiene un **estado** (pendiente o aceptada) y una **dirección** (quién la solicitó, a quién). Guardar solo una lista de `friendIds` dentro de `User` no permitiría representar solicitudes pendientes ni saber quién inició la relación. Por eso se creó una tabla independiente, `Friendship`, con una relación **doble** hacia `User`.

```prisma
enum FriendshipStatus {
  PENDING
  ACCEPTED
}

model Friendship {
  id          Int              @id @default(autoincrement())
  requesterId Int
  addresseeId Int
  status      FriendshipStatus @default(PENDING)
  createdAt   DateTime         @default(now())

  requester User @relation("FriendshipRequester", fields: [requesterId], references: [id], onDelete: Cascade)
  addressee User @relation("FriendshipAddressee", fields: [addresseeId], references: [id], onDelete: Cascade)

  @@unique([requesterId, addresseeId])
}
```

**Relaciones nombradas (`@relation("FriendshipRequester", ...)`):** como `Friendship` tiene dos campos que apuntan al mismo modelo `User` (quién solicita, a quién), Prisma necesita un nombre explícito para cada relación — si no, no sabría distinguir cuál es cuál. Por eso, dentro de `User`, también aparecen dos campos separados: `sentFriendRequests` y `receivedFriendRequests`, cada uno enlazado a su relación correspondiente por nombre.

**Restricción única compuesta (`@@unique([requesterId, addresseeId])`):** impide, a nivel de base de datos, que la misma persona envíe una solicitud duplicada a otra.

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/friends` | Lista los amigos ya aceptados |
| `GET` | `/friends/requests` | Lista las solicitudes entrantes pendientes |
| `POST` | `/friends/request/:userId` | Envía una solicitud de amistad |
| `POST` | `/friends/:userId/accept` | Acepta una solicitud entrante |
| `DELETE` | `/friends/:userId` | Elimina la relación (rechaza una pendiente, o rompe una amistad ya aceptada — funciona igual en ambos casos) |

Todas las rutas están protegidas con `JwtAuthGuard` a nivel de controlador.

## Reglas de negocio aplicadas

- No se puede enviar una solicitud a uno mismo
- No se puede enviar una solicitud si ya existe una relación (pendiente o ya aceptada) **en cualquiera de las dos direcciones** — se comprueba con `OR` en ambos sentidos, porque la amistad pudo haberse iniciado por cualquiera de las dos personas
- Solo la persona que **recibió** la solicitud puede aceptarla (comprobado explícitamente, no solo por la existencia de la fila)
- Al listar amigos, cada fila de `Friendship` puede tener al usuario actual como `requester` o como `addressee` — el código detecta en qué lado está y devuelve siempre "la otra persona", sin que a quien consulta la lista le importe quién inició cada amistad

## `ParseIntPipe`

Los IDs de usuario en la URL (`/friends/request/:userId`) llegan siempre como texto (`"3"`, no `3`), porque cualquier segmento de una URL es una cadena. `ParseIntPipe` es un pipe incorporado de NestJS que convierte automáticamente ese texto a número, y responde con `400 Bad Request` si el valor no es un número válido — sin tener que validarlo manualmente en cada endpoint.

## Verificación realizada

Probado de extremo a extremo con dos usuarios reales a través de Insomnia:
1. Envío de solicitud (A → B) → `201`, estado `PENDING`
2. Solicitud visible en `/friends/requests` del receptor, con los datos del solicitante incluidos
3. Aceptación de la solicitud → estado pasa a `ACCEPTED`
4. Ambos usuarios ven al otro en su `/friends`
5. Casos límite comprobados: solicitud duplicada (`409 Conflict`), solicitud a uno mismo (`400 Bad Request`), ruptura de amistad seguida de lista vacía en ambos usuarios



[VOLVER](../README.md)
