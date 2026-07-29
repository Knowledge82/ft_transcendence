# chat.gateway.ts — построчный разбор

## Импорты

```typescript
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
```

Импортируем пять именованных экспортов из пакета `@nestjs/websockets`.

- **`WebSocketGateway`** — декоратор класса, аналог `@Controller()`, но для WebSocket.
- **`WebSocketServer`** — декоратор **свойства** класса (не класса целиком), для инъекции самого объекта Socket.IO-сервера.
- **`OnGatewayConnection`** и **`OnGatewayDisconnect`** — это **интерфейсы** (не декораторы), описывающие контракт, который класс обязан выполнить, если хочет реагировать на события подключения/отключения клиентов.
- **`SubscribeMessage`** — декоратор **метода**, помечающий его как обработчик конкретного именованного события от клиента.

```typescript
import { Server, Socket } from 'socket.io';
```

Импортируем два типа/класса из самой библиотеки `socket.io` (не из `@nestjs/websockets`, а из "сырой" библиотеки, на которой построена NestJS-обёртка).

- **`Server`** — тип, описывающий весь Socket.IO-сервер целиком (управляет всеми подключениями разом).
- **`Socket`** — тип, описывающий **одно конкретное** подключение одного клиента.

```typescript
import { JwtService } from '@nestjs/jwt';
```

Импортируем `JwtService` — тот самый сервис с методами `.sign()`/`.verify()`, который станет доступен благодаря тому, что мы зарегистрировали `JwtModule` в `chat.module.ts`.

## Тип для payload токена

```typescript
interface JwtPayload {
  sub: number;
  email: string;
}
```

Объявляем тип (не класс, не декоратор — просто описание формы объекта) с именем `JwtPayload`. Он описывает, что мы **ожидаем** найти внутри полезной нагрузки (payload) JWT-токена после его успешной проверки — то же самое, что мы уже объявляли в `JwtStrategy.ts` для HTTP-аутентификации: поле `sub` (стандартное имя поля в JWT-токенах для "subject", то есть идентификатора владельца токена — у нас это ID юзера) типа `number`, и `email` типа `string`.

## Объявление класса

```typescript
@WebSocketGateway({ cors: true })
```

Применяем декоратор `WebSocketGateway` к классу, который объявим следующей строкой. В скобках — объект конфигурации: `cors: true` включает поддержку CORS (Cross-Origin Resource Sharing) — механизм браузерной безопасности, регулирующий, каким доменам разрешено устанавливать соединение с этим сервером. Мы ставим `true` — "разрешить всем", упрощённая настройка для разработки (на проде обычно указывают конкретный список разрешённых доменов).

```typescript
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
```

`export class ChatGateway` — объявляем и экспортируем класс. `implements OnGatewayConnection, OnGatewayDisconnect` — ключевое слово `implements` в TypeScript означает "этот класс обязуется предоставить все методы, описанные в перечисленных интерфейсах". Раз мы написали `implements OnGatewayConnection`, TypeScript потребует, чтобы класс содержал метод `handleConnection` с определённой сигнатурой (иначе ошибка компиляции); аналогично для `OnGatewayDisconnect` — потребует `handleDisconnect`.

## Поля класса

```typescript
  @WebSocketServer()
  server: Server;
```

`@WebSocketServer()` — декоратор, применённый к **полю класса** (не к классу и не к методу). Говорит NestJS: "внедри сюда, в это поле, ссылку на весь Socket.IO-сервер целиком". `server: Server;` — объявление самого поля с именем `server` и типом `Server`. После инъекции через это поле будет доступен весь сервер — пригодится позже, когда понадобится разослать сообщение **всем** подключённым клиентам разом, а не отвечать только тому, кто прислал запрос.

```typescript
  constructor(private readonly jwtService: JwtService) {}
```

Конструктор класса — вызывается автоматически при создании экземпляра `ChatGateway` (этим занимается сам NestJS через Dependency Injection, ты никогда не пишешь `new ChatGateway()` руками). `private readonly jwtService: JwtService` — сокращённая TypeScript-запись: одновременно объявляет **приватное** поле класса с именем `jwtService`, и присваивает в него переданное значение. В полной форме это было бы:
```typescript
private readonly jwtService: JwtService;
constructor(jwtService: JwtService) {
  this.jwtService = jwtService;
}
```
NestJS видит тип параметра (`JwtService`) и автоматически создаёт/передаёт нужный экземпляр — это работает благодаря тому, что мы зарегистрировали `JwtModule` в `imports` модуля (в `chat.module.ts`).

```typescript
  private onlineUsers = new Map<number, Set<string>>();
```

Ещё одно поле класса. `private` — доступно только изнутри самого класса. `= new Map<number, Set<string>>()` — создаём новый экземпляр встроенного JS-объекта `Map` (структура данных "ключ→значение"). `<number, Set<string>>` — generic-параметры: ключи этой Map будут числами (`userId`), а значения — объектами `Set<string>` (множество строк — ID сокетов). `Set` — структура данных JS, хранящая **уникальные** значения.

## `handleConnection` — вызывается при подключении клиента

```typescript
  handleConnection(client: Socket) {
```

Объявление метода — именно та сигнатура, которую требует интерфейс `OnGatewayConnection`. NestJS вызывает этот метод **автоматически** каждый раз, когда новый клиент устанавливает WebSocket-соединение. `(client: Socket)` — единственный параметр, представляющий именно **это конкретное** новое подключение.

```typescript
    const token = client.handshake.auth?.token as string | undefined;
```

