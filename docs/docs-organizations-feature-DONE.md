# Sistema de organizaciones — Facciones dentro de la Iglesia

Cierra el Major de User Management: "An organization system: crear, editar y eliminar organizaciones; añadir/quitar usuarios; ver organizaciones y permitir acciones específicas dentro de ellas (mínimo: create, read, update)". Ha sido, con diferencia, la pieza más grande construida en todo el proyecto — toca prácticamente todos los módulos existentes: base de datos, permisos, chat, crónica pública, IA, y subida de archivos.

## Por qué facciones, y no otra cosa

El enunciado exige un sistema de organizaciones genérico, pero encajarlo en un proyecto con una única "organización" real (la propia Iglesia) parecía forzado al principio. La solución: facciones internas — Radical, Snob, y las que se quieran fundar — algo históricamente coherente con el tema del proyecto, ya que las instituciones religiosas reales casi siempre han tenido órdenes y corrientes internas enfrentadas entre sí.

## Decisiones de diseño

Una facción por persona, a la vez. Al igual que una afiliación política real, nadie puede pertenecer a más de una facción simultáneamente. Esto se garantiza a nivel de base de datos, no solo con una comprobación en el código: el campo userId en la tabla de pertenencia es único, así que la propia base de datos rechazaría cualquier intento de duplicidad.

Quién puede fundar una facción. Inquisidor y Arzobispo — reutilizando la misma agrupación de rangos que ya existía para la moderación del chat.

El "líder de facción": una autoridad separada del rango global. Si un Arzobispo funda una facción y luego es degradado, ¿pierde el control sobre lo que fundó? Se decidió que no: la capacidad de gestionar una facción concreta depende de si esa persona es el líder de esa facción, un atributo propio de la facción, independiente del rango global. Un Arzobispo actual conserva además una capacidad de anulación sobre cualquier facción.

```typescript
private async assertCanManage(organizationId: number, requestingUserId: number) {
  const requester = await this.prisma.user.findUnique({ where: { id: requestingUserId } });
  if (requester?.role === 'ARZOBISPO') return;

  const membership = await this.prisma.organizationMember.findUnique({
    where: { userId: requestingUserId },
  });
  if (membership?.organizationId === organizationId && membership.isLeader) return;

  throw new ForbiddenException({ code: 'NOT_ORGANIZATION_LEADER' });
}
```

## El esquema

