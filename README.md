# ft_transcendence — Notas de progreso 

## 🚀 Como comenzar a trabajar (Quick Start)
 
Sigue estos sencillos pasos para clonar el repositorio, configurar tu entorno y levantar el proyecto en local:
 
### A. Clonar el repositorio
 
Clona el proyecto en tu máquina local y accede a la carpeta raíz:
```bash
git clone <URL_DE_TU_REPOSITORIO>
cd <NOMBRE_DE_LA_CARPETA>
```
 
### B. Configurar las variables de entorno
 
Cada desarrollador debe tener su propio archivo de configuración local. Copia el archivo de plantilla .env.example y renómbralo a .env:
```bash
cp .env.example .env
```
 
⚠️ **Importante**: Abre el archivo .env recién creado y define tus propias contraseñas, credenciales de la base de datos y la clave secreta para los tokens (JWT_SECRET). Nunca subas tu archivo .env personal al repositorio.
 
#### 📝 Configuración del archivo `.env`
 
Cuando copies el archivo `.env.example` a `.env`, verás las siguientes variables. Aquí tienes qué significa cada una y qué debes cambiar:
 
| Variable | Valor por defecto | ¿Qué debes hacer? |
| :--- | :--- | :--- |
| `POSTGRES_USER` | `ft_user` | Puedes dejarlo por defecto para desarrollo local. |
| `POSTGRES_PASSWORD` | `change_me` | **¡CÁMBIALO!** Pon una contraseña segura para tu base de datos local, sin caracteres especiales como `@ : / # ?` (ej. `mi_super_clave_123`). |
| `POSTGRES_DB` | `ft_transcendence`| Puedes dejarlo por defecto. Es el nombre de la base de datos que se creará automáticamente en PostgreSQL. |
| `JWT_SECRET` | `change_me_access_secret` | **¡CÁMBIALO!** Genera una cadena de texto larga y aleatoria. Se usa para firmar los Access Tokens (15 min). |
| `JWT_REFRESH_SECRET` | `change_me_refresh_secret` | **¡CÁMBIALO!** Genera otra cadena de texto aleatoria distinta a la anterior. Se usa para firmar los Refresh Tokens (7 días). |
| `NODE_ENV` | `development` | Déjalo en `development` para habilitar los logs detallados y el modo de recarga rápida (watch mode) en NestJS. |
| `VITE_API_URL` | `https://localhost/api` | Déjalo así. Es la URL que usará el Frontend (Vite) para comunicarse con el Backend a través del puerto seguro de Nginx. |
| `GROQ_API_KEY` | *(vacío)* | **¡OBLIGATORIO Y PERSONAL!** Cada desarrollador debe generar su propia clave gratuita — ver instrucciones abajo. Nunca la compartas ni la subas al repositorio. |
| `GROQ_MODEL` | `openai/gpt-oss-20b` | Puedes dejarlo por defecto. Si este modelo queda retirado por Groq en el futuro, cámbialo aquí sin tocar el código — consulta los modelos disponibles en console.groq.com. |
 
> 🔑 **Tip para generar secretos seguros:**
Puedes generar claves aleatorias fuertes rápidamente desde tu terminal ejecutando:
```bash
openssl rand -base64 32
```
Copia el resultado y pégalo en tu `JWT_SECRET` y `JWT_REFRESH_SECRET`.
 
#### 🤖 Obtener tu propia clave de Groq API
 
**Por qué cada uno necesita su propia clave, y no una compartida:**
- **Cuota limitada por clave**: el nivel gratuito de Groq tiene un límite de peticiones. Si todo el equipo usa la misma clave, esa cuota se agota mucho más rápido y unos bloquean el trabajo de otros.
- **Seguridad**: una clave compartida por chat/Slack/lo que sea es una clave que tarde o temprano se filtra por accidente. Cada clave está vinculada a la cuenta de quien la crea — mejor que sea tu propia responsabilidad, no la de otro.
**Cómo conseguirla (gratis, sin tarjeta, 2 minutos):**
1. Entra en console.groq.com y crea una cuenta o inicia sesión
2. Crea una API key nueva
3. Copia la clave generada y pégala en tu `.env` local como `GROQ_API_KEY`

### C. Levantar el proyecto
 
