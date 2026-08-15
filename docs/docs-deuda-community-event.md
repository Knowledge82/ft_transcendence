# Deuda técnica pendiente: crecimiento de CommunityEvent

## El problema

La tabla CommunityEvent crece sin límite — actualmente se generan 336 eventos ficticios al día (288 estáticos + 48 por IA), sin contar los eventos "reales" (registro, amistad, artículos, cambio de rango). No existe ningún mecanismo de limpieza de registros antiguos.

## Riesgo más inmediato: rendimiento, no espacio en disco

getTodayEvents() filtra por createdAt, pero el esquema no tiene un índice explícito sobre ese campo — a medida que la tabla crezca, esta consulta (usada por el widget de /celda) tendrá que escanear una tabla cada vez más grande, incluso para encontrar solo los eventos de hoy.

## Solución propuesta (pendiente de implementar)

1. Añadir un índice en createdAt en el modelo CommunityEvent (@@index([createdAt]) en el schema de Prisma).
2. Un job periódico (o un setInterval similar al que ya genera los eventos) que elimine eventos con más de N días de antigüedad.

## Estado

Identificado y documentado, no implementado — se decidió posponerlo deliberadamente en vez de abordarlo de inmediato.
