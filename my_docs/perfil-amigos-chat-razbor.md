# Публичный профиль, друзья, чат — детальный разбор

## Общая картина, прежде чем нырять в код

Мы закрывали четыре связанных задачи: показ чужого профиля, удаление друга, кликабельные имена везде, и умный список бесед в чате (с названием текущего канала по центру и без пустых "болтающихся" диалогов). Разберём по порядку, от простого к сложному.

---

## Часть 1 — публичный профиль (backend)

### Новый метод в `UsersService`

```typescript
async findPublicProfile(userId: number) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
    },
  });
  ...
}
```

Сравни с уже существующим `findById` — там в `select` был ещё и `email: true`. Тут его специально нет. Смысл: `findById` используется для `/users/me` (я смотрю **свой** профиль, мне можно видеть свой email), а `findPublicProfile` — для просмотра **чужого** профиля, где email должен оставаться приватным. Два разных метода вместо одного с условием внутри — так проще: смотришь на название метода и сразу понимаешь, что он возвращает, не читая логику внутри.

### Новый эндпоинт в контроллере

```typescript
@Get(':id')
async getPublicProfile(@Param('id', ParseIntPipe) id: number) {
  const profile = await this.usersService.findPublicProfile(id);
  return {
    ...profile,
    isOnline: this.chatGateway.isUserOnline(profile.id),
  };
}
```

`@Param('id', ParseIntPipe)` — эту конструкцию мы уже разбирали для `FriendsController` — вытаскивает часть URL после `/users/` и сразу конвертирует строку в число.

`{...profile, isOnline: ...}` — тот же паттерн "обогащения объекта", что мы применяли для друзей и участников чата: берём то, что вернул сервис, добавляем сверху поле, вычисленное отдельно, через другой источник (`ChatGateway`, у которого есть карта текущих подключений).

### Важная деталь — порядок объявления роутов

```typescript
@Get('me')
async getMe(...) { ... }

@Post('me/avatar')
async uploadAvatar(...) { ... }

// ЭТОТ роут — последним
@Get(':id')
async getPublicProfile(...) { ... }
```

Почему порядок важен: `:id` — это параметр, который совпадает с любым текстом на этом месте URL, включая слово `"me"`. Если бы `@Get(':id')` был объявлен раньше `@Get('me')`, запрос на `/users/me` мог бы быть перехвачен обработчиком `:id` (который попытался бы превратить `"me"` в число через `ParseIntPipe` и упал бы с ошибкой, вместо того чтобы дойти до правильного обработчика `getMe`). NestJS проверяет роуты в том порядке, в котором они объявлены в классе — точный текстовый путь (`'me'`) должен идти раньше параметризованного (`':id'`), чтобы не создавать двусмысленности.

---

## Часть 2 — публичный профиль (frontend)

### `useParams` — новый хук

```typescript
const { id } = useParams<{ id: string }>();
```

Мы объявили роут как `/perfil/:id` в `App.tsx`. `useParams()` — хук из `react-router-dom`, достающий реальное значение, подставленное вместо `:id` в текущем URL. Если открыт `/perfil/7`, то `id` будет строкой `"7"` (не числом — все части URL всегда строки, поэтому дальше в коде используется `Number(id)`).

### Проверка "это я сам"

```typescript
const isSelf = ownUserId !== null && profile !== null && ownUserId === profile.id;
```

Разберём, зачем три условия через `&&`, а не просто `ownUserId === profile.id`. Проблема: пока данные ещё грузятся, `ownUserId` и `profile` оба равны `null` (их начальные значения из `useState`). `null === null` дало бы `true` — то есть без явных проверок на `null` мы бы ошибочно решили "это мой профиль" в момент, когда на самом деле оба значения просто ещё не загрузились. Первые два условия (`ownUserId !== null && profile !== null`) — защита именно от этого: сравнение ID происходит только когда оба значения реально пришли с сервера.

### Условный рендер обеих кнопок разом

