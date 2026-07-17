# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
Un conjunto estándar de archivos generados por npm create vite@latest . -- --template react-ts:

 - index.html: el punto de entrada para el navegador; aquí es donde Vite incluye tu código React mediante `<script type="module" src="/src/main.tsx">`
 - src/: toda tu lógica; aquí es donde ahora colocamos api/, context/ y pages/
 - public/: archivos estáticos que se sirven tal cual (iconos, favicons, etc.); no pasan por el proceso de compilación de Vite.
 - vite.config.ts — Configuración propia de Vite (plugins, alias de ruta, etc.)
 - tsconfig.json / tsconfig.app.json / tsconfig.node.json — Configuración de TypeScript dividida: una parte para el código de la aplicación (app), la otra para los archivos de configuración propios de Vite (node). Vite ha estado separando estos archivos en versiones recientes para que la configuración de compilación y el código de la aplicación tengan reglas de compilación diferentes.
 - package.json/package-lock.json — Dependencias; ya las has añadido mediante npm install axios react-router-dom.
 - eslint.config.js — El linter, el mismo ESLint que vimos en el contexto de Oxlint.

