# Internacionalización (i18n) — resumen del trabajo realizado

## Idiomas elegidos y por qué

Tres idiomas: español (idioma original del proyecto), inglés, y árabe. El árabe se eligió deliberadamente porque el enunciado exige, además de soporte multi-idioma, soporte RTL (right-to-left) para al menos un idioma — usar el árabe como uno de los tres cubre ambos requisitos a la vez, sin duplicar esfuerzo.

## Instalación

```bash
docker compose exec frontend npm install react-i18next i18next
```

Dos paquetes: `i18next` es el motor de traducción (independiente de framework), `react-i18next` es la capa que lo conecta a React mediante hooks y componentes.

## Cómo funciona el sistema

### Las frases viven en archivos JSON, no en el código

```
frontend/src/i18n/
├── i18n.ts              ← configuración
└── locales/
    ├── es.json
    ├── en.json
    └── ar.json
```

Los tres archivos tienen exactamente la misma estructura de claves (`"chat.send"`, `"register.title"`, etc.) — solo cambian los valores. En vez de escribir texto directamente en el JSX (`<button>Enviar</button>`), se usa una clave (`<button>{t('chat.send')}</button>`).

### La configuración (`i18n.ts`)

```typescript
i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: savedLanguage, // el idioma guardado de una visita anterior
  fallbackLng: 'es',
});
```

También aquí se gestiona el cambio de dirección del documento (`document.documentElement.dir`) cada vez que el idioma cambia — esto es lo que realmente activa el layout RTL para el árabe, no solo el contenido del texto.

### El hook `useTranslation`

```tsx
import { useTranslation } from 'react-i18next';

export function AlgunaPagina() {
  const { t, i18n } = useTranslation();
  return <button>{t('chat.send')}</button>;
}
```

`t()` devuelve el texto traducido según el idioma activo. `i18n` da acceso al idioma actual (`i18n.language`) y al método para cambiarlo (`i18n.changeLanguage('en')`). Cuando el idioma cambia, `react-i18next` vuelve a renderizar automáticamente todos los componentes que usan `t()` — no hace falta ninguna lógica adicional por nuestra parte.

### El componente `<Trans>` para texto con elementos incrustados

Algunos párrafos (por ejemplo en la landing page) mezclan texto normal con fragmentos de código (`<code>make</code>`). Para esos casos se usa `<Trans>` en vez de `t()`:

```tsx
<Trans i18nKey="landing.p2" components={[<code className={codeClass} key="c0" />]} />
```

La traducción en el JSON contiene un marcador `<0>...</0>` que se sustituye por el elemento indicado en `components`.

### El interruptor de idioma (`LanguageSwitcher`)

Tres botones en forma de cápsula (ES / EN / ع), visibles en cada página traducida. Guarda la elección en `localStorage`, así que persiste entre visitas.

## Qué está traducido

Todas las páginas de la aplicación: `LandingPage`, `LoginPage`, `RegisterPage`, `HomePage`, `ChatPage`, `AdminPage`, `UserProfilePage`, `ConfesionarioPage`, las tres páginas de la Biblioteca (listado, detalle, formulario de escritura/edición), `PrivacyPolicyPage` y `TermsOfServicePage`. También componentes compartidos: `LoadingScreen`, `BackLink`, y los encabezados de los widgets de `/celda`.

### Bugs encontrados y corregidos durante el proceso

- `BackLink` tenía `"← Volver"` como valor por defecto directamente en el componente — cualquier página que lo usara sin pasar un `label` explícito mostraba siempre español, sin importar el idioma elegido. Se corrigió para que el componente use `t('common.back')` como valor por defecto.
- Formato de fechas (`toLocaleDateString`) estaba fijado a `'es-ES'` en varios sitios, ignorando el idioma activo. Se creó `utils/dateLocale.ts`, que traduce el código de idioma de `i18next` (`es`/`en`/`ar`) al código de configuración regional que espera `Intl` (`es-ES`/`en-US`/`ar-SA`).
- Los nombres de los rangos (`HERMANO`/`INQUISIDOR`/`ARZOBISPO`, con su forma femenina) nunca habían sido internacionalizados — se mostraban en español incluso en páginas ya traducidas. Se reescribió `utils/genderedRole.ts` para aceptar también el idioma actual y devolver la palabra correcta en cada uno (por ejemplo, "Brother"/"Sister" en inglés — donde, a diferencia de "Archbishop" o "Inquisitor", el género sí cambia la palabra por tratarse de términos de parentesco, no de un título eclesiástico).

## Qué NO está traducido, y por qué

### Contenido escrito por usuarios (títulos y cuerpo de los artículos)

Es contenido de autor, no texto de interfaz — la misma distinción que hace cualquier plataforma real entre "traducir la interfaz" y "traducir lo que alguien escribió". No se considera parte del alcance de este requisito.

### Texto generado dinámicamente por el backend

Dos casos concretos, ambos con la misma causa raíz: el backend genera una frase completa en español y la guarda tal cual (como texto final, no como plantilla) — no hay forma de que el frontend la muestre en otro idioma después:

- La crónica pública (`CommunityEvent`, el widget "Actividad del Capítulo") — actualmente en refactorización activa para solucionarlo (ver más abajo).
- Los mensajes de error del Confesor y del Oráculo (cuota agotada, artículo rechazado) — mismo problema, todavía sin resolver.

## Trabajo en curso: haciendo multi-idioma la crónica pública

Se decidió abordar el problema de raíz: en vez de guardar la frase ya renderizada, la base de datos pasará a guardar el tipo de evento y sus parámetros en bruto (quién, qué rango, qué artículo), y el frontend elegirá la plantilla correspondiente en el idioma activo en el momento de mostrarla — no en el momento en que ocurrió el evento.

Ya completado: la utilidad de nombres de rango multi-idioma (pieza necesaria, ya que los eventos de cambio de rango incluyen el rango como parámetro).

Pendiente: el cambio de esquema de base de datos, la reescritura del backend para eventos "reales" (registro, amistad, artículos, cambio de rango), la traducción de las ~26 frases decorativas ficticias, y la generación multi-idioma de los eventos ficticios creados por IA (que requerirá triplicar las llamadas a Groq para ese caso concreto, una por idioma).


[VOLVER](../README.md)
