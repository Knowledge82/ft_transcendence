# Protección contra la autogestión de la propia cuenta en /santuario

## El problema de partida

Cualquier Arzobispo podía, sin ninguna restricción, cambiar su propio rango o eliminar su propia cuenta desde el panel de administración. El riesgo real: si solo existía un Arzobispo en el sistema y se rebajaba a sí mismo (o se eliminaba), /santuario quedaba permanentemente inaccesible para todo el mundo — nadie podría volver a entrar para nombrar a otro Arzobispo, ni siquiera para deshacer el error.

## La primera solución considerada, y por qué se descartó

El primer enfoque fue contar cuántos Arzobispos existían en el sistema, y solo bloquear el cambio de rango si el usuario era el último Arzobispo restante:

```typescript
if (user.role === 'ARZOBISPO' && role !== 'ARZOBISPO') {
  const arzobispoCount = await this.prisma.user.count({ where: { role: 'ARZOBISPO' } });
  if (arzobispoCount <= 1) {
    throw new BadRequestException({ code: 'LAST_ARZOBISPO_CANNOT_DEMOTE' });
  }
}
```

Funcionaba, pero era más código del necesario, y solo cubría el caso concreto de "quedarse sin nadie" — no el principio más general que realmente importaba.

## La solución adoptada: prohibir la autogestión, sin excepciones

Se simplificó a una única regla, sin necesidad de contar nada: nadie puede cambiar su propio rango, ni eliminar su propia cuenta, sin importar cuántos Arzobispos más existan en ese momento.

```typescript
if (requestingUserId === userId) {
  throw new BadRequestException({ code: 'CANNOT_CHANGE_OWN_ROLE' });
}
```

Esto no es solo una simplificación de código — es un principio de seguridad habitual en paneles de administración reales: los cambios de privilegios o las acciones destructivas sobre la propia cuenta deben venir siempre de otra persona, nunca de uno mismo. Sirve tanto para dejar un rastro de auditoría más claro (un cambio de rango siempre lo hizo alguien más) como para eliminar cualquier posibilidad de una acción accidental sobre la propia fila en la tabla.

La única renuncia consciente: con dos o más Arzobispos, ninguno de ellos puede "retirarse" cambiando su propio rango, aunque en ese caso concreto sería perfectamente seguro hacerlo — tendría que pedírselo a otro Arzobispo. Se consideró una pérdida de flexibilidad aceptable frente a la simplicidad ganada.

## Se aplicó el mismo principio a la eliminación de cuentas

Al revisar el cambio de rango, se detectó que la eliminación de cuentas tenía exactamente el mismo problema sin ninguna protección — de hecho, era un riesgo aún mayor: eliminar la propia cuenta siendo el único Arzobispo no solo bloquea el acceso, sino que además borra el registro por completo, sin ninguna forma de deshacerlo.

```typescript
async deleteUser(requestingUserId: number, userId: number) {
  if (requestingUserId === userId) {
    throw new BadRequestException({ code: 'CANNOT_DELETE_OWN_ACCOUNT' });
  }
  ...
}
```

## La mejora de interfaz: ni siquiera mostrar la propia fila

Con la protección ya garantizada en el backend, quedaba un problema de experiencia de usuario: la propia fila seguía apareciendo en la tabla, con un selector de rango y un botón de eliminar que, al pulsarse, simplemente fallarían siempre. Se optó por la solución más simple posible — no mostrar la propia fila en absoluto:

```typescript
const allUsers = await listAllUsers();
setUsers(allUsers.filter((u) => u.id !== me.data.id));
```

No hay ningún control deshabilitado ni mensaje confuso — la fila simplemente no está ahí, porque no hay nada legítimo que gestionar sobre uno mismo desde esta pantalla en concreto.

## Por qué ambas capas siguen siendo necesarias

Ocultar la fila en el frontend mejora la experiencia de uso normal, pero no sustituye a la comprobación del backend — cualquiera podría, en teoría, llamar directamente a la API sin pasar por la interfaz. La protección real y definitiva vive en el servidor; el frontend solo evita mostrar una acción que de todas formas está condenada a fallar.