```tsx
{!isSelf && (
  <>
    <button onClick={handleMessage}>Enviar mensaje</button>
    {!isFriend && (
      <button onClick={handleAddFriend}>...</button>
    )}
  </>
)}
```

Тут два вложенных условия. Внешнее (`!isSelf`) — если это свой профиль, не рендерим вообще ничего из этого блока (ни кнопку сообщения, ни кнопку дружбы). Внутреннее (`!isFriend`) — работает только если уже прошли внешнюю проверку (значит это точно чужой профиль), и дополнительно скрывает именно кнопку "+Amigo", если уже друзья, но кнопка "Enviar mensaje" всё равно показывается (другу тоже можно писать).

`<>...</>` — React Fragment, тот же приём, что мы разбирали раньше — нужен, потому что JSX требует один корневой элемент, а тут у нас потенциально два `<button>` рядом без общей обёртки.

---

## Часть 3 — удаление друга

Тут backend уже был готов (мы его сделали ещё в самом начале работы над друзьями и использовали для отклонения заявок) — не хватало только кнопки.

```typescript
async function handleRemoveFriend(userId: number) {
  if (!confirm('¿Seguro que quieres...?')) {
    return;
  }
  await removeFriend(userId);
  setFriends((prev) => prev.filter((f) => f.id !== userId));
}
```

`confirm(...)` — мы это уже разбирали в контексте `AdminPage` (удаление юзера админом) — стандартное браузерное диалоговое окно "ОК/Отмена". Тот же паттерн защиты от случайного клика применили и здесь.

---

## Часть 4 — кликабельные имена и перестройка структуры списка друзей

### Проблема, которую пришлось решать

Раньше список друзей выглядел так:

```tsx
<button onClick={() => openDirectConversation(friend.id)}>
  {friend.displayName}
</button>
```

Один `<button>`, оборачивающий всё — клик где угодно открывал переписку. Теперь нужно три независимых действия: клик по имени → профиль, клик по иконке ✉ → сообщение, клик по ✕ → удалить. Проблема: HTML не разрешает вкладывать `<a>` (то, во что React Router превращает `<Link>`) внутрь `<button>` — это невалидная структура документа, браузер может вести себя непредсказуемо.

### Решение — заменить обёртку с `<button>` на `<div>`

```tsx
<div className="flex items-center gap-2 px-3 py-2 rounded-md mb-1 hover:bg-ink-800 transition-colors">
  <span className="w-2 h-2 rounded-full ..." />
  <Link to={`/perfil/${friend.id}`} className="flex-1 ...">
    {friend.displayName}
  </Link>
  <button onClick={() => openDirectConversation(friend)}>✉</button>
  <button onClick={() => handleRemoveFriend(friend.id)}>✕</button>
</div>
```

`<div>` — не интерактивный сам по себе элемент, поэтому внутри него можно свободно класть и `<Link>` (превращается в `<a>`), и несколько `<button>` — никакого конфликта вложенности. Мы "разобрали" одну большую кликабельную зону на несколько маленьких, каждая со своим назначением.

### То же самое для отправителя сообщения в чате

```tsx
{!isOwn && (
  <Link to={`/perfil/${message.senderId}`} className="... block ... w-fit">
    {message.sender.displayName}
  </Link>
)}
```

`w-fit` — Tailwind-класс, означающий "ширина ровно по содержимому", а не растягиваться на всю доступную ширину — иначе кликабельная зона имени растянулась бы на весь пузырь сообщения, что визуально странно.

---

## Часть 5 — центрирование названия канала в шапке

### Было

```tsx
<header className="flex justify-between items-center ...">
  <span>{channelLabel}</span>
  <span>Conectado como ...</span>
</header>
```

`justify-between` — flexbox-свойство, раскидывающее элементы по краям контейнера. Проблема: `channelLabel` в этом случае прижат к левому краю всей шапки, а не к центру.

### Стало

```tsx
<header className="grid grid-cols-3 items-center ...">
  <div />
  <span className="text-center">{channelLabel}</span>
  <span className="text-right">Conectado como ...</span>
</header>
```