El `Makefile` detecta automáticamente si tu sistema usa `docker-compose` (el binario clásico, con guion) o `docker compose` (el plugin moderno, con espacio) — no hace falta configurar nada a mano para eso. También comprueba, antes de ejecutar cualquier otra cosa, que Docker esté instalado y que tu usuario tenga permiso para hablar con el daemon; si algo falla en cualquiera de esos dos puntos, verás un mensaje explicando exactamente qué hacer, en vez de un error críptico.
 
**Primera vez que levantas el proyecto en un ordenador nuevo:**
```bash
make first-run
```
Este comando fuerza una reconstrucción completa sin caché. Es importante usarlo (en vez de `make up`) la primera vez en cada máquina nueva: evita que Docker reutilice, por error, una capa de instalación de dependencias antigua o incompleta de algún intento anterior, lo que podría dejar el backend sin paquetes que en realidad ya están en `package.json`.
 
**En el día a día, una vez que el proyecto ya está levantado al menos una vez en esa máquina:**
```bash
make up
```
 
**Si en algún momento el proyecto se comporta de forma rara** (dependencias que "deberían estar" pero no aparecen, comportamiento inconsistente tras instalar un paquete nuevo), repetir `make first-run` suele resolverlo — vuelve a construir todo desde cero sin depender de ninguna caché previa.
 
### Guía de comandos del `Makefile`
 
Referencia rápida de cada comando disponible y cuándo usar cada uno.
 
#### `make` / `make all` / `make up`
 
El comando del día a día. Levanta todos los contenedores, reconstruyéndolos si el código ha cambiado desde la última vez. Al final, reinicia automáticamente `nginx` — esto evita un error `502 Bad Gateway` que puede aparecer si solo se reconstruyó un servicio (por ejemplo el backend) y nginx se quedó con la dirección de red antigua de ese contenedor. No hace falta preocuparse por eso: ya está resuelto dentro de este mismo comando.
 
```bash
make
```
 
#### `make first-run`
 
Úsalo la primera vez que levantas el proyecto en un ordenador nuevo (o si algo se comporta de forma rara y sospechas de una caché de Docker corrupta). Reconstruye todo desde cero, sin usar ninguna capa de construcción guardada previamente — más lento, pero garantiza que no arrastras nada de un intento anterior fallido.
 
```bash
make first-run
```
 
#### `make down`
 
Detiene todos los contenedores sin borrar nada — ni el código, ni los datos de la base de datos. La próxima vez que hagas `make up`, todo sigue donde lo dejaste.
 
```bash
make down
```
 
#### `make logs`
 
Muestra los logs en tiempo real de todos los contenedores a la vez. Útil para ver qué está pasando sin tener que parar y volver a levantar el proyecto.
 
```bash
make logs
```
 
#### `make db-migrate`
 
Úsalo después de un `git pull` si alguien del equipo ha cambiado el esquema de la base de datos (`schema.prisma`) y ha subido una migración nueva. Aplica las migraciones que ya existen como archivos en el repositorio — no crea nada nuevo, solo pone tu base de datos local al día con lo que otros ya definieron.
 
```bash
make db-migrate
```
 
#### `make db-migrate-dev name=nombre_descriptivo`
 
Úsalo cuando tú mismo cambias `schema.prisma` (añades un campo, una tabla, etc.) y necesitas generar la migración correspondiente. Requiere un nombre descriptivo — se guardará como parte del nombre del archivo de migración, así que conviene que explique brevemente qué cambia.
 
```bash
make db-migrate-dev name=add_articles
```
 
#### `make db-studio`
 
Abre Prisma Studio, una interfaz visual en el navegador para explorar y editar directamente el contenido de la base de datos — útil para revisar datos sin escribir SQL a mano.
 
```bash
make db-studio
```
 
#### `make clean`
 
Detiene los contenedores y borra los volúmenes del proyecto — esto incluye la base de datos. Los datos se pierden, pero las imágenes de Docker ya construidas se conservan (la siguiente reconstrucción es más rápida que con `fclean`).
 
```bash
make clean
```
 
#### `make fclean`
 
Limpieza profunda: además de todo lo que hace `clean`, borra también las imágenes de Docker del proyecto. La siguiente vez que levantes el proyecto, se reconstruye todo desde cero.
 
```bash
make fclean
```
 
#### `make re`
 
El "reinicio total": ejecuta `fclean` y luego `all` — borra absolutamente todo (contenedores, volúmenes, imágenes) y vuelve a levantar el proyecto de cero, exactamente igual que `first-run`. Úsalo cuando quieras empezar de página en blanco sin salir del propio Makefile.
 
