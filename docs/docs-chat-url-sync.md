# Sincronización de la conversación activa con la URL

## El problema

Al recargar la página `/chat` mientras se tenía abierta una conversación privada, la aplicación siempre volvía al canal general ("Capítulo") — perdiendo de vista con quién se estaba hablando. La causa: qué conversación estaba seleccionada vivía únicamente en el estado de React (`selectedConversationId`), que se reinicia por completo cada vez que la página se recarga.

El único caso que sí se recordaba era llegar al chat desde el perfil de alguien (con un parámetro `?dm=<id>` en la URL) — pero cualquier otro cambio de conversación (clic en el canal general, clic en una conversación de la lista lateral) no se reflejaba en la URL en absoluto.

## Por qué merece la pena arreglarlo

Aplicaciones de chat reales (Slack, Discord, Telegram Web) sincronizan la conversación activa con la URL precisamente para evitar este problema — permite que recargar la página, compartir un enlace directo o usar el botón "atrás" del navegador se comporten de forma predecible. Sin esto, cualquier persona evaluando o usando la aplicación puede toparse con una recarga que la devuelve a un sitio inesperado, dando sensación de aplicación incompleta.

## La solución: un único parámetro `?c=<id>` para cualquier conversación

Antes existían dos mecanismos parciales y distintos (`?dm=` solo para el caso de "escribir desde un perfil"). Se unificaron en un solo parámetro, `c` (de "conversación"), que ahora se actualiza en cualquier cambio de conversación — incluido el canal general, que antes no tocaba la URL en absoluto.

### Una función central para no repetir la lógica en cada sitio

```typescript
function selectConversation(id: number, label: string, dmTarget: typeof activeDmTarget) {
  setSelectedConversationId(id);
  setChannelLabel(label);
  setActiveDmTarget(dmTarget);
  setSearchParams({ c: String(id) }, { replace: true });
}
```

Antes, cada uno de los sitios donde se podía cambiar de conversación (botón del canal general, clic en una conversación de la lista, abrir un chat desde la lista de amigos) actualizaba el estado por su cuenta, de forma duplicada. Ahora todos llaman a esta única función, que además de actualizar el estado, sincroniza la URL — así es imposible que alguien olvide hacer una de las dos cosas.

`{ replace: true }` es importante: sin esto, cada clic entre conversaciones añadiría una entrada nueva al historial del navegador, y el botón "atrás" se convertiría en un recorrido interminable por todas las conversaciones abiertas durante la sesión, en vez de volver a la página anterior real.

### Al cargar la página, se lee el parámetro para restaurar el estado

```typescript
const cParam = searchParams.get('c');
const cId = cParam ? Number(cParam) : null;

if (cId === general.id) {
  // era el canal general
} else if (cId) {
  const matchingDm = directList.find((c) => c.id === cId);
  if (matchingDm) {
    // conversación privada ya con mensajes — la encontramos en la lista
  } else if (stateOtherUser) {
    // conversación recién creada, sin mensajes todavía, pero sabemos
    // con quién es gracias al estado de navegación que pasa el perfil
  } else {
    // no reconocemos ese id — volvemos al canal general con seguridad
  }
} else {
  // no había ningún parámetro — comportamiento por defecto, canal general
}
```

## Dónde está en el código

- `src/pages/ChatPage.tsx` — la función `selectConversation`, la lógica de lectura al cargar, y los tres puntos que ahora la usan (canal general, lista de conversaciones, `openDirectConversation`)
- `src/pages/UserProfilePage.tsx` — el botón "Enviar mensaje" ahora navega con `?c=` en vez del antiguo `?dm=`, unificando ambos mecanismos en uno solo


[VOLVER](../README.md)
