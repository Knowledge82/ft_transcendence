# AdminModule (frontend) — детальный разбор

## Общая картина

Мы построили клиентскую часть панели администрирования — страницу, где ARZOBISPO видит всех юзеров, может менять им роль и удалять аккаунты. Плюс — показали текущему юзеру его собственный ранг на дашборде, и условно показали ссылку на админку, только если юзер реально ARZOBISPO.

Важно помнить (мы это уже обсуждали): всё, что на фронте — это **удобство**, не защита. Реальная защита — на бэкенде, через `RolesGuard`. Фронт просто не показывает лишнего обычному юзеру, чтобы не путать его.

---

## `api/admin.ts`

```typescript
export type Role = 'HERMANO' | 'GUARDIAN' | 'ARZOBISPO';
```

Union-тип на строковых литералах — та же конструкция, что мы разбирали для `Stage` в `LandingPage`. Значение переменной типа `Role` может быть **только** одной из этих трёх точных строк.

```typescript
export interface AdminUser {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: Role;
  createdAt: string;
}
```

Описание формы объекта, который возвращает `GET /admin/users` для каждого юзера в списке — совпадает с тем, что `select` возвращает в `AdminService.listUsers()` на бэкенде.

```typescript
export async function listAllUsers(): Promise<AdminUser[]> {
  const { data } = await apiClient.get<AdminUser[]>('/admin/users');
  return data;
}

export async function changeUserRole(userId: number, role: Role): Promise<AdminUser> {
  const { data } = await apiClient.patch<AdminUser>(`/admin/users/${userId}/role`, { role });
  return data;
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/admin/users/${userId}`);
}
```

Три функции по знакомому тебе паттерну (как `listFriends`, `sendFriendRequest` и т.д.) — обёртки над конкретными HTTP-запросами, с чёткой типизацией параметров и возвращаемого значения. `changeUserRole` принимает `role: Role`, а не просто `string` — TypeScript не даст случайно передать туда что-то не входящее в union-тип.

---

## `AdminPage.tsx`

### Состояния

```typescript
const [ownRole, setOwnRole] = useState<Role | null>(null);
const [users, setUsers] = useState<AdminUser[]>([]);
const [isLoading, setIsLoading] = useState(true);
```

`ownRole` — роль **текущего** залогиненного юзера (нужна для проверки "а можно ли ему вообще тут находиться"). `users` — список **всех** юзеров (наполняется только если `ownRole` окажется `ARZOBISPO`).

### Загрузка данных

```typescript
useEffect(() => {
  apiClient.get<{ role: Role }>('/users/me').then(async (me) => {
    setOwnRole(me.data.role);
    if (me.data.role === 'ARZOBISPO') {
      const allUsers = await listAllUsers();
      setUsers(allUsers);
    }
    setIsLoading(false);
  });
}, []);
```

Сначала запрашиваем **свой** профиль (`/users/me`), узнаём свою роль. `async (me) => {...}` — обрати внимание, эта функция внутри `.then()` помечена `async`, потому что внутри неё есть `await listAllUsers()` — вложенная асинхронная операция. Список всех юзеров запрашивается **только если** своя роль — ARZOBISPO: нет смысла дёргать `listAllUsers()`, если запрос всё равно упадёт на бэкенде с 403 — экономим лишний сетевой вызов.

### Обработчик смены роли

```typescript
async function handleRoleChange(userId: number, newRole: Role) {
  const updated = await changeUserRole(userId, newRole);
  setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: updated.role } : u)));
}
```

Тот же паттерн иммутабельного обновления массива через `.map()`, что мы уже разбирали много раз (в контексте real-time обновлений друзей) — находим юзера с нужным `id` в массиве, заменяем его на копию с обновлённой ролью, остальных не трогаем.

### Обработчик удаления

```typescript
async function handleDelete(userId: number) {
  if (!confirm('¿Seguro que quieres eliminar esta cuenta? Esta acción no se puede deshacer.')) {
    return;
  }
  await deleteUser(userId);
  setUsers((prev) => prev.filter((u) => u.id !== userId));
}
```

**`confirm(...)`** — встроенная браузерная функция (не React, не наша, а стандартная часть JavaScript в браузере), показывает нативное системное диалоговое окно с текстом и кнопками "ОК"/"Отмена". Возвращает `true`, если юзер нажал "ОК", `false` — если "Отмена". `if (!confirm(...)) return;` — если юзер отменил, сразу выходим из функции, ничего не делая.

`.filter((u) => u.id !== userId)` — создаёт новый массив, **исключая** удалённого юзера (тот же метод, что мы использовали для `pendingRequests` после принятия запроса дружбы).

### Условный рендеринг — три возможных состояния экрана

```typescript
if (isLoading) {
  return ( /* спиннер загрузки */ );
}

if (ownRole !== 'ARZOBISPO') {
  return ( /* сообщение "нет доступа" */ );
}

return ( /* реальная админка */ );
```

Три последовательные проверки, каждая — самостоятельный `return`. Пока грузится — показываем загрузку. Как только загрузилось — если роль не та, показываем отказ и **не идём дальше** по коду (следующий `return` ниже просто не выполнится). Только если оба условия пройдены — доходим до реальной разметки таблицы.

### Таблица — новые HTML-теги

```jsx
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-ink-800 text-cream-400 text-left">
      <th className="px-4 py-3">Usuario</th>
      ...
    </tr>
  </thead>
  <tbody>
    {users.map((user) => (
      <tr key={user.id} className="border-b border-ink-800 last:border-0">
        <td className="px-4 py-3 text-cream-100">
          {user.displayName ?? `Usuario ${user.id}`}
        </td>
        ...
      </tr>
    ))}
  </tbody>
