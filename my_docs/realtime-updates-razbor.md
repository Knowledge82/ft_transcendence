# Real-time обновления списков — детальный разбор

## Общая природа проблемы, с которой столкнулись трижды подряд

Все три бага (Hermanos, Solicitudes pendientes, Amigos) были **одним и тем же** явлением в разных местах: фронтенд грузит данные (список друзей, список участников) **один раз** при открытии страницы (`useEffect` с пустым массивом `[]`), и дальше эти данные хранятся только в React state конкретной открытой вкладки. Если **другой** юзер (в другой вкладке, другом браузере, другом человеке) делает что-то, что должно изменить эти данные — твоя вкладка **никак об этом не узнает**, пока WebSocket явно не пришлёт событие об этом.

Простая аналогия: представь, что у каждого открытого браузера — своя личная, устаревающая копия записной книжки. Если кто-то другой дописал туда новую запись на **своём** экземпляре — твоя копия не обновится сама, пока тебе кто-то не позвонит и не скажет "запиши это".

Раньше мы уже решили эту же проблему для `newMessage` (новое сообщение) и `userStatusChanged` (онлайн/офлайн). Три новых бага — то же самое, просто про другие типы данных: новый участник канала, новый входящий запрос дружбы, и принятие уже отправленного запроса.

---

## Баг 1 — "Hermanos" не обновлялся при регистрации нового юзера

### Причина

Список участников общего канала (`members` state) грузится один раз при открытии `/chat`. Когда новый юзер регистрируется и заходит в чат — на бэкенде в `handleConnection` вызывается `ensureParticipant`, которая добавляет его в таблицу `ConversationParticipant`. Но раньше эта функция была реализована через `upsert` (create-or-update) и **ничего не сообщала о результате** — мы не могли отличить "юзер уже был участником" от "юзер стал участником только что". А раз не было этого различия — не было и повода разослать кому-то уведомление о новом участнике.

### Исправление — часть 1: `ensureParticipant` теперь возвращает булево значение

Было:
```typescript
async ensureParticipant(conversationId: number, userId: number) {
  await this.prisma.conversationParticipant.upsert({
    where: { conversationId_userId: { conversationId, userId } },
    update: {},
    create: { conversationId, userId },
  });
}
```

Стало:
```typescript
async ensureParticipant(conversationId: number, userId: number): Promise<boolean> {
  const existing = await this.prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });
  if (existing) {
    return false;
  }
  await this.prisma.conversationParticipant.create({
    data: { conversationId, userId },
  });
  return true;
}
```

Разница в подходе: вместо одной "умной" операции `upsert` (которая одинаково молча отрабатывает что при создании, что при обновлении) — сначала **явно проверяем**, существует ли уже запись (`findUnique`), и только если её нет — создаём (`create`). Это позволяет вернуть `true`/`false`, честно сообщая вызывающему коду, что реально произошло.

### Исправление — часть 2: используем этот флаг в Gateway

```typescript
const isNewMember = await this.chatService.ensureParticipant(general.id, payload.sub);
if (isNewMember) {
  const user = await this.chatService.getUserBasicInfo(payload.sub);
  this.server.emit('memberJoined', { ...user, isOnline: true });
}
```

`this.chatService.getUserBasicInfo(payload.sub)` — новый метод, просто достающий `id`, `displayName`, `avatarUrl` юзера из БД (нам нужны эти данные, чтобы разослать их всем — одного `userId` недостаточно, фронту нужно **имя**, чтобы показать в списке).

`this.server.emit('memberJoined', ...)` — та же логика "разослать всем подряд", что мы уже использовали для `userStatusChanged`, потому что список "Hermanos" — публичная информация для всех в теме культа, как мы и договаривались раньше.

### Исправление — часть 3: фронт слушает и добавляет

```typescript
function handleMemberJoined(newMember: Member) {
  setMembers((prev) =>
    prev.some((m) => m.id === newMember.id) ? prev : [...prev, newMember],
  );
}
```