`grid grid-cols-3` — включает CSS Grid с тремя равными по ширине колонками. Первая — пустой `<div />` (ничего не рендерит визуально, просто занимает место). Вторая — название канала, `text-center` центрирует его внутри своей колонки (а раз колонка — ровно треть всей ширины шапки, по центру находится и относительно всей шапки). Третья — "Conectado como", прижато вправо внутри своей колонки.

Смысл пустой первой колонки: без неё было бы только две колонки, и `text-center` центрировал бы название канала между левым краем экрана и текстом "Conectado como" — то есть не по центру всей шапки, а смещённо. Пустая колонка слева "уравновешивает" колонку с "Conectado como" справа, делая центральную колонку реально центральной.

---

## Часть 6 — список "Conversaciones", не показывающий пустые беседы

Это самая сложная часть, разберём аккуратно, по шагам.

### Backend — фильтрация на уровне запроса к БД

```typescript
async getUserDirectConversations(userId: number) {
  const conversations = await this.prisma.conversation.findMany({
    where: {
      type: 'DIRECT',
      participants: { some: { userId } },
      messages: { some: {} },
    },
    ...
```

`messages: { some: {} }` — это Prisma-фильтр по связанной таблице: "верни только те `Conversation`, у которых есть хотя бы одна (`some`) связанная запись в таблице `Message`". Пустые фигурные скобки `{}` внутри `some` означают "без дополнительных условий на сами сообщения, просто хотя бы одно любое". Если у беседы пока нет ни одного сообщения — она просто не попадёт в результат запроса вообще, ещё на уровне базы данных, а не отфильтровывается потом в коде.

### Frontend — проблема с "оптимистичным" добавлением

Раньше (в предыдущей версии) мы сразу, в момент клика "написать другу", добавляли новую беседу в список `directConversations`. Но теперь бэкенд не вернёт эту беседу при следующей загрузке страницы, пока в ней нет сообщений — то есть если мы продолжаем сразу добавлять её на фронте, а потом юзер перезагрузит страницу до того как что-то написал — беседа "исчезнет" из списка (бэкенд её больше не пришлёт), создавая непоследовательное поведение.

### Решение — отдельное состояние "с кем я сейчас потенциально разговариваю"

```typescript
const [activeDmTarget, setActiveDmTarget] = useState<{
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
} | null>(null);
```

Это не то же самое, что `directConversations` — это временное "напоминание", с кем открыт диалог прямо сейчас, независимо от того, есть ли там уже сообщения. Устанавливается при открытии любой беседы:

```typescript
async function openDirectConversation(friend: Friend) {
  const conversation = await startDirectConversation(friend.id);
  setSelectedConversationId(conversation.id);
  setChannelLabel(friend.displayName ?? `Usuario ${friend.id}`);
  setActiveDmTarget({ id: friend.id, displayName: friend.displayName, avatarUrl: friend.avatarUrl });
}
```

Обрати внимание — тут нет больше строчки, добавляющей что-то в `directConversations`. Мы только запоминаем "с кем говорим", саму беседу в постоянный список пока не кладём.

### "Продвижение" беседы в список — момент реальной отправки

```typescript
function handleSend(event: FormEvent) {
  ...
  socket.emit('sendMessage', { ... });
  setDraft('');

  if (
    activeDmTarget &&
    generalChannel &&
    selectedConversationId !== generalChannel.id &&
    !directConversations.some((c) => c.id === selectedConversationId)
  ) {
    setDirectConversations((prev) => [
      ...prev,
      { id: selectedConversationId, otherUser: { ...activeDmTarget, isOnline: false } },
    ]);
  }
}
```

Разберём условие целиком: `activeDmTarget` существует (мы знаем, с кем говорим) И это не общий канал (`selectedConversationId !== generalChannel.id`) И этой беседы ещё нет в списке (`!directConversations.some(...)`). Если всё это верно — значит мы только что впервые отправили сообщение в новую, ранее пустую беседу — самое время добавить её в постоянный список.

