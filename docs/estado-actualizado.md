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
| Major: Cumplimiento WCAG 2.1 AA completo | ✅ (auditoría completa: teclado/foco, ARIA, regiones en vivo, alt, jerarquía de encabezados, contraste de texto y no textual, tamaño de zonas táctiles, autocomplete, enlace de salto — verificado con Lighthouse) | 2 |
| Minor: Soporte multi-idioma (3+ idiomas, i18n, selector) | ✅ (español/inglés/árabe — interfaz completa, crónica pública, notificaciones, códigos de error, y respuestas de la IA generadas en el idioma activo) | 1 |
| Minor: Soporte RTL | ✅ (espejado completo auditado en todas las páginas y componentes — propiedades lógicas de CSS, excepciones documentadas para controles de utilidad persistentes y contenido no localizable) | 1 |
| Minor: Compatibilidad con navegadores adicionales | ✅ (verificado en Chrome, Firefox y Edge sin problemas; Safari queda sin probar por falta de acceso a hardware de Apple) | 1 |
| Subtotal Accessibility/i18n | | 5 |

---

### Módulo 3 — User Management

| Requisito | Estado | Puntos |
|---|---|---|
| Major: Gestión estándar de usuario (perfil editable, avatar con default, amigos + estado online, página de perfil) | ✅ | 2 |
| Minor: Estadísticas de juego e historial de partidas | 🚫 | 0 |
| Minor: Autenticación remota OAuth 2.0 | ✅ (inicio de sesión con 42 — flujo completo, incluida la finalización de registro para elegir género en el primer acceso) | 1 |
| Major: Sistema de permisos avanzado (CRUD de usuarios, gestión de roles, vistas/acciones según rol) | ✅ | 2 |
| Major: Sistema de organizaciones (crear/editar/eliminar, añadir/quitar usuarios, acciones dentro de la organización) | ✅ (facciones internas — CRUD completo, membresía única por persona, liderazgo propio de cada facción independiente del rango global, distintivo de color junto al rango, canal de chat dedicado, artículos internos exclusivos de sus miembros, imagen de cabecera personalizable, y cuatro tipos de evento en la crónica pública) | 2 |
| Minor: 2FA completo | ✅ (verificación en dos pasos por TOTP, restringida a cuentas con contraseña por diseño — no ofrece una falsa sensación de seguridad a cuentas vinculadas solo a 42; configuración con código QR, confirmación obligatoria antes de activar, y desactivación protegida por contraseña) | 1 |
| Minor: Panel de analíticas de actividad de usuario | ✅ (panel personal en /celda — accesos, tratados escritos, antigüedad — y panel administrativa en /santuario con desglose por rango, gráfico de registros de los últimos 7 días, y top 5 de personas más activas) | 1 |
| Subtotal User Management | | 9 |

---

### Módulo 4 — Artificial Intelligence

| Requisito | Estado | Puntos |
|---|---|---|
| Major: IA oponente para juegos | 🚫 (no existe ningún módulo de juego en el proyecto) | 0 |
| Major: Sistema RAG completo | 🚫 | 0 |
| Major: Interfaz completa de sistema LLM (texto/streaming, manejo de errores, rate limiting) | ✅ (el Confesor, sobre Groq) | 2 |
| Major: Sistema de recomendación con ML | 🚫 | 0 |
| Minor: Moderación de contenido por IA | ✅ (el Oráculo, revisión de artículos — pendiente un ajuste fino en la regla de decoro para tratados internos de facción, ver huecos abiertos) | 1 |
| Minor: Integración de voz/habla | 🚫 | 0 |
| Minor: Análisis de sentimiento | 🚫 | 0 |
| Minor: Reconocimiento y etiquetado de imágenes | 🚫 | 0 |
| Subtotal AI | | 3 |

---

## Resumen general

| Módulo | Puntos conseguidos |
|---|---|
| Web | 11 |
| Accessibility/i18n | 5 |
| User Management | 9 |
| Artificial Intelligence | 3 |
| Total | 28 |

## Decisiones conscientes de no implementar (🚫)

- API pública (Web, Major): no encaja de forma natural en el proyecto y habría exigido una capa entera de autenticación por clave separada del JWT existente.
- Funcionalidades colaborativas en tiempo real (Web, Minor): no hay ninguna funcionalidad del proyecto que se preste a edición compartida en vivo.
- SSR (Web, Minor): habría exigido una reestructuración arquitectónica grande para un beneficio marginal en este proyecto.
- Búsqueda avanzada (Web, Minor): no se identificó ningún caso de uso lo bastante genuino como para justificarla por sí sola.
- Estadísticas de juego e historial de partidas (User Management, Minor): no existe ningún módulo de juego en el proyecto.
- IA oponente para juegos (AI, Major): mismo motivo — no existe ningún módulo de juego que necesite un oponente.
- Sistema RAG completo (AI, Major): no se identificó un caso de uso genuino en el proyecto que requiera recuperación de documentos externos; el Oráculo y el Confesor ya cubren las necesidades reales de IA del proyecto sin necesitarlo.
- Sistema de recomendación con ML (AI, Major): no hay volumen de datos de usuario suficiente para que un sistema de recomendación tenga sentido real, más allá de un ejercicio artificial.
- Integración de voz/habla (AI, Minor): no encaja con la naturaleza basada en texto del proyecto (chat escrito, artículos, confesiones escritas).
- Análisis de sentimiento (AI, Minor): no hay ninguna funcionalidad concreta del proyecto que se beneficiara de él de forma genuina.
- Reconocimiento y etiquetado de imágenes (AI, Minor): el único contenido visual del proyecto son los avatares de perfil, que ya se gestionan sin necesidad de IA.

## Huecos abiertos más relevantes de cara a la defensa

1. Ajuste fino de la moderación por IA para tratados internos de facción — el Oráculo sigue rechazando, en algunos casos, contenido que debería aprobar dentro del tono más agresivo propio de ciertas facciones. La distinción entre regla pública/interna ya existe en el prompt, pero necesita más trabajo.
2. Safari — el único navegador todavía sin verificar, por falta de acceso a hardware de Apple.
3. Resize/Reflow (dentro de WCAG, pero pospuesto deliberadamente) — se abordará junto con el diseño responsive del proyecto.
4. Una serie de retoques visuales menores identificados durante las pruebas (cursores, espaciados, tamaños de fuente, mensajes de confirmación) — en curso.