`prev.some((m) => m.id === newMember.id)` — проверка "а нет ли уже такого участника в списке" (защита от дублей, вдруг событие как-то придёт дважды). Если уже есть — возвращаем `prev` без изменений (React не станет зря перерисовывать, если ссылка на массив не поменялась). Если нет — `[...prev, newMember]`, тот же паттерн иммутабельного добавления, что мы уже разбирали много раз.

---

## Баг 2 — "Solicitudes pendientes" не появлялись сами

### Причина

`FriendsController.sendRequest` создавал запись в БД и просто возвращал её **отправителю** (тому, кто нажал "+ Amigo") в виде HTTP-ответа. Получатель запроса **вообще не уведомлялся** — узнать о новом запросе он мог только через `GET /friends/requests`, то есть только при следующей загрузке страницы.

### Исправление — часть 1: добавляем данные отправителя при создании

Было:
```typescript
return this.prisma.friendship.create({
  data: { requesterId, addresseeId },
});
```

Стало:
```typescript
return this.prisma.friendship.create({
  data: { requesterId, addresseeId },
  include: {
    requester: { select: { id: true, displayName: true, avatarUrl: true } },
  },
});
```

`include` — та же Prisma-конструкция для подгрузки связанных данных, что мы уже видели много раз (в `chat.service.ts` для сообщений). Без этого объект, который мы разошлём получателю, содержал бы только `requesterId` (число), а не имя — фронту нечего было бы показать в списке.

### Исправление — часть 2: адресная рассылка вместо общей

Тут отличие от бага 1 — статус нового участника **можно** видеть всем (по нашей теме проекта), а вот "тебе пришёл запрос дружбы" — это **личное** уведомление, должно долететь **только** до конкретного получателя, не до всех подряд. Значит `this.server.emit(...)` (всем) не подходит, нужен новый механизм.

```typescript
notifyUser(userId: number, event: string, payload: unknown) {
  const sockets = this.onlineUsers.get(userId);
  if (!sockets) {
    return;
  }
  for (const socketId of sockets) {
    this.server.to(socketId).emit(event, payload);
  }
}
```

Разберём. `this.onlineUsers.get(userId)` — та самая карта (`Map<userId, Set<socketId>>`), которую мы завели ещё для отслеживания онлайн-статуса — оказалось, она полезна и для другой задачи: раз мы уже знаем **все** socket ID конкретного юзера, можем разослать событие именно им, а не всем подряд.

`this.server.to(socketId).emit(...)` — тот же метод `.to()`, что использовался для комнат чата (`conversation:${id}`), только тут вместо имени комнаты — конкретный ID сокета. В Socket.IO у каждого подключённого сокета **автоматически** есть своя персональная "комната", совпадающая с его же ID — то есть `.to(конкретный_socket_id)` доставляет событие ровно этому одному соединению.

`for (const socketId of sockets)` — цикл нужен, потому что у юзера может быть несколько открытых вкладок разом (несколько socket ID под одним `userId`), и уведомление должно долететь до **каждой** из них, а не только до первой попавшейся.

```typescript
@Post('request/:userId')
async sendRequest(@Request() req, @Param('userId', ParseIntPipe) addresseeId: number) {
  const friendship = await this.friendsService.sendRequest(req.user.userId, addresseeId);
  this.chatGateway.notifyUser(addresseeId, 'friendRequestReceived', friendship);
  return friendship;
}
```

После того как запрос реально создан в БД — вызываем `notifyUser`, указывая **получателя** (`addresseeId`, не отправителя) и данные, которые ему нужно увидеть.

### Исправление — часть 3: фронт слушает целевое событие

```typescript
function handleFriendRequestReceived(request: PendingRequest) {
  setPendingRequests((prev) =>
    prev.some((r) => r.id === request.id) ? prev : [...prev, request],
  );
}
```

