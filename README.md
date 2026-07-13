# 🛠️ Progreso del trabajo — ft_transcendence, infraestructura + Auth

## 1. Arquitectura y Stack

**Tema**: red social "Iglesia del Verdadero Relink" — perfiles, rangos/roles, chat, donaciones, más adelante bot LLM y juego de cartas.

**Stack**:
- **Backend**: NestJS
- **Frontend**: React + TypeScript + Vite
- **Base de datos**: PostgreSQL + Prisma ORM
- **Tiempo real**: Socket.IO
- **Infraestructura**: Docker Compose + Nginx

**Plan modular para bonificaciones**: ~28+ puntos sin el juego (Web, User Management, AI, Data & Analytics, DevOps). El juego se abordará en una fase posterior.

---

## 2. Docker Compose — Infraestructura base

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

## 3. Backend — Dockerfile

**Multi-stage**:
- `development`: hot-reload mediante `npm run start:dev --watch`
- `production`: compilación para futuros despliegues

**Detalles importantes**:

- `apk add openssl` — obligatorio para el motor de consultas (query engine) de Prisma en Alpine; sin esto, `prisma generate` falla.

- `app.listen(port, '0.0.0.0')` — imprescindible; de lo contrario, el backend no es accesible desde la red de contenedores.

- **Prisma fijado a la versión 6** (`--save-exact`): Prisma 7 (lanzada en noviembre de 2025) rompió la sintaxis `url = env("DATABASE_URL")` en `schema.prisma`, exigiendo `prisma.config.ts` y adaptadores de driver.

- **Script de entrada (entrypoint.sh)**: ejecuta `prisma migrate deploy` antes de iniciar la aplicación. Se usa `exec "$@"` para garantizar que las señales se transmitan correctamente al proceso principal.

## 4. Frontend — Dockerfile

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


