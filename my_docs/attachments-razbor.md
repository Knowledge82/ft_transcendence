# Вложения в чате — полный разбор от начала до конца

## Общая картина

Мы добавили возможность прикреплять файлы (картинки и PDF) к сообщениям — но только в личных беседах, не в общем канале. По пути столкнулись с двумя реальными проблемами (nginx резал большие файлы, браузер не мог авторизованно загружать картинки) — разберём и код, и оба бага подробно.

---

## Backend, часть 1 — схема данных

```prisma
model Message {
  ...
  attachmentFilename String?
  attachmentType     String?
  attachmentName     String?
  ...
}
```

Три опциональных (`?`) поля — у большинства сообщений вложения нет, поэтому все три могут быть `null`. Разберём, зачем три отдельных поля, а не одно:

- `attachmentFilename` — как файл называется на диске сервера (что-то вроде `5-1723456789012.png`) — используется, чтобы найти файл физически
- `attachmentType` — MIME-тип (`image/png`, `application/pdf`) — по нему фронт решает, показывать превью картинки или иконку документа
- `attachmentName` — оригинальное имя файла, как его назвал юзер на своём компьютере (`отпуск.png`) — нужно только для красивого отображения, юзеру плевать на техническое имя на диске

---

## Backend, часть 2 — загрузка файла

```typescript
@Post('upload')
@UseInterceptors(
  FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads/attachments',
      filename: (req, file, callback) => {
        const userId = (req as { user?: { userId?: number } }).user?.userId;
        const uniqueSuffix = Date.now();
        const ext = extname(file.originalname);
        callback(null, `${userId}-${uniqueSuffix}${ext}`);
      },
    }),
    limits: { fileSize: MAX_ATTACHMENT_SIZE_BYTES },
    fileFilter: (req, file, callback) => {
      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.mimetype)) {
        callback(new BadRequestException('Solo se permiten imágenes o archivos PDF'), false);
        return;
      }
      callback(null, true);
    },
  }),
)
async uploadAttachment(@UploadedFile() file: Express.Multer.File) {
  return { filename: file.filename, type: file.mimetype, name: file.originalname };
}
```

Это тот же самый паттерн Multer + diskStorage, что мы уже проходили для аватарки — генерируем уникальное имя файла (`userId-timestamp.расширение`, чтобы два разных файла никогда не перезаписали друг друга), проверяем тип (`fileFilter`) и размер (`limits`) до того как файл реально сохранится на диск.

Важная деталь дизайна — загрузка это отдельный шаг от отправки сообщения. Сначала фронт грузит файл сюда, получает обратно `{filename, type, name}`, и только потом, отдельным действием, отправляет само сообщение (через WebSocket) уже с этими данными внутри. То есть "загрузить файл" и "отправить сообщение с этим файлом" — технически два разных запроса, хоть с точки зрения юзера это выглядит одним действием.

---

## Backend, часть 3 — правило "только в личке"

```typescript
async saveMessage(conversationId, senderId, content, attachment?) {
  const allowed = await this.isParticipant(conversationId, senderId);
  if (!allowed) {
    throw new ForbiddenException('You are not part of this conversation');
  }

  if (attachment) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { type: true },
    });
    if (conversation?.type !== 'DIRECT') {
      throw new ForbiddenException('Los archivos adjuntos solo están permitidos en conversaciones privadas');
    }
  }
  ...
}
```

Тут проверка только если `attachment` реально передан (`if (attachment) {...}`) — обычные текстовые сообщения без файла эту проверку вообще не проходят, она не мешает основному потоку. Если файл есть — смотрим тип беседы (`DIRECT` или `CHANNEL`) и отклоняем, если это общий канал.

Это решение — на сервере, значит сработает, даже если кто-то технически обойдёт кнопку на фронте (например, через консоль браузера вручную соберёт запрос) — тот самый принцип "проверяем на бэке, не полагаемся только на UI", который мы применяли много раз.

---

## Backend, часть 4 — самое сложное: как безопасно отдать файл обратно

Вот тут была реальная архитектурная развилка. Разберём все три варианта, которые в принципе существуют, и почему выбрали именно третий.

**Вариант А — статика через nginx** (как у аватарок). Просто, но небезопасно для приватных вложений: URL файла легко угадать/сохранить, и любой, у кого есть ссылка, может открыть файл, даже не будучи участником той личной беседы.

**Вариант Б — авторизованный роут с JWT в заголовке** (наш первый подход). Безопасно с точки зрения проверки прав — эндпоинт проверяет, что юзер реально участник беседы. Но тут всплыла проблема (разберём в разделе про баги): `<img>` и `<a>` — обычные HTML-теги, браузер загружает их напрямую, без нашего JS-кода, а значит без возможности прикрепить заголовок Authorization.

