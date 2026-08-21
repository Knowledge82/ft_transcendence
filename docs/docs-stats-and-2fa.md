# Analíticas de actividad y verificación en dos pasos (2FA)

Cierra los dos últimos Minors pendientes del módulo de User Management. A diferencia de otras piezas del proyecto, aquí no había ninguna duda temática que resolver — ambas son funcionalidades bastante estándar, así que el trabajo se centró en decisiones de alcance y en un par de sorpresas técnicas por el camino.

## Panel de analíticas de actividad

### El primer dilema: ¿para quién es esta panel?

El enunciado habla de "un panel de analíticas de actividad de usuario" sin especificar más. Se decidió construir dos versiones en paralelo, cada una con un propósito distinto: una panel personal (en /celda, visible para cualquiera sobre su propia cuenta) y una panel administrativa (en /santuario, solo para el Arzobispo, con datos agregados de todo el Capítulo).

### Un ajuste sobre la marcha: el número de mensajes no es una buena métrica

La primera propuesta incluía el número de mensajes enviados como indicador de actividad personal. Se descartó porque mide una sola acción concreta (participar en el chat), no la actividad general de la persona. En su lugar se usa el número de inicios de sesión — y aquí hubo un pequeño golpe de suerte: cada login exitoso ya crea una fila nueva en la tabla de tokens de renovación, así que contar accesos no exigió ningún campo ni tabla nueva, solo un count() sobre una tabla que ya existía por completo.

### Contenido final de cada panel

Personal: número de accesos, número de tratados escritos, y la fecha de alta ("En el Capítulo desde...").

Administrativa: usuarios agrupados por rango, un gráfico de barras con los registros de los últimos 7 días (con ceros explícitos en los días sin ninguno, para que el gráfico no tenga huecos), total de tratados, total de facciones y de sus miembros, y un top 5 de las personas con más accesos.

### El backend

Se reutilizaron los módulos ya existentes en vez de crear uno nuevo dedicado a "analíticas" — getUserStats vive en UsersService, getAdminStats en AdminService, cada uno junto a la lógica con la que ya comparte responsabilidad. La parte más particular es cómo se construyen los 7 días del gráfico: se generan primero los 7 huecos vacíos (hoy y los seis anteriores, todos en cero), y solo después se rellenan con los registros reales encontrados — así el frontend siempre recibe una serie completa, sin fechas ausentes que romperían el eje del gráfico.

### El frontend

Se instaló recharts para el gráfico de barras. El panel administrativo vive en su propio componente, AdminStatsPanel, separado de AdminPage para no sobrecargar un archivo que ya era considerable. Un detalle de internacionalización: el gráfico se fuerza a disposición LTR (dir="ltr") incluso cuando la interfaz está en árabe — los ejes y las cifras siguen la misma convención que el resto de los números en la aplicación, que ya se mantienen en LTR en todo el proyecto.

## Verificación en dos pasos (2FA)

### La decisión de diseño más importante: 2FA y el inicio de sesión con 42

La aplicación tiene dos caminos de entrada: contraseña y OAuth con 42. Si la 2FA solo protegiera el camino de la contraseña, cualquiera con acceso a la cuenta de 42 de una persona podría saltarse la verificación por completo, entrando por la otra puerta. Se decidió, de forma consciente, restringir la 2FA únicamente a cuentas con contraseña — es una limitación honesta y visible (la propia pantalla de configuración explica por qué no está disponible en cuentas vinculadas solo a 42), en vez de dar una falsa sensación de seguridad a una cuenta que en realidad seguiría siendo vulnerable por el otro camino.

### El mecanismo: TOTP, reutilizando un patrón que ya existía

Se eligieron códigos TOTP (aplicaciones como Google Authenticator o Authy) en vez de SMS, ya que el proyecto no tiene ninguna infraestructura de envío de mensajes de texto. El flujo de login con una cuenta protegida por 2FA reutiliza exactamente el mismo patrón de "token pendiente de corta duración" que ya se había construido para el registro con 42: la contraseña correcta no basta por sí sola, así que en vez de emitir los tokens reales se firma un token de solo 5 minutos, y solo tras verificar el código TOTP correcto se emiten los tokens de sesión de verdad.

### Los cuatro endpoints nuevos

POST /auth/2fa/setup genera un secreto y su código QR, pero todavía no activa nada. POST /auth/2fa/confirm exige un código real generado desde la aplicación de autenticación recién configurada — solo entonces se activa de verdad, para asegurarse de que la persona configuró todo correctamente antes de depender de ello. POST /auth/2fa/disable exige la contraseña actual para desactivarla. POST /auth/2fa/verify es el segundo paso del login, recibiendo el token pendiente más el código.

### El frontend: un formulario de login en dos pasos

LoginPage ahora puede mostrar dos pantallas distintas dentro del mismo componente: el formulario habitual de email/contraseña, y —solo si la cuenta tiene 2FA activada— una segunda pantalla pidiendo el código de 6 dígitos. La nueva página /seguridad gestiona todo el ciclo de vida: muestra el código QR y el secreto en texto (por si no se puede escanear), pide un código de confirmación antes de activar, y permite desactivar con la contraseña.

### Un imprevisto durante el desarrollo: una librería cambió su API entera a mitad del trabajo

La primera implementación se escribió contra la API clásica de otplib (authenticator.generateSecret(), .keyuri(), .verify()). Al instalar la librería, sin embargo, se descargó automáticamente su versión más reciente — la 13 — que había reestructurado por completo su forma de exportar funciones, sustituyendo aquel objeto único por funciones sueltas (generateSecret, generateURI, verify), y convirtiendo además verify en una función asíncrona que devuelve { valid, delta } en vez de un simple booleano. Se detectó al inspeccionar directamente los tipos ya instalados en node_modules, y se reescribió la integración contra la API real, no la que se esperaba por la documentación aprendida de antemano — un recordatorio de que las versiones de las dependencias no siempre coinciden con lo último conocido en el momento de escribir el código.

## Resumen de archivos tocados

Backend: schema.prisma (campos twoFactorSecret/twoFactorEnabled), users.service.ts, users.controller.ts, admin.service.ts, admin.controller.ts, auth.service.ts, auth.controller.ts.

Frontend: api/users.ts, api/admin.ts, api/auth.ts, AuthContext.tsx, HomePage.tsx, AdminPage.tsx, AdminStatsPanel.tsx (nuevo), LoginPage.tsx, TwoFactorSetupPage.tsx (nuevo), routes.ts, App.tsx, tres archivos de idioma.
