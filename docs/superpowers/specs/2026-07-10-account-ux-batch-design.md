# Дизайн: пакет улучшений аккаунта и UX

**Дата:** 2026-07-10
**Статус:** одобрен

## Обзор

Пакет из девяти связанных задач: удаление сохранённых поисков, админ-уведомления о модерации в Telegram, обязательная email-верификация, автоопределение языка, аватар пользователя, редизайн «Мой кабинет», кнопка «Избранное» и пункт «Подписка» в header, переработка меню пользователя, страница «Настройки».

Общий подход: точечные изменения по существующим паттернам проекта, без рефакторингов. Максимально используются встроенные механизмы Strapi (email confirmation, change-password, upload) вместо кастомных решений.

## 1. Удаление сохранённых поисков

**Frontend — удалить:**

- `app/dashboard/saved-searches/` (страница целиком)
- `components/saved-search/` (SaveSearchButton)
- `stores/SavedSearchStore.ts` + тест, поле `savedSearch` из RootStore
- `lib/saved-search-utils.ts` + тест
- Использования `SaveSearchButton` в `VacanciesClient.tsx` и `ResumesClient.tsx`
- SavedSearch-типы из `types/api.ts` (`SavedSearchType`, `SavedSearchFilters`, `SavedSearch`, `SavedSearchCreateInput`)
- Ссылки на `/dashboard/saved-searches` из DashboardClient и ProfileClient
- Ключи локалей RU/EN (`savedSearches*`, `saveSearch*`)

**Backend — удалить:**

- `api/saved-search/` целиком (content type, controller, routes, service)
- Упоминания saved-search в `seed-permissions.ts`

**БД:** таблица `saved_searches` остаётся (Strapi не дропает таблицы автоматически) — безвредно, миграция не нужна.

## 2. Header

### 2.1 Кнопка «Избранное»

- Иконка Heart справа от `NotificationBadge`, только для авторизованных
- Ссылка на `/dashboard/favorites`
- Стиль — как у NotificationBadge (ghost icon button, h-8 w-8)

### 2.2 Пункт «Подписка» в навигации

- В основной навигации header (desktop, блок `md:flex`) для авторизованных — после «Мои резюме»
- Ссылка на `/subscription`, активное состояние по `pathname.startsWith('/subscription')`

### 2.3 Меню пользователя (dropdown)

Верхний блок `DropdownMenuLabel` переделывается:

- Отступы и размер/стиль шрифта — те же, что у обычных `DropdownMenuItem`
- Аватар пользователя (реальный, с fallback-инициалом) + `firstName lastName` — одна ссылка на `/dashboard/profile`
- `SubscriptionBadge` в той же строке — отдельная ссылка на `/subscription`
- Две соседние ссылки, не вложенные друг в друга

## 3. «Мой кабинет» (`/dashboard`)

- Заголовок: «Мой кабинет» (ключ локали, RU/EN) вместо приветствия по имени
- Из сетки секций удаляются: Избранное, Уведомления, Сохранённые поиски, Профиль, Подписка
- Остаются: Вакансии, Резюме, Компании, Отклики, Публикации, Блокировки
- Компактность на мобильных: сетка 2 колонки уже с мобильной ширины (`grid-cols-2`), плотные карточки (меньше паддинги), описание секции скрыто на узких экранах
- Быстрые действия («Создать вакансию/резюме/компанию») остаются
- **Баннер подписки:** градиентная карточка с CTA → `/subscription`; показывается только пользователям с планом Free или Pro (Max/VIP не видят)
- Вкладка «Профиль» в Mini App bottom nav остаётся и ведёт на новую страницу настроек

## 4. Страница «Настройки» (`/dashboard/profile`)

Полностью заменяет текущий ProfileClient.

### Структура

Общий `layout.tsx` с навигацией:

- Desktop: sidebar слева
- Mobile / Mini App: горизонтальные скроллируемые табы сверху

Секции — вложенные роуты (расширяемость: новый раздел = новый route segment + пункт в конфиге навигации):

| Пункт          | Роут / действие               | Видимость                   |
| -------------- | ----------------------------- | --------------------------- |
| Данные профиля | `/dashboard/profile`          | все                         |
| Безопасность   | `/dashboard/profile/security` | только пользователи с email |
| Подписка       | ссылка на `/subscription`     | все                         |
| Выйти          | logout + redirect `/`         | все                         |

### Данные профиля

