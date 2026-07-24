# Tailwind CSS — guía y paleta del proyecto

## Qué es Tailwind CSS

Tailwind es un framework CSS **utility-first**. A diferencia de frameworks como Bootstrap, que dan componentes ya hechos con su propio estilo visual (`<button class="btn btn-primary">`), Tailwind da un conjunto enorme de clases pequeñas, cada una haciendo una sola cosa (`flex`, `p-4`, `text-lg`, `rounded-md`), que se combinan directamente en el HTML/JSX para construir el diseño.

**Ejemplo de la diferencia:**

```html
<!-- Enfoque tradicional: clase con nombre, estilos en un archivo CSS aparte -->
<button class="btn-primary">Entrar</button>
```
```css
.btn-primary {
  background: #d4af37;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
}
```

```html
<!-- Enfoque Tailwind: todo el estilo vive en la propia clase -->
<button class="bg-gold-500 text-white px-4 py-2 rounded-md">Entrar</button>
```

**Ventaja principal:** no hay que inventar nombres de clases (`.btn-primary`, `.card-header`...) ni saltar entre el archivo JSX y un archivo CSS aparte para saber qué aspecto tiene algo — el estilo está justo donde se usa.

## Diferencias entre v3 y v4

Usamos **Tailwind v4** (la versión más reciente). Diferencias clave respecto a v3, que es la que más tutoriales y ejemplos tiene en internet:

| | v3 | v4 |
|---|---|---|
| Configuración | Archivo `tailwind.config.js` en JavaScript | Directamente en CSS, con la directiva `@theme` |
| Integración con Vite | Requiere PostCSS configurado aparte | Plugin oficial (`@tailwindcss/vite`), una línea en `vite.config.ts` |
| Activación | Tres directivas: `@tailwind base; @tailwind components; @tailwind utilities;` | Una sola línea: `@import "tailwindcss";` |
| Motor | PostCSS + JS | Motor propio en Rust (Lightning CSS), más rápido |

**Por qué elegimos v4 para este proyecto:** menos archivos de configuración que mantener, y el equipo entero trabaja directamente en CSS en vez de tener que entender un archivo de configuración JavaScript aparte.

## Cómo se define la paleta personalizada (`src/index.css`)

```css
@import "tailwindcss";

@theme {
  --color-ink-950: #0b0a0f;
  --color-ink-900: #17151d;
  --color-ink-800: #2a2732;

  --color-gold-400: #e8c766;
  --color-gold-500: #d4af37;
  --color-gold-on: #2c2205;

  --color-cream-100: #f5f0e8;
  --color-cream-400: #9c96a8;

  --color-error-500: #e85d5d;
}
```

La directiva `@theme` es la forma que tiene Tailwind v4 de declarar tokens de diseño personalizados directamente en CSS (en v3 esto se hacía en `theme.extend.colors` dentro de `tailwind.config.js`). **Cada variable `--color-NOMBRE` se convierte automáticamente en clases de utilidad**: `--color-gold-500` genera `bg-gold-500`, `text-gold-500`, `border-gold-500`, etc., sin que haya que declarar cada una por separado.

## Nuestra paleta — "La Iglesia del Verdadero Relink"

| Token | Valor | Uso |
|---|---|---|
| `ink-950` | `#0B0A0F` | Fondo principal de la página |
| `ink-900` | `#17151D` | Fondo de tarjetas/superficies elevadas |
| `ink-800` | `#2A2732` | Bordes sutiles sobre fondo oscuro |
| `gold-500` | `#D4AF37` | Acento principal — botones, enlaces, elementos destacados |
| `gold-400` | `#E8C766` | Estados hover/activo del dorado |
| `gold-on` | `#2C2205` | Texto sobre fondo dorado (nunca blanco puro sobre dorado — bajo contraste) |
| `cream-100` | `#F5F0E8` | Texto principal |
| `cream-400` | `#9C96A8` | Texto secundario, placeholders, etiquetas |
| `error-500` | `#E85D5D` | Mensajes de error |

## Por qué esta paleta

**Oscuro + dorado** encaja con la temática satírica del proyecto — culto, ritual, jerarquía — sin caer en algo infantil o genérico. Algunas decisiones concretas:

- **Fondo casi negro, no negro puro** (`#0B0A0F` en vez de `#000000`): el negro absoluto resulta plano y cansa la vista en superficies grandes; un tono muy oscuro con un matiz mínimo da más profundidad.
- **Dos tonos de fondo** (`ink-950` para la página, `ink-900` para las tarjetas): permite distinguir visualmente una tarjeta (como el formulario de login) del fondo general, sin necesidad de sombras o bordes gruesos.
- **Dorado, no amarillo puro**: el dorado (`#D4AF37`) tiene una connotación de "ceremonial/valioso" que un amarillo saturado no transmite — encaja con la estética de culto/iglesia.
- **`gold-on` para texto sobre dorado**: el texto negro puro o blanco puro sobre un fondo dorado da bajo contraste o se ve mal; un marrón muy oscuro extraído de la misma familia de color mantiene la cohesión visual y cumple con contraste accesible.
- **Texto crema, no blanco puro**: un blanco `#FFFFFF` sobre fondo muy oscuro genera demasiado contraste y cansa en lecturas largas; un tono cálido y ligeramente apagado es más cómodo.

## Cómo se usa en componentes

```tsx
<div className="bg-ink-950 min-h-screen">
  <div className="bg-ink-900 border border-ink-800 rounded-xl p-8">
    <button className="bg-gold-500 text-gold-on hover:bg-gold-400">
      Entrar
    </button>
  </div>
</div>
```

## Estado

Paleta aplicada a `LoginPage`, `RegisterPage` y `HomePage`. El resto de la aplicación (a medida que se construya) debe usar estos mismos tokens en vez de colores sueltos, para mantener consistencia visual.
