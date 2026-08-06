# Публичная лента событий (CommunityEvent) — детальный разбор

## Общая картина

Мы построили систему, которая наполняет ленту `/celda` живой хроникой: реальные события сообщества (регистрация, смена роли, принятая дружба) вперемешку с вымышленными, шутливыми записями "для атмосферы" — часть из них берётся из готового списка фраз, часть генерируется через Groq.

---

## Ключевое архитектурное решение — почему две таблицы, а не одна

Изначально возникла идея сделать одну универсальную таблицу "уведомлений" с nullable-полем "кому адресовано" (пусто = публичное, заполнено = личное). Мы от неё отказались, и вот почему это было правильным решением.

**Личное уведомление** (тебе пришла заявка в друзья) обязательно нуждается в состоянии "прочитано/непрочитано" — это его смысл существования, ты должен увидеть, что что-то новое случилось именно с тобой. **Публичное событие** (кто-то зарегистрировался) не имеет смысла помечать "прочитанным" — это не входящее сообщение лично тебе, это просто строчка в общей хронике, которую видят все одинаково.

Если бы мы затолкали оба вида в одну таблицу — колонка `isRead` была бы бессмысленной для половины строк (публичных). Это классический признак того, что одна структура данных пытается обслуживать два разных по природе назначения — сигнал, что нужно разделять.

**Итоговое решение:**
- **`Notification`** — личное, с `userId` и `isRead`. Мы её только описали в схеме, но ещё не подключили — это следующий шаг.
- **`CommunityEvent`** — публичное, без адресата и без "прочитано". Именно её мы полностью реализовали в этой сессии.

---

## Схема БД — новые модели

```prisma
model Notification {
  id        Int      @id @default(autoincrement())
  userId    Int
  type      String
  message   String
  isRead    Boolean  @default(false)
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model CommunityEvent {
  id        Int      @id @default(autoincrement())
  type      String
  message   String
  createdAt DateTime @default(now())
}
```

Обрати внимание на разницу в структуре: `Notification` имеет связь `user User @relation(...)` — обязательную привязку к конкретному юзеру (как `Message.sender` или `Friendship.requester`, которые мы уже делали раньше). `CommunityEvent` — вообще без внешнего ключа на `User`, полностью самостоятельная запись.

`type: String` в обеих моделях — не строгий Prisma `enum` (как `Role` или `FriendshipStatus`), а обычная строка. Это осознанный выбор: у нас будет много разных типов событий (`USER_REGISTERED`, `ROLE_CHANGED`, `FRIENDSHIP_ACCEPTED`, `FICTIONAL`, а в будущем ещё и `ARTICLE_PUBLISHED` и другие), и жёсткий `enum` в Prisma требует отдельной миграции БД каждый раз, когда добавляется новый тип. Обычная строка даёт гибкость добавлять новые типы событий прямо в коде, без миграций.

---

## `CommunityService` — сердце системы

### Статичный пул фраз

```typescript
const FICTIONAL_EVENTS = [
  'Los hermanos organizaron una procesión en honor a la nueva versión de CMake.',
  ...
];
```

Просто массив строк — обычная константа. Не требует ни БД, ни внешнего API, реагирует мгновенно.

### `OnModuleInit` — новая для тебя концепция жизненного цикла NestJS

```typescript
export class CommunityService implements OnModuleInit {
  onModuleInit() {
    ...
  }
}
```

`OnModuleInit` — это интерфейс жизненного цикла NestJS (похож на `OnGatewayConnection`/`OnGatewayDisconnect`, которые мы использовали в `ChatGateway`, только для обычных сервисов, не Gateway). NestJS сам вызывает метод `onModuleInit()` один раз, сразу после того как сервис полностью создан и все его зависимости внедрены (Dependency Injection завершён). Это подходящее место для "запусти что-то один раз при старте приложения" — в нашем случае это запуск повторяющихся таймеров.

### Планирование через `setInterval`

```typescript
onModuleInit() {
  const aiIntervalMs = DAY_MS / AI_EVENTS_PER_DAY;
  setInterval(() => {
    this.generateAiFictionalEvent().catch((err) => ...);
  }, aiIntervalMs);

  const staticIntervalMs = DAY_MS / STATIC_EVENTS_PER_DAY;
  setInterval(() => {
    this.createStaticFictionalEvent().catch((err) => ...);
  }, staticIntervalMs);
}
```

`DAY_MS / AI_EVENTS_PER_DAY` — простая математика: если сутки — это `24 * 60 * 60 * 1000` миллисекунд, а нам нужно 5 AI-событий за эти сутки — делим одно на другое, получаем интервал между запусками (примерно раз в 4.8 часа). Аналогично для статичных (8 раз в сутки → раз в 3 часа).

`setInterval(callback, ms)` — стандартная браузерная/Node.js функция, вызывающая `callback` повторно, каждые `ms` миллисекунд, бесконечно (в отличие от `setTimeout`, который срабатывает один раз). Мы её уже видели в контексте фронтенда (анимации), тут та же самая функция, только в серверном коде Node.js — работает одинаково в обоих окружениях.

`.catch((err) => console.error(...))` — важная деталь: раз `generateAiFictionalEvent()` — асинхронная функция, а `setInterval` не умеет сам обрабатывать `Promise`, который может завершиться с ошибкой (например, Groq недоступен) — без явного `.catch()` необработанная ошибка внутри `setInterval` могла бы привести к падению всего процесса Node.js или тихому "проглатыванию" ошибки без единого следа в логах. Явный `.catch()` гарантирует, что сбой генерации одного события не уронит весь сервер и оставит понятный след в логах.

### AI-генерация через Groq