</table>
```

Стандартная HTML-структура таблицы (не специфична для React): `<table>` — сама таблица, `<thead>` — шапка с заголовками столбцов, `<tbody>` — тело с данными, `<tr>` — строка (table row), `<th>` — ячейка заголовка, `<td>` — обычная ячейка данных. `key={user.id}` — тот же обязательный атрибут при рендере списка через `.map()`, что мы разбирали для друзей и участников чата.

`last:border-0` — Tailwind-модификатор `last:` применяет стиль **только к последнему** элементу в группе однотипных соседей — убираем нижнюю границу у последней строки таблицы, чтобы не было двойной линии на стыке с краем таблицы.

### Выпадающий список для смены роли

```jsx
<select
  value={user.role}
  onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
  className="..."
>
  {ROLES.map((role) => (
    <option key={role} value={role}>
      {role}
    </option>
  ))}
</select>
```

`<select>` — стандартный HTML-элемент выпадающего списка. `value={user.role}` — делает его **управляемым** (controlled component), та же концепция, что мы разбирали для текстовых `<input>` в формах логина/регистрации — React полностью контролирует, какое значение выбрано, через состояние (в данном случае — через `user.role` из массива `users`).

`onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}` — при выборе новой опции срабатывает этот обработчик. `e.target.value` — новое выбранное значение, но TypeScript по умолчанию типизирует его как обычную `string` (потому что HTML в принципе не знает о нашем union-типе `Role`) — `as Role` это **type assertion**, та же конструкция, что мы уже применяли не раз, говорящая "поверь мне, тут точно одно из трёх допустимых значений" (это безопасно здесь, потому что `<option>` внутри жёстко ограничены значениями из `ROLES`, юзер физически не может выбрать что-то другое через этот интерфейс).

`{ROLES.map((role) => (<option key={role} value={role}>{role}</option>))}` — генерируем три `<option>` (по одному на каждую роль) из константы `const ROLES: Role[] = ['HERMANO', 'GUARDIAN', 'ARZOBISPO'];`, вместо того чтобы писать три `<option>` руками — если появится четвёртая роль в будущем, достаточно будет добавить её в один массив `ROLES`, а не искать все места в разметке, где перечислены роли вручную.

---

## Изменения в `App.tsx`

```typescript
<Route
  path="/santuario"
  element={
    <ProtectedRoute>
      <AdminPage />
    </ProtectedRoute>
  }
/>
```

Тот же паттерн, что и для `/altar`, `/chat` — обёрнуто в `ProtectedRoute`, значит **не залогиненный вообще** юзер не попадёт сюда в принципе (его перекинет на `/login`). А проверку **конкретно роли ARZOBISPO** делает уже сам `AdminPage` внутри себя — то есть у нас тут два уровня проверки даже на фронте: "залогинен ли вообще" (через `ProtectedRoute`) и "та ли роль" (внутри `AdminPage`).

---

## Изменения в `HomePage.tsx`

### Добавили роль в тип профиля

```typescript
interface Profile {
  ...
  role: 'HERMANO' | 'GUARDIAN' | 'ARZOBISPO';
}
```

### Показ бейджа роли

```jsx
<p className="text-xs text-gold-500 uppercase tracking-wide mb-6">
  {profile.role}
</p>
```

Просто отображаем значение роли текстом, стилизованное золотым и капсом (`uppercase`) — небольшая визуальная деталь, показывающая юзеру его текущий "ранг" в теме проекта.

### Условная ссылка на Santuario

```jsx
{profile.role === 'ARZOBISPO' && (
  <Link to="/santuario" className="...">
    Santuario
  </Link>
)}
```

Тот же паттерн условного рендеринга через `&&`, что мы разбирали множество раз ранее (для ошибок валидации, для секции pending requests и т.д.) — кнопка физически не попадает в разметку (не просто скрыта через CSS, а вообще не рендерится), если роль не ARZOBISPO. Обычный юзер даже не видит намёка на существование этой страницы в интерфейсе — хотя, как мы обсуждали, технически он мог бы попасть туда напрямую через URL, просто увидел бы там отказ в доступе.

---

## Итоговая карта — что где происходит при заходе на /santuario

1. `ProtectedRoute` проверяет `isAuthenticated` — если не залогинен, редирект на `/login`
2. `AdminPage` монтируется, `useEffect` запрашивает `/users/me`
3. Если роль ≠ ARZOBISPO → рендерится сообщение "нет доступа", `listAllUsers()` не вызывается вообще
4. Если роль = ARZOBISPO → `listAllUsers()` вызывается, дёргает `GET /admin/users`
5. На бэкенде `RolesGuard` **повторно** проверяет роль (уже не доверяя фронту) — если бы фронт как-то соврал или был обойдён, здесь всё равно случился бы `403`
6. Таблица рендерится, `<select>` для каждого юзера позволяет сразу поменять роль, кнопка "Eliminar" — удалить с подтверждением через `confirm()`
