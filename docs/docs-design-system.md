# Design System — componentes reutilizables

## Qué pide el enunciado

Módulo bonus Minor de la categoría Web: *"Custom-made design system with reusable components, including a proper color palette, typography, and icons (minimum: 10 reusable components)."* La paleta de colores ya estaba definida desde el principio del proyecto (tema oscuro + dorado, Tailwind v4). Lo que faltaba era la parte de **componentes reutilizables**: cada página repetía sus propios botones, campos de formulario y tarjetas con las mismas clases de Tailwind copiadas una y otra vez.

## El problema que resuelve

Antes, una simple actualización visual de un botón habría exigido buscar y modificar manualmente todas las páginas donde aparecía ese mismo bloque de clases repetido. Con componentes compartidos, el estilo vive en un solo sitio, y cada página solo declara qué necesita, no cómo se ve.

## Los 11 componentes

Todos viven en `src/components/ui/`, con un `index.ts` que los reexporta juntos para poder importarlos en una sola línea:

| Componente | Para qué sirve |
| :--- | :--- |
| `Button` | Botón con tres variantes (`primary`, `secondary`, `danger`) |
| `Input` | Campo de texto de una línea, con el estilo de foco estándar |
| `Textarea` | Campo de texto multilínea (usado en el Confesionario) |
| `Card` | Contenedor oscuro con borde redondeado, la base visual de casi todas las páginas |
| `Avatar` | Círculo con imagen o, si no hay avatar, la inicial del nombre como respaldo |
| `StatusDot` | Punto de estado online/offline (verde o gris) |
| `RoleBadge` | Etiqueta del rango del usuario (`HERMANO`/`GUARDIAN`/`ARZOBISPO`) |
| `FieldError` | Mensaje de error bajo un campo de formulario; no renderiza nada si no hay error |
| `LoadingScreen` | Pantalla completa de "Cargando..." |
| `PageContainer` | El envoltorio base (`min-h-screen bg-ink-950`) de cualquier página |
| `IconButton` | Botón de texto pequeño para acciones puntuales (aceptar, quitar, etc.) |

Cada uno acepta las propiedades nativas de su elemento HTML (por ejemplo, `Button` admite `onClick`, `disabled`, `type`, igual que un `<button>` normal) más una clase opcional para ajustes puntuales — así se comportan exactamente como su versión nativa, solo que con el estilo del proyecto ya aplicado.

## Páginas migradas

Se reescribieron usando estos componentes: `LoginPage`, `RegisterPage`, `HomePage`, `ChatPage`, `AdminPage`, `UserProfilePage`, `ConfesionarioPage`, `PrivacyPolicyPage` y `TermsOfServicePage` — prácticamente todas las páginas de la aplicación.

## La excepción deliberada: `LandingPage`

La página de aterrizaje pública, con su animación en varias fases (loader, imagen, texto en cascada) y sus botones con tamaño y animación propios (`animate-[pulse-glow_...]`), se dejó fuera a propósito. Forzar su contenido a encajar en los componentes compartidos habría exigido sobrescribir estilos base de forma poco fiable, sin aportar ningún beneficio real: es una página única en todo el proyecto, no un patrón que se repita en ningún otro sitio. Un design system existe para eliminar repetición, no para que todo el código pase por los mismos componentes sin excepción.


[VOLVER](../README.md)
