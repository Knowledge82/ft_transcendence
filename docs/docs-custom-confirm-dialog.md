# Sustitución del diálogo nativo confirm() por un componente propio

## El problema

Cada acción destructiva del proyecto (eliminar un mensaje, un amigo, un artículo, una cuenta) pedía confirmación mediante window.confirm() — la ventana emergente nativa del navegador, con el texto "localhost:8443 dice..." y botones sin ningún estilo propio. Visualmente rompe por completo con la estética del proyecto, y esto no tiene solución dentro del propio confirm(): es una ventana que renderiza el navegador mismo, fuera del DOM de la página — ni CSS ni JavaScript tienen ningún acceso a su apariencia. No es una cuestión de esfuerzo insuficiente, es una limitación técnica dura del propio confirm().

## La solución: un modal propio, con la misma forma de uso

Se construyó un componente de confirmación estilizado con la paleta del proyecto (fondo oscuro, acentos dorados), accesible desde cualquier página mediante un hook, useConfirm(), pensado para sustituir confirm() con la menor fricción posible en el código ya existente.

## La diferencia técnica clave: síncrono vs. asíncrono

window.confirm() es síncrono — bloquea la pestaña entera del navegador hasta que la persona responde, y el código que lo llama se detiene ahí mismo, en la misma línea, esperando. Un componente de React no puede funcionar así — el modal tiene que abrirse, pintarse en pantalla, y el código tiene que esperar de forma asíncrona a que se haga clic en un botón, sin bloquear nada.

Por eso useConfirm() devuelve una función que retorna una Promise<boolean>, en vez de un booleano directo:

```typescript
// Antes
if (!confirm(t('chat.confirmDeleteMessage'))) {
  return;
}

// Ahora
if (!(await confirm(t('chat.confirmDeleteMessage')))) {
  return;
}
```

El cambio en cada punto de uso fue mínimo — añadir await — porque las funciones que ya envolvían estas comprobaciones eran async de por sí (hacían una llamada a la API justo después).

## Cómo funciona por dentro

Un contexto de React (ConfirmContext) guarda, en su estado, si hay una confirmación pendiente y con qué mensaje. Cuando se llama a confirm(mensaje), se crea una Promise nueva y se guarda su función resolve en ese estado — el modal se muestra en pantalla en ese mismo instante, en cualquier parte de la aplicación, gracias a que el proveedor (ConfirmProvider) envuelve toda la app desde App.tsx. Al pulsar uno de los dos botones, se llama a ese resolve guardado con true o false, lo que hace que la Promise original se resuelva y el código que estaba esperando con await continúe.

## Accesibilidad, no solo estética

No bastaba con que se viera bien — al ser un reemplazo de un diálogo nativo (que el navegador ya gestiona correctamente en cuanto a teclado), había que replicar ese comportamiento a mano:

- role="alertdialog" y aria-modal="true", para que un lector de pantalla lo identifique como un diálogo que requiere atención inmediata.
- Escape cierra el diálogo como cancelación, igual que el nativo.
- Un foco atrapado dentro del modal: con solo dos elementos interactivos (Cancelar y Confirmar), Tab y Shift+Tab simplemente rebotan entre ambos, sin dejar que el foco se escape hacia la página que queda detrás.
- El foco inicial cae en "Cancelar", no en "Confirmar" — la opción más segura por defecto, para que una pulsación accidental de Enter no confirme una acción destructiva por error.
- Clicar fuera del cuadro (en el fondo oscurecido) también cancela, un patrón habitual en cualquier modal.

## Dónde vive el código

frontend/src/context/ConfirmContext.tsx — junto a AuthContext.tsx y SocketContext.tsx, no dentro de components/, porque es un proveedor de contexto con un hook asociado, la misma categoría que esos dos archivos, no un componente de interfaz suelto.

## Los cuatro puntos de uso actualizados

ChatPage.tsx (eliminar mensaje, quitar amigo), ArticleDetailPage.tsx (eliminar artículo), AdminPage.tsx (eliminar cuenta de usuario) — los únicos cuatro lugares del proyecto que usaban confirm(), localizados mediante una búsqueda en todo el código antes de empezar, no de memoria.