```prisma
model Organization {
  id        Int      @id @default(autoincrement())
  name      String   @unique
  manifesto String?
  color     String
  bannerUrl String?
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

Conversation.organizationId (único, opcional) enlaza cada facción con su propio canal de chat. Article.organizationId (opcional) marca un artículo como interno de una facción concreta.

## El backend: módulo organizations

Servicio, controlador y módulo, con la misma estructura que admin. Métodos principales: createOrganization (comprueba rango, comprueba que la persona no pertenezca ya a otra facción, crea la facción, su canal dedicado, y convierte al fundador en líder), updateOrganization/deleteOrganization (protegidos por assertCanManage), joinOrganization/leaveOrganization (autoservicio), removeMember (expulsión).

## El frontend: tres páginas

OrganizationsListPage (listado con nombre, color, número de miembros), NewOrganizationPage (formulario con selector de color nativo), y OrganizationDetailPage — manifiesto editable, lista de miembros con indicador de líder, unirse/abandonar, gestión completa para quien tiene permiso.

## El distintivo de facción junto al rango

users.service.ts incluye ahora la pertenencia a una facción en el perfil propio y público. Un componente pequeño, OrganizationBadge, no muestra nada si la persona no pertenece a ninguna facción. Se probó también en la lista de miembros del chat, pero el espacio ahí resultó demasiado reducido — se retiró de ese lugar y se dejó solo en /celda y en la página de perfil.

Un detalle de maquetación que costó un par de intentos: el distintivo de rango y el de facción, al ser ambos elementos "en línea" (inline-block/inline-flex), aparecían uno junto al otro en vez de uno encima del otro. Se resolvió envolviendo el distintivo de facción en su propio div — un elemento de bloque siempre empieza en una línea nueva.

## La crónica pública

Cuatro tipos de evento nuevos, siguiendo el mismo patrón que el resto de la crónica (plantillas con variantes, renderizadas en el idioma activo de cada persona, nunca guardadas ya traducidas): fundación de una facción, disolución, ingreso de un nuevo miembro, y publicación de un tratado interno. Este último fue una decisión deliberada: aunque el tratado es interno, la crónica solo muestra su título, nunca el contenido — funciona más como publicidad de la facción (atrae curiosidad) que como una filtración real.

En árabe, las tres primeras frases se construyeron evitando deliberadamente que el verbo tenga que concordar en género con la persona (fundador o nuevo miembro) — el sujeto gramatical es siempre la propia facción o el hecho en sí, no la persona, sorteando así la necesidad de conocer o declinar el género en cada frase.

## El canal de chat propio de cada facción

El campo Conversation.organizationId ya existía desde el principio, pero ChatPage solo sabía reconocer el canal general y las conversaciones privadas. Se amplió para reconocer un tercer tipo de "canal": el de la propia facción del usuario, con su distintivo de color en el botón de la barra lateral, reconocimiento correcto de enlaces directos (?c=<id>), y el nombre de la facción en la cabecera cuando ese canal está activo.

De paso, se corrigió un detalle que se había vuelto incorrecto con esta ampliación: los adjuntos solo están permitidos en conversaciones privadas (regla del backend), pero el frontend solo ocultaba el botón de adjuntar en el canal general — con el canal de facción ya existiendo, había que generalizar la condición a "cualquier canal", no solo el general.

## Artículos exclusivos de una facción

Se decidió mantener el mismo requisito de rango que la biblioteca pública (Inquisidor o superior) para escribir, tanto para tratados públicos como internos — con un matiz: un Inquisidor solo puede escribir para una facción a la que realmente pertenezca; un Arzobispo puede escribir para cualquiera, la misma anulación que ya se aplica en el resto de la función.

Los artículos internos no aparecen nunca en /biblioteca — el backend filtra explícitamente organizationId: null en el listado público — y solo son visibles, tanto en listado como al abrir uno por enlace directo, para los propios miembros de esa facción (o un Arzobispo).

### Un ajuste pendiente en la moderación por IA

El Oráculo aplicaba, sin distinción, la misma regla estricta de decoro a cualquier artículo — lo que provocaba rechazos absurdos en tratados internos de una facción como "Radical", cuyo carácter agresivo es precisamente su seña de identidad temática, no un problema real. Se dividió el prompt de revisión en una regla de lenguaje estricta (biblioteca pública) y otra más permisiva (tratados internos, que tolera fanatismo y lenguaje duro dentro de la ficción del proyecto, mientras seguirá rechazando cualquier cosa genuinamente dañina fuera de esa ficción). El primer intento de ajuste, sin embargo, todavía no resuelve el problema del todo — sigue devolviendo rechazos en casos que deberían aprobarse; queda pendiente de revisión.

## La imagen de cabecera (banner) de cada facción

Última pieza, puramente visual: cada facción puede tener una imagen de banner, subida por su líder o un Arzobispo, siguiendo exactamente el mismo patrón que ya existía para los avatares de perfil (multer, diskStorage, límite de tamaño, tipos MIME permitidos). En /facciones, una facción con banner muestra la imagen como fondo de su tarjeta con un degradado oscuro para que el texto siga siendo legible; una facción sin banner conserva la tarjeta plana original, sin cambios. En la página de detalle, el banner ocupa una franja completa arriba de la tarjeta, con controles de cambiar/quitar superpuestos, visibles solo para quien puede gestionar la facción.

## Resumen de todo lo tocado

Backend: schema.prisma, organizations.service.ts, organizations.controller.ts, organizations.module.ts, users.service.ts, chat.service.ts, community.service.ts, articles.service.ts, articles.controller.ts, create-article.dto.ts, ai.service.ts.

Frontend: routes.ts, api/organizations.ts, api/articles.ts, api/chat.ts, api/users.ts, OrganizationsListPage.tsx, NewOrganizationPage.tsx, OrganizationDetailPage.tsx, OrganizationBadge.tsx, HomePage.tsx, UserProfilePage.tsx, ChatPage.tsx, NewArticlePage.tsx, ActivityTicker.tsx, App.tsx, tres archivos de idioma.
