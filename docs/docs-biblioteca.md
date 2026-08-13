# Biblioteca — sistema de artículos con revisión por IA

## La idea

Los `INQUISIDOR` y `ARZOBISPO` pueden escribir y publicar artículos ("tratados") directamente en el portal. La comunidad entera puede leerlos en `/biblioteca`, y en `/celda` aparece un pequeño widget con tres artículos aleatorios como puerta de entrada a la biblioteca.

## Decisión de diseño: sin borradores

No existe un estado intermedio "guardado pero no publicado". Publicar un artículo dispara, en el mismo momento, una revisión automática por IA que comprueba si el contenido trata temas legítimos (programación, Makefiles, C/C++, vida académica de 42). Si el artículo no supera la revisión, nunca llega a guardarse en la base de datos — el autor recibe un reproche del Inquisidor y puede corregir su tratado e intentarlo de nuevo.

## Backend

- `prisma/schema.prisma` — modelo `Article` (título, contenido, autor, fecha)
- `src/ai/ai.service.ts` — nuevo método `checkArticleRelevance`, que le pide al modelo un veredicto en un formato de texto simple (primera línea APROBADO/RECHAZADO) en vez de JSON, para que sea más resistente a pequeñas desviaciones del formato por parte del modelo
- `src/community/community.service.ts` — nuevas plantillas de frase para anunciar la publicación de un artículo en la crónica pública
- `src/articles/` — módulo completo: `articles.service.ts` (CRUD, más una selección aleatoria de artículos para el widget), `articles.controller.ts` (`GET /articles`, `GET /articles/random`, `GET /articles/:id`, `POST /articles` restringido a `INQUISIDOR`/`ARZOBISPO`)

De paso se corrigieron dos descuidos encontrados en `ai.module.ts`: el servicio de IA no estaba exportado (impedía que otros módulos lo usaran) y quedaba un límite de peticiones "temporal" de pruebas anteriores (1 por minuto) sin revertir a su valor normal (5 por minuto).

## Frontend

- `src/api/articles.ts` — funciones para listar, leer, obtener aleatorios y crear artículos
- `src/components/RandomArticles.tsx` — el widget de tres artículos aleatorios en `/celda`
- `src/pages/ArticlesListPage.tsx` (`/biblioteca`) — listado completo con extracto de cada artículo; el botón "Escribir un tratado" solo aparece para quien tiene el rango adecuado
- `src/pages/ArticleDetailPage.tsx` (`/biblioteca/:id`) — vista de un artículo completo
- `src/pages/NewArticlePage.tsx` (`/biblioteca/nueva`) — formulario de escritura y publicación, con el mensaje de rechazo del Inquisidor mostrado directamente si la IA no aprueba el contenido
- `HomePage.tsx` — enlace a la Biblioteca y el widget de artículos aleatorios

## Nota sobre el orden de las rutas

`/biblioteca/nueva` está declarada antes que `/biblioteca/:id`, tanto en el backend como en el frontend — de lo contrario, la palabra "nueva" sería interpretada como un intento de `:id`, el mismo problema de orden de rutas que ya nos ha aparecido antes en otros controladores.


[VOLVER](../README.md)