Ровно тот же паттерн, что и для `memberJoined` — проверка на дубли, добавление через spread.

---

## Баг 3 — "Amigos" не обновлялся у отправителя после принятия

### Причина

Когда юзер B нажимал "Aceptar", код на **его собственной** вкладке (`handleAcceptRequest`) честно перезапрашивал `listFriends()` и обновлял **свой** список — это мы сделали сразу. Но юзер A (тот, кто изначально отправил запрос и всё это время сидел в открытой вкладке) — **не получал вообще никакого сигнала**, что его запрос был принят. Его `friends` state оставался прежним до перезагрузки страницы.

### Исправление — зеркальное к багу 2, но в обратную сторону

```typescript
@Post(':userId/accept')
async acceptRequest(@Request() req, @Param('userId', ParseIntPipe) requesterId: number) {
  const friendship = await this.friendsService.acceptRequest(req.user.userId, requesterId);
  const accepter = await this.friendsService.getBasicInfo(req.user.userId);
  this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);
  return friendship;
}
```

Разберём, кто есть кто в этом коде. `req.user.userId` — это тот, кто **сейчас** выполняет запрос, то есть юзер **B** (принимающий). `requesterId` — параметр из URL (`/friends/:userId/accept`), это юзер **A** (тот, кто изначально отправил запрос, и кому теперь нужно сообщить).

`const accepter = await this.friendsService.getBasicInfo(req.user.userId);` — достаём данные **B** (раз это именно B "стал другом" с точки зрения A — A теперь должен увидеть B у себя в списке). `getBasicInfo` — новый простой метод в `FriendsService`, аналогичный `getUserBasicInfo` в `ChatService`, просто достаёт `id`/`displayName`/`avatarUrl` по ID.

`this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);` — уведомляем именно **A** (`requesterId`), отправляя ему данные **B** (`accepter`) — потому что именно A должен увидеть нового друга у себя в списке.

### Фронт — добавление напрямую, без повторного запроса

```typescript
function handleFriendRequestAccepted(newFriend: Friend) {
  setFriends((prev) =>
    prev.some((f) => f.id === newFriend.id) ? prev : [...prev, { ...newFriend, isOnline: true }],
  );
}
```

Тут интересная деталь — `isOnline: true` жёстко прописано, а не вычислено откуда-то. Логика: раз юзер B только что **выполнил действие** (нажал "Aceptar"), находясь в активном сеансе — значит он **точно** сейчас онлайн, дополнительно проверять не нужно, можно просто это утверждать напрямую.

---

## Общий паттерн, который стоит запомнить

Для **любого** действия, которое должно быть видно другим людям в реальном времени, нужны **три** шага одновременно:

1. **На бэкенде** — после того как действие реально сохранено в БД, решить, **кому именно** нужно об этом сообщить: всем (`this.server.emit(...)`), только участникам конкретной комнаты (`this.server.to(room).emit(...)`), или только конкретному человеку (`this.notifyUser(userId, ...)`, наш собственный метод поверх `.to(socketId)`).
2. **Дать событию понятное, конкретное имя** — не одно универсальное "что-то обновилось", а отдельные `memberJoined`, `friendRequestReceived`, `friendRequestAccepted`, `newMessage`, `userStatusChanged` — так фронту не приходится гадать, что именно произошло и что делать.
3. **На фронте** — подписаться на это событие (`socket.on(...)`) внутри `useEffect`, обновить локальный state иммутабельно (через `[...prev, ...]` или `.map()`), не забыть отписаться в cleanup-функции (`socket.off(...)`), и обычно — защититься от дублей проверкой `.some(...)` перед добавлением.

Если в будущем добавишь новую фичу, которая должна быть видна другим людям сразу (например, редактирование сообщения, реакции на сообщения, удаление друга) — заранее закладывай эти три шага, а не добавляй их постфактум, когда заметишь, что "почему-то не обновляется само".
