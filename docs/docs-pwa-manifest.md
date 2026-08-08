# PWA — Progressive Web App (instalabilidad)

## Qué pide el enunciado

Módulo bonus Minor de la categoría Web: *"Progressive Web App (PWA) with offline support and installability."* Se decidió cubrir solo la parte de **instalabilidad** — que el sitio se pueda instalar como una aplicación — y no la parte de soporte offline completo (que requeriría un Service Worker con estrategias de caché, mucho más trabajo para un proyecto que depende de tiempo real vía WebSockets, donde "funcionar sin conexión" tiene poco sentido práctico).

## Para qué sirve esto en la práctica

Sin manifest, el sitio es solo una pestaña más del navegador. Con él, el navegador ofrece un botón de "Instalar" — una vez instalada, la aplicación se abre en su propia ventana, sin la barra de direcciones del navegador, con su propio icono en el escritorio o en la pantalla de inicio del móvil. Visualmente deja de parecer una web y pasa a parecer una aplicación real.

## Cómo se hizo

### El archivo `manifest.json`

```json
{
  "name": "La Iglesia del Verdadero Relink",
  "short_name": "Verdadero Relink",
  "start_url": "/celda",
  "display": "standalone",
  "background_color": "#0b0a0f",
  "theme_color": "#0b0a0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- `start_url: "/celda"` — al abrir la app instalada, entra directo al panel de perfil, no al manifiesto público de la landing page (quien instala la app ya suele tener sesión iniciada).
- `display: "standalone"` — el campo que realmente hace que se vea como una app: oculta la interfaz propia del navegador.
- `icons` — dos tamaños mínimos (192px y 512px), el navegador elige cuál usar según el contexto (escritorio, icono de app, etc.).

### Enlace desde `index.html`

```html
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#0b0a0f" />
```

El `<link>` es lo que le indica al navegador que el sitio tiene un manifest disponible — sin esto, aunque el archivo exista, el navegador nunca lo lee. El `theme-color` es independiente del manifest y afecta a elementos del propio navegador (como la barra superior en Chrome para Android) incluso antes de instalar nada.

## Un detalle sobre los iconos: la transparencia real

Al generar los iconos a partir de una imagen subida, hubo que comprobar de verdad si el archivo tenía transparencia utilizable, en vez de asumirlo por el modo de la imagen (`RGBA`). Un archivo puede estar en modo `RGBA` y aun así no tener ningún píxel realmente transparente (canal alfa siempre al máximo). Se verificó leyendo directamente los valores del canal alfa antes de decidir si rellenar el fondo o conservarlo transparente — evitando repetir un error de una iteración anterior del favicon, donde se asumió incorrectamente que hacía falta rellenar el fondo.

## Aviso cosmético en DevTools (no es un error real)

Chrome puede mostrar un aviso en la pestaña Application → Manifest: *"Richer PWA install UI won't be available on desktop"*. No es un fallo — solo indica que, para mostrar una tarjeta de instalación más vistosa (con capturas de pantalla, como en una app store), faltaría añadir un campo `screenshots` al manifest. La instalabilidad básica (el requisito real del enunciado) ya funciona sin eso; se dejó pendiente como mejora puramente visual para una fase de pulido posterior.


[VOLVER](../README.md)
