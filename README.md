# 🛠️ Notas del trabajo

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

> 🔑 **Pro Tip para generar secretos seguros:**  
Puedes generar claves aleatorias fuertes rápidamente desde tu terminal ejecutando:
```bash
openssl rand -base64 32
```
Copia el resultado y pégalo en tu `JWT_SECRET` y `JWT_REFRESH_SECRET`.

### C. Levantar la infraestructura con Docker
Gracias a Docker y a nuestro Makefile, no necesitas instalar Node.js, NestJS ni PostgreSQL en tu sistema local. Solo asegúrate de tener Docker instalado y ejecutándose, luego lanza el comando:
```bash
make
```
(O `make re` si necesitas realizar una limpieza completa y reconstruir los contenedores desde cero).

### D. Ejecutar las migraciones de la base de datos
Una vez que los contenedores estén levantados y en funcionamiento (puedes ver que el backend dice Nest application successfully started), abre una nueva terminal y sincroniza la estructura de la base de datos:
```bash
docker compose exec backend npx prisma migrate dev
```

¡Y listo! El backend estará escuchando a través del proxy de Nginx en https://localhost:8443/api (no olvides usar la opción -k o ignorar la advertencia de certificado SSL autofirmado en tu navegador o cliente de API).

---

#  Arquitectura y Stack

**Tema**: red social "Iglesia del Verdadero Relink" — perfiles, rangos/roles, chat, donaciones, más adelante bot LLM (preferible) y juego de cartas (como opcion).

**Stack**:
- **Backend**: NestJS
- **Frontend**: React + TypeScript + Vite
- **Base de datos**: PostgreSQL + Prisma ORM
- **Tiempo real**: Socket.IO
- **Infraestructura**: Docker Compose + Nginx

**Plan modular para bonificaciones**: ~28+ puntos sin el juego (Web, User Management, AI, Data & Analytics, DevOps). El juego se abordará en una fase posterior.

---

#  Docker Compose — Infraestructura base

**docker-compose.yml**: servicios `postgres`, `backend`, `frontend`, `nginx`; red común `ft_network`.

**Variables de entorno**:  
- Archivo `.env` (no se sube al repositorio) y `.env.example` (plantilla que sí se commitea).

### Correcciones clave durante el desarrollo

- **`target: development`** es obligatorio en el apartado `build:` para backend y frontend; de lo contrario, Docker toma la última etapa (stage) sin el `CMD` adecuado.

- **Healthcheck de Postgres**:
```yaml
  test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
```
(Inicialmente se producía el error database "ft_user" does not exist porque pg_isready usaba por defecto la base de datos con el nombre del usuario, no la base de datos real.)

Puertos de Nginx: se usan 8080:80 y 8443:443 en lugar de 80:80 y 443:443, porque en el campus no se dispone de sudo y los puertos privilegiados (<1024) no son accesibles en Docker sin permisos de root.

# 🖥️ Backend (NestJS + Prisma)

## 1. ¿Qué es el Backend y cuál es su función?

El **Backend** es el motor central de nuestra plataforma. Mientras que el Frontend se encarga de pintar la interfaz y capturar los clics del usuario, el Backend es el cerebro que gestiona las reglas de negocio, protege los datos y mantiene el estado del sistema en tiempo real.

En nuestro ecosistema, el backend cumple las siguientes funciones críticas:
*   **Gestión de Datos (API REST & Prisma ORM):** Controla el acceso a la base de datos PostgreSQL, garantizando que la información de los usuarios, partidas y chats se guarde y consulte de forma segura.
*   **Autenticación y Seguridad (JWT):** Valida la identidad de los usuarios, gestiona el inicio de sesión (incluyendo el flujo de OAuth2 con la API de 42) y protege las rutas del sistema para que nadie pueda suplantar a otro jugador.
*   **Comunicación en Tiempo Real (WebSockets):** Soporta el tráfico de baja latencia necesario para el juego del Pong en vivo, el emparejamiento (matchmaking) y el chat en tiempo real.

---

## 2. Estructura de Archivos del Proyecto (Raíz del Backend)

Para mantener el proyecto limpio y escalable, la raíz de nuestro directorio `backend/` está organizada de la siguiente manera:

```text
backend/
├── dist/                  # Código TypeScript compilado a JavaScript (generado automáticamente)
├── node_modules/          # Dependencias de Node.js instaladas por npm
├── prisma/                # Configuración de la base de datos (schema.prisma y migraciones)
├── src/                   # El código fuente de nuestra aplicación (lógica del backend)
├── test/                  # Pruebas integradas y de extremo a extremo (E2E)
├── Dockerfile             # Receta para construir la imagen de Docker del backend
├── entrypoint.sh          # Script de arranque del contenedor (aplica migraciones y levanta NestJS)
├── eslint.config.mjs      # Reglas de linter para mantener la calidad y estilo del código
├── nest-cli.json          # Configuración de la interfaz de comandos (CLI) de NestJS
├── package.json           # Dependencias del proyecto y scripts de ejecución (start, build, etc.)
├── package-lock.json      # Registro exacto de las versiones de las dependencias instaladas
├── tsconfig.json          # Configuración principal del compilador de TypeScript
└── tsconfig.build.json    # Configuración de TypeScript específica para el build de producción 
```
### Dockerfile:

**Multi-stage**:
- `development`: hot-reload mediante `npm run start:dev --watch`
- `production`: compilación para futuros despliegues

**Detalles importantes**:

- `apk add openssl` — obligatorio para el motor de consultas (query engine) de Prisma en Alpine; sin esto, `prisma generate` falla.

- `app.listen(port, '0.0.0.0')` — imprescindible; de lo contrario, el backend no es accesible desde la red de contenedores.

- **Prisma fijado a la versión 6** (`--save-exact`): Prisma 7 (lanzada en noviembre de 2025) rompió la sintaxis `url = env("DATABASE_URL")` en `schema.prisma`, exigiendo `prisma.config.ts` y adaptadores de driver.

### Entrypoint.sh

**Script de entrada (entrypoint.sh)**: ejecuta `prisma migrate deploy` antes de iniciar la aplicación. Se usa `exec "$@"` para garantizar que las señales se transmitan correctamente al proceso principal.



## 3. Anatomía de src/ (El corazón de la aplicación)

Dentro de la carpeta src/ es donde ocurre toda la magia de NestJS. Está modularizada para que cada recurso (usuarios, autenticación, etc.) tenga su propio espacio aislado:

```text
src/
├── auth/                  # Módulo de Autenticación (Login, JWT, Registro, 42 OAuth)
├── users/                 # Módulo de Usuarios (Perfiles, base de datos, relaciones)
├── prisma/                # Servicio y módulo global para conectar NestJS con Prisma Client
├── app.controller.ts      # Controlador raíz (gestiona peticiones HTTP genéricas de prueba)
├── app.controller.spec.ts # Pruebas unitarias para el controlador raíz
├── app.module.ts          # El módulo principal que orquesta e importa todo el sistema
├── app.service.ts         # Lógica de negocio básica para el módulo raíz
└── main.ts                # El punto de entrada oficial que levanta el servidor NestJS
```


---
##  Módulo de autenticación (Auth) — recién implementado

**Esquema Prisma**:
- Modelos `User` y `RefreshToken` (relación uno-a-muchos, con revocación de tokens).

**PrismaModule / PrismaService**:
- Capa de inyección de dependencias (DI) sobre el cliente de Prisma.
- Decorador `@Global()` para no tener que importarlo en cada módulo.

**AuthModule**:
- Endpoints: `register`, `login`, `refresh`, `logout`.

**Tokens**:
- **Access token**: JWT con validez de 15 minutos.
- **Refresh token**: cadena aleatoria, válida durante 7 días, almacenada en la base de datos con soporte para revocación y rotación.

**Cifrado**:
- `bcrypt` con `SALT_ROUNDS = 12`.

## Sobre los certificados

La configuración hace referencia a `/etc/nginx/certs/nginx.crt` y `nginx.key`, pero los archivos todavía no existen.

Para el desarrollo local se necesita un certificado **self-signed** (autofirmado), similar al que ya creaste en el proyecto *inception* para WordPress.

