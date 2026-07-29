# Онлайн-статус — детальный разбор реализации

## Общая идея, прежде чем нырять в код

Проблема, которую решаем: юзер A хочет знать, онлайн ли юзер B, **и** это знание должно обновляться само, без перезагрузки страницы. У нас уже был `ChatGateway` с картой `onlineUsers` — мы её **не создавали заново**, а протянули доступ к ней из других мест приложения (`FriendsController`, список участников общего канала) плюс добавили рассылку события при каждом изменении.

---

## Backend, файл за файлом

### `chat.module.ts` — открываем доступ извне

```typescript
providers: [ChatGateway, ChatService],
exports: [ChatGateway],
```

`exports` — новое поле, которое мы раньше не использовали в `ChatModule`. По умолчанию всё, что модуль создаёт (`providers`), видно **только внутри самого модуля** — это называется инкапсуляцией модулей в NestJS, та же идея, что `private` в классах, только на уровне модулей целиком. `exports: [ChatGateway]` явно "приоткрывает дверь" — говорит: "любой другой модуль, который импортирует меня, получит доступ к `ChatGateway`".

### `friends.module.ts` — импортируем открытую дверь

```typescript
import { ChatModule } from '../chat/chat.module';

@Module({
  imports: [ChatModule],
  ...
```

`imports: [ChatModule]` — теперь `FriendsModule` "видит" всё, что `ChatModule` экспортировал (то есть `ChatGateway`), и может инжектить его в свои классы через обычный конструктор, как любой другой provider.

### `friends.controller.ts` — используем инжектированный Gateway

```typescript
constructor(
  private readonly friendsService: FriendsService,
  private readonly chatGateway: ChatGateway,
) {}
```

Ничего концептуально нового — та же схема DI через конструктор, что мы видели десятки раз, просто теперь второй зависимостью выступает `ChatGateway` вместо `PrismaService`/`JwtService`.

```typescript
@Get()
async listFriends(@Request() req) {
  const friends = await this.friendsService.listFriends(req.user.userId);
  return friends.map((friend) => ({
    ...friend,
    isOnline: this.chatGateway.isUserOnline(friend.id),
  }));
}
```

`friends.map((friend) => ({ ...friend, isOnline: ... }))` — для каждого друга из списка (который `FriendsService` вернул **без** информации об онлайне — этот сервис вообще ничего не знает про WebSocket) создаём **новый** объект: `...friend` копирует все существующие поля (`id`, `displayName`, `avatarUrl`), а `isOnline: this.chatGateway.isUserOnline(friend.id)` добавляет новое поле, вычисленное **прямо сейчас**, в момент запроса, обращаясь к той самой карте `onlineUsers` внутри Gateway.

**Важно понимать:** это вычисляется заново при **каждом** запросе `GET /friends` — не хранится в базе данных, потому что статус "онлайн" не то, что должно жить в постоянном хранилище, это временное, живое состояние процесса сервера.

### `chat.gateway.ts` — логика подключения/отключения с рассылкой

```typescript
const existing = this.onlineUsers.get(payload.sub) ?? new Set<string>();
const isFirstConnection = existing.size === 0;
existing.add(client.id);
this.onlineUsers.set(payload.sub, existing);

if (isFirstConnection) {
  this.server.emit('userStatusChanged', { userId: payload.sub, isOnline: true });
}
```

Разберём, зачем нужна проверка `isFirstConnection`. Представь: юзер уже открыл одну вкладку (он уже онлайн, в `onlineUsers` у него есть один socket ID). Он открывает **вторую** вкладку того же сайта — `handleConnection` вызовется заново для нового сокета. Если бы мы рассылали `userStatusChanged` **при каждом** подключении без разбора — все остальные юзеры получили бы избыточное "юзер X теперь онлайн" уведомление, хотя он и так уже был онлайн (просто открыл вторую вкладку). `isFirstConnection = existing.size === 0` — проверяем размер множества **до** добавления нового ID: если оно было пустым — значит это действительно первое подключение, есть смысл сообщать всем. Если там уже что-то было — это просто ещё одна вкладка того же уже онлайн юзера, рассылать нечего.

