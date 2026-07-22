# Frontend — Módulo de Autenticación

Documentación de la implementación del frontend de autenticación (login/registro) para que el equipo entienda la arquitectura antes de tocar este código.

## Decisión de arquitectura: dónde se guarda el token de sesión

Antes de escribir código, se decidió **cómo** manejar la sesión del usuario en el navegador, porque esto condiciona toda la estructura:

- **Access token** (vida corta, 15 min): se guarda **solo en memoria** (estado de React), nunca en `localStorage`. Esto lo hace inaccesible para scripts maliciosos inyectados vía XSS.
- **Refresh token** (vida larga, 7 días): viaja como **cookie `httpOnly`**, generada por el backend — inaccesible desde JavaScript por diseño, incluso si hay un XSS.

**Consecuencia práctica:** al recargar la página, el access token en memoria desaparece (es normal, vive solo en el estado de React). Para no obligar al usuario a volver a loguearse en cada recarga, la app hace una petición silenciosa a `/api/auth/refresh` al arrancar — el navegador envía automáticamente la cookie httpOnly, y si es válida, el backend devuelve un nuevo access token sin que el usuario haga nada. Este patrón se conoce como **"silent refresh"**.

## Estructura de archivos

```
frontend/src/
├── api/
│   ├── client.ts           — instancia de axios configurada
│   └── auth.ts             — funciones que llaman a /api/auth/*
├── context/
│   └── AuthContext.tsx     — estado global de autenticación (React Context)
├── components/
│   └── ProtectedRoute.tsx  — bloquea el acceso a rutas si no hay sesión
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   └── HomePage.tsx        — página protegida de ejemplo
└── App.tsx                 — configura el router y envuelve todo con AuthProvider
```

**Criterio de organización:** por rol, no por feature. `api/` es todo lo relacionado con peticiones al backend, `context/` es estado global, `components/` son piezas reutilizables sin URL propia, `pages/` son pantallas completas con su propia ruta.

## `api/client.ts` — cliente HTTP configurado

- `baseURL: '/api'` — evita repetir la URL completa en cada llamada
- `withCredentials: true` — **imprescindible**: sin esto, el navegador no envía la cookie httpOnly del refresh token en las peticiones, aunque sea el mismo origen
- Un interceptor de axios añade automáticamente la cabecera `Authorization: Bearer <token>` a cada petición saliente, usando el access token guardado en una variable de módulo (`setAccessToken`)

## `api/auth.ts` — funciones de petición

Wrappers tipados sobre axios para cada endpoint: `registerRequest`, `loginRequest`, `refreshRequest`, `logoutRequest`. Ninguna maneja estado directamente — solo hacen la petición HTTP y devuelven los datos.

## `context/AuthContext.tsx` — estado global de sesión

Expone, vía el hook `useAuth()`:
- `isAuthenticated` — booleano
- `isLoading` — true mientras se resuelve el refresh silencioso inicial (evita mostrar prematuramente un redirect a `/login` mientras aún no sabemos si hay sesión)
- `login`, `register`, `logout` — funciones que llaman a la API y actualizan el estado

El `useEffect` con dependencias vacías (`[]`) ejecuta el refresh silencioso **una sola vez**, al montar la aplicación — este es el mecanismo que restaura la sesión tras recargar la página.

**Nota de desarrollo:** en modo dev, `React.StrictMode` (activado en `main.tsx`) ejecuta los efectos dos veces intencionadamente, para detectar código con efectos secundarios mal escritos. Por eso es normal ver **dos** peticiones a `/api/auth/refresh` en la pestaña Network al cargar la app por primera vez, ambas con 401 si no hay sesión aún. Esto no ocurre en el build de producción.

## `components/ProtectedRoute.tsx` — guardia de rutas

Envuelve cualquier página que requiera sesión activa:
```tsx
<Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
```
Lógica: si `isLoading`, muestra un estado de carga; si no está autenticado, redirige a `/login` (`<Navigate replace />`, para no ensuciar el historial del navegador); si todo está bien, renderiza el contenido protegido.

## Páginas (`pages/`)

`LoginPage` y `RegisterPage` son formularios controlados (el valor de cada `<input>` vive en el estado de React, no en el DOM). Ambas:
- Llaman a `preventDefault()` en el submit para evitar la recarga de página por defecto del HTML
- Muestran un estado `isSubmitting` para deshabilitar el botón mientras la petición está en curso (evita envíos duplicados)
- Capturan errores del backend (credenciales inválidas, email duplicado) y los muestran al usuario

`HomePage` es una pantalla mínima de prueba, protegida, con un botón de cierre de sesión — sirve para verificar que todo el ciclo funciona de extremo a extremo antes de construir el contenido real (feed, perfil, etc.).

## `App.tsx` — cómo se conecta todo

Jerarquía de componentes (importante: refleja el flujo real de datos y permisos):
```
BrowserRouter
  └── AuthProvider       (todo lo de dentro puede usar useAuth())
        └── Routes
              ├── /login    → LoginPage
              ├── /register → RegisterPage
              └── /         → ProtectedRoute → HomePage
```

## Flujo completo verificado

1. Usuario sin sesión visita `/` → `ProtectedRoute` lo redirige a `/login`
2. Se registra desde `/register` → backend crea el usuario, hashea la contraseña, devuelve `accessToken` en el body y `refreshToken` como cookie httpOnly
3. Redirección automática a `/` → sesión activa, `HomePage` visible
4. Al recargar la página → refresh silencioso restaura la sesión sin pedir contraseña de nuevo
5. Botón "Cerrar sesión" → revoca el refresh token en base de datos, limpia la cookie, `ProtectedRoute` redirige automáticamente a `/login` al detectar `isAuthenticated: false`

## Verificación manual recomendada

En DevTools del navegador:
- **Network**: comprobar que el body de la respuesta de login/register solo contiene `accessToken`, nunca `refreshToken`
- **Application → Cookies**: comprobar que `refreshToken` tiene el flag `HttpOnly` activo

## Pendiente

- Validación de formularios en el frontend más allá de los atributos HTML básicos (`required`, `minLength`) — el enunciado del proyecto exige validación tanto en frontend como en backend
- Diseño visual (por ahora es HTML sin estilos, Tailwind aún no aplicado a estas páginas)
- Manejo de expiración del access token durante el uso de la app (actualmente el refresh solo se dispara al cargar la página, no automáticamente si el access token caduca a mitad de sesión)


[VOLVER](./README.md)