**Comando:**

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
-keyout nginx/certs/nginx.key \
-out nginx/certs/nginx.crt \
-subj "/C=ES/ST=Catalonia/L=Barcelona/O=42/CN=localhost"
```

* `req -x509` — Indica a la utilidad que queremos crear precisamente un certificado autofirmado con estructura **X.509** (el estándar para la seguridad web), y no simplemente una solicitud de firma (CSR) para enviarla a una autoridad de certificación externa.

* `-nodes` (se lee *no-DES*) — Este flag desactiva el cifrado de la clave privada con contraseña. Si no se incluye, cada vez que se reinicie el contenedor de Docker, Nginx se bloqueará completamente y pedirá que se introduzca la contraseña en la consola. Para la automatización en Docker, el parámetro `-nodes` es obligatorio.

* `-days 365` — Período de validez del «pasaporte digital» de tu sitio. Exactamente dentro de un año se convertirá en calabaza, pero para proteger el proyecto en el campus es más que suficiente.

* `-newkey rsa:2048` — Genera simultáneamente con el certificado una nueva clave privada mediante el algoritmo RSA de 2048 bits (el estándar de oro de la criptografía).

* `-keyout` y `-out` — Rutas donde se guardarán físicamente la clave privada (`.key`) y el propio certificado público (`.crt`).

* `-subj` — Campos del sujeto (información sobre el propietario). Aquí tu compañera incluyó muy bien la ubicación de Barcelona y del campus:

  - `C=ES` (Country — España)
  - `ST=Catalonia` (State/Region — Cataluña)
  - `L=Barcelona` (Locality — Barcelona)
  - `O=42` (Organization — Escuela 42)
  - `CN=localhost` (Common Name — nombre de dominio para el que se emite el certificado).

El navegador mostrará el aviso «conexión no segura» (porque el certificado es autofirmado y no proviene de una CA de confianza). Esto es normal en entornos de desarrollo: simplemente pulsa «continuar» una vez en el navegador.

Para evitar tener que ejecutar manualmente el comando openssl cada vez en un nuevo ordenador, podemos hacer que Docker lo haga automáticamente durante la construcción del contenedor Nginx, generando el certificado directamente en la etapa de construcción de la imagen (`RUN openssl...` en el Dockerfile).

Para ello, incluiremos la creación de los certificados directamente en el Dockerfile de Nginx.

Pero, ¿cuál es el problema de este enfoque?

La imagen se construye una sola vez. Esto significa que la fecha de emisión del certificado queda «cocida» de forma inmutable en esa imagen. Si alguien descarga la imagen construida seis meses después, a su certificado le quedará solo la mitad de su vida útil. Y si despliegas el proyecto en un servidor de producción, todos tendrían exactamente la misma clave privada, lo cual, desde el punto de vista de la seguridad, es un desastre absoluto.

Haremos lo siguiente (esta es una solución **Production-Ready** a nivel de un sólido ingeniero Senior DevOps):

Trasladar la generación a la etapa de arranque del contenedor (**Runtime**) mediante un script de entrypoint que genera el certificado al iniciar el contenedor:

1. La primera vez, el script `make` detecta que la carpeta está vacía y genera una clave fresca y única para esa máquina concreta.
2. En todos los reinicios posteriores (o si el contenedor cae y se levanta de nuevo), la condición `if [ ! -f ... ]` comprueba si los archivos ya existen, los detecta y no pierde tiempo regenerándolos. Un verdadero enfoque cuidadoso con los recursos del sistema.

Este script se ejecuta en cada arranque del contenedor (no durante la construcción de la imagen). Comprueba «¿el certificado ya existe?»: si no existe, lo genera; si ya existe, simplemente inicia nginx.

De esta forma el certificado vive en un volumen en el host (ya estamos montando `./nginx/certs`), se genera una sola vez en la máquina concreta del desarrollador y se reutiliza entre reinicios del contenedor. Al mismo tiempo, el proceso es completamente automático para una persona nueva en el equipo: basta con hacer `docker compose up` y todo se crea solo.

Es el mismo patrón que discutimos para las migraciones de Prisma (punto 3 de «la amiga»): un script de entrypoint que prepara algo antes de iniciar el proceso principal. Es lógico hacer ambos de esta manera, ya que hemos llegado a esta solución.

## Análisis de varios puntos del código (se trata del Dockerfile de nginx y el pequeño script entrypoint.sh)

1) `exec nginx -g "daemon off;"` — es un detalle importante sin el cual tendrás problemas con el *graceful shutdown*.

Si simplemente llamas a `nginx -g "daemon off;"` sin `exec`, este comando se ejecutará como un proceso hijo de tu script shell, y el PID 1 del contenedor seguirá perteneciendo al propio shell.

Docker envía SIGTERM precisamente al PID 1 al detener el contenedor. Si ese proceso es el shell en lugar de nginx, la señal puede no llegar correctamente a nginx, y Docker esperará el timeout para luego matar el contenedor de forma brusca (SIGKILL). El `exec` reemplaza el proceso shell por el proceso nginx en el mismo PID, por lo que las señales llegan exactamente donde deben.

Otra vez:

- Cuando Docker inicia el contenedor, el proceso indicado en `ENTRYPOINT` recibe el **PID = 1** (proceso principal del sistema, análogo a init en Linux).
- Si pones simplemente `nginx`: tu script `entrypoint.sh` seguirá funcionando como PID 1. Cuando ejecutes `docker-compose down` (o `make down`), Docker enviará la señal SIGTERM al proceso PID 1. Pero un script bash/sh normal **no reenvía señales** a sus procesos hijos. Como resultado, Nginx ni siquiera se enterará de que quieren cerrarlo. Seguirá funcionando hasta que a Docker se le acabe la paciencia (normalmente 10 segundos), después de lo cual Docker matará el contenedor de forma brusca con SIGKILL. Para una base de datos esto significaría pérdida de datos, para Nginx — logs corruptos.
- Qué hace `exec`: En C el equivalente es la llamada al sistema `execve()`. No crea un nuevo proceso. Toma el proceso actual (PID 1, nuestro script) y reemplaza completamente su código en memoria por el código de Nginx. El script muere y Nginx se convierte en el propietario del PID 1. Ahora todas las señales SIGTERM llegan directamente a Nginx, que tiene tiempo de cerrar todas las conexiones de red, terminar de escribir los logs y finalizar correctamente el trabajo (**graceful shutdown**) en fracciones de segundo.

2) `RUN apk add --no-cache openssl` — la imagen `nginx:alpine` es minimalista, y openssl no viene instalado por defecto (aunque mucha gente espera que esté «como en un Linux normal»). El flag `--no-cache` evita que Alpine guarde la caché del gestor de paquetes dentro de la capa de la imagen, ahorrando espacio.

3) Los permisos del `entrypoint.sh` mediante `RUN chmod +x` — la misma lógica que con la propiedad de archivos por UID de la que hablamos antes: el script debe ser ejecutable dentro de la imagen. Esta es una acción independiente de simplemente copiar el archivo.

---
---

## ============ AUTH MODULE =============

### -------- ACCESS TOKEN + REFRESH TOKEN

Añadimos en `schema.prisma` la parte del refresh token. Implementamos el modelo: **access token + refresh token**.

¿Por qué dos tokens y no uno solo?

Si tuvieras un único JWT de larga duración (por ejemplo, de una semana), en caso de robo del token (XSS, interceptación de tráfico) el atacante tendría acceso durante toda una semana, y no podrías revocarlo antes de tiempo. Esto se debe a que un JWT es, por naturaleza, un trozo de datos firmado y autosuficiente: el servidor no almacena una lista de tokens «vivos» y no puede decir «este ya no es válido» sin una infraestructura adicional.

La solución es separar las responsabilidades:

- **Access token** — vive muy poco tiempo (15-30 minutos) y se utiliza en cada petición API. Aunque lo roben, la ventana de ataque es muy pequeña.

- **Refresh token** — vive mucho tiempo (días/semanas), pero se usa solo para una cosa: obtener un nuevo access token cuando el anterior ha expirado. Se almacena por separado, normalmente en una cookie `httpOnly` (inaccesible desde JavaScript, por lo tanto protegida contra ataques XSS).


### Flujo de trabajo (simulación)

El usuario se loguea (email + password) → el backend verifica el hash de la contraseña con bcrypt → devuelve un par de tokens: **access** (corto) + **refresh** (largo).

El cliente guarda el access token en memoria (o en el header Authorization) y el refresh token en una cookie **httpOnly**.

Cada petición a un endpoint protegido se envía con el access token en el encabezado: `Authorization: Bearer <token>`.

Cuando el access token expira (401 Unauthorized), el frontend automáticamente llama al endpoint `/auth/refresh` con el refresh token → el backend verifica su validez → devuelve un nuevo par de tokens.

Si el usuario cierra sesión, el refresh token se invalida en el servidor (normalmente mediante una tabla en la base de datos con la lista de refresh tokens activos o mediante una blacklist).


### --------- PRISMASERVICE (prisma.service.ts), PRISMAMODULE (prisma.module.ts)

#### 🧱 a) ¿Para qué sirve el wrapper PrismaService?

En un proyecto Node.js normal simplemente escribirías en un archivo `const prisma = new PrismaClient()` e importarías esa variable en todas partes. Pero en NestJS este enfoque es tabú y un tiro en el pie.

Si hiciéramos `new PrismaClient()` en cada servicio (por ejemplo, en AuthService, UserService, ChatService), cada vez que se ejecutara el backend abriría una nueva conexión independiente a PostgreSQL. La base de datos en el contenedor se ahogaría inmediatamente por cientos de conexiones abiertas.

**Cómo lo resuelve PrismaService:**

```ts
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy
```
- **Herencia (`extends PrismaClient`)**: Tu servicio se convierte exactamente en un cliente de Prisma. Desde él puedes llamar a `this.user.create()` o `this.refreshToken.findUnique()`. Todos los métodos ya están disponibles dentro.

- **Ciclo de vida (Lifecycle Hooks)**: Las interfaces `OnModuleInit` y `OnModuleDestroy` son «alarmas» integradas en NestJS.

Cuando NestJS se inicia (`onModuleInit`), fuerza la conexión a la base de datos: `this.$connect()`.

Cuando detienes Docker (`onModuleDestroy`), el backend se desconecta educadamente de la base: `this.$disconnect()`. No quedan conexiones colgando.

#### 💉 b) ¿Qué es DI (Inyección de Dependencias)?

En lugar de crear objetos manualmente con `new`, simplemente le «pides» a NestJS que te los dé.

Al marcar la clase con el decorador `@Injectable()`, le decimos a NestJS: «Oye, toma este clase bajo tu control. Si alguien en el proyecto necesita la base de datos, provéela tú mismo».

Cuando en el futuro necesites acceder a la base de datos desde algún `AuthService`, no tendrás que importar nada manualmente. Simplemente lo escribirás en el constructor:

```ts
constructor(private prisma: PrismaService) {} // ¡Listo! NestJS inyectará automáticamente el servicio listo para usar.
```

NestJS creará **exactamente una sola instancia** de `PrismaService` para toda la aplicación (esto se llama **Singleton**) y la repartirá cuidadosamente a todos los que la soliciten. Una sola conexión = rendimiento óptimo.

#### 🌍 c) ¿Para qué sirve `@Global()` en `PrismaModule`?

Por defecto en NestJS cada módulo es una caja aislada. Si creaste `PrismaService` dentro de `PrismaModule`, `AuthModule` no lo verá a menos que explícitamente lo importes con `imports: [PrismaModule]`.

Como la base de datos se necesita **en todas partes** (autorización, chats, estadísticas de partidas de pong), tener que añadir este import en cada módulo del proyecto sería una rutina infernal.

El decorador `@Global()` derriba esas paredes:

- Hace que `PrismaService` sea visible en toda la aplicación.
- Registras el módulo una sola vez, exportas el servicio (`exports: [PrismaService]`) y ahora en cualquier rincón del proyecto puedes simplemente declarar `prisma: PrismaService` en el constructor y funcionará inmediatamente.

📝 **Resumen para tus apuntes:**

`PrismaService` es una envoltura que mantiene **una única conexión limpia** a la base de datos PostgreSQL, la abre automáticamente al iniciar el backend y la cierra al detener Docker. Y gracias a `@Global()`, este acceso se propaga automáticamente a todos los módulos futuros (Auth, Chat, Game) sin tener que escribir código repetitivo.

### ---------- DTO — Validación de datos de entrada

🧐 ¿Qué es realmente un DTO?

**DTO** (Data Transfer Object) es, en lenguaje sencillo, el «pasaporte sanitario» para los datos entrantes.

Cuando un usuario intenta registrarse, envía un paquete JSON a tu backend. Sin DTO, tu servidor aceptaría fríamente cualquier disparate: en lugar de un email, un simple número 42, y en lugar de contraseña, un array vacío. El backend intentaría meter eso en la base de datos, recibiría un crash brutal y el servidor se caería.

El DTO describe la forma estricta de lo que esperamos recibir. Si el JSON entrante no se corresponde con este pasaporte, el backend devuelve la petición al cliente inmediatamente, sin gastar recursos en ejecutar la lógica de autorización.

🧪 ¿Cómo funciona la magia automática de NestJS (ValidationPipe)?

El propio TypeScript después de compilarse a JavaScript pierde toda la información de tipos. Para que la validación funcione en **runtime** (cuando el código ya está ejecutándose en Docker), se utilizan decoradores de la librería `class-validator`.

Funciona como una cadena de montaje:

El cliente envía una petición POST con un cuerpo JSON a `/api/auth/register`.

Se activa `ValidationPipe` (el validador integrado de NestJS). Toma ese JSON y lo pasa a través de los decoradores de tu clase `RegisterDto`.

- Si todo está correcto: los datos se convierten en un objeto limpio y se pasan a tu controlador.
- Si hay algún error (por ejemplo, contraseña de 5 caracteres): `ValidationPipe` interrumpe la petición, genera automáticamente una respuesta con estado **400 Bad Request** y devuelve un array con errores claros (el texto en español que escribió tu compañera: «La contraseña debe tener al menos 8 caracteres»). El controlador ni se entera de esto.

🔍 Análisis detallado de los campos y decoradores

1. Campo **email**
   - `@IsEmail({}, { message: '...' })` — comprueba que la cadena corresponde a una dirección de correo electrónico válida (presencia de `@`, dominio, etc.). No pasará ningún texto aleatorio.

2. Campo **password**
   - `@IsString()` — garantiza que se envió realmente una cadena, y no un número u objeto.
   - `@MinLength(8)` — protección contra contraseñas demasiado débiles. Menos de 8 caracteres → rechazo inmediato.
   - `@MaxLength(72)` — ¡Atención, este es un detalle de nivel pro! Tu compañera es una crack por haberlo tenido en cuenta. La librería bcrypt que se usa para hashear contraseñas ignora físicamente todo lo que supere los 72 bytes. Si envías una contraseña de 100 caracteres, bcrypt cortará el final en silencio. La restricción a nivel DTO protege contra esta peculiaridad y contra ataques de denegación de servicio (cuando se obliga al servidor a hashear cadenas de megabytes para que se cuelgue).

3. Campo **displayName** (apodo para el perfil)
   - Restricción de 2 a 30 caracteres. Nada de nombres vacíos ni nicks de tres páginas que rompan el diseño del frontend.

🔄 ¿Por qué se creó una clase separada para el login (LoginDto)?

A simple vista los campos son los mismos (email y password), ¿para qué crear más archivos?

Este es un punto arquitectónico importante:

- En el registro nos importan reglas estrictas: la contraseña debe ser compleja (de 8 a 72 caracteres), necesitamos nombre de perfil, etc.
- En el login nos da igual la longitud máxima de la contraseña o el nombre de perfil. Solo necesitamos verificar lo que el usuario introdujo. Si mañana decidimos cambiar las reglas de registro (por ejemplo, exigir contraseña de 10 caracteres), los usuarios antiguos con contraseñas de 8 caracteres deben poder loguearse sin problemas. La separación de DTOs proporciona esta independencia.

### ¿Quién se encarga de todo esto?

1. **Biblioteca class-validator (Decoradores)**  
   Estos elementos: `@IsEmail()`, `@IsString()`, `@MinLength()`, etc.  
   No son una característica exclusiva de NestJS. Es una librería popular e independiente para Node.js. Bajo el capó contiene cientos de expresiones regulares y validaciones listas para usar. Cuando se ejecuta el código, estos decoradores colocan marcas-reglas invisibles sobre las propiedades de la clase.

2. **El propio NestJS (ValidationPipe)**  
   `ValidationPipe` es una herramienta pura de NestJS.  
   En NestJS existe el concepto de **Pipes** (Tuberías / Conducciones). Son filtros integrados a través de los cuales pasa cualquier petición entrante antes de llegar a tu código.

   Cuando escribes en el controlador algo como:

   ```ts
   @Post('register')
   register(@Body() dto: RegisterDto) { ... }
   ```
NestJS ve: «Vale, el tipo de dato es RegisterDto. Activo ValidationPipe». Toma el JSON que llegó del usuario, toma la clase RegisterDto y los enfrenta entre sí.

3. **Biblioteca class-transformer (Motor oculto)**
Como desde la red siempre llega texto plano (JSON), hay que parsearlo correctamente y convertirlo en un objeto real de una clase TypeScript. NestJS usa internamente la librería class-transformer para transformar los datos del JSON crudo en tu clase DTO, lista para ser validada.

💡 Cómo funciona esto en la vida real (explicado de forma sencilla):

El usuario envía una tontería: una contraseña de solo 3 caracteres.

NestJS intercepta la petición → se la pasa a `ValidationPipe`.

`class-validator` realiza la comprobación: mira la etiqueta `@MinLength(8)` del campo `password`, la compara con los tres caracteres del usuario y dice: «¡Error, no coincide!».

NestJS le da con la puerta en las narices: `ValidationPipe` bloquea la ejecución, genera el código de estado **400 Bad Request** y envía al usuario un JSON claro con el texto del error que indicaste en el `message`. La petición ni siquiera llega a tu controlador. El backend está completamente protegido.

### --------- AuthService — lógica de registro, login, refresh y logout

=> Aquí tenemos patrones de seguridad de nivel producción serio <=

Presta atención a la decisión arquitectónica: el refresh token **no es un JWT**, sino una cadena aleatoria (`crypto.randomBytes`) almacenada en la base de datos. Esta es una elección consciente: como de todas formas lo verificamos en la BD en cada refresh (para poder revocarlo), no tiene sentido usar una estructura JWT autofirmada para él. Un token aleatorio normal con un registro en la tabla es más simple y ofrece control total sobre la revocación.

💎 1. ¿Por qué el Refresh Token **NO es** un JWT criptográfico?

Esta es la mejor decisión arquitectónica para los refresh tokens:

```ts
const refreshTokenValue = crypto.randomBytes(64).toString('hex');
```

Cómo lo hacen los novatos: Generan dos JWT (Access y Refresh). Pero si un hacker roba ese Refresh JWT, podrá usarlo hasta que expire su tiempo de vida. Revocarlo antes de tiempo (por ejemplo, al hacer logout) es un dolor de cabeza enorme, hay que montar listas negras en Redis.

Cómo lo hacemos nosotros: El Access Token es un JWT rápido y ligero (el servidor lo verifica al instante, sin consultar la base de datos). En cambio, el Refresh Token es simplemente una larga cadena aleatoria de 64 bytes, fuertemente aleatoria.

*Ventajas*: Como de todas formas tenemos que consultar la base de datos al actualizar los tokens (para comprobar si el usuario pulsó “Cerrar sesión”), un token opaco (opaque token) aleatorio es la solución ideal. Es imposible falsificarlo y revocarlo es cuestión de una microsegundo (simplemente borras la fila de la base de datos o pones revoked: true).

🛡️ 2. Seguridad: Protección contra fuerza bruta y errores inteligentes

Mira el método `login`. Si el usuario introduce una contraseña incorrecta **O** un email inexistente, el backend devuelve exactamente la misma respuesta: `400 Unauthorized: Credenciales inválidas`.

```ts
if (!user) {
  throw new UnauthorizedException('Credenciales inválidas');
}
// ...
if (!passwordMatches) {
  throw new UnauthorizedException('Credenciales inválidas');
}
```
**¿Por qué es necesario esto?**

Si el backend devolviera “Este email no está registrado”, un hacker podría ejecutar un script, probar miles de direcciones de correo de estudiantes del campus y elaborar una lista de quienes juegan en vuestro Pong. La respuesta idéntica cierra completamente esta vulnerabilidad (**Enumeration Attack**).

Y otro detalle importante: `SALT_ROUNDS = 12`. El hasheo con bcrypt ralentiza intencionadamente el procesador unos **100-200 milisegundos por cada contraseña**. Para una persona normal es imperceptible, pero para un hacker hace que el ataque de fuerza bruta (brute force) sea económicamente inviable.

🔄 3. Rotación de tokens (Token Rotation) en el método refresh

Aquí se esconde la élite de la seguridad web. El método `refresh` hace lo siguiente: en cuanto el frontend envía el refresh token antiguo para obtener uno nuevo, el backend invalida inmediatamente ese token viejo (`revoked: true`) y a cambio genera un par de tokens completamente nuevo.

```ts
await this.prisma.refreshToken.update({
  where: { id: storedToken.id },
  data: { revoked: true },
});

