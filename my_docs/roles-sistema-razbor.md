# Система ролей — детальный разбор

## Что это вообще и зачем

Это реализация мандаторного бонус-модуля "Advanced permissions system" из спеки ft_transcendence: разные юзеры должны иметь разные права — обычный юзер может только пользоваться приложением, а кто-то с более высоким рангом должен уметь модерировать/администрировать (менять роли других, удалять юзеров).

Мы сделали три уровня, тематично названные под "Церковь Истинного Релинка":
- **`HERMANO`** — обычный юзер, это значение ставится **автоматически** при регистрации (дефолт)
- **`GUARDIAN`** — модератор (пока не используется нигде кроме самого факта существования — в будущем, когда будем чистить чат от "ереси", именно этот уровень получит на это право)
- **`ARZOBISPO`** — админ, полный доступ: видит всех юзеров, может менять роль любому, может удалить любого

## Главное архитектурное решение — откуда берётся роль при проверке прав

Это первое, что нужно понять, прежде чем разбирать код. У нас уже был готовый механизм: юзер логинится → получает JWT access token → в этом токене "зашиты" `userId` и `email` (мы это делали ещё в самом начале, в `AuthService.issueTokens`). Казалось бы логично: положить туда же и `role`, чтобы не лазить в базу данных лишний раз.

**Но мы намеренно этого не сделали.** Представь ситуацию: ARZOBISPO меняет юзеру роль с `HERMANO` на `GUARDIAN`. Если бы роль была зашита в JWT, у этого юзера в токене всё ещё лежала бы **старая** роль `HERMANO` — потому что токен уже выдан, его содержимое неизменно (JWT в принципе нельзя "переписать"后 выдачи, только выдать новый). Юзер получил бы новые права только через 15 минут, когда его access token протухнет и обновится через `/auth/refresh` — а то и позже, если он вообще не активен в этот момент.

Поэтому мы **каждый раз, при каждой проверке прав**, лезем в базу данных за **актуальной** ролью. Дороже по производительности (лишний SQL-запрос на защищённых ролями роутах), зато изменения ролей действуют мгновенно, без задержек и путаницы.

## Схема БД — что добавили

```prisma
enum Role {
  HERMANO
  GUARDIAN
  ARZOBISPO
}

model User {
  ...
  role Role @default(HERMANO)
  ...
}
```

`enum Role` — та же конструкция, что мы уже видели для `FriendshipStatus` (`PENDING`/`ACCEPTED`) и `ConversationType` (`DIRECT`/`CHANNEL`) — ограничивает поле строго перечисленными значениями на уровне самой базы данных, а не только в TypeScript-коде.

`role Role @default(HERMANO)` — новое поле в модели `User`, `@default(HERMANO)` гарантирует, что **при создании** любого нового юзера (то есть при регистрации) это поле автоматически заполнится значением `HERMANO`, даже если мы явно не укажем его в коде `AuthService.register`.

## Декоратор `@Roles(...)` — как помечаем, какому роуту какая роль нужна