**Вариант В — токен через query-параметр** (то, что мы в итоге сделали). Тот же авторизованный роут, но принимает токен ещё и из `?token=...` в самом URL — единственный способ авторизовать прямую браузерную загрузку без сложных обходных путей (blob-URL, ручной fetch для каждой картинки).

### Новый Guard — принимает токен из двух источников

```typescript
@Injectable()
export class JwtQueryOrHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    const headerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const queryToken = request.query.token;
    const token = headerToken ?? queryToken;

    if (!token) throw new UnauthorizedException('No token provided');

    try {
      const payload = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
      request.user = { userId: payload.sub, email: payload.email };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
```

`headerToken ?? queryToken` — берём токен откуда получится: если есть заголовок (обычный API-запрос через axios) — используем его; если нет (прямая загрузка браузером через `<img>`) — берём из query. Дальше — обычная проверка JWT, та же, что делает и стандартный JwtAuthGuard, просто написанная руками, а не через готовый Passport-механизм.

### Отдельный контроллер — почему нельзя было просто добавить метод в ChatController

```typescript
@Controller('chat')
@UseGuards(JwtAuthGuard)   // ← действует на ВСЕ методы класса
export class ChatController { ... }
```

`ChatController` целиком защищён `JwtAuthGuard` на уровне класса — это применяется ко всем методам разом, нет способа сказать "а вот для этого одного метода — другой Guard вместо этого". Пришлось вынести отдачу вложения в отдельный класс `AttachmentsController`, у которого нет общего class-level Guard'а, и повесить наш новый `JwtQueryOrHeaderGuard` точечно, только на нужный метод:

```typescript
@Controller('chat/attachments')
export class AttachmentsController {
  @Get(':filename')
  @UseGuards(JwtQueryOrHeaderGuard)
  async getAttachment(...) { ... }
}
```

---

## Backend, часть 5 — удаление сообщения

```typescript
const isAuthor = message.senderId === req.user.userId;
const role = await this.chatService.getUserRole(req.user.userId);
const isModerator = role !== null && MODERATOR_ROLES.includes(role);

if (!isAuthor && !isModerator) {
  throw new ForbiddenException('No puedes eliminar este mensaje');
}

await this.chatService.deleteMessage(id);

if (message.attachmentFilename) {
  const filePath = join(process.cwd(), 'uploads', 'attachments', message.attachmentFilename);
  unlink(filePath).catch(() => {});
}

this.chatGateway.broadcastToRoom(message.conversationId, 'messageDeleted', { messageId: id, conversationId: message.conversationId });
```

`isAuthor || isModerator` — та самая логика, которую ты выбрал: автор своего сообщения или GUARDIAN/ARZOBISPO как модерация чужого.

`unlink(filePath).catch(() => {})` — удаление физического файла с диска. `.catch(() => {})` — специально "проглатываем" возможную ошибку (например, если файл уже как-то пропал) — это дополнительная уборка, не критичная для основного результата (сообщение всё равно удалится из БД, даже если файл почему-то не удалился с диска).

`broadcastToRoom(...)` — рассылка только участникам конкретной беседы (не всем подряд), чтобы сообщение исчезло "на глазах" у всех, кто сейчас смотрит именно этот чат.

---

## Frontend, часть 1 — загрузка с прогресс-баром

```typescript
export async function uploadAttachment(file: File, onProgress?: (percent: number) => void) {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/chat/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (event) => {
      if (onProgress && event.total) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    },
  });
  return data;
}
```

`onUploadProgress` — специальная опция axios, которую браузер вызывает многократно прямо во время передачи файла (не после!), с текущим количеством переданных байт (`event.loaded`) из общего размера (`event.total`). Именно поэтому ты, скорее всего, не заметил прогресс-бар — на 2МБ при быстром соединении вся загрузка укладывается в доли секунды, прогресс успевает "проскочить" от 0% до 100% почти мгновенно.

## Frontend, часть 2 — состояние компонента для вложения

```typescript
const [pendingAttachment, setPendingAttachment] = useState<{filename, type, name} | null>(null);
const [uploadProgress, setUploadProgress] = useState<number | null>(null);
const [uploadError, setUploadError] = useState<string | null>(null);
```

Три отдельных состояния: `pendingAttachment` — файл уже загружен, ждёт отправки вместе с текстом. `uploadProgress` — `null`, когда ничего не грузится, число от 0 до 100 во время загрузки. `uploadError` — текст ошибки, если что-то пошло не так (это мы добавили отдельно, когда разбирали твой случай с 413).

## Frontend, часть 3 — условная кнопка прикрепления

```tsx
{!isGeneralChannelSelected && (
  <>
    <input ref={fileInputRef} type="file" ... className="hidden" onChange={handleFileSelected} />
    <button type="button" onClick={() => fileInputRef.current?.click()}>📎</button>
  </>
)}
```

Тот же паттерн "скрытый `<input type="file">` + видимая кнопка, программно кликающая по нему", что мы уже делали для аватарки. Условие `!isGeneralChannelSelected` — кнопка физически не рендерится в общем канале, дублируя на UI-уровне то ограничение, что уже проверяется на бэкенде.