return this.issueTokens(storedToken.user.id, storedToken.user.email);
```
Esta técnica se llama Token Rotation y es una de las mejores prácticas de seguridad a nivel producción. Reduce drásticamente el riesgo en caso de que un refresh token sea comprometido.

**¿De qué nos protege esto?**

Imagina que un hacker consiguió robar el refresh token de un estudiante.

**Escenario A**: El estudiante está en el sitio, se le caduca el Access Token. El frontend envía el Refresh Token al backend, recibe un nuevo par. Todo perfecto. Un minuto después el hacker intenta usar ese mismo token robado: el backend ve `revoked: true` y salta: «¡Alerta, este token ya fue utilizado!». El backend puede bloquear todas las sesiones de ese usuario porque detectó una posible fuga.

**Escenario B**: El hacker consiguió actualizar el token primero. Entonces el estudiante original, al cabo de 15 minutos, será expulsado de su cuenta. Cuando intente refrescar, el backend detectará el uso repetido del token y obligará a **ambos** a realizar una autenticación completa de nuevo. El hacker perderá el acceso.

🗂️ Método fábrica `issueTokens`

Es privado (`private`) porque solo se necesita dentro de este servicio. Encapsula (reúne en un solo lugar) toda la rutina:

- Inserta el `userId` y el `email` en la carga útil (payload) del JWT.
- Firma el Access Token con la clave secreta del `.env` (`JWT_SECRET`).
- Genera un Refresh Token aleatorio, calcula su fecha de caducidad (+7 días) y guarda este registro en PostgreSQL a través de nuestro querido `PrismaService`.

## Estrategia JWT (JWT Strategy) e implementación de Guards

En el ecosistema de NestJS, la autenticación y el control de acceso se basan en una simbiosis perfecta entre dos herramientas potentes: Passport.js (que se encarga del trabajo sucio de parsear y verificar los tokens) y los Guards de NestJS (que actúan como aduanas o filtros de seguridad antes de ejecutar la lógica de los endpoints).

### 1. Arquitectura y lógica de JwtStrategy

#### src/auth/strategies/jwt.strategy.ts

Esta clase es el "cerebro" detrás de la validación del token. No la llamamos directamente en el código; NestJS la registra como un proveedor (provider) que Passport.js ejecutará automáticamente en cada petición entrante dirigida a una ruta protegida.

**Desglose de la configuración dentro de super():**
- *Integración con Passport.js*: Al extender PassportStrategy(Strategy, 'jwt'), el segundo argumento 'jwt' registra esta estrategia con un nombre único en el contenedor de Passport. Así es como NestJS sabe exactamente a qué estrategia recurrir cuando un Guard solicita una validación de tipo 'jwt'.

- *Mecanismo de extracción (jwtFromRequest)*: La opción ExtractJwt.fromAuthHeaderAsBearerToken() le indica al backend que escanee minuciosamente las cabeceras (headers) de cada petición HTTP entrante. Busca específicamente la cabecera Authorization y espera el formato estricto Bearer <token>. Si la cabecera no existe o el formato es incorrecto, Passport corta la petición de inmediato sin siquiera intentar descifrar el token.

- *Control de expiración (ignoreExpiration)*: Configurar ignoreExpiration: false es un pilar crítico de seguridad. Dentro de cada JWT viaja un campo llamado exp (timestamp de caducidad). Al dejarlo en false, Passport.js compara la hora actual del servidor con ese exp. Si el token ha caducado por un solo milisegundo, lanza un 401 Unauthorized. Nos ahorramos tener que picar la lógica de fechas a mano.

**Robustez contra errores críticos (Enfoque Fail-Fast):**
En TypeScript, las variables de entorno leídas a través de process.env tienen por defecto el tipo string | undefined, pero la librería passport-jwt exige estrictamente un tipo string.

En lugar de usar el operador ruidoso secretOrKey: process.env.JWT_SECRET!, que simplemente "engaña" al compilador pero no soluciona el peligro real, implementamos una validación explícita antes de invocar al constructor padre:

```ts
const secret = process.env.JWT_SECRET;
if (!secret) {
    throw new Error('JWT_SECRET no está definido en las variables de entorno');
  }