**`this.server.emit(...)`** — обрати внимание на разницу с `this.server.to(room).emit(...)`, которую мы использовали для сообщений чата. Без `.to(room)` — `emit` уходит **всем без исключения** подключённым сокетам, а не только участникам конкретной комнаты. Это осознанный выбор, который ты сам подтвердил как желаемый (все видят статус всех).

```typescript
if (sockets && sockets.size === 0) {
  this.onlineUsers.delete(userId);
  this.server.emit('userStatusChanged', { userId, isOnline: false });
  console.log(`User ${userId} is now offline`);
}
```

Симметричная логика при отключении — только когда `size === 0` **после** удаления текущего сокета (то есть это было последнее открытое соединение юзера), рассылаем `isOnline: false`. Если у юзера были ещё открытые вкладки — они остаются в `Set`, и рассылка не происходит, юзер по-прежнему считается онлайн.

### `chat.service.ts` — список участников общего канала

```typescript
async getGeneralChannelMembers() {
  const general = await this.getOrCreateGeneralChannel();
  const participants = await this.prisma.conversationParticipant.findMany({
    where: { conversationId: general.id },
    include: {
      user: { select: { id: true, displayName: true, avatarUrl: true } },
    },
  });
  return participants.map((p) => p.user);
}
```

`this.prisma.conversationParticipant.findMany({ where: { conversationId: general.id } })` — находим все строки таблицы `ConversationParticipant`, относящиеся к общему каналу (вспомни: эта таблица заполняется через `ensureParticipant`, который мы чинили раньше, когда ловили баг с "Internal server error"). `include: { user: {...} } }` — для каждой найденной строки **подгружаем связанные данные** юзера (Prisma сама делает JOIN под капотом) — без `include` мы получили бы только сырые строки `ConversationParticipant` (с `userId`, `conversationId`), без реальных данных о самом юзере. `participants.map((p) => p.user)` — раз нам не нужна сама строка-связка (`ConversationParticipant`), а нужны именно данные юзеров — вытаскиваем только вложенное поле `user` из каждой записи, отбрасывая остальное.

### `chat.controller.ts` — эндпоинт со статусом

```typescript
constructor(
  private readonly chatService: ChatService,
  private readonly chatGateway: ChatGateway,
) {}
```

Обрати внимание — `ChatGateway` тут инжектируется в **тот же модуль**, где он и объявлен (`ChatModule`), в отличие от `friends.controller.ts`, где он приходил "снаружи" через `imports`. Тут ничего специального делать не пришлось — раз `ChatController` и `ChatGateway` оба находятся в `providers` одного модуля, DI работает "из коробки".

```typescript
@Get('general/members')
async getGeneralMembers() {
  const members = await this.chatService.getGeneralChannelMembers();
  return members.map((member) => ({
    ...member,
    isOnline: this.chatGateway.isUserOnline(member.id),
  }));
}
```

Тот же паттерн обогащения объекта, что мы видели в `friends.controller.ts` — берём "сырых" участников из сервиса, добавляем каждому вычисленное поле `isOnline`.

---

## Frontend, файл за файлом

### `api/friends.ts` и `api/chat.ts` — новые поля в типах

```typescript
export interface Friend {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}
```

Просто добавили поле в существующий интерфейс — TypeScript теперь будет требовать (и подсказывать через автодополнение), что у объекта `Friend` есть это поле, соответствуя тому, что реально присылает бэкенд.

```typescript
export interface Member {
  id: number;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
}

export async function getGeneralMembers(): Promise<Member[]> {
  const { data } = await apiClient.get<Member[]>('/chat/general/members');
  return data;
}
```

Новый интерфейс и новая функция запроса — по той же схеме, что мы писали для всех остальных API-вызовов (`getGeneralChannel`, `listFriends` и т.д.).

### `ChatPage.tsx` — состояние и загрузка

```typescript
const [members, setMembers] = useState<Member[]>([]);
```

Новое состояние, аналогичное `friends` — отдельный массив, потому что участники общего канала и друзья — разные, хоть и пересекающиеся, множества людей.

```typescript
Promise.all([
  getGeneralChannel(),
  listFriends(),
  getGeneralMembers(),
  apiClient.get<{ id: number }>('/users/me'),
])
  .then(([general, friendsList, membersList, me]) => {
    ...
    setMembers(membersList);
```

