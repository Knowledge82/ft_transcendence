# AdminModule — Sistema de rangos y permisos

## Para qué sirve

Implementa el módulo bonus "Advanced permissions system" del enunciado: distintos usuarios tienen distintos niveles de acceso. Se definieron tres rangos, con nombres temáticos pero equivalentes al esquema estándar admin/moderator/user que pide la especificación:

- **`HERMANO`** — usuario normal, asignado automáticamente al registrarse
- **`GUARDIAN`** — moderador (reservado para futuras funciones de moderación, como limpiar mensajes del chat)
- **`ARZOBISPO`** — administrador, con acceso total: listar todos los usuarios, cambiar el rango de cualquiera, eliminar cuentas

## Decisión de diseño clave: el rango no viaja en el JWT

El access token ya contiene `userId` y `email`, pero **deliberadamente no se añadió el rango ahí**. Si el rango estuviera "grabado" en el token, un cambio de rango hecho por un ARZOBISPO no tendría efecto inmediato sobre la otra persona — seguiría teniendo, en su token ya emitido, el rango antiguo hasta que ese token caduque y se renueve (hasta 15 minutos de retraso, o más si no está usando la aplicación activamente).

En su lugar, cada vez que se necesita comprobar el rango de alguien, se consulta **la base de datos en el momento**, no el contenido del token. Es un poco más costoso (una consulta extra en las rutas protegidas por rango), pero garantiza que los cambios de permisos se apliquen al instante.

## Cómo se protegen las rutas — decorador y Guard personalizados

Se construyeron dos piezas nuevas de NestJS que no existían en el proyecto hasta ahora:

**`@Roles(...roles)`** — un decorador propio que adjunta metadatos a un controlador o método, indicando qué rangos tienen permitido el acceso:
```typescript
@Roles('ARZOBISPO')
export class AdminController { ... }
```

**`RolesGuard`** — un guard que se ejecuta después de `JwtAuthGuard` (que ya identifica quién hace la petición) y decide si esa persona tiene el rango requerido, consultando su rango actual en la base de datos y comparándolo con lo que pide `@Roles(...)`. Si no coincide, corta la petición con `403 Forbidden`.

Ambas piezas se combinan así en `AdminController`:
```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARZOBISPO')
export class AdminController { ... }
```

## Endpoints

| Método | Ruta | Qué hace |
|---|---|---|
| `GET` | `/admin/users` | Lista todos los usuarios con su rango actual |
| `PATCH` | `/admin/users/:id/role` | Cambia el rango de un usuario concreto |
| `DELETE` | `/admin/users/:id` | Elimina una cuenta de usuario |

Todas exigen estar autenticado **y** tener el rango `ARZOBISPO` — cualquier otro usuario recibe `403 Forbidden` antes de que la petición llegue a la lógica del controlador.

## Validación del rango recibido

Como el rango llega desde el cuerpo de la petición HTTP como texto plano (no como un tipo `enum` de TypeScript), se valida explícitamente contra la lista de rangos válidos antes de guardar nada — evita un mensaje de error críptico de la base de datos si alguien envía un valor que no existe.

## Dónde está en el código

- `prisma/schema.prisma` — `enum Role`, campo `role` en `User` (por defecto `HERMANO`)
- `src/auth/decorators/roles.decorator.ts` — decorador `@Roles(...)`
- `src/auth/guards/roles.guard.ts` — `RolesGuard`
- `src/admin/` — `admin.module.ts`, `admin.controller.ts`, `admin.service.ts`
- `src/users/users.service.ts` — el campo `role` se añadió también a la respuesta de `GET /users/me`, para que el frontend sepa qué rango tiene el usuario actual

## Pendiente

- Interfaz de frontend para administrar usuarios (una página protegida, visible solo para `ARZOBISPO`)
- Mostrar el propio rango en el panel de perfil
- Aprovechar `GUARDIAN` para una función de moderación real (por ejemplo, borrar mensajes del chat)


[VOLVER](../README.md)