```
- Por qué esto es calidad de producción: Sigue el patrón arquitectónico Fail-Fast (Fallo inmediato). Si al levantar los contenedores de Docker (ya sea en la máquina de otro desarrollador del equipo o en producción) alguien olvida meter la variable JWT_SECRET en el .env, la aplicación de NestJS petará instantáneamente en el arranque, dejando un log claro y conciso. Si hubiéramos usado el !, la app habría arrancado bien, pero escupiría un TypeError críptico e infumable en tiempo de ejecución cada vez que un usuario intentara loguearse.

**El rol del método validate(payload):**

Este es el paso final y más importante de la estrategia. Este método se ejecuta automáticamente única y exclusivamente si Passport.js ha verificado con éxito tres cosas: el token existe, la firma criptográfica coincide con nuestro JWT_SECRET y el token no ha expirado.

```ts
async validate(payload: JwtPayload) {
  return { userId: payload.sub, email: payload.email };
}
```

Qué pasa con el retorno: El objeto que devolvemos aquí (en nuestro caso { userId, email }) es interceptado por Passport, que lo inyecta directamente en el objeto de la petición HTTP bajo la propiedad user (request.user).

El beneficio real: En cualquier controlador protegido por el Guard, ya no necesitamos parsear el token a mano ni decodificarlo. Nos basta con usar el decorador @Req() req para tener acceso seguro e inmediato a req.user.userId.

### 2. Principio de funcionamiento de JwtAuthGuard

#### src/auth/guards/jwt-auth.guard.ts

Si JwtStrategy es el perito experto que sabe validar si un pasaporte es auténtico o falso, el JwtAuthGuard es el portero de la discoteca que utiliza a ese perito para dejar pasar o no a la gente.

- El nexo de unión: La clase extiende AuthGuard('jwt'). Esa cadena 'jwt' es la que conecta este Guard de manera síncrona con la estrategia JwtStrategy que hemos definido antes.

- Ciclo de vida de la petición: Los Guards en NestJS se ejecutan en la fase intermedia: justo después de parsear el cuerpo de la petición (body), pero antes de que impacte en la lógica del método del controlador.

- Protección declarativa: Al colocar la anotación @UseGuards(JwtAuthGuard) sobre una clase controladora entera (или sobre un método específico @Get() / @Post()), blindamos ese endpoint por completo. Si la petición es legítima, el Guard devuelve true y el código sigue su curso. Si la estrategia falla, el Guard bloquea la petición y devuelve un 401 Unauthorized de libro, protegiendo los recursos del servidor de usuarios no autenticados.

=====================================
1. Instalación de dependencias — qué paquetes y para qué sirven.
```bash
docker compose exec backend npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt class-validator class-transformer
```

* **`@nestjs/jwt`** — Envoltorio de NestJS sobre la librería `jsonwebtoken`. Proporciona el `JwtService` con los métodos `.sign()` (crear token) y `.verify()` (verificar token). Ya lo usamos en `AuthService` con `this.jwtService.sign(payload, ...)`.

* **`@nestjs/passport`** — Integración de NestJS con Passport.js (librería independiente de NestJS, muy antigua y estándar en el ecosistema Node). NestJS no inventa su propio sistema de autenticación desde cero, sino que envuelve Passport en decoradores cómodos (`@UseGuards`, `PassportStrategy`).

* **`passport`** — La propia librería Passport, de la que depende `@nestjs/passport`.

* **`passport-jwt`** — Estrategia concreta de Passport para trabajar específicamente con JWT (Passport soporta decenas de estrategias: Google OAuth, GitHub OAuth, login local, etc. — ahora necesitamos precisamente la estrategia JWT, que usamos en `jwt.strategy.ts`).

* **`bcrypt`** — Librería para hashear contraseñas. Importante: es un módulo nativo con bindings en C++ (se compila para la plataforma concreta), por eso a veces da problemas en Docker al cambiar de arquitectura (Mac ARM vs Linux x86). Pero como lo instalamos dentro del contenedor (`docker compose exec`), se compila directamente para la plataforma del contenedor y no debería haber problemas.

* **`class-validator`** — La librería que proporciona los decoradores `@IsEmail()`, `@MinLength()`, etc. en nuestros DTO.

* **`class-transformer`** — Trabaja en conjunto con `class-validator` y se encarga de transformar el JSON crudo de la petición en una instancia real de la clase DTO (sin ella los decoradores de validación no verían los datos en la forma correcta).

---

**Tipos separados para TypeScript** (las propias librerías pueden estar escritas en JS puro sin tipos incluidos).
```bash
docker compose exec backend npm install --save-dev @types/bcrypt @types/passport-jwt
```

**¿Por qué usar `docker compose exec` en lugar de simplemente `npm install` en el host?**

El contenedor debe estar ya en ejecución (`up` en segundo plano o en otra terminal). El comando `exec` entra dentro del contenedor en ejecución y ejecuta el comando allí. Esto garantiza que `node_modules` se actualice exactamente en el volumen que ven tanto el host (para tu editor/IDE) como el contenedor (para ejecutar la aplicación).

Si el contenedor no está corriendo, el comando fallará con un error del tipo *"no such service is running"* o similar. En ese caso, primero ejecuta `docker compose up -d`.

---
======================================
**ValidationPipe, Persistencia con Prisma y Pruebas End-to-End**

1. *El motor de validación*: ValidationPipe en main.ts

Archivo: src/main.ts

La inclusión de la línea app.useGlobalPipes(new ValidationPipe()); no es un simple paso de configuración; es el interruptor que activa la seguridad de la capa de entrada de datos en toda la API.

- Activación del tipado en runtime: TypeScript es un lenguaje de tipado estático que desaparece por completo una vez compilado a JavaScript. Esto significa que los DTOs (RegisterDto, LoginDto) por sí solos no protegen al servidor de recibir datos corruptos. Los decoradores como @IsEmail() o @MinLength() son solo metadatos decorativos.
 - El rol del Pipe global: Al registrar el ValidationPipe de forma global, NestJS intercepta cada petición entrante, busca el DTO correspondiente al endpoint y ejecuta una validación en tiempo de ejecución (runtime) utilizando las librerías class-validator y class-transformer.
 - Filtrado preventivo: Si un cliente envía un campo con un formato erróneo (por ejemplo, un email inválido), el ValidationPipe detiene la petición inmediatamente en la puerta de entrada y devuelve un error 400 Bad Request detallado. Esto garantiza que ningún dato corrupto o malformado llegue jamás a la lógica de negocio del AuthService, protegiendo la estabilidad del backend.

2. *Sincronización del estado*: Primera migración con Prisma

```bash
docker compose exec backend npx prisma migrate dev --name add_auth
```
Este comando consolidó la arquitectura de persistencia del proyecto, conectando las definiciones de TypeScript con la realidad de la base de datos PostgreSQL.

```bash
docker compose exec backend npx prisma migrate dev --name add_auth
```

- Detección de diferencias (Diffing): Prisma comparó el archivo schema.prisma actualizado (que ya incluía las relaciones y restricciones de los modelos User y RefreshToken) con el estado actual de la base de datos dentro del contenedor. Al detectar que la base de datos carecía de estas tablas, calculó los cambios necesarios.
 - Generación del artefacto SQL: Se creó un archivo físico de migración en la ruta `prisma/migrations/<timestamp>_add_auth/migration.sql`. Este archivo contiene las instrucciones SQL puras (CREATE TABLE, ALTER TABLE, etc.) y debe ser comiteado obligatoriamente en Git. No es un archivo temporal; es el historial que asegura que el resto del equipo (y el entorno de producción) tengan exactamente la misma estructura de base de datos.
 - Resolución de errores de compilación: Tras aplicar el SQL en la base de datos, el comando ejecutó automáticamente prisma generate. Esto actualizó el mapa de tipos de PrismaClient en los node_modules. Al regenerarse, TypeScript reconoció instantáneamente la existencia de la propiedad refreshToken, lo que eliminó de inmediato el error de compilación que bloqueaba el arranque del servidor.

3. *Verificación End-to-End (E2E) mediante cURL*

Para certificar que toda la infraestructura (Validación $\rightarrow$ Controladores $\rightarrow$ Servicios $\rightarrow$ Prisma $\rightarrow$ Base de Datos) funciona al unísono sin fisuras, se ejecutó una batería de tres pruebas secuenciales contra el endpoint `https://localhost:8443/api/auth/`:

Flujo de Prueba	| Endpoint / Método | Resultado HTTP | Acción Interna del Servidor
|------|----------|--------|--------|
| 1. Registro Inicial | `POST /auth/register` | 211 Created | El AuthService recibe los datos limpios. Encripta la contraseña usando bcrypt.hash(), crea el registro en la base de datos y devuelve una estructura JSON con `{ accessToken, refreshToken }`|
| 2. Autenticación | `POST /auth/login` | 200 OK | Se envían las mismas credenciales. El servidor busca al usuario, extrae el hash de la base de datos y lo compara con la contraseña en texto plano usando bcrypt.compare(). Al coincidir, genera y retorna un par de tokens completamente nuevos|
| 3. Control de Duplicados | `POST /auth/register` | 409 Conflict | Se intenta registrar exactamente el mismo email. El servicio detecta la colisión antes de realizar la inserción y lanza un ConflictException. El cliente recibe un error controlado con el mensaje *"Ya existe una cuenta con este email"*|

Conclusión del hito: El éxito de esta secuencia (201 $\rightarrow$ 200 $\rightarrow$ 409) valida de extremo a extremo el flujo base de autenticación. El sistema es criptográficamente seguro, inmune a la duplicidad de cuentas en la capa de persistencia y capaz de autorizar sesiones de manera consistente.

---

## 👥 El Módulo de Usuarios (`src/users/`)

En pocas palabras este módulo se encarga de gestionar la información de los jugadores una vez que ya han iniciado sesión. Sigue la arquitectura estándar de NestJS dividida en tres capas: el módulo como declarador, el servicio para la lógica de negocio y base de datos, y el controlador para exponer los endpoints HTTP.

Para entender por qué hemos creado este módulo, primero debemos entender cómo funciona la arquitectura de una aplicación web moderna (como nuestro *Transcendence*).

---

#### 1. ¿Por qué necesitamos un módulo de Usuarios separado?
El módulo de Autenticación (`AuthModule`) solo se encarga de las **puertas de acceso**: registrar usuarios, verificar contraseñas y expedir "pases" (los tokens JWT). 

Una vez que el usuario ya ha cruzado esa puerta y está dentro de la aplicación, el `AuthModule` ya no tiene más trabajo. Es aquí donde entra el **`UsersModule`**. Su propósito es:
*   Servir como la fuente de verdad del perfil del jugador (su nombre, su avatar, sus estadísticas).
*   Permitir que otros módulos (como el de emparejamiento para el juego, la lista de amigos o el chat) puedan consultar información del usuario de forma rápida y segura a través de su `ID`.

---

#### 2. ¿Qué es y cómo funciona la "zona protegida" `/users/me`?
En una API REST clásica, cuando un usuario inicia sesión y entra a su perfil, el frontend necesita saber **quién es el usuario actual** para poder pintar su interfaz (su avatar, sus puntos, etc.). El endpoint para resolver esto es `GET /api/users/me` (que se traduce literalmente como *"tráeme mis propios datos"*).

Pero hay un problema de seguridad: **¿Cómo sabe el servidor quién está haciendo la petición?**
*   **La forma insegura:** Que el frontend envíe el ID del usuario en la URL (ej. `GET /api/users/15`). Si hiciéramos esto, cualquier usuario malicioso podría cambiar el `15` por un `16` o un `17` y cotillear los perfiles de los demás o, peor aún, modificarlos.
*   **La forma segura (Zona Protegida con JWT):** El frontend no envía ningún ID. Simplemente hace una petición a `/users/me` y adjunta en la cabecera el "pase VIP" que le dimos al iniciar sesión (el `AccessToken` dentro de la cabecera `Authorization: Bearer <token>`).

---

#### 3. El flujo de seguridad paso a paso en la "zona protegida"

Cuando ejecutas el comando `curl -H "Authorization: Bearer <token>" https://localhost:8443/api/users/me`, el backend realiza el siguiente baile de seguridad detrás de escena:

1.  **Interceptación del Guardia (`JwtAuthGuard`):** El guardia detiene la petición en la entrada. Revisa si hay un token. Si no lo hay, responde inmediatamente con un `401 Unauthorized` (que es lo que viste en tu primera prueba).
2.  **Validación del pasaporte (`JwtStrategy`):** El guardia le pasa el token a la estrategia. Esta verifica criptográficamente que el token fue firmado por nuestro servidor (usando el `JWT_SECRET` del `.env`) y que no ha expirado.
3.  **Extracción de identidad:** Al descifrar el token, la estrategia encuentra el Payload (que contiene el `userId`). Passport.js inyecta este payload dentro del objeto de la petición HTTP (`req.user`).
4.  **Consulta segura en la Base de Datos (`UsersService`):** El controlador recibe la petición (sabiendo ya con total certeza que el usuario es el `userId` extraído del token) y le pide al servicio que busque ese perfil en PostgreSQL, **excluyendo siempre la contraseña** mediante la selección selectiva (`select`).
5.  **Respuesta:** El servidor devuelve un JSON limpio con los datos del perfil del jugador actual.

> 💡 **En resumen:** La zona protegida de `/users/me` es la garantía de que un usuario solo puede ver y gestionar su propia información, de manera 100% segura, sin posibilidad de suplantación de identidad.

-----------------------------

---

### 1. `users.module.ts` (El Pegamento del Módulo)

Es la pieza que declara y conecta todos los componentes de este recurso dentro del ecosistema de NestJS.

