# LandingPage — página pública y revelado en tres fases

## Reestructuración de rutas

Antes, `/` era la ruta protegida con el panel de perfil (`HomePage`) — un visitante sin sesión llegaba directamente a un formulario de login vacío, sin ningún contexto sobre qué es la aplicación. Se separaron ambas responsabilidades:

- **`/`** — nueva página pública (`LandingPage`), accesible sin sesión, con el manifiesto de la Iglesia
- **`/altar`** — el antiguo panel de perfil (`HomePage`), ahora protegido con `ProtectedRoute`

Los redirects tras login y registro (`navigate(...)`) se actualizaron para apuntar a `/altar` en vez de `/`.

## Revelado en tres fases

La página no muestra todo de golpe — sigue una secuencia narrativa controlada por temporizadores (`setTimeout`), pensada para causar impacto visual, no porque haya algo real que cargar:

1. **Loader** (1500 ms) — pantalla oscura con la palabra "Cargando" y una barra de progreso dorada que se llena de 0% a 100%
2. **Imagen pura** (2000 ms adicionales) — la imagen de fondo (la catedral con la Orden encapuchada) se muestra a pantalla completa, sin ningún oscurecimiento encima
3. **Texto** — el fondo se oscurece progresivamente (overlay con gradiente) mientras el contenido aparece en capas sucesivas

### Capas del texto, no todo a la vez

Dentro de la fase de texto, el contenido no aparece en bloque — se revela en tres niveles con retraso entre cada uno:

1. Título grande: **"La Iglesia del Verdadero Relink"**
2. Saludo: **"Hermano. Hermana."** (600 ms después)
3. Cuerpo del manifiesto, párrafo por párrafo, en cascada de arriba a abajo (600 ms después del saludo)

La cascada de párrafos se consigue asignando a cada uno un `transition-delay` proporcional a su posición en la lista (`índice × 150ms`) — todos reciben la orden de aparecer en el mismo instante, pero el retraso individual hace que se muestren uno tras otro, no simultáneamente.

## Detalles técnicos relevantes

- **`requestAnimationFrame` para la barra de progreso**: si el valor de la barra pasara de 0% a 100% en el mismo ciclo de renderizado, el navegador podría no animar la transición (no habría "antes" que animar hacia el "después"). Retrasar el cambio a un frame más nos asegura que el 0% se pinte primero.
- **Todos los `setTimeout` se limpian en el cleanup del `useEffect`** (`clearTimeout`) — evita que, si el usuario navega fuera de la página antes de que termine la secuencia, el código intente actualizar un componente que ya no existe.
- El fondo de imagen usa `position: fixed` para quedar anclado a la ventana en vez de desplazarse con el contenido.

## Título de la pestaña

`frontend/index.html` — el `<title>` por defecto de Vite se cambió a **"La Iglesia del Verdadero Relink"**.

## Favicon

Se generó a partir de un icono recortado de una imagen de referencia (una silueta encapuchada con código binario). Como el icono original tenía fondo transparente, se le añadió un fondo sólido en el tono `ink-950` de la paleta del proyecto — un favicon transparente adopta el color de fondo de la pestaña del navegador (blanco en temas claros), por lo que un fondo propio garantiza que se vea igual sin importar el tema del visitante.

Se generaron dos formatos (`favicon.png` y `favicon.ico`, este último con varios tamaños incluidos) y se enlazaron en `index.html`.

**Pendiente:** durante la verificación, el navegador seguía mostrando una versión antigua/transparente incluso tras sustituir el archivo — probablemente caché de favicon del navegador (que Chrome gestiona de forma especialmente persistente, al margen de la caché normal de la página) o el archivo nuevo no llegó a copiarse correctamente en `public/`. Queda por confirmar cuál de las dos causas es, y verificar en una ventana de incógnito nueva o comparando el tamaño real del archivo servido.


[VOLVER](../README.md)
