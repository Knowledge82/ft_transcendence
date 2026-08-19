# Sistema de organizaciones — Facciones dentro de la Iglesia

Cierra el Major de User Management: "An organization system: crear, editar y eliminar organizaciones; añadir/quitar usuarios; ver organizaciones y permitir acciones específicas dentro de ellas (mínimo: create, read, update)".

## Por qué facciones, y no otra cosa

El enunciado exige un sistema de organizaciones genérico, pero encajarlo en un proyecto con una única "organización" real (la propia Iglesia) parecía forzado al principio. La solución: facciones internas — Radical, Snob, y las que se quieran fundar — algo históricamente coherente con el tema del proyecto, ya que las instituciones religiosas reales casi siempre han tenido órdenes y corrientes internas enfrentadas entre sí.

## Decisiones de diseño, antes de escribir una línea de código

### Una facción por persona, a la vez

Al igual que una afiliación política real, se decidió que nadie puede pertenecer a más de una facción simultáneamente. Esto se garantiza a nivel de base de datos, no solo con una comprobación en el código: el campo userId en la tabla de pertenencia es único, así que la propia base de datos rechazaría cualquier intento de duplicidad, aunque hubiera un fallo en la lógica de la aplicación.

### Quién puede fundar una facción

Se decidió que Inquisidor y Arzobispo pueden fundar facciones — reutilizando exactamente la misma agrupación de rangos que ya existía para la moderación del chat, en vez de inventar una regla nueva.

### El "líder de facción": una autoridad separada del rango global

Aquí surgió una pregunta interesante durante el diseño: si un Arzobispo funda una facción y luego es degradado de rango, ¿debería perder también el control sobre la facción que él mismo creó? Se decidió que no — la capacidad de gestionar una facción concreta (editar su manifiesto, expulsar miembros, disolverla) depende de si esa persona es el líder de esa facción en concreto, un atributo propio de la facción, completamente independiente del rango global de la Iglesia. Un Arzobispo actual conserva además una capacidad de anulación sobre cualquier facción, como red de seguridad.

```typescript
private async assertCanManage(organizationId: number, requestingUserId: number) {
  const requester = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
  if (requester?.role === 'ARZOBISPO') return; // anulación global

  const membership = await this.prisma.organizationMember.findUnique({
    where: { userId: requestingUserId },
  });
  if (membership?.organizationId === organizationId && membership.isLeader) return;

  throw new ForbiddenException({ code: 'NOT_ORGANIZATION_LEADER' });
}
```

## El esquema

Dos modelos nuevos, y dos campos añadidos a modelos ya existentes:

```prisma
model Organization {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  manifesto String?
  color     String
  members      OrganizationMember[]
  conversation Conversation?
  articles     Article[]
}

model OrganizationMember {
  id             Int     @id @default(autoincrement())
  organizationId Int
  userId         Int     @unique
  isLeader       Boolean @default(false)
}
```

Conversation.organizationId (único, opcional) enlaza cada facción con su propio canal de chat dedicado, reutilizando toda la infraestructura de chat ya existente. Article.organizationId (opcional) permitirá, más adelante, artículos visibles solo para los miembros de una facción concreta.

## El backend: un módulo nuevo, siguiendo el patrón ya establecido

backend/src/organizations/ — servicio, controlador y módulo, con la misma estructura que admin. Los métodos principales:

- createOrganization — comprueba el rango, comprueba que la persona no pertenezca ya a otra facción, crea la facción, su canal de chat dedicado, y convierte automáticamente al fundador en su líder.
- updateOrganization / deleteOrganization — protegidos por assertCanManage.
- joinOrganization / leaveOrganization — autoservicio, disponible para cualquiera.
- removeMember — expulsión, solo para quien puede gestionar la facción.

## El frontend: tres páginas nuevas

OrganizationsListPage (listado con nombre, color, número de miembros), NewOrganizationPage (formulario de creación, con un selector de color nativo del navegador), y OrganizationDetailPage — la más completa: manifiesto editable, lista de miembros con indicador de líder, botones de unirse/abandonar, y gestión completa para quien tiene permiso.

## El distintivo de facción (color + nombre) junto al rango

Se amplió users.service.ts para incluir la pertenencia a una facción en el perfil propio y en el perfil público de cualquier persona, reutilizando la misma relación que ya existía en el esquema. Se creó un componente pequeño y reutilizable, OrganizationBadge, que no muestra nada en absoluto si la persona no pertenece a ninguna facción.

### Un detalle de CSS que costó un par de intentos

Al añadir el distintivo justo debajo del de rango en /celda, ambos aparecían uno al lado del otro en la misma línea, en vez de uno encima del otro — un fallo sutil de maquetación: tanto el contenedor del rango (inline-block, para que el resaltado de "acabas de ascender" no ocupe todo el ancho) como el propio distintivo de facción (inline-flex) son elementos de tipo "en línea", y sin ningún elemento de bloque entre ambos, el navegador los coloca uno junto a otro por defecto. La solución fue envolver el distintivo de facción en su propio div — un elemento de bloque siempre empieza en una línea nueva, así que esto obliga al salto de línea sin tener que tocar el propio componente.

### Un elemento del mismo distintivo se probó y se descartó

Inicialmente se añadió también en la lista de miembros del chat, junto a cada nombre — pero el espacio ahí es demasiado reducido para que quede bien, así que se retiró de ese lugar concreto y se dejó únicamente en /celda y en la página de perfil de cada persona (a la que se llega, precisamente, pulsando sobre un nombre en el chat).

## Un extra no relacionado, resuelto de paso

Al tocar ChatPage.tsx para revisar el diseño, se aprovechó para corregir un problema real detectado durante las pruebas: las tres columnas de la página de chat (conversaciones/amigos a la izquierda, los mensajes en el centro, la lista de miembros a la derecha) compartían un único scroll de página entera, en vez de desplazarse cada una por separado. Se corrigió fijando la altura de toda la disposición a la altura de la ventana, y dando a cada columna su propio desplazamiento independiente. De paso, se sustituyó la barra de desplazamiento genérica del navegador por una versión a medida, en la misma paleta oscura y dorada del proyecto.

## Lo que queda por hacer — y aquí una corrección

No son solo dos cosas pendientes, sino tres:

1. La crónica pública — un evento debería registrarse cuando se funda una facción, cuando se disuelve, y cuando alguien se une a ella. Siguiente paso.
2. El canal de chat propio de cada facción — el campo ya existe en la base de datos y se crea automáticamente al fundar una facción, pero ChatPage todavía no sabe reconocerlo ni mostrarlo: solo entiende el canal general y las conversaciones privadas. Sin esta pieza, el canal de la facción existe en la base de datos pero es, por ahora, invisible e inaccesible desde la interfaz.
3. Artículos exclusivos de una facción — el campo organizationId ya existe en el modelo Article, pero todavía no hay ninguna lógica, ni en el backend ni en el frontend, que permita crear o consultar un artículo con esa visibilidad restringida.
