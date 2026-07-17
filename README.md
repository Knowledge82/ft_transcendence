# ft_transcendence — Notas de progreso

**Proyecto:** "La Iglesia del Verdadero Relink" — red social satírica sobre la cultura del cargo cult en 42
**Periodo cubierto:** primera semana de desarrollo (infraestructura + módulo de autenticación)

---

## 1. Idea y planificación

### Concepto del proyecto
Red social de "feligreses": perfiles de usuario, sistema de rangos/roles jerárquicos, chat en tiempo real, donaciones, y más adelante un chatbot basado en LLM (preferible) y un juego de cartas (opcional).

### Stack tecnológico elegido
- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **Backend:** NestJS + TypeScript
- **Base de datos:** PostgreSQL + Prisma ORM
- **Tiempo real:** Socket.IO
- **Infraestructura:** Docker Compose + Nginx (reverse proxy + HTTPS)

**Por qué NestJS y no Express:** el equipo es de 4 personas. Express da libertad total pero ninguna estructura impuesta — con varios desarrolladores sin experiencia previa en Node, eso deriva en caos arquitectónico. NestJS impone una organización modular (Module/Controller/Service/DI) que facilita que cualquiera del equipo entienda dónde va cada pieza.

### Planificación de módulos bonus
Se repasaron las categorías de módulos del enunciado (Web, User Management, AI, Cybersecurity, Gaming, DevOps, Data & Analytics, Blockchain) y se seleccionaron los que encajan de forma natural con el concepto del proyecto, apuntando a superar los 14 puntos mínimos exigidos como margen de seguridad ante módulos que puedan no validarse en la evaluación.

---

## 2. Infraestructura Docker — construcción y depuración

### Estructura del repositorio
```
ft_transcendence/
├── docker-compose.yml
├── .env / .env.example
├── backend/
├── frontend/
└── nginx/
```

### `.env` vs `.env.example`
- `.env` contiene credenciales reales, nunca se sube a git (`.gitignore`)
- `.env.example` es la plantilla pública con placeholders, sí se comitea — permite a cualquier miembro del equipo saber qué variables necesita configurar

### docker-compose.yml — servicios
`postgres`, `backend`, `frontend`, `nginx`, todos en la red `ft_network`.

**Problemas encontrados y soluciones:**

| Problema | Causa | Solución |
|---|---|---|
| `target frontend: failed to solve: failed to read dockerfile` | Faltaba `frontend/Dockerfile` | Se creó el Dockerfile del frontend |
| Backend/frontend no accesibles desde nginx | Los servidores escuchaban solo en `localhost` dentro del contenedor | `app.listen(port, '0.0.0.0')` en NestJS, `--host 0.0.0.0` en Vite |
| `database "ft_user" does not exist` | El healthcheck de Postgres (`pg_isready -U ${POSTGRES_USER}`) intenta conectar por defecto a una base con el mismo nombre que el usuario, no a la base real | `pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}` |
| `cannot expose privileged port 80` | Docker rootless en las máquinas del campus (sin sudo) no puede enlazar puertos <1024 | Mapeo `8080:80` / `8443:443` en el host en vez de `80:80`/`443:443` |
| `ft_frontend exited with code 0 (restarting)` | Faltaba `target: development` en el build del frontend — Docker construía el último stage, sin `CMD` de arranque | Se añadió `target: development` |
| Postgres no aplicaba las variables de entorno tras varios reinicios | El volumen de datos ya existía de un arranque anterior; Postgres solo ejecuta la inicialización la primera vez que el volumen está vacío | `docker compose down --volumes` para reiniciar desde cero |

### HTTPS con certificado autofirmado
- Nginx reescrito con **Dockerfile propio** (no imagen directa) para incluir un script de entrypoint
- `entrypoint.sh`: genera el certificado (`openssl req -x509 ...`) solo si no existe ya en el volumen — así no se regenera en cada reinicio, pero sí automáticamente en cualquier máquina nueva del equipo
- Detalle técnico importante: `exec nginx -g "daemon off;"` al final del script — sustituye el proceso shell por el proceso de nginx en el mismo PID, para que las señales de apagado de Docker (`SIGTERM`) lleguen correctamente

