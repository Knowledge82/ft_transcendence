# UsersModule — Perfil y avatar

## Qué se implementó

### 1. Actualización de perfil

`PATCH /api/users/me` — permite al usuario actualizar sus datos (por ahora, `displayName`). Usa `UpdateProfileDto` con `@IsOptional()` en cada campo, porque a diferencia del registro, aquí el usuario puede enviar una actualización parcial (solo el campo que quiere cambiar).

### 2. Subida de avatar

`POST /api/users/me/avatar` — primera funcionalidad de subida de archivos del proyecto. Diferencias clave respecto a los endpoints anteriores:

- El `Content-Type` es `multipart/form-data`, no `application/json` — permite enviar archivos binarios junto con campos de texto en una sola petición.
- Se gestiona con **Multer**, la librería estándar de Node.js para procesar este tipo de peticiones, integrada en NestJS mediante `FileInterceptor`.

**Reglas aplicadas:**
- Solo se aceptan imágenes JPEG, PNG o WEBP (`fileFilter`)
- Tamaño máximo: 2 MB (`limits.fileSize`)
- Cada archivo se guarda con un nombre único (`userId-timestamp.ext`) para evitar colisiones entre usuarios o entre subidas sucesivas del mismo usuario

**Dónde se guardan los archivos:** `backend/uploads/avatars/`, montado como *bind mount* en `docker-compose.yml` (`./backend/uploads:/app/uploads`) — así los archivos sobreviven a la reconstrucción de contenedores y son visibles directamente en el sistema de archivos del proyecto, a diferencia de los datos de Postgres (que usan un *named volume*, gestionado internamente por Docker, sin acceso directo desde el host).

**Cómo se sirven:** el backend expone la carpeta `uploads/` como contenido estático (`app.useStaticAssets` en `main.ts`, con prefijo `/uploads`). La URL guardada en base de datos es del tipo `/api/uploads/avatars/archivo.jpg` — el prefijo `/api` hace que la petición pase por el mismo proxy de nginx que el resto del backend (`location /api/`), sin necesidad de una regla de nginx aparte.

## Problemas encontrados

### DTO en la carpeta equivocada

`update-profile.dto.ts` se creó inicialmente dentro de `auth/dto/`, cuando pertenece a `users/dto/` — es el DTO que usa `UsersController`, no `AuthController`. Regla general del proyecto: cada DTO vive junto al controlador que lo usa, no en una carpeta común.

### `req.user` sin tipo definido

Al escribir la función `filename` dentro de la configuración de Multer, TypeScript lanzó dos errores:
- `'req.user' is possibly 'undefined'`
- `Property 'userId' does not exist on type 'User'`

**Causa:** Passport declara globalmente `Express.Request.user`, pero como un tipo `Express.User` **vacío**, pensado para que cada proyecto lo complete con sus propios campos mediante *module augmentation*. Nunca habíamos declarado explícitamente que `Express.User` contiene `userId` y `email` — hasta ahora no había dado problemas porque en otros archivos TypeScript no fue tan estricto verificando la forma exacta del objeto.

**Solución:** se creó `src/types/express.d.ts`:
```typescript
declare global {
  namespace Express {
    interface User {
      userId: number;
      email: string;
    }
  }
}
export {};
```
Esto "fusiona" nuestros campos con la interfaz vacía existente de Passport, en vez de reemplazarla — mecanismo de TypeScript llamado *declaration merging*. Además, se usó `req.user?.userId` (optional chaining) con una comprobación explícita en vez de forzar el tipo con `!`, para manejar con un error claro el caso (improbable, pero posible en teoría) de que el guard no haya poblado `req.user`.

### Confusión entre los dos significados de `volumes` en docker-compose

`docker-compose.yml` usa la palabra `volumes` en dos sitios distintos con significados diferentes:

- **Dentro de un servicio** (`services.backend.volumes`): lista de qué montar y dónde, para ese servicio concreto.
- **En el nivel superior del archivo** (junto a `services:`, no dentro de él): declara *named volumes*, gestionados internamente por Docker.

Error cometido: se colocó la declaración `postgres_data:` (named volume) dentro de la lista `volumes` del servicio `backend`, en vez de como sección independiente al final del archivo. Corrección:

```yaml
services:
  backend:
    volumes:
      - ./backend:/app
      - /app/node_modules
      - ./backend/uploads:/app/uploads
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## Cómo verificar

### Actualizar perfil

```bash
curl -k -b cookies.txt https://localhost:8443/api/users/me \
  -X PATCH \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Nuevo Nombre"}'
```

### Subir avatar

Con curl, la subida de archivos usa el flag `-F` (form data), no `-d`:

```bash
curl -k -b cookies.txt https://localhost:8443/api/users/me/avatar \
  -X POST \
  -F "avatar=@/ruta/a/una/imagen.jpg"
```

El nombre `avatar` antes del `=` debe coincidir exactamente con el que se pasó a `FileInterceptor('avatar', ...)` en el backend — si no coincide, Multer no encuentra el archivo en la petición.

**Respuesta esperada:** el objeto de usuario actualizado, con `avatarUrl` apuntando a `/api/uploads/avatars/<archivo>`.

**Verificación visual:** pegar esa URL completa (`https://localhost:8443/api/uploads/avatars/...`) directamente en el navegador — debería mostrar la imagen subida.

**Casos de error a probar:**
- Subir un archivo que no sea imagen (por ejemplo un `.txt`) → debe devolver `400 Bad Request`
- Subir una imagen de más de 2 MB → debe ser rechazada por el límite de tamaño
