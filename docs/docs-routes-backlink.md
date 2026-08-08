# Rutas centralizadas (`routes.ts`) y componente `BackLink`

## El bug que lo motivó

Al renombrar la ruta `/altar` a `/celda`, quedaron siete lugares distintos en el código todavía apuntando al `/altar` antiguo — un enlace roto ("Volver" llevaba a una ruta que ya no existía) que pasó desapercibido durante un tiempo. La causa raíz: la ruta estaba escrita como texto literal (`"/altar"`) repetido de forma independiente en cada archivo, sin ningún punto único de referencia — cambiar la ruta significaba buscar y editar cada aparición a mano, y es fácil que alguna se escape.

## La solución: una única fuente de verdad para las rutas

Se creó `src/routes.ts`, un objeto con todas las rutas de la aplicación:

```typescript
export const ROUTES = {
  LANDING: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/celda',
  CHAT: '/chat',
  SANCTUARY: '/santuario',
  CONFESSIONAL: '/confesionario',
  PRIVACY: '/privacy',
  TERMS: '/terms',
  PROFILE: (userId: number | string) => `/perfil/${userId}`,
} as const;
```

A partir de ahora, en vez de escribir `"/celda"` como texto suelto en cada archivo, se importa `ROUTES` y se usa `ROUTES.HOME`. Si algún día se vuelve a renombrar una ruta, solo hace falta cambiarla aquí — todos los lugares que la usan se actualizan automáticamente, sin buscar manualmente por el proyecto.

`PROFILE` es una función, no un valor fijo, porque esa ruta necesita un parámetro (el id del usuario) — se usa como `ROUTES.PROFILE(userId)`.

## El componente `BackLink`

Junto con las rutas centralizadas, se creó un componente para el patrón "← Volver" que se repetía, con estilos ligeramente distintos copiados en cada página, en `src/components/ui/BackLink.tsx`:

```typescript
interface BackLinkProps {
  to: string;
  label?: string;
  className?: string;
}

export function BackLink({ to, label = '← Volver', className = '' }: BackLinkProps) {
  return (
    <Link to={to} className={`text-sm text-gold-500 hover:text-gold-400 ${className}`}>
      {label}
    </Link>
  );
}
```

Uso típico: `<BackLink to={ROUTES.HOME} />`.

## Dónde está en el código

- `src/routes.ts` — las constantes de rutas
- `src/components/ui/BackLink.tsx` — el componente, exportado también desde `src/components/ui/index.ts`
- Actualizados para usar ambos: `LoginPage`, `RegisterPage` (redirect tras autenticarse), `AdminPage`, `ChatPage`, `ConfesionarioPage`, y `public/manifest.json` (el `start_url` del PWA)

## Nota importante

Esta limpieza cubre los archivos revisados en esta sesión — es buena idea que cada miembro del equipo confirme en su propia copia del proyecto que no queda ningún `"/altar"` suelto:
```bash
grep -rn "altar" frontend/src frontend/public
```
