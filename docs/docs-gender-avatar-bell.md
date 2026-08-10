# Género de los usuarios, avatar por defecto y campana de notificaciones

## Género y formas de rango con concordancia gramatical

### La decisión de diseño

El rango de un usuario (`HERMANO`/`INQUISIDOR`/`ARZOBISPO`) es un valor técnico que determina permisos y nunca depende del género. Lo que sí cambia según el género es cómo se muestra ese rango en pantalla — se añadió un campo `gender` separado, y una pequeña función pura (`getGenderedRole`) que traduce `(rango, género)` a la forma gramaticalmente correcta: HERMANA, INQUISIDORA, ARZOBISPA.

### Backend

- `prisma/schema.prisma` — nuevo enum `Gender` (`MASCULINO`/`FEMENINO`) y campo `gender` en `User`
- `auth/dto/register.dto.ts` — el registro ahora exige elegir género, validado con `@IsIn(['MASCULINO', 'FEMENINO'])`
- `auth.service.ts` — el género elegido se guarda al crear la cuenta
- `common/gendered-role.ts` — la función `getGenderedRole`, usada tanto para eventos de la crónica pública como para notificaciones (mensajes ya pre-renderizados en texto, que no pueden recalcularse después en el frontend)
- Se añadió `gender` a los `select` de Prisma en `users.service.ts`, `admin.service.ts` y `chat.service.ts` (concretamente en quién elimina un mensaje) — en todos los sitios donde ya se devolvía `role`, ahora también viaja `gender`

### Frontend

- `utils/genderedRole.ts` — equivalente exacto de la función del backend, para los elementos de interfaz que sí pueden recalcularse en el momento (la insignia de rango, la lápida de un mensaje eliminado)
- `components/ui/RoleBadge.tsx` — ahora recibe `role` y `gender`, y muestra la forma correcta
- `pages/RegisterPage.tsx` — nuevo selector de género con dos botones tipo "radio", estilizados como un interruptor segmentado (cápsula con el segmento activo resaltado en dorado)
- Todas las páginas que ya mostraban el rango (`HomePage`, `UserProfilePage`, `AdminPage`, la lápida de mensajes eliminados en `ChatPage`) se actualizaron para pasar también el género

## Avatar por defecto y opción de eliminarlo

### Backend

- `users.controller.ts` — nuevo endpoint `DELETE /users/me/avatar`, que simplemente pone `avatarUrl` de nuevo a `null`

### Frontend

- `components/ui/Avatar.tsx` — simplificado: ya no dibuja un círculo con la inicial del nombre como alternativa; ahora siempre muestra una imagen, usando `avatarUrl ?? '/default-avatar.png'` — un único archivo estático compartido por todos los usuarios sin avatar propio
- `pages/HomePage.tsx` — nuevo botón "Eliminar avatar", visible solo cuando el usuario tiene un avatar propio subido

No hace falta ninguna lógica adicional para "asignar" el avatar por defecto a cada usuario — como el componente ya sabe mostrar la imagen por defecto cuando `avatarUrl` es `null`, eliminar el avatar y quedarse sin uno son exactamente la misma cosa desde el punto de vista del código.

## Campana de notificaciones atenuada

Cuando no hay ninguna notificación (ni leída ni sin leer), el icono de la campana se muestra con menor opacidad — un indicador visual sutil de que no hay nada que revisar, sin necesidad de abrir el panel.

```tsx
className={notifications.length === 0 ? 'text-cream-400/40' : 'text-cream-100'}
```

Cambio puntual en `components/NotificationBell.tsx`, sin tocar el backend.