```ts
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController], // Expone las rutas HTTP al exterior
  providers: [UsersService],     // Contiene la lógica de negocio accesible mediante Inyección de Dependencias
})
export class UsersModule {}
```
¿Por qué es necesario? NestJS es modular. Sin este archivo, el framework no sabría que existen el controlador de usuarios ni su servicio. Al encapsularlos aquí, creamos un bloque reutilizable que luego simplemente se importa en el módulo raíz (app.module.ts).

### 2. users.service.ts (El Cerebro y la Seguridad de Datos)
Este servicio es el único encargado de hablar directamente con la base de datos a través de Prisma. Aquí se aplica una regla de oro de la seguridad en el desarrollo backend.
```ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable() // Registra la clase en el contenedor de Inyección de Dependencias de NestJS
export class UsersService {
  // Inyectamos el servicio global de Prisma para acceder a las tablas de la base de datos
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, // Ejecuta un SELECT optimizado usando el índice único de la clave primaria
      
      // REGLA DE ORO DE SEGURIDAD: Selección selectiva (Safe Selection)
      // Por defecto, Prisma extrae todas las columnas de la tabla, incluyendo "passwordHash".
      // Si un desarrollador devuelve el objeto de la base de datos directamente al cliente por error,
      // el hash de la contraseña se filtraría al frontend, creando una brecha de seguridad crítica.
      // Usando "select", forzamos a la base de datos a no extraer jamás "passwordHash" de la memoria física.
      select: {
        id: true,
        email: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    // Control de errores (Fail-Fast):
    // Si el usuario no existe (por ejemplo, si el token es antiguo y la cuenta fue borrada de la BD),
    // Prisma devolverá null. Lanzamos un NotFoundException que NestJS convertirá automáticamente
    // en una respuesta HTTP estándar 404 Not Found con un JSON formateado para el cliente.
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Retorna el objeto de usuario limpio y seguro para el cliente
    return user;
  }
}
```

### 3. users.controller.ts (La Frontera HTTP)
Es el punto de entrada que recibe las peticiones HTTP del exterior, valida las credenciales y delega la obtención de datos en el servicio.
```ts
import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@Controller('users') // Define la ruta base para este controlador: /api/users
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard) // ACTIVA EL GUARD: Nadie puede acceder a este endpoint sin un token JWT válido
  @Get('me')               // Endpoint: GET /api/users/me
  async getMe(@Request() req) {
    // FLUJO INTERNO:
    // 1. Antes de entrar aquí, JwtAuthGuard ejecuta JwtStrategy.validate()
    // 2. Si el token es válido, los datos del Payload descifrado ({ userId, email })
    //    se inyectan automáticamente dentro del objeto HTTP request como "req.user"
    // 3. Extraemos el "userId" de forma segura y le pedimos al servicio que busque la información completa en la BD
    return this.usersService.findById(req.user.userId);
  }
}
```

🔄 Resumen del flujo de datos en /users/me:
```text
[ Cliente HTTP ]
       │  (GET /api/users/me con Bearer Token)
       ▼
 ┌───────────────┐
 │ JwtAuthGuard  │ ──(¿Token inválido/expirado?)──► [ 401 Unauthorized ]
 └───────────────┘
       │  (Token válido -> Inyecta req.user = { userId, email })
       ▼
 ┌─────────────────────────────────┐
 │ UsersController.getMe(req)      │
 └─────────────────────────────────┘
       │  (Pide buscar por id: req.user.userId)
       ▼
 ┌─────────────────────────────────┐
 │ UsersService.findById(userId)   │
 └─────────────────────────────────┘
       │  (Consulta SELECT segura excluyendo passwordHash)
       ▼
 ┌──────────────────┐
 │ PostgreSQL (BD)  │ ──(¿No existe el usuario?)──► [ 404 Not Found ]
 └──────────────────┘
       │  (Devuelve datos seguros)
       ▼
[ JSON seguro con datos del perfil ]
```

El punto clave es cómo se completa aquí toda la cadena que construimos a partir de JWT Strategy:

1.  Una solicitud GET /users/me llega con el encabezado Authorization: Bearer <accessToken>.

2. @UseGuards(JwtAuthGuard) intercepta la solicitud antes de que llegue al cuerpo del método getMe.

3. JwtAuthGuard ejecuta JwtStrategy, que extrae el token del encabezado (ExtractJwt.fromAuthHeaderAsBearerToken()) y verifica la firma y la fecha de vencimiento usando secretOrKey.

4. Si es válido, se llama a validate(payload), que devuelve { userId, email }.

5. NestJS coloca esto en req.user, por lo que leemos req.user.userId en el controlador. 

6. Si el token no es válido, ha caducado o falta, Guard finaliza la solicitud prematuramente, el cuerpo del método getMe no se ejecuta y el cliente recibe automáticamente una respuesta 401 No autorizado.

---

## 🔒 Refactorización de Seguridad: Tokens en Cookies HTTP-Only

Durante el diseño de la arquitectura de autenticación, tomamos una decisión crítica de seguridad: **separar el almacenamiento del Access Token y del Refresh Token** para proteger la aplicación contra ataques XSS (Cross-Site Scripting).

---

### ⚠️ El problema del almacenamiento en `localStorage`

Si devolvemos ambos tokens en el cuerpo de la respuesta JSON, el Frontend se ve obligado a guardarlos en la memoria del navegador (usualmente en `localStorage` o `sessionStorage`). 

*   **Vulnerabilidad:** Cualquier script malicioso de terceros que consiga ejecutarse en nuestra página (XSS) tendrá acceso total al `localStorage`. Si un atacante roba el `RefreshToken`, tendrá acceso indefinido a la cuenta del usuario.
*   **La regla de oro:** El `AccessToken` puede vivir en la memoria de la aplicación (variables de React) porque expira en 15 minutos. El `RefreshToken`, al ser de larga duración (7 días), **nunca** debe ser accesible desde JavaScript.

---

### 🛡️ La solución: Cookies con la directiva `HttpOnly`

Para mitigar este riesgo, implementamos el siguiente flujo:

1.  **Access Token:** Se sigue devolviendo en el JSON de respuesta. El Frontend lo guarda en memoria dinámica (un estado de React/Pinia). Si el usuario refresca la pestaña, el token se pierde (lo cual está bien, ya que pedirá uno nuevo usando el Refresh Token de inmediato).
2.  **Refresh Token:** El servidor lo inyecta directamente en las cabeceras de respuesta como una cookie con los siguientes atributos de seguridad:
    *   `httpOnly: true` -> Impide que cualquier código JavaScript (incluyendo exploits XSS) acceda o lea la cookie a través de `document.cookie`.
    *   `secure: true` -> Fuerza a que la cookie solo viaje a través de conexiones cifradas HTTPS (obligatorio en nuestro entorno de producción con Nginx).
    *   `sameSite: 'strict'` -> Protege contra ataques CSRF (Cross-Site Request Forgery) al asegurar que la cookie solo se envíe en peticiones originadas desde nuestro propio dominio.
    *   `path: '/api/auth'` -> Limita la cookie para que solo se envíe automáticamente en las peticiones que vayan a los endpoints de autenticación, protegiendo el resto de rutas.

---

### 🔄 Flujo de comunicación refinado:

```text
[ Frontend (React) ]                                [ Backend (NestJS) ]
        │                                                    │
        │─── (POST /api/auth/login) ────────────────────────>│
        │                                                    │ (Genera tokens)
        │<── [ JSON: { accessToken } ] ──────────────────────│
        │<── [ Header: Set-Cookie: refreshToken (HttpOnly) ]─│
        │                                                    │
   (Guarda accessToken)                                      │
   (El navegador guarda la cookie de forma aislada)          │
        │                                                    │
        │                                                    │
  ⏱️ Transcurren 15 minutos (Access Token expira)              │
        │                                                    │
        │─── (POST /api/auth/refresh) ──────────────────────>│
        │    (El navegador adjunta la cookie HttpOnly        │ (Verifica cookie)
        │     de forma automática y transparente para JS)    │ (Genera nuevos tokens)
        │                                                    │
        │<── [ JSON: { accessToken } ] ──────────────────────│
        │<── [ Header: Set-Cookie: refreshToken (HttpOnly) ]─│

```
---

### 🍪 Guía de Ingeniería: ¿Qué es realmente una Cookie `HttpOnly`?
Una **cookie** es simplemente un pequeño fragmento de texto que el servidor web envía al navegador del usuario. El navegador guarda este texto de forma persistente y lo **devuelve automáticamente** al servidor en cada petición posterior que coincida con las reglas de la cookie.

Sin embargo, las cookies tradicionales creadas con JavaScript o enviadas sin configuración tienen una vulnerabilidad crítica: **cualquier script que se ejecute en la página puede leerlas, modificarlas o enviarlas a servidores externos** utilizando la API global `document.cookie`.

El flag `HttpOnly` es una directiva de seguridad añadida en la cabecera HTTP `Set-Cookie` del servidor que cambia por completo este comportamiento.

1. El Flag HttpOnly (La barrera contra XSS)
Cuando el backend responde al cliente con la siguiente cabecera HTTP:

```http
Set-Cookie: refreshToken=ey...; HttpOnly;
```
El navegador recibe la instrucción y almacena la cookie en un compartimento estanco de su sistema de almacenamiento, aislado del entorno de ejecución de la página web.

 * **Bloqueo de la API del navegador**: A partir de ese momento, si un atacante intenta ejecutar console.log(document.cookie) en la consola, o si consigue inyectar un script malicioso mediante una vulnerabilidad XSS (Cross-Site Scripting), la cookie refreshToken simplemente no aparecerá. Es 100% invisible para el motor de JavaScript del navegador.

 * **Envío automático por red**: A pesar de ser invisible para el código JS, cuando el navegador realiza una petición HTTP (o una llamada con fetch/axios) hacia el dominio del backend, el propio motor de red del navegador (un proceso nativo del sistema operativo) adjunta la cookie automáticamente en las cabeceras:

```http
Cookie: refreshToken=ey...
```
2. La Santísima Trinidad de la seguridad en Cookies
Para que una cookie de sesión (como nuestro `refreshToken`) sea verdaderamente inexpugnable, el flag `HttpOnly` debe ir acompañado de otros tres atributos obligatorios en entornos modernos:

```http
Set-Cookie: refreshToken=ey...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth;
```

A. El flag `Secure` (Protección contra Man-in-the-Middle)
Fuerza al navegador a enviar la cookie únicamente si la petición se realiza a través de un canal cifrado **HTTPS**.

Si el usuario está conectado a una red Wi-Fi pública y el frontend hiciera una petición accidental por HTTP plano (`http://`), un atacante con un sniffer de red (como Wireshark) podría interceptar el tráfico. Con `Secure`, el navegador previene este envío en texto plano.

B. El flag `SameSite` (Protección contra CSRF)
Controla si la cookie se envía o no en peticiones que se originan desde sitios web de terceros (peticiones cross-site) para mitigar ataques **CSRF** (**Cross-Site Request Forgery**). Tiene tres modos:

 * `None`: La cookie se envía siempre, incluso desde sitios externos (requiere obligatoriamente el flag `Secure`).

 * `Lax` (Por defecto en navegadores modernos): La cookie se envía en navegaciones seguras de primer nivel (como pinchar un enlace normal), pero no en peticiones hechas por scripts de terceros.

 * `Strict`: La cookie **solo** se envía si la petición actual se origina exactamente desde el mismo dominio que la aloja. Si el usuario está en `sitio-malicioso.com` e intenta hacer un `fetch` hacia nuestra API, el navegador **bloqueará el envío de la cookie**.

C. El flag `Path` (Principio de mínimo privilegio)
Limita el alcance de la cookie a rutas específicas de la API. Al definir `Path=/api/auth`, el navegador solo adjuntará la cookie de refresco cuando el frontend haga peticiones a endpoints dentro de la autenticación (como `/api/auth/refresh` o `/api/auth/logout`), evitando saturar el ancho de banda enviando un token pesado en peticiones innecesarias (como chats o estados de juego).

📊 Comparativa de almacenamiento: localStorage vs. Cookies HttpOnly

| Característica | `localStorage` | Cookie `HttpOnly` + `Secure` + `SameSite` |
| :--- | :--- | :--- |
| **Accesible por JavaScript** | Sí (`localStorage.getItem()`) | **No** (Inmune a XSS en el cliente) |
| **Envío en las peticiones** | Manual (Debes programar las cabeceras) | **Automático** por el propio navegador |
| **Vulnerable a CSRF** | No (JavaScript debe adjuntarlo explícitamente) | **Protegido** (Configurando `SameSite=Strict`) |
| **Gestión de Caducidad** | Manual (Hay que borrarlo por código) | **Automática** (Gestionada por el navegador vía `Max-Age`) |


## 📦 Configuración del Entorno: Instalación de `cookie-parser`

Para que NestJS sea capaz de leer las cookies que el navegador envía automáticamente en las cabeceras de las peticiones, necesitamos instalar y configurar un middleware clásico del ecosistema de Node.js: `cookie-parser`.

### 1. Instalación de dependencias

Ejecuta los siguientes comandos en tu terminal para instalar el paquete de producción y sus tipos de desarrollo dentro del contenedor del backend:

```bash
docker compose exec backend npm install cookie-parser
docker compose exec backend npm install --save-dev @types/cookie-parser
```

 * `cookie-parser`: Es el paquete principal que intercepta las peticiones HTTP entrantes, busca la cabecera `Cookie`, la procesa y la transforma en un objeto de JavaScript fácil de leer (`req.cookies`).

 * `@types/cookie-parser`: Proporciona el tipado estricto para TypeScript, permitiendo que el compilador reconozca las propiedades de las cookies sin lanzar errores de tipo.

💡 Nota: Al instalar estos paquetes utilizando `docker compose exec backend`, las dependencias se guardan directamente dentro del volumen de `node_modules` del contenedor y se actualiza el archivo `package.json` en tu máquina local automáticamente.

## 🔧 Refactorización del Código: Implementación de Cookies HttpOnly

Con `cookie-parser` ya instalado, procedemos a activarlo a nivel global en nuestra aplicación y a refactorizar el controlador de autenticación para gestionar de forma segura el envío y recepción de los tokens.

---

### 1. `main.ts` — Activación del Middleware global