### Configuración de Nginx (`conf.d/default.conf`)
Tres bloques `location`:
- `/api/` → `backend:3000`
- `/socket.io/` → `backend:3000`, con cabeceras `Upgrade`/`Connection` (imprescindibles para que la conexión HTTP se transforme en WebSocket) y timeouts largos (86400s, ya que las conexiones WS son de larga duración)
- `/` → `frontend:5173`, también con cabeceras de Upgrade — necesario para el Hot Module Replacement de Vite, que también usa WebSocket internamente

---

## 3. Backend — configuración base

### Dockerfile multi-stage
- Stage `development`: hot-reload vía `npm run start:dev --watch`
- Stage `production`: build optimizado, para uso futuro en el despliegue final
- `apk add openssl` obligatorio — Prisma necesita OpenSSL para su motor de consultas, y la imagen `node:20-alpine` no lo incluye por defecto

### Incidente: Prisma 7
Al ejecutar `npx prisma generate` sin versión fijada en `package.json`, se instaló automáticamente la última versión (Prisma 7.8.0, lanzada en noviembre de 2025). Esta versión eliminó el soporte de `url = env("DATABASE_URL")` directamente en `schema.prisma`, exigiendo un archivo `prisma.config.ts` aparte y adaptadores de conexión (driver adapters) obligatorios para instanciar el cliente.

**Solución:** se fijó la versión 6 de forma explícita:
```bash
npm install prisma@6 @prisma/client@6 --save-exact
```
Para un proyecto universitario con plazos ajustados, migrar a la arquitectura de Prisma 7 no compensaba frente a simplemente fijar una versión estable y probada.

### Entrypoint de migraciones
`entrypoint.sh` en el backend ejecuta `npx prisma migrate deploy` antes de arrancar la aplicación (`exec "$@"` al final, mismo patrón que en nginx). Esto asegura que cualquier persona del equipo que levante el proyecto tenga automáticamente la última versión del esquema de base de datos aplicada, sin pasos manuales.

---

## 4. Módulo de autenticación (Auth)

### Esquema de base de datos (Prisma)
- `User`: email, passwordHash (nunca se guarda la contraseña en texto plano), displayName, avatarUrl, timestamps
- `RefreshToken`: token, relación con User, fecha de expiración, flag `revoked` — permite revocar sesiones individuales sin afectar a las demás

### Arquitectura de tokens: access + refresh
- **Access token** (JWT, 15 min): se usa en cada petición a la API, vida corta para minimizar el riesgo si es robado
- **Refresh token** (string aleatorio, 7 días): se usa únicamente para obtener un nuevo access token; se almacena en base de datos (no es JWT) para poder revocarlo individualmente
- **Rotación**: cada vez que se usa un refresh token para renovar, ese token se marca como revocado y se emite uno nuevo — dificulta el reuso de un token robado

### PrismaService / PrismaModule
Envoltorio inyectable (`@Injectable()`) sobre `PrismaClient`, marcado como `@Global()` para estar disponible en toda la aplicación sin reimportar el módulo en cada feature.

### AuthService — lógica
- `register`: verifica email único, hashea con bcrypt (`SALT_ROUNDS = 12`), emite tokens
- `login`: mismo mensaje de error tanto si el email no existe como si la contraseña es incorrecta, para no filtrar qué emails están registrados
- `refresh`: valida el token contra la base de datos (existencia, no revocado, no expirado), rota el token
- `logout`: revoca el refresh token en base de datos

### Refresh token vía httpOnly cookie (decisión de seguridad importante)
Inicialmente el refresh token se devolvía en el cuerpo JSON de la respuesta — esto lo hace accesible desde JavaScript en el navegador, anulando la protección contra robo de tokens vía XSS.

