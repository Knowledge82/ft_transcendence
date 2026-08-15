# Espejado completo para RTL (árabe)

Cierra el requisito "complete layout mirroring, not just text direction" — asegurar que, además de la dirección del texto (ya resuelta con `document.dir`), el resto de la interfaz se refleje correctamente cuando el árabe está activo.

## El problema de fondo

`document.documentElement.dir = 'rtl'` cambia la dirección de lectura del documento, pero no afecta a las clases de Tailwind que fijan un lado físico concreto — `ml-2`, `pr-4`, `left-0`, `text-left`, `border-l`, etc. siguen significando literalmente "izquierda"/"derecha", sin enterarse de que el documento ahora se lee al revés. Por eso el espejado completo requiere una revisión manual, componente por componente.

## Las dos herramientas usadas

Propiedades lógicas de CSS (la solución preferida, automática): en vez de "izquierda"/"derecha" físicas, Tailwind ofrece equivalentes basados en la dirección de lectura — `ms-*`/`me-*` (margin-inline-start/end), `ps-*`/`pe-*` (padding), `start-*`/`end-*` (posicionamiento, sustituyen a `left-*`/`right-*`), `border-s`/`border-e`, `text-start`/`text-end`. Se adaptan solas al atributo `dir`, sin duplicar código.

El modificador `rtl:` de Tailwind (manual, para espejar la forma visual de un elemento): útil solo cuando hace falta invertir literalmente un icono (como la flecha de "volver"), no una simple posición.

## Qué NO se espeja, y por qué

- El interruptor de idioma: debe permanecer en el mismo lugar físico sea cual sea el idioma activo — es un control de utilidad persistente, no contenido que fluya con la lectura. Cuando aparece solo (como en la landing page), se fija su posición explícitamente. Cuando aparece integrado en una fila junto a otro elemento (como BackLink en la mayoría de páginas), se deja que el propio flexbox/grid lo reordene de forma natural — esto es intencional, no un descuido.
- Los monjes decorativos a los lados de las páginas: son puramente ornamentales, sin relación con el sentido de lectura, así que no se espejan.
- Reproductores de medios, cifras dentro de un texto: no aplicable a este proyecto por ahora, pero documentado como principio general para el futuro.

## Qué SÍ se espeja

Cualquier elemento anclado a contenido concreto que la persona manipula directamente: los dos botones circulares sobre el avatar (editar/eliminar), el botón de eliminar un mensaje en el chat, la insignia de notificaciones no leídas y el panel desplegable de notificaciones. Todos migraron de posiciones físicas (left/right) a lógicas (start/end).

## Un bug real encontrado durante la auditoría — no solo "falta de espejado"

En ChatPage, la burbuja de cada mensaje ya se posiciona mediante justify-end/justify-start según sea un mensaje propio o ajeno — y eso, al ser flexbox, ya se espeja automáticamente con el idioma. Pero el botón de eliminar mensaje (el aspa que aparece al pasar el ratón) seguía una lógica de posición física fija atada a la misma condición (isOwn). El resultado: en árabe, la burbuja cambiaba de lado correctamente, pero el botón de eliminar se quedaba en la esquina equivocada (la exterior, en vez de la que da hacia el centro de la conversación). Se corrigió pasando también esa posición a lógica (-start-2/-end-2).

## Campos de formulario: contenido "universal" vs contenido de autor

Se estableció una distinción importante, aplicada de forma consistente:

- Email, contraseña, el Makefile del Confesor, los contadores de caracteres (245/1000): son formatos que siempre se escriben de izquierda a derecha sin importar el idioma de la interfaz (protocolos técnicos, código, cifras). Se les fijó dir="ltr" explícitamente para evitar comportamientos extraños del cursor al escribir símbolos como @ o : dentro de un contexto RTL heredado.
- El nombre para mostrar, el título y el contenido de un artículo: son contenido de autor genuino — la persona puede escribirlos legítimamente en árabe. Estos campos se dejaron sin forzar, para que fluyan con normalidad en cualquier dirección.
- La respuesta del Confesor y la razón de rechazo del Oráculo: tampoco se fuerzan a LTR — desde la Parte 3 del trabajo de i18n, ese texto se genera de verdad en el idioma activo (incluido árabe con prosa natural), así que debe fluir en RTL cuando corresponde.

## Una corrección de flecha, hecha correctamente esta vez

BackLink guardaba antes la flecha directamente dentro del texto traducido (incluso con un carácter distinto para árabe, un parche temporal reconocido como tal en su momento). Ahora la flecha se renderiza como un elemento separado del texto, volteada mediante rtl:scale-x-[-1] — el mismo carácter ← en los tres idiomas, espejado únicamente por CSS cuando corresponde, sin mezclar contenido traducido con lógica de maquetación.

## Un malentendido corregido sobre el interruptor de idioma

Durante el proceso surgió una contradicción real: se aplicó una regla general ("el interruptor de idioma no se mueve nunca") sin verificarla con hablantes reales, lo que llevó a fijar su posición de forma incorrecta en un par de sitios. Tras confirmar con hablantes de árabe (marroquíes y un compañero somalí) que el comportamiento correcto depende del contexto — a veces se espeja junto con su fila (comportamiento nativo del navegador, correcto), y solo se fija cuando aparece en solitario — se revirtieron esas correcciones excesivas. Buen recordatorio de que las reglas generales de RTL tienen matices reales y conviene verificarlas con hablantes nativos siempre que sea posible.

## Las tablas HTML no necesitaron ningún trabajo

El orden de las columnas en la tabla de /santuario se invierte solo, de forma nativa, al heredar dir="rtl" del documento — es comportamiento estándar del navegador para el elemento table, no algo que haya que implementar con CSS.

## Resumen de archivos tocados durante la auditoría

De los más de 25 componentes y páginas revisados uno por uno, la mayoría no necesitó ningún cambio — la base de estilos ya usaba clases simétricas (px, py, mx-auto, gap-*) desde el principio. Los que sí requirieron ajustes:

- BackLink.tsx — flecha separada y espejada por CSS
- LandingPage.tsx — posición fija del interruptor de idioma
- HomePage.tsx — botones circulares del avatar a posición lógica, más la nueva funcionalidad del botón de eliminar avatar
- ChatPage.tsx — cabecera, bordes de los paneles laterales, alineación de texto, y el bug del botón de eliminar mensaje
- AdminPage.tsx — alineación del encabezado de la tabla
- ConfesionarioPage.tsx — campos de código/cifras fijados a LTR
- NewArticlePage.tsx — contadores de caracteres fijados a LTR
- NotificationBell.tsx — insignia, panel desplegable, y alineación de texto

## Qué queda pendiente del módulo de Accessibility/i18n

El espejado a nivel de código está completo. Falta la verificación real en un navegador (idealmente con una persona que lea árabe con fluidez) para confirmar visualmente que todo se comporta como se espera — y, más allá de RTL, siguen pendientes la compatibilidad con navegadores adicionales y la conformidad WCAG 2.1 AA.
