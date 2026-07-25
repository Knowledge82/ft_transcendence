## 6. Estado actual y pendientes

### Completado
- Infraestructura Docker completa y estable (postgres, backend, frontend, nginx, HTTPS)
- Módulo de autenticación backend: registro, login, refresh con rotación, logout con revocación
- Refresh token vía cookie httpOnly (no expuesto en el body de la respuesta)
- Renovación automática del access token cuando caduca a mitad de sesión (interceptor de respuesta en el frontend, con protección contra múltiples llamadas de refresh simultáneas)
- Frontend de autenticación completo: páginas de login/registro con formularios controlados, `AuthContext` con sesión persistente vía silent refresh, rutas protegidas (`ProtectedRoute`)
- Validación de formularios tanto en frontend como en backend
- Paleta visual definitiva aplicada (Tailwind v4, tema oscuro + dorado)
- `UsersModule`: consulta y actualización de perfil (`GET`/`PATCH /users/me`), subida de avatar con validación de tipo y tamaño (`POST /users/me/avatar`)

### Pendiente (requisitos obligatorios del enunciado)
- **Sistema de amigos** — añadir, aceptar, listar amigos (parte de "User interaction" en la sección Web y de "Standard user management" en User Management)
- **Estado online de los usuarios** — deliberadamente pospuesto: un estado online real requiere la infraestructura de WebSockets (módulo de chat/tiempo real), que todavía no existe. Implementarlo ahora de forma provisional (por ejemplo con un campo `lastSeenAt`) se descartó para no tener que rehacerlo después

### Pendiente (deuda técnica / buenas prácticas)
- Rate limiting en `/auth/login` (actualmente sin protección contra fuerza bruta)
- Limpieza periódica de refresh tokens expirados/revocados en la base de datos

### Pendiente (módulos bonus relacionados con Auth)
- 2FA
- OAuth con 42 intra
- Sistema de permisos avanzado (roles)


[VOLVER](../README.md)
