# Mejoras de coherencia: roles en vivo, amistad como privilegio y nombres temáticos

## 1. El rango se actualiza en vivo, sin recargar la página

**El problema:** al cambiar el rango de alguien desde `/santuario`, esa persona no veía el cambio reflejado hasta recargar manualmente su página.

**Importante — esto era solo cosmético, no un fallo de seguridad:** los permisos reales ya se comprobaban en el momento correcto, porque `RolesGuard` consulta el rango actual en la base de datos en cada petición, no confía en el contenido del JWT. Si alguien perdía su rango de `ARZOBISPO`, el servidor ya le habría bloqueado el acceso al instante — solo la insignia visible en pantalla se quedaba desactualizada.

**La solución** reutiliza el mismo patrón de notificación dirigida que ya existía para las solicitudes de amistad:

```typescript
// AdminController, tras actualizar el rango
this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });
```

En el frontend, `HomePage` escucha ese evento y actualiza el estado local directamente, sin necesidad de volver a pedir nada al servidor. Como detalle adicional, la insignia del rango parpadea brevemente con el mismo efecto de resplandor dorado usado en la landing page — un pequeño gesto dramático acorde con la idea de un "ascenso" o "descenso" repentino dentro de la jerarquía.

## 2. Los mensajes privados son un privilegio de la amistad

**El cambio de comportamiento:** antes, cualquier usuario podía iniciar una conversación directa con cualquier otro. Ahora, solo se puede escribir en privado a quienes ya son amigos — el resto de la comunidad se comunica exclusivamente en el canal común. Esto refuerza narrativamente el valor de tener hermanos dentro de la congregación.

**Dónde se aplica la regla:** en `ChatService.findOrCreateDirectConversation`, el único punto por el que pasa cualquier creación de conversación directa, sea cual sea el camino que lleve hasta ahí (botón en la lista de amigos, botón en un perfil, etc.):

```typescript
const friendship = await this.prisma.friendship.findFirst({
  where: {
    status: 'ACCEPTED',
    OR: [
      { requesterId: userIdA, addresseeId: userIdB },
      { requesterId: userIdB, addresseeId: userIdA },
    ],
  },
});
if (!friendship) {
  throw new ForbiddenException('Solo puedes escribir en privado a tus hermanos');
}
```

Se comprueban ambas direcciones posibles de la amistad (no se sabe de antemano quién envió la solicitud a quién), y se exige explícitamente `status: 'ACCEPTED'` — una solicitud todavía pendiente no cuenta.

En el frontend, `UserProfilePage` ya no muestra "Enviar mensaje" a quien no es amigo — en su lugar, solo ofrece "+ Amigo", dejando claro cuál es el paso necesario antes de poder escribir en privado.

## 3. Rechazar una solicitud de amistad

Antes solo existía la opción de aceptar una solicitud entrante; no había forma de rechazarla desde la interfaz. Se añadió un botón "Rechazar" junto a "Aceptar", reutilizando el mismo endpoint que ya servía para eliminar una amistad (`DELETE /friends/:userId`) — ese endpoint ya estaba diseñado desde el principio para funcionar tanto con amistades aceptadas como con solicitudes todavía pendientes, así que no hizo falta tocar el backend en absoluto, solo añadir el botón correspondiente en el frontend.

## 4. Renombrado de rutas y nombres visibles

- **`/altar` → `/celda`**: cambio puramente de ruta y textos visibles en la interfaz, sin ninguna lógica afectada.
- **"# general" → "Capítulo"**: aquí hay un matiz importante. El nombre técnico `'general'`, usado internamente para localizar el canal en la base de datos (`getOrCreateGeneralChannel`), no se tocó — cambiarlo habría hecho que la aplicación no reconociera el canal ya existente y creara uno nuevo vacío, dejando huérfanos todos los mensajes y miembros ya registrados en el canal original. Solo se cambió el texto que ve el usuario en la interfaz (el botón del canal en la barra lateral y el título mostrado en la cabecera del chat), dejando completamente intacta la clave técnica interna.


[VOLVER](../README.md)
