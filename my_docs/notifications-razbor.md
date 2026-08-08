# Система личных уведомлений — детальный разбор

## Общая картина, прежде чем нырять в код

Помнишь, мы разделили публичную ленту (`CommunityEvent`, уже готова) и личные уведомления (`Notification`) на два разных механизма, потому что у них разное назначение: публичная лента — хроника для всех, без понятия "прочитано". Личные уведомления — твой персональный инбокс, с состоянием прочитано/непрочитано, колокольчиком, конкретно про тебя.

В этой сессии мы реализовали именно вторую половину — то, что формально закрывает пункт спеки "notification system for all creation, update, deletion actions".

---

## Backend — `NotificationsService`, сердце системы

### Ключевой метод — объединяет сохранение и живую доставку разом

```typescript
async createNotification(userId: number, type: string, message: string) {
  const notification = await this.prisma.notification.create({
    data: { userId, type, message },
  });
  this.chatGateway.notifyUser(userId, 'notificationCreated', notification);
  return notification;
}
```

Это точная копия по духу того, что мы уже делали в `CommunityService.createEvent` — один вызов метода делает два дела разом: сохраняет запись в БД (переживёт перезагрузку страницы, офлайн-периоды) и сразу же отправляет её живьём через WebSocket конкретному юзеру (`chatGateway.notifyUser` — тот самый метод, который мы разбирали ещё в контексте уведомлений о заявке в друзья, самый первый раз когда делали "адресную" рассылку одному конкретному человеку, а не всем).

Смысл объединения в один метод: каждый вызывающий код (контроллеры) вызывает одну функцию, не думая отдельно "не забыть и сохранить, и разослать" — это уже встроено внутрь, невозможно случайно забыть одну из двух частей.

### Подсчёт непрочитанных — новый метод Prisma

```typescript
async getUnreadCount(userId: number): Promise<number> {
  return this.prisma.notification.count({
    where: { userId, isRead: false },
  });
}
```

`prisma.notification.count(...)` — новый для тебя метод: вместо того чтобы достать все записи (`findMany`) и потом посчитать их длину в JavaScript (`.length`), мы просим саму базу данных посчитать количество строк, подходящих под условие — это быстрее и экономнее, особенно если записей много: считает СУБД (PostgreSQL), а не наш сервер, которому не приходится тащить по сети реальные данные всех этих строк ради того, чтобы просто узнать их количество.

### Проверка владения перед пометкой "прочитано"

```typescript
async markAsRead(userId: number, notificationId: number) {
  const notification = await this.prisma.notification.findUnique({
    where: { id: notificationId },
  });
  if (!notification) {
    throw new NotFoundException('Notification not found');
  }
  if (notification.userId !== userId) {
    throw new ForbiddenException('This notification does not belong to you');
  }
  return this.prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}
```

Важная деталь безопасности — зачем тут проверка `notification.userId !== userId`. Юзер присылает произвольный `notificationId` в URL (`PATCH /notifications/5/read`) — без этой проверки любой залогиненный юзер мог бы пометить прочитанным чужое уведомление, просто подобрав/угадав ID. Мы сначала находим запись, потом явно сверяем, что она реально принадлежит тому, кто её запрашивает, и только тогда разрешаем менять.

### Массовая пометка — `updateMany`

```typescript
async markAllAsRead(userId: number) {
  await this.prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}
```

`updateMany` — обновляет все строки, подходящие под `where`, одним SQL-запросом, а не по одной в цикле — эффективнее, чем перебирать вручную.

---

## `NotificationsController` — тонкий слой поверх сервиса

```typescript
@Get()
async list(@Request() req) { ... }

@Get('unread-count')
async unreadCount(@Request() req) { ... }

@Patch(':id/read')
async markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) { ... }

@Patch('read-all')
async markAllAsRead(@Request() req) { ... }
```

Обрати внимание на порядок роутов — та же логика, что мы уже разбирали для `UsersController` (`me` перед `:id`): `unread-count` — это точный текстовый путь без параметра, `:id/read` — с параметром. Тут конфликта нет (`/notifications/read-all` и `/notifications/:id/read` физически разной "формы" — один сегмент против двух после `/notifications/`), но привычка проверять порядок при параметризованных роутах — хорошая практика на будущее.

---

## Точки интеграции — почему в каждом месте теперь ТРИ вызова, а не два

Возьмём `AdminController.changeRole` как пример:

```typescript
const updated = await this.adminService.changeRole(id, role);
this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });        // 1

const name = updated.displayName ?? `Usuario ${updated.id}`;
await this.communityService.createRoleChangedEvent(name, updated.role);        // 2
await this.notificationsService.createNotification(                            // 3
  id,
  'ROLE_CHANGED',
  `Tu rango ha cambiado a ${updated.role}.`,
);
```

Разберём, зачем реально нужны все три, а не только одно:

1. `chatGateway.notifyUser(..., 'roleChanged', ...)` — точечное, живое обновление конкретного UI-элемента (бейджа роли на `HomePage`) с богатыми данными (сама роль). Это уже существовало раньше, ещё до системы уведомлений.
2. `communityService.createRoleChangedEvent(...)` — публичная запись в общую хронику, видимая всем, не только тому, чью роль поменяли.
3. `notificationsService.createNotification(...)` — персональное, сохраняемое уведомление именно этому юзеру, с состоянием прочитано/непрочитано, переживает перезагрузку.