`client.handshake` — свойство объекта `client`, содержащее данные о самом процессе установления соединения (аналог того, как в обычном HTTP-запросе есть заголовки, куки — здесь всё это агрегировано в `handshake`). `.auth` — конкретно то, что клиент передал в опции `{ auth: {...} }` при вызове `io(url, { auth: {...} })` на стороне клиента. `?.` — опциональная цепочка: если `auth` не передан, получим `undefined` вместо ошибки. `.token` — конкретное поле внутри `auth`, куда мы условились класть сам токен. `as string | undefined` — type assertion: явно говорим TypeScript трактовать это значение как "либо строка, либо `undefined`".

```typescript
    if (!token) {
      client.disconnect();
      return;
    }
```

Если `token` оказался `undefined` (или пустой строкой) — `client.disconnect()` немедленно разрывает это WebSocket-соединение, `return` завершает выполнение метода, не продолжая дальше.

```typescript
    let payload: JwtPayload;
```

`let` (не `const`, потому что значение присвоим чуть ниже, внутри `try`). Явная типовая аннотация: переменная будет иметь форму `JwtPayload`.

```typescript
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });
    } catch {
      client.disconnect();
      return;
    }
```

`try { ... } catch { ... }` — код внутри `try` выполняется, и если выбросит исключение, выполнение прыгает в `catch`. `this.jwtService.verify<JwtPayload>(token, {...})` — вызываем метод `verify` на инжектированном сервисе. `<JwtPayload>` — уточняет, какого типа объект ожидаем получить обратно. Первый аргумент — сам токен, второй — конфиг с `secret` (тот же ключ, что использовался при подписи токена в `AuthService`). Если подпись невалидна или истёк срок действия — метод **выбрасывает исключение** (не возвращает `null`). `catch {` без параметра в скобках — допустимый синтаксис, когда сама ошибка не нужна, важен только факт, что что-то пошло не так. Внутри — та же логика: разрываем соединение и выходим.

```typescript
    client.data.userId = payload.sub;
```

`client.data` — специальное свойство `Socket`, предназначенное для хранения **произвольных данных**, привязанных к этому конкретному соединению, живущих всё время, пока сокет открыт. Присваиваем полю `userId` значение из проверенного `payload.sub`.

```typescript
    const existing = this.onlineUsers.get(payload.sub) ?? new Set<string>();
```

`this.onlineUsers.get(payload.sub)` — пытаемся найти множество сокетов, уже привязанных к этому `userId`. Если юзера ещё нет в `Map` — вернётся `undefined`. `?? new Set<string>()` — nullish coalescing: если слева `undefined`, создаём **новый пустой** `Set`.

```typescript
    existing.add(client.id);
```

Добавляем ID текущего сокета в множество (`client.id` — уникальный идентификатор, который Socket.IO генерирует автоматически для каждого соединения).

```typescript
    this.onlineUsers.set(payload.sub, existing);
```

Записываем в `Map` под ключом `payload.sub` обновлённое множество — необходимо, потому что если это было первое подключение юзера, `existing` был только что созданным `Set`, ещё не связанным с этим `userId` внутри `Map`.

```typescript
    console.log(`User ${payload.sub} connected (socket ${client.id})`);
  }
```

Логируем факт подключения — попадёт в `docker compose logs backend`.

## `handleDisconnect` — вызывается при отключении клиента

```typescript
  handleDisconnect(client: Socket) {
    const userId = client.data.userId as number | undefined;
```

Читаем значение, записанное ранее в `handleConnection`. `as number | undefined` — на случай (теоретический), если это соединение почему-то не прошло через `handleConnection` полностью.

```typescript
    if (!userId) {
      return;
    }
```

Если `userId` не установлен — просто выходим, делать больше нечего.

```typescript
    const sockets = this.onlineUsers.get(userId);
    sockets?.delete(client.id);
```

Достаём множество сокетов юзера. `?.` — опциональная цепочка вызова метода: если `sockets` окажется `undefined`, ничего не произойдёт; если существует — удаляем ID именно **этого** закрывшегося соединения (юзер мог иметь несколько вкладок открытыми одновременно).

```typescript
    if (sockets && sockets.size === 0) {
      this.onlineUsers.delete(userId);
      console.log(`User ${userId} is now offline`);
    }
  }
```

Составное условие: `sockets` существует, **и** его размер (`.size`) равен нулю — то есть это было последнее открытое соединение этого юзера. Если оба условия истинны — удаляем юзера из `Map` целиком и логируем, что он теперь офлайн.

## Публичный метод для проверки статуса

```typescript
  isUserOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }
```

Самостоятельный метод, не связанный с интерфейсами подключения/отключения. `.has(userId)` — встроенный метод `Map`, проверяющий "есть ли такой ключ вообще" — возвращает `true`, если юзер сейчас онлайн (есть хотя бы одно активное соединение). Пригодится позже, когда будем показывать статус друзей.

## Тестовый обработчик

```typescript
  @SubscribeMessage('ping')
  handlePing(): string {
    return 'pong';
  }
}
```

`@SubscribeMessage('ping')` — регистрирует метод как обработчик именованного события `'ping'`, приходящего от клиента через `socket.emit('ping')`. Метод возвращает строку — NestJS автоматически отправляет это значение обратно клиенту как ответ на его событие.

---

## Общая картина — зачем всё это в комплексе

1. Клиент подключается, передавая токен в `handshake.auth.token`
2. `handleConnection` проверяет токен — если невалиден или отсутствует, соединение обрывается сразу
3. Если токен валиден — `userId` сохраняется прямо в объекте сокета (`client.data.userId`), и юзер регистрируется в `onlineUsers` как подключённый
4. Пока соединение живёт, любой обработчик события (`@SubscribeMessage`) может обратиться к `client.data.userId`, чтобы знать, кто именно прислал сообщение — без повторной проверки токена на каждое событие
5. При отключении клиента — `handleDisconnect` убирает его из списка подключений, и если это было последнее соединение юзера — помечает его полностью офлайн