Добавили третий параллельный запрос в уже существующий `Promise.all` — раз он и так грузит несколько вещей одновременно при открытии страницы, логично добавить сюда и список участников, а не делать отдельный ещё один `useEffect`.

### Обработчик живого обновления — ключевая часть

```typescript
function handleStatusChanged({ userId, isOnline }: { userId: number; isOnline: boolean }) {
  setFriends((prev) =>
    prev.map((friend) => (friend.id === userId ? { ...friend, isOnline } : friend)),
  );
  setMembers((prev) =>
    prev.map((member) => (member.id === userId ? { ...member, isOnline } : member)),
  );
}
```

Разберём `prev.map((friend) => (friend.id === userId ? { ...friend, isOnline } : friend))` пошагово. `.map()` проходит по **каждому** элементу массива `prev` (текущего списка друзей) и для каждого решает, что вернуть на его месте в новом массиве. Условие `friend.id === userId` — "это тот самый юзер, чей статус только что поменялся?". Если да — возвращаем **новый** объект (`{ ...friend, isOnline }` — копия старого объекта друга, но с обновлённым полем `isOnline`). Если нет — возвращаем **тот же самый** объект `friend` без изменений (просто "пропускаем" его дальше как есть).

Результат — новый массив, где **только один** элемент (тот, чей `id` совпал) реально заменён на обновлённую копию, все остальные элементы — те же ссылки, что были. Это стандартный React-паттерн "иммутабельного обновления": мы никогда не меняем существующий объект/массив **на месте**, а создаём новый с нужными изменениями — так React корректно замечает, что состояние изменилось, и перерисовывает интерфейс.

**`setFriends` и `setMembers` вызываются оба** — потому что один и тот же юзер потенциально присутствует в обоих списках разом (он может быть и другом, и участником общего канала одновременно) — обновляем оба списка на случай, если юзер есть в каждом из них, `.map()` просто ничего не поменяет там, где `id` не совпал.

### Сортировка в разметке

```tsx
{[...members]
  .sort((a, b) => Number(b.isOnline) - Number(a.isOnline))
  .map((member) => ( ... ))}
```

`[...members]` — spread-оператор создаёт **новый** массив, копию `members`, прежде чем сортировать. Это важно: `.sort()` в JavaScript сортирует **на месте** (мутирует исходный массив, а не возвращает новый) — если бы мы вызвали `members.sort(...)` напрямую, мы бы изменили сам React state в обход `setMembers`, что React не отследит как изменение, и это плохая практика вообще (нельзя мутировать state напрямую).

`.sort((a, b) => Number(b.isOnline) - Number(a.isOnline))` — функция сравнения для `.sort()`. `Number(true)` даёт `1`, `Number(false)` даёт `0`. Если `b.isOnline` (`1` или `0`) больше `a.isOnline` — результат вычитания положительный, что говорит `.sort()` "переставь их местами" (по соглашению JS: отрицательный результат — `a` должен идти раньше `b`, положительный — наоборот). Итоговый эффект — все онлайн-участники (`isOnline: true`, то есть `1`) оказываются в начале массива, офлайн — в конце.

### Счётчик

```tsx
<h2>Hermanos ({members.filter((m) => m.isOnline).length}/{members.length})</h2>
```

`.filter((m) => m.isOnline)` — создаёт новый массив, содержащий только тех участников, у кого `isOnline === true`. `.length` этого отфильтрованного массива — количество онлайн. `members.length` — общее количество. Вместе дают строку вида "Hermanos (3/7)".

---

## Итоговая картина всей цепочки

1. Юзер B открывает вкладку → `ChatGateway.handleConnection` проверяет токен → добавляет в `onlineUsers` → это первое подключение → `this.server.emit('userStatusChanged', {userId: B, isOnline: true})` уходит **всем**
2. У юзера A, который уже был на странице чата, сокет получает это событие → срабатывает `handleStatusChanged` → `setFriends`/`setMembers` создают новые массивы с обновлённым статусом юзера B
3. React видит, что state изменился → перерисовывает списки → точка рядом с именем B становится зелёной, без единого действия со стороны юзера A