## Frontend, часть 4 — отображение вложения в истории

```tsx
{message.attachmentType?.startsWith('image/') ? (
  <a href={withAuthToken(message.attachmentUrl)} target="_blank">
    <img src={withAuthToken(message.attachmentUrl)} className="rounded-md max-h-48 object-cover" />
  </a>
) : (
  <a href={withAuthToken(message.attachmentUrl)} target="_blank">📄 {message.attachmentName}</a>
)}
```

`message.attachmentType?.startsWith('image/')` — простая проверка по MIME-типу: если начинается с `"image/"` — показываем настоящее превью через `<img>`. Иначе (PDF и всё остальное, что мы разрешим в будущем) — просто иконка документа со ссылкой.

`withAuthToken(...)` — та самая функция, что решает проблему авторизации (разберём в разделе про баги ниже) — оборачивает URL, добавляя токен в query.

## Frontend, часть 5 — удаление с "проявляющейся" кнопкой

```tsx
<div className="... group">
  <div className="... relative">
    ...
    {canDelete && (
      <button className="... opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
    )}
  </div>
</div>
```

`group` на родителе + `group-hover:opacity-100` на потомке — новая для тебя Tailwind-техника: класс `group` "помечает" элемент как родителя, чей hover-статус могут "слушать" дети через специальный модификатор `group-hover:`. Кнопка удаления невидима (`opacity-0`) по умолчанию, и появляется только когда мышь наведена на весь пузырь сообщения (не обязательно именно на саму кнопку) — стандартный приём "не загромождать интерфейс постоянно видимыми элементами управления".

---

## Баг №1 — nginx резал файлы больше 1МБ (413)

### Симптом
```
client intended to send too large body: 1554136 bytes
POST /api/chat/upload ... 413
```

### Причина
nginx по умолчанию ограничивает размер тела любого запроса одним мегабайтом (`client_max_body_size`). Мы настраивали лимит 10МБ только на уровне Multer (в самом backend) — но nginx стоит перед backend в цепочке, и обрубает слишком большой запрос раньше, чем тот вообще доходит до нашего кода.

### Фикс
```nginx
location /api/ {
    ...
    client_max_body_size 10M;
}
```

Одна строка, синхронизирующая лимит nginx с уже существующим лимитом Multer.

---

## Баг №2 — 401 при клике на картинку/файл

### Симптом
Вложение грузилось и отправлялось нормально, но клик по нему (или сама попытка отрисовать превью картинки) выдавал `{"message": "Unauthorized", "statusCode": 401}`.

### Причина
Разобрали подробно выше (backend, часть 4) — `<img>`/`<a>` это обычные HTML-теги, браузер загружает их сам, в обход нашего axios-клиента с его автоматической подстановкой заголовка Authorization. Наш эндпоинт требовал этот заголовок — а его физически не было в таком запросе.

### Фикс — два взаимосвязанных изменения
1. Новый `JwtQueryOrHeaderGuard`, принимающий токен либо из заголовка, либо из `?token=...`
2. Функция `withAuthToken(url)` на фронте, добавляющая токен в URL перед тем, как вставить его в `<img src>`/`<a href>`

### Честная оговорка про компромисс
Токен в URL — не идеальное решение с точки зрения безопасности (может попасть в логи сервера, историю браузера) — но раз наш access token живёт всего 15 минут, риск минимален. "Более правильный" продакшен-подход — отдельный, короткоживущий токен именно для скачивания файлов, не переиспользующий основной access token. Для масштаба нашего проекта это было бы избыточным усложнением.

---

## Итоговая схема — путь одного вложения от выбора файла до показа в чате

1. Юзер жмёт 📎, выбирает файл → `handleFileSelected` вызывает `uploadAttachment(file, setUploadProgress)`
2. Файл летит на `POST /chat/upload` (с прогрессом), Multer сохраняет его на диск в `uploads/attachments/`, возвращает `{filename, type, name}`
3. Это сохраняется в `pendingAttachment` — превью-плашка показывается над полем ввода
4. Юзер жмёт "Enviar" → `socket.emit('sendMessage', {..., attachmentFilename, attachmentType, attachmentName})`
5. `ChatGateway.handleSendMessage` → `ChatService.saveMessage` → проверка "это личка?" → запись в БД → `attachmentUrl` вычисляется (`/api/chat/attachments/<filename>`) → рассылается всем в комнате беседы через `newMessage`
6. У всех участников в открытом чате сообщение появляется мгновенно, с вложением
7. Рендер: если `image/*` — `<img src={withAuthToken(url)}>`, иначе — иконка+ссылка
8. Клик/показ картинки → браузер идёт по URL с токеном в query → `AttachmentsController` через `JwtQueryOrHeaderGuard` проверяет токен из query, проверяет "юзер реально участник этой беседы?" → отдаёт файл
