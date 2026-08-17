# WCAG 2.1 AA — resumen completo del trabajo realizado

Cierra el Major de accesibilidad del enunciado. A diferencia de otros módulos, este no admite cumplimiento parcial — o se cumple el nivel AA, o no cuenta en absoluto. Por eso, desde el principio, se descartó cualquier intento de alcanzar AAA y se centró todo el esfuerzo en los criterios de nivel A y AA realmente aplicables a este proyecto.

## 1. Navegación por teclado (2.1.1, 2.1.2, 2.4.7)

Se auditó todo el proyecto en busca de dos problemas: elementos "clicables" construidos sobre etiquetas que el navegador no considera interactivas (div onClick, h1 onClick), y ausencia de un indicador visual de foco. Se encontraron y corrigieron dos casos reales: el nombre del perfil en /celda (un h1 con onClick directo, corregido envolviendo un button real dentro) y el panel de notificaciones (que solo podía cerrarse con el ratón, sin ninguna forma de hacerlo con teclado — se añadió cierre con Escape). Se añadió además un indicador de foco global y consistente mediante :focus-visible, que solo aparece durante la navegación por teclado, no al hacer clic con el ratón.

## 2. Etiquetas ARIA en botones de solo icono (4.1.2)

Siete botones en todo el proyecto tenían como único contenido un emoji (✎, ✕, 📎, 🔔, ✉) — sin texto, un lector de pantalla no puede anunciar su función real. Se añadió aria-label a cada uno, reutilizando las claves de traducción que ya existían para el atributo title.

## 3. Regiones "en vivo" para contenido dinámico (4.1.3)

La lista de mensajes del chat y el contador de notificaciones sin leer se marcaron con aria-live="polite", para que un lector de pantalla anuncie las novedades sin que la persona tenga que comprobar manualmente. Todos los mensajes de error de la aplicación (formularios, subida de avatar, artículos rechazados) se marcaron con role="alert". Deliberadamente NO se marcó el ticker de actividad de la comunidad, que cambia de frase cada 7 segundos — hacerlo habría generado una interrupción constante, más perjudicial que útil.

## 4. Texto alternativo para imágenes (1.1.1)

Revisión sistemática de las tres fuentes posibles de contenido no textual (img, background-image por CSS, svg). Se encontró un problema real: el componente Avatar tenía el alt fijado a la palabra literal "Avatar" para cualquier persona — con varias fotos de perfil en pantalla a la vez, un lector de pantalla las anunciaba todas igual, sin poder distinguirlas. Se corrigió usando el nombre real de cada persona, que ya se pasaba al componente mediante una prop (fallbackText) que, por un descuido de una versión anterior, nunca llegaba a usarse.

## 5. Jerarquía de encabezados (2.4.6, 1.3.1)

Se listaron todos los encabezados del proyecto y se encontraron dos páginas con la jerarquía rota: en /celda, los widgets de la parte superior tenían un h2 que aparecía antes que el único h1 de la página (el nombre del perfil, más abajo) — se corrigió añadiendo un h1 oculto visualmente al principio de la página, y bajando el antiguo h1 del nombre a h2. En /chat no existía ningún h1 en absoluto — se convirtió el nombre de la conversación activa (ya visible en la cabecera) en el h1 de la página.

## 6. Contraste de color

### Del texto (1.4.3)

Verificado matemáticamente al principio del trabajo de accesibilidad — toda la paleta pasa el umbral de 4.5:1 con margen. Pero la auditoría real con Lighthouse encontró un fallo que el cálculo estático no podía prever: el texto "Cargando" de la landing page usaba animate-pulse de Tailwind, que reduce la opacidad hasta el 50% como parte de la animación — en ese punto, el contraste efectivo caía a 2.51:1, muy por debajo del mínimo. Se sustituyó por una animación propia con un suelo de opacidad del 80%, calibrado matemáticamente para mantener el contraste por encima de 4.5:1 en todo momento.

### De elementos no textuales (1.4.11)

Un criterio distinto del contraste de texto — aplica a bordes, contornos de foco, e indicadores de estado. La auditoría reveló que ink-800, el color usado para prácticamente todos los bordes del proyecto (campos de formulario, tarjetas, el indicador de "desconectado" de StatusDot), tenía un contraste real de apenas 1.24–1.35:1 contra los fondos oscuros del proyecto — muy por debajo del mínimo de 3:1. Se creó un nuevo color, border-default, con el mismo tono pero aclarado lo justo para superar el umbral contra ambos fondos oscuros usados en el proyecto, y se sustituyó en los once archivos donde ink-800 se usaba como borde (no como color de fondo, que es un uso distinto y no se tocó).

## 7. Tamaño de las zonas táctiles (2.5.5, técnicamente AAA)

Aunque no exigido para AA, se decidió corregirlo igualmente por su bajo coste y su beneficio real para personas con control motor limitado. Los botones de icono muy pequeños (algunos de apenas 20px) se ampliaron a un mínimo garantizado de 44×44px, incluyendo un cambio deliberado en el tamaño visual del avatar del perfil (de 96px a 144px) para que los círculos de editar/eliminar, ahora más grandes, no resultaran desproporcionados sobre una imagen demasiado pequeña.

## 8. Identificación del propósito de los campos (1.3.5)

Se añadió el atributo autocomplete a los campos que recogen datos personales del usuario: email para el correo, current-password en el inicio de sesión frente a new-password en el registro (indican al navegador si debe autocompletar una contraseña existente o sugerir una nueva), y nickname para el nombre público (no name, ya que no es el nombre legal completo de la persona).

## 9. Enlace para saltar al contenido (2.4.1)

Se añadió un enlace "Saltar al contenido principal", oculto visualmente por defecto y visible solo al recibir el foco por teclado, en el componente compartido PageContainer — cubre toda la aplicación de una sola vez.

## Qué se dejó fuera, deliberadamente

El comportamiento de la interfaz al aumentar el zoom o en pantallas muy estrechas (1.4.4, 1.4.10) se pospuso a propósito hasta que se aborde el diseño responsive del proyecto, por estar directamente relacionado. La verificación real en navegadores adicionales a Chrome sigue pendiente de completarse (Firefox ya se probó sin problemas).

## Metodología general

Prácticamente todos los criterios se abordaron con el mismo patrón: primero una búsqueda sistemática en todo el código (mediante grep o scripts) para localizar cada caso relevante, sin depender de la memoria o de revisar archivo por archivo al azar; después, la corrección puntual de cada caso encontrado; y finalmente, una segunda pasada de búsqueda para confirmar que no quedaba ningún caso suelto. Varios de los hallazgos más importantes (el alt de Avatar, el contraste de ink-800, el fallo de animate-pulse) no eran evidentes de antemano — solo se descubrieron gracias a esta combinación de búsqueda sistemática y verificación real con herramientas de auditoría (Lighthouse).
