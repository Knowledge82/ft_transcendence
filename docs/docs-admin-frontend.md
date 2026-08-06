# AdminModule (frontend) — Panel de administración

## Qué se construyó

La interfaz para el sistema de rangos implementado en el backend: una página (`/santuario`) donde un usuario con rango `ARZOBISPO` puede ver todos los usuarios registrados, cambiar el rango de cualquiera, y eliminar cuentas. Además, el panel de perfil (`/celda`) ahora muestra el propio rango del usuario, y solo enseña el enlace al Santuario si corresponde.

## Protección en dos capas

Es importante entender que **la protección real vive en el backend** (`RolesGuard`, ya documentado por separado). Lo que se construyó en el frontend es una capa de experiencia de usuario, no de seguridad:

- `ProtectedRoute` impide que alguien sin sesión iniciada llegue siquiera a `/santuario`
- Dentro de `AdminPage`, se consulta el propio rango (`GET /users/me`) y, si no es `ARZOBISPO`, se muestra un mensaje de "no autorizado" en vez del contenido real — la lista de usuarios ni siquiera se solicita al backend en ese caso
- Aunque alguien lograra saltarse esta comprobación del lado del cliente, cualquier petición real a `/admin/*` sigue siendo rechazada por el `RolesGuard` del backend con `403 Forbidden`

## Archivos

- `src/api/admin.ts` — funciones `listAllUsers()`, `changeUserRole(userId, role)`, `deleteUser(userId)`, y el tipo `Role`
- `src/pages/AdminPage.tsx` — la página del Santuario
- `src/App.tsx` — nueva ruta `/santuario`
- `src/pages/HomePage.tsx` — muestra el rango propio y el enlace condicional al Santuario

## Interfaz

Tabla con: nombre, email, un desplegable para cambiar el rango (editable en el momento, sin recargar la página) y un botón para eliminar la cuenta (con confirmación del navegador antes de ejecutar la acción, dado que no se puede deshacer).

## Cómo probarlo

El primer usuario con rango `ARZOBISPO` debe asignarse manualmente en la base de datos (no existe otra forma de "arrancar" el sistema, ya que cambiar un rango requiere ya tener el rango `ARZOBISPO`):

```bash
docker compose exec postgres psql -U <usuario> -d <base_de_datos> \
  -c "UPDATE \"User\" SET role = 'ARZOBISPO' WHERE id = <tu_id>;"
```

A partir de ahí, el resto de cambios de rango pueden hacerse directamente desde `/santuario`.



[VOLVER](../README.md)