**Corrección:** el refresh token se envía ahora como cookie `httpOnly` (inaccesible desde JavaScript), con:
- `secure: true` — solo se envía por HTTPS
- `sameSite: 'strict'` — protección contra CSRF
- `path: '/api/auth'` — la cookie solo se adjunta a las rutas de autenticación, no a toda la aplicación

Requirió instalar `cookie-parser` y activarlo en `main.ts` con `app.use(cookieParser())`.

**Nota de sintaxis TypeScript:** `import cookieParser from 'cookie-parser'` (no `import * as cookieParser`) — este último genera un error de tipos porque `cookie-parser` es un módulo CommonJS y un import de tipo namespace no se puede invocar como función. Con `esModuleInterop: true` (activado por defecto por Nest CLI), el import por defecto funciona correctamente.

### Fail-fast en refresh/logout
Se añadió una comprobación explícita de que el token exista **antes** de consultar la base de datos:
```typescript
if (!rawToken) {
  throw new UnauthorizedException('No refresh token provided');
}
```
Sin esto, Prisma lanzaba un `PrismaClientValidationError` (500 Internal Server Error) al recibir `where: { token: undefined }`, en lugar del `401 Unauthorized` que corresponde semánticamente al caso.

### JwtStrategy — detalle de tipado
`process.env.JWT_SECRET` tiene el tipo `string | undefined` en TypeScript, pero `passport-jwt` exige `string`. Se optó por una comprobación explícita con `throw` en el constructor (falla rápido con mensaje claro si falta la variable de entorno) en vez de silenciar el error con `!` (non-null assertion), que oculta el problema en tiempo de compilación pero deja que falle de forma críptica en tiempo de ejecución si la variable realmente no está definida.

### UsersModule — primera ruta protegida
`GET /users/me`, protegida con `@UseGuards(JwtAuthGuard)`. Flujo completo:
1. Petición con cabecera `Authorization: Bearer <token>`
2. `JwtAuthGuard` ejecuta `JwtStrategy`, que extrae y valida el token
3. Si es válido, `validate()` devuelve `{ userId, email }`, inyectado en `req.user`
4. El controlador usa `req.user.userId` para buscar el perfil

---

## 5. Verificación end-to-end

Todo el ciclo se probó manualmente con `curl` (con flags `-k` para el certificado autofirmado, `-c`/`-b` para gestionar cookies) y posteriormente también con Insomnia:

1. `POST /auth/register` → `201 Created`
2. `POST /auth/login` → `200 OK`
3. `POST /auth/register` (email duplicado) → `409 Conflict`
4. `GET /users/me` sin token → `401 Unauthorized`
5. `GET /users/me` con token válido → `200 OK` con datos del perfil
6. `POST /auth/refresh` con cookie válida → `200 OK`, nueva cookie emitida
7. `POST /auth/logout` → `204 No Content`, cookie invalidada, token marcado como revocado en base de datos

---

## 6. Estado actual y pendientes

### Completado
- Infraestructura Docker completa y estable (postgres, backend, frontend, nginx, HTTPS)
- Módulo de autenticación backend: registro, login, refresh con rotación, logout con revocación
- Primera ruta protegida (`GET /users/me`)

### Pendiente (requisitos obligatorios del enunciado)
- **Formularios de frontend** para registro/login — todavía no existe ninguna pantalla de React para esto
- **Validación en frontend** — el enunciado exige validación tanto en frontend como en backend; solo tenemos la de backend

### Pendiente (deuda técnica / buenas prácticas)
- Rate limiting en `/auth/login` (actualmente sin protección contra fuerza bruta)
- Limpieza periódica de refresh tokens expirados/revocados en la base de datos

### Pendiente (módulos bonus relacionados con Auth)
- 2FA
- OAuth con 42 intra
- Sistema de permisos avanzado (roles)

### Próximo paso sugerido
Decidir entre completar los formularios de frontend para Auth (para tener un flujo funcional de extremo a extremo) o continuar con el backend (`UsersModule` con perfil, avatar, sistema de amigos) antes de volver al frontend.