- Форма firstName/lastName → `PUT /users/me` (React Hook Form + Zod)
- Блок аватара: превью, загрузка/смена (см. раздел 5)
- Тумблер «Telegram-уведомления» — виден только пользователям с привязанным `telegramId`

### Безопасность

- Смена пароля через встроенный Strapi `POST /auth/change-password` (currentPassword, password, passwordConfirmation)
- Пункт скрыт для Telegram-only пользователей (без email)

### Тумблер Telegram-уведомлений

- Новое поле `User.telegramNotificationsEnabled: boolean` (default `true`)
- Добавить в allowlist `PUT /users/me` и в `SAFE_RESPONSE_FIELDS`
- Добавить в `contentTypes.d.ts` и тип `User` в `frontend/types/api.ts`
- `notification.service`: запись в БД создаётся всегда; `sendMessage` не вызывается, если флаг выключен

## 5. Аватар пользователя

- Хранение: существующее поле `User.avatar` (строка-URL) — без миграции схемы
- Загрузка: файл → Strapi upload (`POST /upload`, MinIO/S3) → полученный URL сохраняется через `PUT /users/me`
- Валидация на бэке: avatar принимает только URL собственного uploads-домена (S3/MinIO public URL) или Telegram CDN (`t.me` / `telegram.org` домены) — защита от записи произвольной строки
- Компонент `UserAvatar` (image + fallback-инициал), переиспользуется: кнопка dropdown в header, пункт в dropdown-меню, страница настроек

## 6. Email-верификация

- Bootstrap: idempotent-настройка advanced settings users-permissions (по образцу `configurePasswordReset`): `email_confirmation = true`, `email_confirmation_redirection = {FRONTEND_URL}/email-confirmed`
- SMTP уже настроен (nodemailer + Mailpit в dev)
- Регистрация: Strapi шлёт письмо, JWT не выдаёт → RegisterForm показывает экран «Проверьте почту» + кнопка «Отправить повторно» (`POST /auth/send-email-confirmation`)
- Логин с неподтверждённым email → ошибка Strapi «Your account email is not confirmed» → локализованное сообщение + кнопка повторной отправки
- Новая страница `/email-confirmed` — «Email подтверждён, войдите» + ссылка на `/login`
- Миграция: одноразовая knex-миграция в `backend/database/migrations` помечает всех существующих пользователей `confirmed = true` (нельзя делать это в bootstrap на каждом старте — иначе новые неподтверждённые пользователи автоподтверждались бы при рестарте)
- Telegram-регистрация: пользователи создаются с `confirmed = true`, флоу не меняется

## 7. Админ-уведомления о модерации

- Env `ADMIN_TELEGRAM_CHAT_IDS` — список chat_id через запятую (личные чаты и/или группа модераторов); добавить в `.env.example`
- Функция `notifyAdmins(message)` в notification-слое: парсит env, шлёт `sendMessage` каждому id; ошибки логируются и не роняют основной флоу; при пустом env — no-op
- Триггеры (существующие lifecycle hooks, переход `status → moderation`):
  - Вакансия отправлена на модерацию
  - Резюме отправлено на модерацию
  - Компания отправлена на модерацию
  - Новая жалоба (report) создана
- Текст уведомления: тип сущности, название/заголовок, автор (имя + id), ссылка на запись в Strapi Admin

## 8. Определение языка (i18n)

Порядок в `lib/i18n.ts` при инициализации:

1. `localStorage.gramjob_lang` — если есть, используется как раньше
2. Mini App: `window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code`
3. Веб: `navigator.language`
4. Маппинг: код начинается с `ru` → `ru`, всё остальное → `en`

Определённый язык сразу сохраняется в `localStorage.gramjob_lang`. Ручное переключение работает как сейчас (пишет в localStorage).

Функция `detectLanguage()` выносится в чистую утилиту с unit-тестами.

## Тестирование

- Unit-тесты: `detectLanguage`, валидация avatar-URL, `notifyAdmins` (парсинг env, построение сообщения), пропуск `sendMessage` при выключенном тумблере, компоненты настроек, AuthStore (register → состояние «проверьте почту»)
- Обновить существующие тесты: DashboardClient, WebHeader, RootStore (удаление savedSearch)
- Ручная проверка: браузер (desktop + mobile viewport) и Telegram Mini App; email-флоу через Mailpit (web UI :8025)

## Вне скоупа

- Привязка email к Telegram-аккаунту
- Разделы настроек «Сессии» и расширенная «Безопасность» (архитектура их допускает, реализация позже)
- Дроп таблицы `saved_searches` из БД