```bash
make re
```
 
### Comprobaciones automáticas al ejecutar cualquier comando
 
Antes de ejecutar cualquiera de las reglas anteriores, el `Makefile` comprueba dos cosas y avisa con un mensaje claro si algo falla:
 
1. **¿Está Docker instalado en esta máquina?** Si no, indica el enlace de instalación.
2. **¿Tiene tu usuario permiso para hablar con Docker?** Si no (típico si acabas de instalar Docker o de añadirte al grupo `docker`), te indica que cierres sesión y vuelvas a entrar, o que ejecutes `newgrp docker` como solución rápida sin reiniciar.

# Cómo asignar el primer ARZOBISPO
 
Este es un procedimiento de arranque único: cambiar el rango de alguien solo se puede hacer desde el panel `/santuario`, pero ese panel solo es accesible para quien ya tiene el rango `ARZOBISPO` — así que el primer `ARZOBISPO` de cada base de datos nueva (por ejemplo, después de un `prisma migrate reset`, o al levantar el proyecto por primera vez en tu máquina) hay que asignarlo a mano, directamente en la base de datos.
 
## Paso 1 — Regístrate normalmente en la aplicación
 
Si todavía no tienes cuenta en esta base de datos, entra en la web y regístrate como lo haría cualquier hermano — por defecto, todo el mundo empieza con el rango `HERMANO`.
 
## Paso 2 — Averigua tu `id`
 
```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "SELECT id, email, role FROM \"User\";"
```
 
Sustituye `<POSTGRES_USER>` y `<POSTGRES_DB>` por los valores reales de tu archivo `.env`. Verás una tabla con todos los usuarios registrados — anota el `id` de tu propia cuenta (identifícala por el email).
 
## Paso 3 — Súbete el rango a `ARZOBISPO`
 
```bash
docker compose exec postgres psql -U <POSTGRES_USER> -d <POSTGRES_DB> -c "UPDATE \"User\" SET role = 'ARZOBISPO' WHERE id = <tu_id>;"
```
 
Sustituye `<tu_id>` por el número que anotaste en el paso anterior.
 
## Paso 4 — Vuelve a iniciar sesión
 
Cierra sesión y vuelve a entrar (o simplemente espera a que `/altar` vuelva a pedir tus datos, lo que ocurre en cada carga de la página). Debería aparecerte el botón "Santuario".
 
## A partir de aquí
 
Ya no hace falta tocar la base de datos a mano nunca más — desde `/santuario` puedes cambiar el rango de cualquier usuario (incluido a `INQUISIDOR`) directamente desde la interfaz.
 
> 💡 Cuándo necesitarás repetir este proceso: cada vez que se reinicie la base de datos desde cero (`prisma migrate reset`, `make clean`, `make fclean`, `make re`) — todos los rangos se pierden junto con el resto de los datos, así que el primer `ARZOBISPO` siempre hay que crearlo así.

---


## 1. Idea y planificación

### Concepto del proyecto
Red social de "feligreses": perfiles de usuario, sistema de rangos/roles jerárquicos, chat en tiempo real, donaciones, y más adelante un chatbot basado en LLM (preferible) y un juego de cartas (opcional).

[Concepto detallado y funcionalidades posibles](./docs/concepto.md)

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
├── Makefile
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

### HTTPS con certificado autofirmado
- Nginx reescrito con **Dockerfile propio** (no imagen directa) para incluir un script de entrypoint
- `entrypoint.sh`: genera el certificado (`openssl req -x509 ...`) solo si no existe ya en el volumen — así no se regenera en cada reinicio, pero sí automáticamente en cualquier máquina nueva del equipo
- Detalle técnico importante: `exec nginx -g "daemon off;"` al final del script — sustituye el proceso shell por el proceso de nginx en el mismo PID, para que las señales de apagado de Docker (`SIGTERM`) lleguen correctamente

### Configuración de Nginx (`conf.d/default.conf`)
Tres bloques `location`:
- `/api/` → `backend:3000`
- `/socket.io/` → `backend:3000`, con cabeceras `Upgrade`/`Connection` (imprescindibles para que la conexión HTTP se transforme en WebSocket) y timeouts largos (86400s, ya que las conexiones WS son de larga duración)
- `/` → `frontend:5173`, también con cabeceras de Upgrade — necesario para el Hot Module Replacement de Vite, que también usa WebSocket internamente