```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

Это новая для тебя NestJS-концепция — **создание собственного декоратора**. Разберём.

`SetMetadata` — встроенная функция NestJS, которая "прикрепляет" произвольные данные (метаданные) к классу или методу — это не меняет поведение метода напрямую, а просто **сохраняет информацию рядом с ним**, которую потом можно прочитать в другом месте кода (в нашем случае — в Guard).

`export const ROLES_KEY = 'roles';` — просто строковая константа, "ключ", под которым мы будем сохранять и потом искать эти метаданные. Вынесена в константу, а не написана прямо строкой "roles" в двух местах, чтобы не было риска опечататься в одном из мест и получить рассинхрон.

`export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);` — это и есть сам декоратор, который мы потом используем как `@Roles('ARZOBISPO')`. `(...roles: string[])` — **rest-параметр**, новый для тебя синтаксис: позволяет передать **произвольное количество** аргументов, которые соберутся в массив `roles`. То есть `@Roles('GUARDIAN', 'ARZOBISPO')` тоже сработает — `roles` внутри станет `['GUARDIAN', 'ARZOBISPO']`. Функция возвращает `SetMetadata(ROLES_KEY, roles)` — то есть под ключом `'roles'` сохраняет массив требуемых ролей для того метода, над которым этот декоратор поставлен.

## `RolesGuard` — сама проверка

```typescript
@Injectable()
export class RolesGuard implements CanActivate {
```

`implements CanActivate` — новый для тебя интерфейс. Это стандартный контракт NestJS для **любого** Guard'а (охранника доступа) — обязывает класс реализовать метод `canActivate`, который должен вернуть `true` (пропустить запрос) или `false`/выбросить исключение (отклонить). Мы уже пользовались готовыми Guard'ами (`JwtAuthGuard` через `AuthGuard('jwt')` из Passport) — там этот интерфейс уже реализован за нас библиотекой. Тут мы пишем свой Guard с нуля, поэтому реализуем интерфейс сами.

```typescript
constructor(
  private readonly reflector: Reflector,
  private readonly prisma: PrismaService,
) {}
```

Два инжектированных зависимости через конструктор, как обычно. `Reflector` — новый для тебя сервис из `@nestjs/core`, специально предназначенный для **чтения** метаданных, которые были "прикреплены" через `SetMetadata` (то есть через наш декоратор `@Roles`).

```typescript
async canActivate(context: ExecutionContext): Promise<boolean> {
  const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
```

`context: ExecutionContext` — объект, описывающий **текущий контекст выполнения запроса** — через него можно достать сам HTTP-запрос, а также сведения о том, какой именно метод контроллера сейчас вызывается.

`this.reflector.get<string[]>(ROLES_KEY, context.getHandler())` — читаем метаданные под ключом `ROLES_KEY` (то есть `'roles'`), прикреплённые конкретно к **методу**, который сейчас обрабатывает запрос (`context.getHandler()` — возвращает ссылку именно на этот метод). Если над этим методом стоял `@Roles('ARZOBISPO')` — сюда вернётся `['ARZOBISPO']`.

```typescript
if (!requiredRoles || requiredRoles.length === 0) {
  return true;
}
```

Если у метода вообще **нет** декоратора `@Roles(...)` (то есть `requiredRoles` окажется `undefined`), или он пустой — значит проверка ролей для этого роута не требуется, пропускаем запрос дальше (`return true`) без всякой дальнейшей логики.

```typescript
const request = context.switchToHttp().getRequest();
const userId = request.user?.userId;
```

`context.switchToHttp().getRequest()` — достаём сам объект HTTP-запроса из абстрактного `ExecutionContext` (NestJS Guards универсальны и для HTTP, и для WebSocket, и для других транспортов — поэтому нужен этот метод-переключатель "дай мне именно HTTP-версию контекста"). `request.user?.userId` — на этом этапе `JwtAuthGuard` **уже отработал** (мы указали оба Guard'а в паре: `@UseGuards(JwtAuthGuard, RolesGuard)`, и они выполняются по порядку) — значит `request.user` уже заполнен данными из JWT.

```typescript
const user = await this.prisma.user.findUnique({
  where: { id: userId },
  select: { role: true },
});

if (!user || !requiredRoles.includes(user.role)) {
  throw new ForbiddenException('No tienes el rango necesario para esto');
}

return true;
```

Вот тут и происходит тот самый "свежий запрос к БД", о котором мы говорили в начале — достаём **актуальную** роль юзера прямо сейчас, а не то, что было в JWT при логине. `requiredRoles.includes(user.role)` — проверяем, входит ли реальная роль юзера в список разрешённых для этого роута. Если юзера вообще не нашли (`!user`, маловероятно, но защищаемся), или его роль не входит в список — кидаем `ForbiddenException` (403 Forbidden). Если всё ок — `return true`, запрос идёт дальше, в тело контроллера.

## `AdminModule` — сами защищённые эндпоинты

```typescript
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ARZOBISPO')
export class AdminController {
```

Три декоратора разом на уровне **всего класса** (не отдельных методов): `@Controller('admin')` — базовый путь `/admin`. `@UseGuards(JwtAuthGuard, RolesGuard)` — оба Guard применяются ко **всем** методам этого контроллера. `@Roles('ARZOBISPO')` — тоже на уровне класса, значит требование "только ARZOBISPO" действует на **весь** контроллер разом, не нужно повторять на каждом отдельном методе.

```typescript
@Get('users')
async listUsers() {
  return this.adminService.listUsers();
}
```

`GET /admin/users` — список всех юзеров. Обрати внимание — тут даже не нужно доставать `req.user`, потому что сам факт прохождения через `RolesGuard` уже гарантирует, что запрашивающий — ARZOBISPO, дальше просто отдаём список всех.

```typescript
@Patch('users/:id/role')
async changeRole(@Param('id', ParseIntPipe) id: number, @Body('role') role: string) {
  return this.adminService.changeRole(id, role);
}
```

`PATCH /admin/users/:id/role` — смена роли конкретного юзера. `@Param('id', ParseIntPipe)` — та же конструкция, что мы уже видели во `FriendsController`, конвертирует строку из URL в число. `@Body('role')` — новый нюанс: `@Body()` без аргумента достаёт **весь** объект тела запроса, а `@Body('role')` — достаёт **конкретно** поле `role` из этого объекта (сокращение, чтобы не писать `@Body() body: {role: string}` и потом `body.role`).

## `AdminService` — валидация роли

```typescript
const VALID_ROLES = ['HERMANO', 'GUARDIAN', 'ARZOBISPO'];

async changeRole(userId: number, role: string) {
  if (!VALID_ROLES.includes(role)) {
    throw new BadRequestException(`El rango debe ser uno de: ${VALID_ROLES.join(', ')}`);
  }
  ...
```

Зачем эта проверка, если `role` в схеме Prisma и так `enum`? Дело в том, что на этом этапе `role` в коде — это просто **строка**, пришедшая из тела HTTP-запроса (TypeScript не может проверить на этапе компиляции, что реальное значение, присланное клиентом в JSON, совпадает с одним из значений enum — это runtime-данные, не типы). Если бы кто-то прислал `role: "papa"` — без этой явной проверки Prisma сама кинула бы куда менее понятную ошибку валидации на уровне БД. Мы ловим это раньше, с понятным сообщением.

## Итоговая картина всей цепочки

1. Юзер с ролью ARZOBISPO делает `PATCH /admin/users/5/role` с телом `{"role": "GUARDIAN"}`
2. `JwtAuthGuard` проверяет токен, заполняет `req.user`
3. `RolesGuard` смотрит на `@Roles('ARZOBISPO')` над контроллером, лезет в БД за **актуальной** ролью **вызывающего** юзера (не того, кому меняют роль — а того, кто делает запрос), убеждается что это ARZOBISPO
4. Если проверка прошла — запрос доходит до `AdminController.changeRole`, оттуда в `AdminService.changeRole`
5. Сервис валидирует, что `"GUARDIAN"` — допустимое значение, обновляет юзера с `id: 5` в БД
6. С этого момента, при **следующем же** запросе юзера 5 к любому роуту с проверкой ролей — `RolesGuard` увидит уже новую роль `GUARDIAN`, без всякой задержки на протухание токена
