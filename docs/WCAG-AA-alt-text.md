# Texto alternativo para contenido no textual (WCAG 2.1 AA — 1.1.1)

Cuarto bloque de trabajo del Major de accesibilidad, tras la navegación por teclado, las etiquetas ARIA de iconos, y las regiones "en vivo".

## Qué exige el criterio

Todo contenido no textual (imágenes, iconos gráficos, etc.) debe tener una alternativa textual equivalente: una imagen con significado necesita un alt que lo describa; una imagen puramente decorativa necesita alt="" para que el lector de pantalla la ignore por completo en vez de intentar describir algo sin valor informativo.

## Metodología: revisión guiada por búsqueda, no por memoria

En vez de repasar archivo por archivo de memoria, se usó una búsqueda sistemática en el propio proyecto para localizar cada fuente posible de contenido no textual:

```bash
grep -rn "<img" frontend/src --include="*.tsx"
grep -rn "backgroundImage" frontend/src --include="*.tsx"
grep -rn "<svg" frontend/src --include="*.tsx"
```

## Lo que se encontró y cómo se resolvió cada caso

### Etiquetas img (cinco en total)

- PageContainer.tsx (los dos monjes decorativos a los lados): ya tenían alt="" aria-hidden="true" — correcto, doble protección para una imagen puramente ornamental.
- RandomArticles.tsx (el pergamino del widget): alt="" — correcto también, pero por otra razón: el título del artículo ya aparece como texto visible justo al lado, dentro del mismo enlace — repetirlo en el alt sería redundante.
- ChatPage.tsx (adjuntos de imagen en el chat): alt={message.attachmentName ?? t('chat.attachment')} — ya usaba el nombre real del archivo cuando existía, con una traducción genérica de respaldo.
- Avatar.tsx — este sí tenía un problema real: el alt estaba fijado a la cadena literal "Avatar", igual para cualquier persona. Con varias fotos de perfil en pantalla a la vez (la lista de amigos, los miembros de un canal), un lector de pantalla anunciaría "Avatar", "Avatar", "Avatar"... sin forma de distinguir de quién es cada una.

  Revisando el componente se descubrió la causa: recibía una prop fallbackText (el nombre o email de la persona) que ya se pasaba desde todos los sitios donde se usa el componente, pero el propio componente nunca la usaba — un resto de una versión anterior (cuando fallbackText servía para mostrar una inicial dentro de un círculo, antes de introducir el avatar por defecto). Se corrigió para usarla como alt:

  ```tsx
  export function Avatar({ avatarUrl, fallbackText, size = 96 }: AvatarProps) {
    return <img src={avatarUrl ?? '/default-avatar.png'} alt={fallbackText} ... />;
  }
  ```

  Al ser un componente compartido, la corrección se propaga automáticamente a cada lugar donde se usa, sin tocar ninguna otra página.

### Imagen de fondo por CSS (background-image)

Un único caso: la catedral de fondo en LandingPage. A diferencia de una etiqueta img (que el navegador expone por defecto al árbol de accesibilidad, y por tanto necesita un alt="" explícito para ocultarla si es decorativa), una imagen de fondo definida por CSS es invisible para un lector de pantalla desde el principio — no hace falta ninguna marca adicional para lograr el mismo resultado que buscábamos con alt="". Se confirmó además que el contenido es puramente atmosférico: todo el significado de la página ya está transmitido por el texto del manifiesto, no se pierde ninguna información al no describir la imagen.

### Iconos SVG

Ninguno en todo el proyecto — los iconos se implementan con caracteres emoji (✎, ✕, 📎, 🔔, ✉), que son texto Unicode, no "contenido no textual" en el sentido de este criterio. Su accesibilidad ya se resolvió por otra vía (las etiquetas aria-label en los botones que los contienen).

## Estado

Con la revisión de las tres categorías completa y sin más resultados pendientes, el criterio 1.1.1 se considera cerrado.

## Qué queda pendiente del Major de WCAG 2.1 AA

Jerarquía de encabezados, y la verificación real con una herramienta de auditoría (Lighthouse o axe DevTools) contra la aplicación en funcionamiento.
