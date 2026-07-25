# UsersModule — Perfil y avatar

## Para qué sirve este módulo

`UsersModule` gestiona todo lo relacionado con los datos del usuario ya autenticado: consultar su perfil, actualizarlo, y subir una foto de perfil. Es distinto de `AuthModule`: `AuthModule` se encarga de **entrar** al sistema (registro, login, tokens); `UsersModule` se encarga de **gestionar los datos** de alguien que ya entró. Todas sus rutas están protegidas con `JwtAuthGuard` a nivel de controlador — nadie sin sesión válida puede tocar nada aquí.

## Los DTOs de este módulo

### `UpdateProfileDto`

```typescript
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(30)
  displayName?: string;
}
```

Define qué datos puede modificar un usuario de su propio perfil, y con qué reglas.

**`@IsOptional()`** es la pieza clave que diferencia este DTO de los de `AuthModule` (`RegisterDto`, `LoginDto`). En el registro, todos los campos son obligatorios — no se puede crear una cuenta sin contraseña. Aquí, en cambio, el usuario puede enviar una actualización **parcial**: solo el campo que quiere cambiar, sin tener que reenviar todos los demás. `@IsOptional()` le dice a `class-validator`: "si este campo no viene en la petición, no es un error; pero si viene, aplícale el resto de reglas (`@IsString`, `@MinLength`, `@MaxLength`)".

Este patrón (`@IsOptional()` en cada campo) es el estándar para cualquier DTO de tipo "actualización parcial" — se repetirá en otros módulos del proyecto cada vez que haya un endpoint tipo `PATCH`.

## Qué es PATCH y por qué se usa aquí

HTTP define varios métodos, cada uno con un significado semántico distinto:

- **`POST`** — crear algo nuevo (usado en `/auth/register`, o para subir el avatar)
- **`GET`** — leer datos, sin modificar nada (`/users/me`)
- **`PUT`** — reemplazar un recurso **completo** por otro
- **`PATCH`** — modificar **parcialmente** un recurso existente

`PATCH /users/me` encaja exactamente con lo que hace este endpoint: el cliente envía solo los campos que quiere cambiar, y el resto del perfil queda intacto. Usar `PUT` aquí sería semánticamente incorrecto, porque `PUT` implica enviar el objeto completo (y cualquier campo omitido debería, en teoría, borrarse o resetearse) — no es el comportamiento que queremos para una edición de perfil.

## Multer — qué es y por qué hace falta

Todos los endpoints anteriores (`register`, `login`, `updateMe`) reciben `Content-Type: application/json` — texto plano estructurado, que NestJS parsea de forma nativa sin ninguna configuración especial. Subir un archivo (la foto de avatar) es distinto: el navegador envía `Content-Type: multipart/form-data`, un formato binario mixto, pensado para poder mandar archivos junto con campos de texto en una sola petición HTTP.

**Multer** es la librería estándar de Node.js para procesar este tipo de peticiones — se encarga de leer el stream binario entrante, separar los distintos campos y archivos, y (en nuestro caso) escribir el archivo en disco. NestJS lo integra mediante `FileInterceptor`, que conecta Multer con el sistema de decoradores de Nest (`@UploadedFile()`).

Instalación:
```bash
npm install multer
npm install --save-dev @types/multer
```
El segundo paquete son solo los tipos de TypeScript para Multer — necesarios para que el editor y el compilador entiendan la forma de los objetos que Multer produce (`Express.Multer.File`, por ejemplo); sin ellos TypeScript trataría todo como `any`.

**Configuración usada para el avatar:**
- `diskStorage` — guarda el archivo directamente en el disco del contenedor (en `uploads/avatars/`), en vez de mantenerlo solo en memoria
- `filename` — genera un nombre único por archivo (`userId-timestamp.ext`), para que dos usuarios (o dos subidas del mismo usuario) nunca se sobrescriban entre sí
- `fileFilter` — rechaza cualquier archivo que no sea JPEG, PNG o WEBP, antes de guardarlo
- `limits.fileSize` — rechaza archivos de más de 2 MB

## `Express.User` — por qué se declaró explícitamente

Passport (la librería de autenticación que usa `@nestjs/passport` por debajo) añade automáticamente un campo `user` al objeto `Request` de Express — es ahí donde queda disponible lo que devuelve `JwtStrategy.validate()` en cada petición autenticada. Pero Passport declara ese campo con un tipo `Express.User` **vacío** a propósito: es una interfaz genérica, pensada para que cada proyecto la complete con la forma real de sus propios datos de usuario.

Declarar esa forma (en `src/types/express.d.ts`) le dice a TypeScript exactamente qué campos tiene `req.user` en todo el proyecto (`userId`, `email`, en nuestro caso), en vez de dejarlo como un tipo vacío o genérico. Esto habilita el autocompletado del editor y la verificación real de tipos en cualquier controlador que use `req.user`, en lugar de tener que forzar el tipo manualmente cada vez.
