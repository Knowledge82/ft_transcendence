# Diseño responsive — Chat y Santuario

Retoma el punto de Resize/Reflow (dentro de WCAG) que se había pospuesto deliberadamente para abordarlo junto con el resto del trabajo de adaptación a pantallas pequeñas. Casi todas las páginas del proyecto ya se comportaban razonablemente bien en móvil de forma natural, al estar construidas sobre contenedores centrados con anchos máximos (max-w-sm, max-w-md, max-w-2xl) — solo dos páginas concretas necesitaban una intervención real: el chat y el panel de administración.

## Cómo se probó

Combinación de DevTools (modo responsive del navegador) y un dispositivo Android real, además de otros compañeros del campus probando en sus propios teléfonos — la mezcla de emulación y hardware real ayudó a encontrar un par de detalles que solo aparecen con una pantalla e interacción táctil de verdad, no solo redimensionando la ventana del navegador.

## El chat: de tres columnas fijas a una pantalla por vez

### El problema de fondo

El chat tenía una disposición de tres columnas simultáneas (canales/conversaciones/amigos a la izquierda, la conversación en el centro, la lista de miembros a la derecha) con una altura fija a pantalla completa. En un móvil, tres columnas a la vez simplemente no caben con ningún tamaño de fuente razonable.

### La solución: el mismo patrón que Telegram, Discord o Slack en móvil

En vez de intentar comprimir las tres columnas, se adoptó el patrón ya establecido en aplicaciones de mensajería: en pantallas estrechas se muestra una sola columna a la vez, con navegación entre ellas. Un nuevo estado, mobileView (con tres valores: list, chat, members), controla cuál se ve — y es completamente irrelevante en escritorio, donde las tres siguen mostrándose siempre a la vez gracias a que cada columna lleva una clase md:flex que ignora ese estado a partir de cierto ancho de pantalla.

La jerarquía de navegación hacia atrás también se pensó con cuidado: desde la lista de miembros, el botón "atrás" no salta directamente a la lista de conversaciones, sino que vuelve primero al chat que se estaba leyendo — reflejando cómo realmente se llegó ahí (lista → chat → miembros), en vez de un retroceso plano que ignora ese orden.

### Dos fallos reales, encontrados solo al probar en el móvil de verdad

No había forma de salir del chat. El enlace de vuelta a /celda estaba deliberadamente oculto en móvil (se pensó que el botón "atrás" de la cabecera bastaba), pero ese botón solo navega dentro del propio chat (lista → chat → miembros) — nunca hacia afuera, hacia el resto de la aplicación. Se corrigió mostrando ese enlace siempre, también en móvil.

Los botones de la lista de amigos eran demasiado pequeños y estaban demasiado juntos. El botón "Enviar mensaje" (✉) y el de eliminar amigo (✕) no tenían ningún tamaño mínimo de toque definido — dependían solo del tamaño de la fuente del emoji, muy por debajo de los 44×44px que el propio proyecto ya exige en el resto de la interfaz por accesibilidad. Se optó por eliminar el botón de mensaje por completo y hacer que el propio nombre del amigo, al completo, abra la conversación privada al tocarlo — un patrón más natural en móvil que dos iconos diminutos uno junto al otro. El botón de eliminar amigo que queda se amplió también a 44×44px.

## El Santuario: la tabla se convierte en tarjetas en móvil

Una tabla con cuatro columnas (nombre, email, selector de rango, botón de eliminar) es un clásico problema de móvil: o se desborda horizontalmente, o el contenido queda ilegible al comprimirse. La solución habitual, aplicada aquí: la tabla se mantiene sin cambios en escritorio, y en móvil cada persona pasa a mostrarse como su propia tarjeta — nombre, email, un selector de rango a ancho completo y un botón de eliminar, ambos con el tamaño mínimo de toque de 44px. Las dos versiones conviven en el mismo componente, alternando con las clases hidden md:block / md:hidden — sin necesidad de ningún estado nuevo en JavaScript, a diferencia del chat.

## El panel de estadísticas no necesitó ningún cambio

AdminStatsPanel ya se comportaba bien en móvil sin tocar nada: la cuadrícula de tarjetas numéricas (grid-cols-2 sm:grid-cols-3) se reorganiza sola, y el gráfico de barras, construido sobre el ResponsiveContainer de recharts, ya se redimensiona automáticamente al ancho disponible.

## Resumen de archivos tocados

ChatPage.tsx (reestructuración completa de la disposición, más las dos correcciones encontradas en pruebas reales) y AdminPage.tsx (tabla en escritorio, tarjetas en móvil), junto con las traducciones nuevas necesarias (chat.showMembers) en los tres idiomas.
