# Privacy Policy y Terms of Service

## Por qué era urgente

El enunciado del proyecto es explícito al respecto: *"Missing or inadequate Privacy Policy/Terms of Service pages will result in project rejection."* No se trata de un módulo bonus ni de una mejora opcional — es un requisito obligatorio cuya ausencia puede provocar el rechazo directo del proyecto en la evaluación, independientemente de la calidad del resto del código. Por eso se priorizó por encima de otras tareas pendientes con mayor volumen de trabajo (diseño responsive, sistema de rangos, módulo de IA).

## Qué se creó

Dos páginas nuevas, con contenido real y específico del proyecto (no texto de relleno):

- **`/privacy`** (`PrivacyPolicyPage.tsx`) — qué datos se recogen (email, contraseña hasheada, nombre, avatar, mensajes, relaciones de amistad), para qué se usan, cómo se protegen (bcrypt, HTTPS, gestión de tokens), qué derechos tiene el usuario, y qué cookies se usan (solo la técnica de sesión, sin seguimiento ni publicidad)
- **`/terms`** (`TermsOfServicePage.tsx`) — naturaleza satírica/académica del proyecto, responsabilidades de la cuenta, conducta esperada en el chat, condiciones sobre el contenido subido (avatares), disponibilidad del servicio

Ambas reflejan el funcionamiento real de la aplicación tal como está implementado (por ejemplo, la mención a la cookie httpOnly de refresh token, o al hash bcrypt de contraseñas), no una plantilla genérica copiada de internet.

## Accesibilidad — el otro requisito del enunciado

No basta con que las páginas existan: el enunciado exige que sean *"easily accessible... e.g., footer links"*. Se creó un componente `Footer.tsx` reutilizable, con enlaces a ambas páginas, añadido tanto en la landing pública (`/`) como en el panel de perfil (`/altar`) — las dos páginas que cualquier usuario, con o sin sesión iniciada, va a visitar en algún momento.

## Dónde está en el código

- `src/pages/PrivacyPolicyPage.tsx`
- `src/pages/TermsOfServicePage.tsx`
- `src/components/Footer.tsx`
- `src/App.tsx` — nuevas rutas `/privacy` y `/terms`
- `src/pages/LandingPage.tsx` y `src/pages/HomePage.tsx` — footer añadido

## Nota importante

El contenido de ambas páginas es razonable y específico, pero no ha sido revisado por un profesional legal — para un producto real (no un proyecto académico) sería recomendable una revisión jurídica antes de publicarlo. Para los fines de la evaluación de 42, el contenido cumple con el criterio de ser relevante y no genérico.


[VOLVER](../README.md)