Para que NestJS comience a interceptar las cabeceras HTTP y a rellenar el objeto `req.cookies` en cada petición, debemos registrar `cookie-parser` en el archivo de arranque de la aplicación:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser'; // 1. Importamos el middleware
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser()); // 2. Lo activamos globalmente antes de cualquier ruta
  
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
```

### 2. `auth.controller.ts` — El nuevo flujo de Tokens
Ahora modificamos el controlador de autenticación. Los cambios clave son:

 * Utilizamos `@Res({ passthrough: true })` para poder inyectar la cookie en la respuesta HTTP sin perder el comportamiento nativo de NestJS (evitando tener que enviar la respuesta con un `res.send()` manual).

 * El cliente ya nunca recibe el `refreshToken` en el cuerpo del JSON. Solo recibe el `accessToken`.

 * Añadimos el endpoint `@Post('logout')` para invalidar la sesión tanto en la base de datos como en el navegador (limpiando la cookie).

Aquí tienes el código completo del controlador refinado:

```ts
import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Res,
  Req,
} from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días (coincide con REFRESH_TOKEN_TTL_DAYS)

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response, // Permite manipular la respuesta Express sin bloquear a NestJS
  ) {
    const { accessToken, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken); // Inyecta la cookie HttpOnly
    return { accessToken }; // Solo devolvemos el accessToken en el JSON
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Extraemos la cookie del objeto req de forma segura gracias a cookie-parser
    const oldRefreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    
    const { accessToken, refreshToken } = await this.authService.refresh(oldRefreshToken);
    this.setRefreshCookie(res, refreshToken); // Rotación de Refresh Token (enviamos uno nuevo)
    return { accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT) // Código 204: Petición exitosa, sin contenido en la respuesta
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    
    // Eliminamos el token de la base de datos para que quede invalidado
    await this.authService.logout(refreshToken);
    
    // Le ordenamos al navegador que destruya la cookie localmente
    res.clearCookie(REFRESH_COOKIE_NAME);
  }

  // Método auxiliar privado para centralizar la configuración de seguridad de las cookies
  private setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE_NAME, token, {
      httpOnly: true,     // Protege contra XSS: invisible para JavaScript
      secure: true,       // Protege el canal de red: solo viaja por HTTPS (gestionado por Nginx)
      sameSite: 'strict', // Protege contra CSRF: solo se envía si la petición nace en nuestro dominio
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
      path: '/api/auth',   // Principio de mínimo privilegio: el navegador solo envía la cookie a endpoints de auth
    });
  }
}
```

### 🔍 Explicación detallada de la Implementación

Para que todo el equipo comprenda el porqué de cada línea en el controlador, desglosamos los puntos clave explicados por nuestra arquitectura:

#### 1. `@Res({ passthrough: true })` — La clave del control híbrido
Cuando inyectas el objeto de respuesta nativo con `@Res()` en NestJS, el framework por defecto asume que tú vas a gestionar todo el ciclo de vida de la petición de forma manual (obligándote a escribir `res.json(...)`, `res.send(...)` y a gestionar los códigos de estado por tu cuenta). 

Al activar el flag **`passthrough: true`**, obtenemos "lo mejor de ambos mundos":
*   Tenemos acceso directo al objeto `res` de Express para realizar tareas específicas (como inyectar la cookie con `res.cookie()`).
*   Dejamos que NestJS siga gestionando automáticamente el ciclo de vida del endpoint, transformando el `return { accessToken }` en una respuesta JSON estructurada de forma nativa.

---

#### 2. Configuración de Seguridad de la Cookie (Flag por Flag)

*   `httpOnly: true`: Es la barrera física contra ataques **XSS**. Ningún script de JavaScript que corra en el navegador (ni siquiera nuestras propias herramientas de desarrollo o código malicioso inyectado) podrá leer o interactuar con esta cookie a través de `document.cookie`.
*   `secure: true`: La cookie solo viajará encriptada a través de conexiones **HTTPS**. Dado que toda nuestra infraestructura local ya está orquestada bajo SSL gracias a Nginx, esto funciona a la perfección. *(Nota de desarrollo: si intentas conectarte directamente al puerto HTTP del backend sin pasar por Nginx, el navegador ignorará la cookie debido a este flag).*
*   `sameSite: 'strict'`: Bloquea por completo los ataques **CSRF**. El navegador tiene prohibido adjuntar esta cookie si la petición HTTP se inicia desde un dominio externo. Incluso si el usuario hace clic en un enlace legítimo que apunte a nuestra app desde un sitio externo, la cookie no se enviará en esa primera carga de página.
*   `path: '/api/auth'`: Aplicamos el principio de mínimo privilegio. La cookie solo se adjuntará en peticiones cuyas rutas comiencen exactamente por `/api/auth` (como `/refresh` o `/logout`). No tiene ningún sentido que el navegador envíe el token de refresco en peticiones destinadas a `/api/users` o al WebSocket del juego, reduciendo drásticamente la exposición del token en la red.

---

### 🧪 ¿Cómo probar el nuevo flujo usando `curl`?

A diferencia de un navegador web, la herramienta **`curl`** no almacena ni envía cookies de forma automática entre peticiones por defecto. Para emular el comportamiento que tendrá nuestro frontend en React, debemos indicarle explícitamente a `curl` dónde guardar y leer las cookies.

#### Paso 1: Login y almacenamiento de la Cookie (`-c`)
Para iniciar sesión y guardar la cookie `HttpOnly` que nos envía el servidor en un archivo temporal llamado `cookies.txt`, añadimos el flag `-c` (cookie-jar):

```bash
curl -k -c cookies.txt -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```
Qué sucede aquí: En la respuesta verás que el cuerpo JSON ahora solo contiene el `accessToken`. El `refreshToken` se ha guardado de forma silenciosa dentro del archivo local `cookies.txt` en tu máquina.

### Paso 2: Refrescar el token leyendo la Cookie (`-b`)
Cuando el `accessToken` expire, el frontend llamará al endpoint de refresco. Para emular esta petición enviando la cookie que acabamos de guardar, utilizamos el flag `-b` (read cookies):

```bash
curl -k -b cookies.txt -X POST https://localhost:8443/api/auth/refresh
```
Qué sucede aquí: NestJS recibirá la cookie automáticamente gracias a `cookie-parser`, validará el token, generará un nuevo par de tokens, actualizará la base de datos, te inyectará una nueva cookie actualizada en el archivo `cookies.txt` y te devolverá el nuevo `accessToken` en el cuerpo del JSON.

---

## 🏆 Conclusión del Sistema de Autenticación y Pruebas de Integración

Tras refactorizar el backend para utilizar **Cookies HttpOnly**, realizamos un proceso de depuración y pruebas de integración extremo a extremo (*End-to-End*). Este análisis nos permitió validar no solo el correcto funcionamiento del código, sino también el comportamiento del sistema ante la pérdida de persistencia (recreación de contenedores).

---

### 🕵️ Crónica de un "Bug Fantasma": El misterio del 401 Unauthorized

Durante las pruebas iniciales con `curl`, el endpoint `POST /api/auth/login` devolvía un código `401 Unauthorized` y la cookie `refreshToken` no se inyectaba en la cabecera `Set-Cookie`. 

#### 1. Diagnóstico del problema:
Al revisar los logs de Nginx y ejecutar una consulta directa en la base de datos PostgreSQL:

```bash
docker compose exec postgres psql -U ft_user -d ft_transcendence -c "SELECT id, email FROM \"User\";"
```

Confirmamos que la tabla de usuarios estaba completamente vacía.

#### 2. La causa raíz:
Durante el desarrollo, comandos destructivos como `docker compose down -v` (usado para limpiar volúmenes de red o corregir el healthcheck de Postgres) o la ejecución de `prisma migrate dev` con recreación de esquema, eliminaron la base de datos física. El usuario de pruebas `test@test.com` ya no existía. Al fallar la autenticación en el servicio, el controlador interceptaba la excepción antes de llegar a la línea encargada de inyectar la cookie.

#### 3. Aprendizaje clave (Fail-Fast):
Este escenario nos obligó a implementar una validación robusta en el método `refresh` de AuthService. Si el cliente no envía la cookie (llega como `undefined`), el sistema aborta la operación inmediatamente con un `401 Unauthorized`, evitando que Prisma intente realizar una consulta fallida (`where: { token: undefined }`) que provocaría una excepción interna de tipo `500`.

🧪 Protocolo de Pruebas Exitosas (Paso a Paso)
Una vez recreado el usuario de pruebas, procedimos a validar de forma estricta todo el ciclo de vida de los tokens empleando `curl` y gestionando el almacenamiento físico de cookies en el cliente.

Paso 1: Registro de un nuevo usuario
Creamos la identidad del jugador en la base de datos:

```bash
curl -k -X POST https://localhost:8443/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123","displayName":"TestPlayer"}'
```

 * Resultado: `201 Created`. El backend devuelve únicamente el `accessToken` en el cuerpo del JSON e inyecta la cookie de refresco en las cabeceras HTTP.

Paso 2: Login con almacenamiento de Cookies (-c)
Iniciamos sesión forzando a curl a escribir las cookies de respuesta en un archivo local llamado `cookies.txt`:

```bash
curl -k -c cookies.txt -X POST https://localhost:8443/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"password123"}'
```

 * Resultado: 200 OK. El archivo cookies.txt ahora contiene la directiva de la cookie:

```bash
# Netscape HTTP Cookie File
# https://curl.se/docs/http-cookies.html
# This file was generated by libcurl! Edit at your own risk.

#HttpOnly_localhost	FALSE	/api/auth	TRUE	1784642922	refreshToken	9868fa2b682cc0de3b4328a3f8305d54240292bdff127eeccc134eba5571d7de5ad2ba8290b55dd3c90272f2bbc14318ae8e8a42fe8438c9f27940ee0cb304d2
```

Paso 3: Acceso a la ruta protegida (`/users/me`)
Extraemos el `accessToken` obtenido en el paso anterior y lo enviamos en la cabecera `Authorization`:

```bash
curl -k https://localhost:8443/api/users/me \
  -H "Authorization: Bearer <accessToken>"
```

 * Resultado: `200 OK`. Retorna la información limpia del usuario actual (excluyendo el hash de la contraseña por motivos de seguridad).

Paso 4: Refresco de sesión con Rotación de Tokens (`-b` y `-c`)
Cuando el `accessToken` expira, solicitamos un nuevo juego de tokens enviando la cookie almacenada (`-b`) y permitiendo que la respuesta actualice nuestro archivo de cookies (`-c`):

```bash
curl -k -b cookies.txt -c cookies.txt -X POST https://localhost:8443/api/auth/refresh
```

 * Resultado: `200 OK`. Recibimos un nuevo `accessToken` en el JSON de respuesta. Si inspeccionamos el archivo `cookies.txt`, vemos que **el valor de** `refreshToken` **ha cambiado por completo**. El servidor ha invalidado el token antiguo en la base de datos y ha generado uno nuevo (Mecanismo de Rotación de Tokens).

Paso 5: Prueba de Re-uso (Protección contra robo de tokens)
Para comprobar que la seguridad de rotación funciona, intentamos hacer un refresco utilizando el token antiguo (guardado previamente en un backup del archivo de cookies antes del paso 4):

```bash
curl -k -b cookies_antiguas.txt -X POST https://localhost:8443/api/auth/refresh
```

 * Resultado: `401 Unauthorized`. El backend detecta que el token enviado ya no es el actual (ha sido marcado como revocado o eliminado de la base de datos), impidiendo que un atacante que haya interceptado un token antiguo pueda generar nuevas sesiones.

📈 Resumen Técnico de lo que hemos construido

| Componente | Qué hace | Garantía de Seguridad |
| :--- | :--- | :--- |
| **`UsersModule`** | Gestiona perfiles y datos de jugadores. | Encapsulación de lógica y desacoplamiento del módulo Auth. |
| **`Safe Selection`** | Filtra campos sensibles en consultas de Prisma. | Inmunidad contra filtraciones accidentales de `passwordHash` al Frontend. |
| **`HttpOnly Cookies`** | Almacena el `refreshToken` fuera del sandbox de JS. | Resistencia total contra robos de sesión mediante ataques **XSS**. |
| **`SameSite: Strict`** | Restringe el envío de cookies a peticiones del mismo dominio. | Protección robusta contra falsificación de peticiones en sitios cruzados (**CSRF**). |
| **`Token Rotation`** | Destruye el `refreshToken` antiguo al generar uno nuevo. | Mitigación del impacto en caso de interceptación física del token. |
| **`Fail-Fast Gate`** | Rechaza peticiones sin cookie de forma preventiva. | Evita errores de ejecución de base de datos en Prisma y caídas del servidor. |

---

















=======================================================================================================
# Frontend

### Dockerfile

**Multi-stage**:
- `development`: servidor de desarrollo de Vite
- `build`: archivos estáticos para futuros despliegues en producción

**Detalles importantes**:

- `--host 0.0.0.0` es obligatorio para Vite; de lo contrario, solo escucha en `localhost` dentro del contenedor y no es accesible para Nginx.

- `CHOKIDAR_USEPOLLING` / `WATCHPACK_POLLING` — para prevenir problemas con el hot-reload a través de volúmenes (especialmente relevante en sistemas de archivos de red del campus).

## 5. Nginx

- **Dockerfile personalizado** (no se usa la imagen `nginx:alpine` directamente) — necesario para incluir el script de entrada (*entrypoint*).

- **entrypoint.sh**: genera un certificado HTTPS autofirmado en el primer arranque si aún no existe (se reutiliza en posteriores reinicios).

- **Configuración en `conf.d/default.conf`**:

  - `/api/` → redirige al backend en el puerto `3000`
  - `/socket.io/` → redirige al backend en el puerto `3000` con cabeceras `Upgrade` y `Connection` (imprescindible para WebSockets) y tiempos de espera (*timeouts*) aumentados (el valor por defecto de 60 segundos es insuficiente para un chat).
  - `/` → redirige al frontend en el puerto `5173`, también con cabeceras `Upgrade` (necesarias para el HMR de Vite).

---


