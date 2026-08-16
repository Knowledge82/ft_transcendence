# Regiones "en vivo" (aria-live) para contenido dinámico (WCAG 2.1 AA)

Tercer bloque de trabajo dentro del Major de accesibilidad, tras la navegación por teclado y las etiquetas ARIA de los botones de icono.

## El problema, y por qué importa

Un lector de pantalla solo lee lo que la persona navega activamente (con Tab, flechas, u otros comandos). Cuando el contenido de la página cambia por sí solo — llega un mensaje nuevo en el chat, aparece una notificación, falla el envío de un formulario — quien usa un lector de pantalla no tiene ninguna forma de enterarse, a menos que vuelva a comprobar manualmente esa parte de la pantalla. Visualmente el cambio es evidente; para quien no puede verlo, es invisible por completo si no se marca explícitamente.

aria-live="polite" marca una región del DOM cuyos cambios deben anunciarse automáticamente, en cuanto el lector de pantalla esté disponible (sin interrumpir lo que esté leyendo en ese momento).

## Qué SÍ se marcó como "en vivo"

### La lista de mensajes del chat

```tsx
<div className="flex-1 overflow-y-auto p-4 space-y-3" aria-live="polite" aria-relevant="additions">
```

aria-relevant="additions" acota qué tipo de cambio merece un anuncio — solo la llegada de mensajes nuevos, no cualquier cambio dentro de la región (por ejemplo, si un mensaje se marca como leído visualmente, eso no debería generar un anuncio).

### El contador de notificaciones sin leer

En vez de marcar el propio botón de la campana (que ya tiene su aria-label fijo), se añadió una región separada, invisible visualmente pero anunciada por el lector de pantalla:

```tsx
<span className="sr-only" aria-live="polite" aria-atomic="true">
  {unreadCount > 0 ? `${unreadCount} ${t('notifications.title')}` : ''}
</span>
```

aria-atomic="true" asegura que se anuncie la frase completa cada vez ("3 Notificaciones"), no solo el número suelto.

### Los mensajes de error, mediante role="alert"

Para los errores (inicio de sesión fallido, registro rechazado, subida de avatar fallida, artículo rechazado por el Oráculo, campos de formulario no válidos) se usó role="alert" en vez de aria-live manual — es un rol ARIA pensado exactamente para este caso, que ya incluye por sí mismo aria-live="assertive" (interrumpe de inmediato, apropiado para algo que la persona necesita saber ya) y aria-atomic="true", sin tener que declarar ambos atributos por separado.

Se aplicó de forma sistemática, incluyendo el componente compartido FieldError — al corregirlo una sola vez ahí, la mejora se propaga automáticamente a todos los formularios del proyecto que lo usan, sin tocar cada página por separado.

## Qué NO se marcó como "en vivo", y por qué

### El ticker de actividad de la comunidad (ActivityTicker)

Este widget cambia de frase automáticamente cada 7 segundos, de forma indefinida mientras la página esté abierta. Marcarlo como región activa interrumpiría a quien usa un lector de pantalla con un anuncio nuevo cada 7 segundos, para siempre — eso no es una ayuda, es una fuente constante de ruido. Se decidió conscientemente no aplicar aria-live aquí: no todo contenido dinámico merece ser anunciado, especialmente si su valor informativo es bajo (frases decorativas, no datos que la persona necesite conocer con urgencia).

## Cómo se verificó que no quedara ningún caso suelto

Se hizo una búsqueda amplia en todo el proyecto sobre cualquier párrafo con el color de error (text-error-500) que no tuviera ya role="alert" — encontrando tres casos que se habían pasado por alto en una primera pasada (el error de subida de avatar y de cambio de nombre en HomePage, y el error de subida de archivos adjuntos en ChatPage), que se corrigieron de la misma forma. Los demás resultados de esa búsqueda eran falsos positivos: párrafos ya cubiertos por el role="alert" de su contenedor padre, botones que usan el color rojo por diseño sin ser mensajes de error, o simplemente la definición de un color en la paleta de un componente.

## Qué queda pendiente del Major de WCAG 2.1 AA

Texto alternativo de imágenes, y jerarquía de encabezados.
