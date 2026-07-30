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
- `FriendsModule`: envío, aceptación y eliminación de solicitudes de amistad, listado de amigos (backend completo; el frontend todavía depende de pruebas manuales vía Insomnia para crear relaciones de amistad, ver pendientes)
- `ChatModule`: WebSockets con autenticación por JWT en el handshake, canal general, chats directos 1 a 1, historial persistente en base de datos, mensajería en tiempo real con salas de Socket.IO
- Frontend de chat: página `/chat` con barra de conversaciones, historial, envío y recepción en vivo, autoscroll al último mensaje
- Estado online de los usuarios: presencia en tiempo real vía WebSockets, visible tanto en la lista de amigos como en un panel de miembros del canal general (siempre visible, ordenado por conectados primero)

### Pendiente (requisitos obligatorios del enunciado)
- **Diseño responsive** — la interfaz actual (especialmente `ChatPage`, con barras laterales de ancho fijo) no está adaptada a pantallas pequeñas; el enunciado exige compatibilidad con todos los dispositivos

### Pendiente (deuda técnica / buenas prácticas)
- Rate limiting en `/auth/login` (actualmente sin protección contra fuerza bruta)
- Limpieza periódica de refresh tokens expirados/revocados en la base de datos
- Flujo de amistad usable desde la interfaz (añadir amigos actualmente requiere probar los endpoints manualmente; se sustituirá por un botón directo desde el panel de miembros del canal general)
- Notificaciones de mensaje nuevo cuando la conversación correspondiente no está abierta
- Paginación del historial de mensajes (por ahora siempre se cargan los últimos 50, sin forma de pedir mensajes más antiguos)

### Pendiente (módulos bonus relacionados con Auth)
- 2FA
- OAuth con 42 intra
- Sistema de permisos avanzado (roles)


[VOLVER](../README.md)
