# Presencia del Arzobispo en el chat y notificación de mensajes privados

Dos mejoras relacionadas con el chat en tiempo real, que terminaron llevando a una decisión arquitectónica real sobre cómo comunicarse entre módulos de NestJS.

## Parte 1 — Anuncio de presencia del Arzobispo

### La idea original, y el matiz que se corrigió

La primera versión anunciaba en la propia conversación general algo como "**Arzobispo** ha entrado en el Capítulo." cada vez que alguien con ese rango se conectaba o desconectaba. Al probarlo se detectó un matiz importante: el estado online/offline en este proyecto es de todo el portal, no específico del chat — se activa en cuanto la persona abre la aplicación, no cuando entra concretamente a /chat. El mensaje, tal como estaba redactado, afirmaba algo que no era cierto (que la persona había "entrado al Capítulo" específicamente).

Se planteó explícitamente la alternativa arquitectónica: separar el concepto de "presencia en el chat" del de "conectado al portal" — crear una señal distinta, propia del chat. Se decidió no hacerlo, siguiendo un patrón bien establecido en aplicaciones de chat reales (Discord, Slack): la presencia online/offline es global y se muestra solo mediante un indicador visual (el punto de color), nunca como un mensaje de texto en la conversación — los mensajes de texto se reservan para eventos genuinos de membresía, no para el parpadeo constante de "conectado/desconectado". Se optó por mantener la arquitectura de presencia tal como estaba, y simplemente corregir la redacción para que fuera honesta sobre lo que el evento realmente representa.

### La nueva redacción — variantes, y cómo se evitó la concordancia de género en árabe

Se pasó de una única frase fija a tres variantes por idioma y por estado (en línea / desconectado), elegidas al azar en el propio frontend en el momento de mostrarse:

```json
"arzobispoOnline": {
  "0": "**{{role}}** nos honra con su presencia.",
  "1": "**{{role}}** vela ahora sobre el Capítulo.",
  "2": "Se percibe la presencia de **{{role}}** entre nosotros."
}
```

En árabe, donde los verbos concuerdan obligatoriamente en género con su sujeto, se evitó tener que duplicar cada frase en una versión masculina y otra femenina haciendo que el sujeto gramatical de la oración fuera siempre "الحضور" (la presencia — sustantivo de género fijo), en vez de la persona misma: así el verbo concuerda con "presencia", no con el género real del Arzobispo o la Arzobispa, y una sola frase sirve para ambos casos.

## Parte 2 — Notificación de mensaje privado recibido

Se añadió un nuevo tipo de notificación personal: cuando alguien envía un mensaje directo, el destinatario recibe una notificación en la campana, igual que ya ocurre con las solicitudes de amistad o los cambios de rango.

## El problema real: una dependencia circular entre módulos

Para disparar esta notificación, ChatGateway necesitaba usar NotificationsService — pero NotificationsService ya necesitaba ChatGateway desde antes (para empujar notificaciones en vivo por socket). El resultado: ChatModule importando a NotificationsModule, que a su vez importa a ChatModule — un ciclo que NestJS no puede resolver al arrancar.

### La solución rápida que se descartó

La primera opción evaluada fue forwardRef(), la salida oficial de NestJS para estos casos. Funciona, pero la propia documentación de NestJS advierte que las dependencias circulares deben evitarse siempre que sea posible — es un parche aceptado para casos límite, no una solución a la que recurrir por defecto, y en revisiones de código de proyectos reales suele señalarse como algo a corregir, no a dejar pasar.

### La solución adoptada: @nestjs/event-emitter

```bash
npm install --save @nestjs/event-emitter
```

Este paquete implementa el patrón publicador/suscriptor (pub/sub): en vez de que un módulo llame directamente a un método de otro (lo que obliga a importarlo y crea el acoplamiento), un módulo emite un evento sin saber quién, si alguien, lo está escuchando; el otro módulo se suscribe a ese evento por su cuenta. Ninguno de los dos necesita importar al otro — ambos dependen únicamente de un tercer módulo neutral (EventEmitterModule), que no forma parte del ciclo porque no es un participante, es la infraestructura común.

Se registra una única vez, de forma global, en la raíz de la aplicación:

```typescript
// app.module.ts
imports: [EventEmitterModule.forRoot(), ...]
```

ChatGateway deja de necesitar NotificationsService por completo — en su lugar, emite un evento:

```typescript
this.eventEmitter.emit('directMessage.sent', { recipientId, senderName });
```

Y NotificationsService se suscribe a él con el decorador @OnEvent:

```typescript
@OnEvent('directMessage.sent')
async handleDirectMessageSent(payload: { recipientId: number; senderName: string }) {
  await this.createNotification(payload.recipientId, 'DIRECT_MESSAGE_RECEIVED', {
    name: payload.senderName,
  });
}
```

Con esto, ChatModule ya no importa NotificationsModule en ningún sentido — la única relación que queda es la que ya existía desde antes (NotificationsModule importa ChatModule, para el empuje en vivo), que es unidireccional y nunca fue el problema.

## Por qué no se usó este patrón desde el principio del proyecto

Vale la pena dejarlo explícito: no es que el resto del proyecto esté mal diseñado por no usar eventos en todas partes. Todas las demás relaciones entre módulos construidas hasta ahora (CommunityService llamado desde varios controladores, NotificationsService llamado igual, etc.) son dependencias limpias y unidireccionales — A llama a B, y B nunca necesita llamar de vuelta a A. Un event emitter ahí habría sido una abstracción prematura, que complica seguir el rastro del código sin resolver ningún problema real todavía inexistente. Se introdujo aquí, específicamente, porque es exactamente el caso para el que este patrón existe: romper un ciclo genuino entre dos módulos que necesitan comunicarse en ambas direcciones.
