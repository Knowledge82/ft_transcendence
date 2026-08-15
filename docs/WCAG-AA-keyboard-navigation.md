# Navegación por teclado (WCAG 2.1 AA)

Primer bloque de trabajo dentro del Major de accesibilidad (WCAG 2.1 AA). Cubre los criterios de éxito 2.1.1 (Keyboard), 2.1.2 (No Keyboard Trap) y 2.4.7 (Focus Visible).

## Qué exige el estándar

- Toda la funcionalidad del sitio debe poder usarse solo con teclado (Tab, Shift+Tab, Enter, Espacio, Esc), sin necesidad de ratón.
- Ningún elemento debe "atrapar" el foco de teclado sin una forma clara de salir.
- Todo elemento que reciba el foco debe mostrar un indicador visual claro de que está enfocado.

## 1. Indicador de foco global

Antes, el foco visible dependía del estilo por defecto de cada navegador — inconsistente, y en varios botones de icono (el lápiz del avatar, la campana de notificaciones, el aspa de eliminar mensaje) no había ningún estilo propio que lo garantizara. Se añadió una única regla CSS global:

```css
:focus-visible {
  outline: 2px solid var(--color-gold-500);
  outline-offset: 2px;
  border-radius: 2px;
}
```

Se usa `:focus-visible` en vez de `:focus` — esta variante moderna del selector solo se activa cuando el elemento recibe el foco por teclado (Tab), no al hacer clic con el ratón. Así se evita el efecto "anillo dorado en cada clic" y el indicador aparece exactamente donde hace falta: para quien navega sin ratón. Al ser una regla global, cubre automáticamente todos los elementos interactivos del proyecto — no hizo falta tocar componente por componente.

## 2. Auditoría de elementos "clicables" que no son realmente interactivos

Un patrón común (y accesible por completo) que rompe la navegación por teclado: usar onClick sobre una etiqueta que el navegador no considera enfocable por sí sola — un div, un h1, un span. Estos elementos no reciben foco con Tab ni se activan con Enter, aunque visualmente parezcan un botón.

Se hizo una búsqueda sistemática en todo el proyecto (grep sobre patrones div, luego una segunda pasada más amplia sobre h1–h6, span, p, td, tr, img, li seguidos de onClick). Se encontró un caso real: el nombre del perfil en /celda, que abre el modo de edición al hacer clic, estaba implementado como:

```tsx
<h1 onClick={() => setIsEditingName(true)}>...</h1>
```

### La corrección

Se mantiene el h1 (importante para la navegación por encabezados de un lector de pantalla), pero el elemento que realmente responde al clic pasa a ser un button real anidado dentro:

```tsx
<h1 className="text-2xl font-semibold mb-1">
  <button
    onClick={() => setIsEditingName(true)}
    className="bg-transparent border-0 p-0 text-2xl font-semibold text-gold-500 cursor-pointer hover:underline"
    title={t('home.editNameHint')}
  >
    {profile.displayName ?? t('home.noName')}
  </button>
</h1>
```

El button trae estilos por defecto del navegador (fondo, borde, relleno) que había que anular explícitamente (bg-transparent border-0 p-0) para que el resultado visual fuera idéntico al h1 de texto plano de antes — el cambio es puramente de accesibilidad, no debía notarse visualmente.

Tras la corrección, se repitió la búsqueda ampliada sobre todo el proyecto — sin más resultados reales (los seis casos que aparecieron eran falsos positivos: botones auténticos situados cerca de una etiqueta no interactiva en el marcado, no clics sobre la etiqueta en sí).

## 3. Cierre por teclado del panel de notificaciones

El panel desplegable de NotificationBell solo se cerraba al hacer clic fuera de él (un listener de mousedown sobre document) — quien navega solo con teclado no tiene forma de "hacer clic fuera", así que no tenía ninguna manera de cerrar el panel una vez abierto. Se añadió el cierre con la tecla Escape, el mismo comportamiento esperado en cualquier menú o diálogo nativo:

```typescript
function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    setIsOpen(false);
  }
}
document.addEventListener('keydown', handleEscape);
```

## Qué no hizo falta tocar

Prácticamente todos los elementos interactivos del proyecto ya estaban construidos con etiquetas nativamente accesibles (button, Link, input, select, textarea), que el navegador ya hace alcanzables y operables por teclado sin ningún trabajo adicional. La auditoría confirmó que el único caso problemático real era el del nombre del perfil.

## Qué queda pendiente del Major de WCAG 2.1 AA

Etiquetas ARIA para botones de solo icono, regiones "en vivo" (aria-live) para contenido dinámico (chat, notificaciones, la crónica pública), accesibilidad de formularios, texto alternativo de imágenes, y jerarquía de encabezados.
