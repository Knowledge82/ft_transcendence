# Correcciones y mejoras en el sistema de artículos

## Edición y eliminación de tratados

- **Editar** (`PATCH /articles/:id`): permitido al autor original o a cualquier `ARZOBISPO`. La edición se trata como una "nueva publicación" — el contenido corregido vuelve a pasar por la revisión del Oráculo antes de guardarse.
- **Eliminar** (`DELETE /articles/:id`): restringido únicamente a `ARZOBISPO`.
- Ambas acciones generan una entrada en la Actividad del Capítulo, con plantillas de frase propias para cada una (`createArticleEditedEvent`, `createArticleDeletedEvent`).
- Frontend: `NewArticlePage.tsx` ahora funciona en modo dual — crea un artículo nuevo en `/biblioteca/nueva`, o edita uno existente en `/biblioteca/:id/editar`, reutilizando el mismo formulario. Los botones "Editar"/"Eliminar" en `ArticleDetailPage.tsx` solo aparecen para quien tiene permiso.

## Límite de contenido reducido a 2000 caracteres

Antes 5000, ahora 2000 — sincronizado tanto en la validación del DTO del backend como en el contador de caracteres del formulario del frontend.

## El rango del autor, visible junto al nombre

`ArticlesListPage.tsx` y `ArticleDetailPage.tsx` ahora muestran el rango del autor (en su forma gramatical correcta según el género) antes del nombre — por ejemplo "ARZOBISPA Valeria" en vez de solo el nombre. Requirió añadir `role` y `gender` al `select` del autor en `articles.service.ts`.

## El Oráculo, no el Inquisidor

La entidad que revisa los artículos mediante IA se renombró de "Inquisidor" a "el Oráculo" — una entidad mística e impersonal, deliberadamente distinta del rango humano `INQUISIDOR` (que modera el chat), para no confundir ambos conceptos.

## Bug corregido: el título no se revisaba de verdad

Se detectó que un artículo con contenido legítimo sobre `make` pero con un título completamente ajeno al tema (y de tono vulgar) pasaba la revisión sin problema. La causa: el prompt original pedía revisar "que el artículo tratara temas legítimos" como un único criterio general — el modelo evaluaba el contenido y consideraba aprobado el conjunto, sin tratar el título como un criterio de rechazo independiente.

La solución reescribe el prompt con tres condiciones de rechazo explícitas y numeradas: contenido fuera de tema, título sin relación clara con el contenido o el tema (aunque el contenido sea válido), y lenguaje vulgar u ofensivo en cualquiera de los dos. Los modelos de lenguaje siguen reglas explícitas y enumeradas de forma mucho más fiable que una instrucción general ambigua.

## Widget de artículos aleatorios en `/celda`

Rediseñado por completo: en vez de una lista de enlaces de texto, ahora muestra tres pergaminos (imagen propia) con un resplandor animado tipo "hot news" detrás de cada uno (efecto CSS puro, alternando dos tonos cálidos para que parpadee de forma orgánica), el título debajo de cada uno, y cada pergamino entero funciona como enlace al artículo. El título del widget cambió de "De la Biblioteca" a "Lo último de la Biblioteca".
