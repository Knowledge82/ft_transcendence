## 6. Estado del proyecto frente al enunciado, por módulo

> Leyenda: ✅ Hecho · ⏳ Aún no hecho · 🚫 No lo haremos (decisión consciente, no olvido)


---

### Módulo 1 — Web

| Requisito | Estado | Puntos |
|---|---|---|
| Major: Framework de frontend y backend (React + NestJS) | ✅ | 2 |
| Minor: framework de frontend (por separado) | ✅ (ya cubierto por el Major anterior, no acumulable) | — |
| Minor: framework de backend (por separado) | ✅ (ya cubierto por el Major anterior, no acumulable) | — |
| Major: Funcionalidades en tiempo real (WebSockets) | ✅ | 2 |
| Major: Interacción entre usuarios (chat, perfil, amigos) | ✅ | 2 |
| Major: API pública con clave de API, rate limiting, documentación, 5+ endpoints | 🚫 | 0 |
| Minor: ORM (Prisma) | ✅ | 1 |
| Minor: Sistema completo de notificaciones | ✅ | 1 |
| Minor: Funcionalidades colaborativas en tiempo real | 🚫 | 0 |
| Minor: Server-Side Rendering (SSR) | 🚫 | 0 |
| Minor: PWA con soporte offline e instalabilidad | ✅ (solo instalabilidad, sin soporte offline) | 1 |
| Minor: Design system propio (10+ componentes) | ✅ (11 componentes) | 1 |
| Minor: Búsqueda avanzada (filtros, orden, paginación) | 🚫 | 0 |
| Minor: Sistema de subida y gestión de archivos | ✅ | 1 |
| Subtotal Web | | 11 |

---

### Módulo 2 — Accessibility and Internationalization

| Requisito | Estado | Puntos |
|---|---|---|
| Major: Cumplimiento WCAG 2.1 AA completo | ⏳ | 0 |
| Minor: Soporte multi-idioma (3+ idiomas, i18n, selector) | ⏳ | 0 |
| Minor: Soporte RTL | ⏳ | 0 |
| Minor: Compatibilidad con navegadores adicionales | ⏳ | 0 |
| Subtotal Accessibility/i18n | | 0 |

Módulo completamente sin empezar. Pendiente decidir si se aborda antes de la defensa.

---

### Módulo 3 — User Management

| Requisito | Estado | Puntos |
|---|---|---|
| Major: Gestión estándar de usuario (perfil editable, avatar con default, amigos + estado online, página de perfil) | ✅ | 2 |
| Minor: Estadísticas de juego e historial de partidas | 🚫 | 0 |
| Minor: Autenticación remota OAuth 2.0 | ⏳ | 0 |
| Major: Sistema de permisos avanzado (CRUD de usuarios, gestión de roles, vistas/acciones según rol) | ✅ | 2 |
| Major: Sistema de organizaciones (crear/editar/eliminar, añadir/quitar usuarios, acciones dentro de la organización) | ⏳ | 0 |
| Minor: 2FA completo | ⏳ | 0 |
| Minor: Panel de analíticas de actividad de usuario | ⏳ | 0 |
| Subtotal User Management | | 4 |

---

### Módulo 4 — Artificial Intelligence

| Requisito | Estado | Puntos |
|---|---|---|
| Major: IA oponente para juegos | ⏳/N-A (requiere un módulo de juego) | 0 |
| Major: Sistema RAG completo | ⏳ | 0 |
| Major: Interfaz completa de sistema LLM (texto/streaming, manejo de errores, rate limiting) | ✅ (el Confesor, sobre Groq) | 2 |
| Major: Sistema de recomendación con ML | ⏳ | 0 |
| Minor: Moderación de contenido por IA | ✅ (el Oráculo, revisión de artículos) | 1 |
| Minor: Integración de voz/habla | ⏳ | 0 |
| Minor: Análisis de sentimiento | ⏳ | 0 |
| Minor: Reconocimiento y etiquetado de imágenes | ⏳ | 0 |
| Subtotal AI | | 3 |

---

## Resumen general

| Módulo | Puntos conseguidos |
|---|---|
| Web | 11 |
| Accessibility/i18n | 0 |
| User Management | 4 |
| Artificial Intelligence | 3 |
| Total | 18 |

## Decisiones conscientes de no implementar (🚫)

- API pública (Web, Major): no encaja de forma natural en el proyecto y habría exigido una capa entera de autenticación por clave separada del JWT existente.
- Funcionalidades colaborativas en tiempo real (Web, Minor): no hay ninguna funcionalidad del proyecto que se preste a edición compartida en vivo.
- SSR (Web, Minor): habría exigido una reestructuración arquitectónica grande para un beneficio marginal en este proyecto.
- Búsqueda avanzada (Web, Minor): no se identificó ningún caso de uso lo bastante genuino como para justificarla por sí sola.

## Huecos abiertos más relevantes de cara a la defensa

1. Accessibility/i18n está completamente vacío — es el módulo con más margen de mejora rápida si se decide invertir tiempo (especialmente el soporte de idiomas, más asequible que WCAG AA completo).
2. Organizaciones (User Management, Major, 2 puntos) — no se ha empezado, y es un Major con peso considerable.
3. ¿Existe un módulo de juego (Pong)? Varios requisitos (estadísticas de partidas, IA oponente) dependen de él y no se han tratado en estas sesiones — conviene confirmar si se ha construido aparte.