### Симметричная логика для входящих сообщений

```typescript
function handleNewMessage(message: Message) {
  ...
  const isFromSomeoneElse = message.senderId !== ownUserId;
  const isGeneralChannel = generalChannel && message.conversationId === generalChannel.id;
  if (isFromSomeoneElse && !isGeneralChannel) {
    setDirectConversations((prev) =>
      prev.some((c) => c.id === message.conversationId)
        ? prev
        : [...prev, { id: message.conversationId, otherUser: { ...message.sender, isOnline: true } }],
    );
  }
}
```

Это покрывает обратный сценарий: не мы написали первыми, а нам написали первыми (мы ещё даже не открывали эту беседу вообще, `activeDmTarget` про неё ничего не знает). В этом случае мы берём данные отправителя прямо из пришедшего сообщения (`message.sender` — вспомни, это поле мы подгружаем через `include` на бэкенде ещё с самого начала работы над чатом) — и точно так же добавляем в список, если его там ещё нет.

### Deep-link с профиля — третий сценарий

Когда юзер жмёт "Enviar mensaje" на чужом профиле, беседа может быть абсолютно новой (только что создана бэкендом), и в момент перехода на `/chat` бэкенд ещё не знает о ней в контексте "непустых бесед" (сообщений там нет). Значит `directList` (то, что вернёт `getDirectConversations()` при загрузке `/chat`) её не содержит — а имя собеседника взять неоткуда, если не передать его явно.

```typescript
// UserProfilePage.tsx
navigate(`/chat?dm=${conversation.id}`, {
  state: { otherUser: { id: profile.id, displayName: profile.displayName, avatarUrl: profile.avatarUrl } },
});
```

`navigate(url, { state: {...} })` — второй, не самый очевидный способ передать данные между страницами в React Router (в отличие от query-параметров, которые видны в самом URL, `state` передаётся "невидимо", через историю навигации браузера).

```typescript
// ChatPage.tsx
const location = useLocation();
...
const stateOtherUser = (location.state as { otherUser?: typeof activeDmTarget })?.otherUser;

if (matchingDm) {
  // беседа уже есть в списке (значит там уже есть сообщения)
  ...
} else if (dmId && stateOtherUser) {
  // беседа пустая, но мы знаем, кто собеседник — из navigation state
  setSelectedConversationId(dmId);
  setChannelLabel(stateOtherUser.displayName ?? ...);
  setActiveDmTarget(stateOtherUser);
} else {
  // ничего не совпало — общий канал по умолчанию
  ...
}
```

`useLocation()` — ещё один хук `react-router-dom`, даёт доступ к текущему объекту "локации" браузера, включая тот самый `state`, который мы передали через `navigate`. Тройная проверка (`matchingDm` → `stateOtherUser` → дефолт на общий канал) — это как раз три сценария, которые мы разобрали: беседа уже "созрела" (есть в списке), беседа свежая но мы знаем с кем (пришли с профиля), и "ничего не подошло — просто общий канал".

---

## Итоговая схема всей логики "умного списка бесед"

1. Беседа появляется в `directConversations` только когда в ней реально есть хотя бы одно сообщение — это гарантируется бэкендом при каждой обычной загрузке страницы
2. Пока сообщений ещё нет, но диалог уже открыт (кликнули на друга, или пришли по ссылке с профиля) — используется временное состояние `activeDmTarget` для отображения (шапка, содержимое) без записи в постоянный список
3. В момент реальной первой отправки (`handleSend`) или реального первого получения (`handleNewMessage`) — беседа "повышается" в постоянный список на фронте, синхронно с тем, что теперь физически появится и в БД
4. Специальный случай — переход с чужого профиля, где бэкенд ещё не мог знать о существовании беседы вовсе — решается через `navigate` с `state`, донося информацию о собеседнике напрямую, в обход необходимости спрашивать бэкенд