[Update Makefile. El problema de docker-compose vs docker compose y la solucion](./docs/docs-makefile-update.md)

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

## BACKEND:

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

[UPDATE of UsersModule](./docs/docs-users-avatar.md)

[FriendsModule](./docs/docs-friends-module.md)

[ChatModule](./docs/docs-chat-module.md)

[AdminModule backend part](./docs/docs-roles-module-back.md)

[AiModule](./docs/docs-ai-module.md)

[CommunityModule](./docs/docs-community-events.md)

---

## FRONTEND:

[Notas de trabajo AUTH Frontend part](./docs/frontend-auth-notas.md)

### Renovación automática del Access Token

[El problema y la solucion](./docs/access-token-refresh.md)

### TailwindCSS

[TailwindCSS y paleta de colores principal](./docs/docs-tailwind-paleta.md)

### Chat

[ChatModule Frontend part](./docs/docs-chat-frontend.md)

[Online status](./docs/docs-online-status.md)

[Update LandingPage](./docs/docs-landing-page.md)

[Politica de privacidad y Terminos de uso](./docs/docs-privacy-terms.md )

[AdminModule frontend part](./docs/docs-admin-frontend.md)

[AiModule front part](./docs/docs-ai-frontend.md)


---
---

[+ Perfil, update friendlist, clicables nombres, coversaciones](./docs/docs-perfil-amigos-chat.md)

[+ PWA Manifest](./docs/docs-pwa-manifest.md)

[+ Migration to Groq, +slowdown out text in Confesor](./docs/docs-groq-migration.md)

[+ Fix bug in chat room with msg in Conversaciones](./docs/docs-bug-dm-rooms.md)

[+ Design System — componentes reutilizables](./docs/docs-design-system.md)

[+ Varias mejoras: roles en vivo, amistad como privilegio y nombres temáticos](./docs/docs-mejoras-coherencia.md)

[+ Fix routes, backlink](./docs/docs-routes-backlink.md)

[+ Notification system. Back + Front](./docs/docs-notifications.md)

[+ Attachment in chat](./docs/docs-chat-attachments.md)

[+ Fix chat's urls](./docs/docs-chat-url-sync.md)

[+ Soft delete, Guardian->Inquisidor](./docs/docs-inquisidor-soft-delete.md)

[+ Gender, default avatar, bell](./docs/docs-gender-avatar-bell.md)

[+ Articulos](./docs/docs-biblioteca.md)
[+ Articulos fix some issues](./docs/docs-biblioteca-fixes.md)

[+ Internacionalización](./docs/docs-i18n-resumen.md)

[+ Translate CommunityEvent widget](./docs/docs-community-event-multilang.md)

[+ Translate Notifications and Error messages](./docs/docs-notifications-errors-multilang.md)

[+ Translate LLM](./docs/docs-llm-i18n.md)

[+ RTL support](./docs/docs-rtl-mirroring.md)

[+ Unique names, user delete](./docs/docs-unique-names-user-execution.md)

[+ Admin presence notification in chat, notification about private msg](./docs/docs-admin-presence-private-msg-notification.md)

[+ default confirm() window -> our custom window](./docs/docs-custom-confirm-dialog.md)

[+ Self protection of the last admin](./docs/docs-santuario-self-protection.md)

[+ Autenticación remota con OAuth 2.0 — Inicio de sesión con 42](./docs/docs-oauth-42.md)

[+ Organizations](./docs/docs-organizations-feature.md)

[+ Orgs Done](./docs/docs-organizations-feature-DONE.md)

### WCAG 2.1 AA

- [WCAG AA: keyboard navigation](./docs/WCAG-AA-keyboard-navigation.md)

- [WCAG AA: aria-labels](./docs/WCAG-AA-aria-labels.md)

- [WCAG AA: aria-live](./docs/WCAG-AA-aria-live.md)

- [WCAG AA: alt text](./docs/WCAG-AA-alt-text.md)

- [WCAG AA: summary](./docs/WCAG-AA-summary.md)


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

## 6. Estado actual y los puntos acumulados.
[Estado actualizado para 20.08.26](./docs/estado-actualizado.md)

## 7. Deudas.
[CommunityEvent. LLM and DB](./docs/docs-deuda-community-event.md)
