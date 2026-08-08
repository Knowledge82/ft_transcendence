## 6. Estado actual y pendientes

### Completado
- Infraestructura Docker completa y estable (postgres, backend, frontend, nginx, HTTPS)
- Módulo de autenticación backend: registro, login, refresh con rotación, logout con revocación
- Refresh token vía cookie httpOnly (no expuesto en el body de la respuesta)
- Renovación automática del access token cuando caduca a mitad de sesión (interceptor de respuesta en el frontend, con protección contra múltiples llamadas de refresh simultáneas)
- Frontend de autenticación completo: páginas de login/registro con formularios controlados, `AuthContext` con sesión persistente vía silent refresh, rutas protegidas (`ProtectedRoute`)
- Validación de formularios tanto en frontend como en backend
- Paleta visual definitiva aplicada (Tailwind v4, tema oscuro + dorado)
- `UsersModule`: consulta y actualización de perfil (`GET`/`PATCH /users/me`), subida de avatar con validación de tipo y tamaño (`POST /users/me/avatar`), panel de perfil editable en `/celda`
- `FriendsModule`: envío, aceptación y eliminación de solicitudes de amistad, listado de amigos — flujo completo también desde la interfaz (botón "+ Amigo" en el panel de miembros, sección de solicitudes pendientes con aceptación, todo con actualización en tiempo real vía WebSockets)
- `ChatModule`: WebSockets con autenticación por JWT en el handshake, canal general, chats directos 1 a 1, historial persistente en base de datos, mensajería en tiempo real con salas de Socket.IO
- Frontend de chat: página `/chat` con barra de conversaciones, historial, envío y recepción en vivo, autoscroll al último mensaje
- Estado online de los usuarios: presencia en tiempo real vía WebSockets, visible tanto en la lista de amigos como en un panel de miembros del canal general (siempre visible, ordenado por conectados primero), con notificación en vivo de nuevos miembros
- Landing page pública (`/`) con manifiesto temático, revelado en tres fases (loader, imagen, texto en cascada), favicon e identidad visual propios
- Páginas de Política de Privacidad y Términos de Servicio, accesibles desde el footer en las páginas principales
- Sistema de rangos y permisos (`AdminModule`): roles `HERMANO`/`GUARDIAN`/`ARZOBISPO`, guard personalizado que verifica el rango en tiempo real (no depende del contenido del JWT), panel de administración (`/santuario`) para gestionar usuarios y rangos

### Pendiente (requisitos obligatorios del enunciado)
- **Diseño responsive** — la interfaz actual (especialmente `ChatPage`, con barras laterales de ancho fijo) no está adaptada a pantallas pequeñas; el enunciado exige compatibilidad con todos los dispositivos

### Pendiente (deuda técnica / buenas prácticas)
- Rate limiting en `/auth/login` (actualmente sin protección contra fuerza bruta)
- Limpieza periódica de refresh tokens expirados/revocados en la base de datos
- Notificaciones de mensaje nuevo cuando la conversación correspondiente no está abierta
- Paginación del historial de mensajes (por ahora siempre se cargan los últimos 50, sin forma de pedir mensajes más antiguos)
- Auditoría de errores/warnings en la consola del navegador (aplazada deliberadamente hasta que el proyecto esté más cerca de su forma final)

### Pendiente (módulos bonus)
- 2FA
- OAuth con 42 intra
- Módulo de Inteligencia Artificial (Confesor-bot)
- Uso funcional del rango `GUARDIAN` (por ahora existe el rango, pero ninguna acción de moderación real lo requiere todavía)