Это не дублирование — это три разных получателя информации с разным назначением: один UI-элемент, вся публика, и личный инбокс конкретного человека. Мы уже видели этот паттерн "два механизма на одно действие" раньше (для смены роли), теперь он стал "три механизма", и это абсолютно оправдано — каждый решает свою отдельную задачу.

### `FriendsController` — три точки, симметрично

- `sendRequest` — уведомление получателю заявки ("тебе прислали заявку")
- `acceptRequest` — уведомление отправителю ("твою заявку приняли") — обрати внимание, это не тот же юзер, что в `sendRequest`, роли меняются местами
- `removeFriendship` — уведомление другой стороне, только если это был реальный разрыв (`status === 'ACCEPTED'`), не отклонение ещё не принятой заявки

---

## Frontend — `NotificationBell`, новые для тебя паттерны

### Клик "снаружи" закрывает выпадающий список — новая техника

```typescript
const panelRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(event: MouseEvent) {
    if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, []);
```

Это первый раз, когда мы добавляем обработчик на весь `document`, а не на конкретный React-элемент. Логика: `panelRef` — ссылка на сам DOM-узел выпадающей панели. `document.addEventListener('mousedown', ...)` — слушаем клик где угодно на странице. Внутри проверяем: `panelRef.current.contains(event.target)` — "было ли место клика внутри нашей панели?". Если клик был снаружи (`!contains`) — закрываем список (`setIsOpen(false)`).

`event.target as Node` — здесь `as` это уже знакомая тебе type assertion (мы её разбирали для `Role` в `AdminPage`) — TypeScript по умолчанию типизирует `event.target` довольно обобщённо (`EventTarget`), а метод `.contains()` ожидает конкретно `Node` — говорим TypeScript "доверься, тут точно Node".

Пустой массив зависимостей `[]` в `useEffect` — обработчик вешается один раз при монтировании компонента и снимается при размонтировании (`return () => document.removeEventListener(...)`) — классический cleanup-паттерн, который мы уже видели много раз для сокет-подписок.

### Счётчик непрочитанных — маленькая деталь про "9+"

```tsx
{unreadCount > 9 ? '9+' : unreadCount}
```

Простой тернарник — если непрочитанных больше 9, показываем `"9+"` вместо точного числа, чтобы крошечный кружок-бейдж не "распирало" длинным числом вроде "127" — стандартный UX-приём из любого мессенджера.

### Оптимистичное обновление при клике на уведомление

```typescript
async function handleMarkRead(notification: Notification) {
  if (notification.isRead) {
    return;
  }
  await markNotificationAsRead(notification.id);
  setNotifications((prev) =>
    prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
  );
  setUnreadCount((prev) => Math.max(0, prev - 1));
}
```

`if (notification.isRead) return;` — если уже прочитано, вообще ничего не делаем (незачем слать лишний запрос на сервер). Дальше — тот же знакомый паттерн иммутабельного обновления массива через `.map()`, что мы разбирали десятки раз для друзей/участников чата.

`Math.max(0, prev - 1)` — защита от отрицательного числа: если по какой-то причине (гонка запросов, рассинхрон) `prev` окажется `0`, а мы всё равно вычтем единицу — получили бы `-1`, что бессмысленно для счётчика. `Math.max(0, ...)` гарантирует, что результат никогда не уйдёт ниже нуля.

### Живая доставка новых уведомлений

```typescript
useEffect(() => {
  if (!socket) return;
  function handleNew(notification: Notification) {
    setNotifications((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
  }
  socket.on('notificationCreated', handleNew);
  return () => socket.off('notificationCreated', handleNew);
}, [socket]);
```

Тот же паттерн подписки на WebSocket-событие, что мы использовали для `friendRequestReceived`, `roleChanged`, `communityEventCreated` — ничего принципиально нового, просто применённый ещё раз к новому событию `notificationCreated`. Новое уведомление добавляется в начало массива (`[notification, ...prev]`), чтобы самые свежие уведомления были видны первыми в списке.

---

## Итоговая схема — полный путь одного уведомления

1. Юзер A принимает заявку в друзья от юзера B (`POST /friends/:userId/accept`)
2. `FriendsController.acceptRequest` вызывает `notificationsService.createNotification(requesterId, 'FRIEND_REQUEST_ACCEPTED', "...")`
3. Внутри `createNotification`: строка сохраняется в таблицу `Notification` в БД и сразу летит через `chatGateway.notifyUser(requesterId, 'notificationCreated', notification)`
4. Если у юзера B (того, кто изначально отправлял заявку) открыта вкладка с `NotificationBell` — сокет-подписка `handleNew` мгновенно добавляет уведомление в список и увеличивает счётчик на колокольчике, без перезагрузки
5. Если юзер B был офлайн в этот момент — уведомление всё равно сохранено в БД, и он увидит его (и актуальный счётчик непрочитанных) в следующий раз, когда откроет `/celda` — компонент при монтировании дёргает `getNotifications()` и `getUnreadCount()`
6. Юзер B кликает на уведомление → `handleMarkRead` шлёт `PATCH /notifications/:id/read` → бэкенд проверяет, что это реально его уведомление → помечает `isRead: true` в БД → фронт обновляет локальный state, счётчик уменьшается