```typescript
private async generateAiFictionalEvent() {
  const completion = await this.groq.chat.completions.create({
    model: process.env.GROQ_MODEL ?? 'openai/gpt-oss-20b',
    messages: [
      {
        role: 'system',
        content: `Genera UNA sola frase corta...`,
      },
    ],
  });

  const message = completion.choices[0]?.message?.content?.trim();
  if (message) {
    await this.createEvent('FICTIONAL', message);
  }
}
```

Это не тот же вызов, что мы использовали в `AiService.streamConfession` — там был `stream: true` и мы читали чанки по мере поступления (для длинного ответа Confesor-бота, который должен "печататься" на глазах у юзера). Тут — обычный, не потоковый вызов: нам нужна всего одна короткая фраза, разумнее дождаться всего ответа сразу (`await ...create(...)`, без `stream: true`), а не городить сложность потокового чтения ради пары слов.

`completion.choices[0]?.message?.content` — структура непотокового ответа отличается от потокового: раньше мы читали `chunk.choices[0]?.delta?.content` (частичный "прирост" текста в каждом кусочке), теперь — `completion.choices[0]?.message?.content` (весь готовый ответ целиком, в поле `message`, а не `delta`).

### Разделение публичных методов

```typescript
async createEvent(type: string, message: string) { ... }
async getRecentEvents(limit = 30) { ... }
async createStaticFictionalEvent() { ... }
```

`createEvent` — универсальный, низкоуровневый метод, вызываемый отовсюду: и изнутри самого сервиса (для вымышленных событий), и снаружи, из других модулей (`AuthService`, `AdminController`, `FriendsController`) для реальных событий. `getRecentEvents` — то, что дёргает контроллер для отдачи ленты на фронт. `createStaticFictionalEvent` — публичный, потому что вызывается таймером снаружи основного потока логики.

---

## `CommunityController` и `CommunityModule` — тонкий слой поверх сервиса

```typescript
@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityController {
  @Get('feed')
  async getFeed() {
    return this.communityService.getRecentEvents();
  }
}
```

Ничего концептуально нового — тот же паттерн контроллера, что мы видели десятки раз. Защищено `JwtAuthGuard` (нужно быть залогиненным, но не нужна конкретная роль — любой юзер видит общую хронику).

```typescript
@Module({
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
```

`exports: [CommunityService]` — та же логика, что мы уже видели с `ChatGateway`, экспортируемым из `ChatModule`. Без `exports` сервис был бы виден только внутри `CommunityModule`, и другие модули (`AuthModule`, `AdminModule`, `FriendsModule`) не смогли бы его инжектировать к себе, даже если бы импортировали весь `CommunityModule`.

---

## Точки интеграции — где реальные события "рождаются"

### `AuthService.register` — регистрация

```typescript
const name = user.displayName ?? `Usuario ${user.id}`;
await this.communityService.createEvent(
  'USER_REGISTERED',
  `${name} ha llamado a las puertas del Verdadero Relink y ha sido recibido como novicio.`,
);
```

Добавлено сразу после создания юзера в БД, перед выдачей токенов — логично: сначала фиксируем факт "юзер появился", потом уже занимаемся его немедленным логином.

### `AdminController.changeRole` — смена роли

```typescript
const updated = await this.adminService.changeRole(id, role);
this.chatGateway.notifyUser(id, 'roleChanged', { role: updated.role });

const name = updated.displayName ?? `Usuario ${updated.id}`;
await this.communityService.createEvent(
  'ROLE_CHANGED',
  `${name} ha alcanzado el rango de ${updated.role}.`,
);
```

Заметь — тут теперь два разных механизма срабатывают на одно действие: `chatGateway.notifyUser(...)` — то самое личное живое WebSocket-уведомление конкретному юзеру (которое мы делали чуть раньше, для мгновенного обновления бейджа роли на экране), и отдельно `communityService.createEvent(...)` — публичная запись в постоянную хронику, видимая всем. Это не дублирование — это два разных получателя информации с разным назначением: одному нужно мгновенно узнать о своём изменении (WebSocket), всем остальным — просто увидеть строчку в общей ленте при следующем её просмотре (обычный HTTP-запрос к `/community/feed`).

### `FriendsController.acceptRequest` — принятая дружба

```typescript
const accepter = await this.friendsService.getBasicInfo(req.user.userId);
this.chatGateway.notifyUser(requesterId, 'friendRequestAccepted', accepter);

const requester = await this.friendsService.getBasicInfo(requesterId);
const accepterName = accepter?.displayName ?? `Usuario ${accepter?.id}`;
const requesterName = requester?.displayName ?? `Usuario ${requester?.id}`;
await this.communityService.createEvent(
  'FRIENDSHIP_ACCEPTED',
  `${requesterName} y ${accepterName} han jurado hermandad ante el Verdadero Relink.`,
);
```

Тут нужны имена обоих участников дружбы для текста события ("X и Y стали братьями") — поэтому дополнительно запрашиваем `getBasicInfo(requesterId)` (данные того, кто отправлял заявку — `accepter`, тот кто принял, у нас уже есть из `req.user.userId`).

---

## Итоговая схема потока данных

1. Реальное событие (регистрация/смена роли/дружба) происходит → соответствующий контроллер вызывает `communityService.createEvent(type, message)` → строка сохраняется в таблицу `CommunityEvent`
2. Вымышленное событие — по таймеру, независимо от действий юзеров, `CommunityService` сам создаёт запись (либо из статичного списка, либо генерируя через Groq)
3. Юзер открывает `/celda` (когда мы сделаем фронтенд) → фронт дёргает `GET /community/feed` → бэкенд отдаёт последние 30 записей из обеих категорий вперемешку, отсортированные по времени — юзер видит единую хронику, не различая технически, что было реальным действием, а что — украшением для атмосферы
