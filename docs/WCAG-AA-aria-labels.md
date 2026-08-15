# Etiquetas ARIA para botones de solo icono (WCAG 2.1 AA)

Segundo bloque de trabajo dentro del Major de accesibilidad. Cubre el criterio de éxito 4.1.2 (Name, Role, Value) — todo componente de interfaz debe tener un nombre accesible que la tecnología de asistencia pueda anunciar.

## Qué se requería

Un `<button>` con texto visible (`<button>Enviar</button>`) ya tiene un nombre accesible automático — es su propio texto, no hace falta nada más. El problema son los botones cuyo único contenido es un emoji (✎, ✕, 📎, 🔔) — sin texto visible, un lector de pantalla intenta adivinar el nombre a partir de la descripción Unicode del carácter ("pencil", "cross mark"), lo cual no explica la acción real del botón y varía según el lector de pantalla usado.

## Por qué el atributo title (ya usado en varios sitios) no basta por sí solo

title crea una tooltip visual al pasar el ratón por encima, y a veces (sin garantía) algunos lectores de pantalla lo usan como nombre accesible de respaldo. La propia documentación de WCAG desaconseja depender de title como única fuente del nombre accesible, precisamente por esa falta de fiabilidad. La solución: añadir aria-label junto al title ya existente (no en su lugar) — title sigue sirviendo a quien usa ratón, aria-label garantiza el nombre accesible para quien usa un lector de pantalla.

## Cómo se localizaron todos los casos

Búsqueda sistemática en todo el proyecto de líneas que contienen únicamente un carácter de icono, para no depender de la memoria:

```bash
grep -n "^\s*✎\s*$\|^\s*✕\s*$\|^\s*📎\s*$\|^\s*🔔\s*$\|^\s*✉\s*$" archivo.tsx
```

Se encontraron siete botones de solo icono en todo el proyecto. Uno (el botón principal de la campana de notificaciones) ya tenía aria-label de una revisión anterior. Los otros seis se corrigieron:

| Archivo | Icono | Acción |
|---|---|---|
| ChatPage.tsx | ✉ | Enviar mensaje a un amigo |
| ChatPage.tsx | ✕ | Quitar amigo |
| ChatPage.tsx | ✕ | Eliminar mensaje (marcar herejía) |
| ChatPage.tsx | 📎 | Adjuntar archivo |
| HomePage.tsx | ✎ | Cambiar avatar |
| HomePage.tsx | ✕ | Eliminar avatar |

## El cambio, en cada caso

Se añadió aria-label reutilizando exactamente la misma clave de traducción que ya usaba el title correspondiente — no hizo falta ninguna traducción nueva, solo declarar el mismo texto también como nombre accesible:

```tsx
<button
  onClick={() => fileInputRef.current?.click()}
  title={t('home.changeAvatar')}
  aria-label={t('home.changeAvatar')}
>
  ✎
</button>
```

Para los dos casos que usan el componente IconButton, aria-label se pasó como prop normal — el componente ya reenvía cualquier prop no reconocida directamente al button nativo interno, así que no hizo falta modificar el propio componente.

## Verificación de que no quedó ningún caso suelto

Tras la corrección, se repitió la búsqueda ampliándola a otros iconos que podrían haberse usado en algún lugar (🔥, 📄, 🗑, ✏️, ⚙️, 🔍, ❌, ✅) — sin resultados adicionales. Los siete botones de solo icono del proyecto quedan así completamente cubiertos.

## Qué queda pendiente del Major de WCAG 2.1 AA

Regiones "en vivo" (aria-live) para contenido dinámico (mensajes nuevos en el chat, notificaciones, la crónica pública), accesibilidad de formularios, texto alternativo de imágenes, y jerarquía de encabezados.
