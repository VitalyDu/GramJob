# GramJob — API Specification

Strapi 5 REST API.

**Base URL:** `https://api.gramjob.com/api`
**Auth:** `Authorization: Bearer <jwt>`
**Content-Type:** `application/json`

---

## Аутентификация

### POST /auth/telegram

Telegram Login (Web Widget или Mini App initData).

Request:

```json
{
  "initData": "string", // Для Mini App (приоритет)
  "telegramData": {
    // Для Web Widget
    "id": 123,
    "first_name": "John",
    "auth_date": 1234567890,
    "hash": "abc..."
  }
}
```

Response `200`:

```json
{
  "jwt": "eyJ...",
  "user": { ...UserObject }
}
```

### POST /auth/local

Email + пароль.

Request: `{ "identifier": "email", "password": "..." }`
Response: `{ "jwt": "...", "user": {...} }`

### POST /auth/local/register

Request: `{ "email": "...", "password": "...", "firstName": "...", "lastName": "..." }`
Response: `{ "jwt": "...", "user": {...} }`

### POST /auth/refresh

Request: `{ "refreshToken": "..." }` (если реализован refresh token)
Response: `{ "jwt": "..." }`

---

## Пользователи

### GET /users/me

Текущий профиль пользователя.

Response:

```json
{
  "id": 1,
  "email": "user@example.com",
  "telegramId": "123456789",
  "firstName": "Иван",
  "lastName": "Иванов",
  "avatar": { "url": "https://..." },
  "language": "ru",
  "subscriptionPlan": "pro",
  "subscriptionExpiresAt": "2025-02-01T00:00:00Z",
  "vacancyCredits": 5,
  "applyCredits": 100,
  "isVip": false,
  "createdAt": "2025-01-01T00:00:00Z"
}
```

### PUT /users/me

Обновить профиль.

Request: `{ "firstName": "...", "lastName": "...", "language": "en" }`

---

## Компании

### GET /companies

Список компаний (публичный, только `status=published`).

Query params:

- `search` — полнотекстовый поиск
- `country`
- `companySize`
- `page`, `pageSize` (default: 20)

### GET /companies/:id

Публичная карточка компании + последние 5 вакансий.

### GET /companies/slug/:slug

По slug.

### POST /companies

Создать компанию. Требует авторизации.

Request:

```json
{
  "name": "...",
  "description": "...",
  "country": "RU",
  "city": "Москва",
  "companySize": "11-50",
  "website": "https://...",
  "telegram": "@company"
}
```

### PUT /companies/:id

Обновить. Только владелец.

### DELETE /companies/:id

Удалить. Только владелец. Только если нет активных вакансий.

---

## Вакансии

### GET /vacancies

Поиск вакансий. Публичный для `status=published`.

Query params:

- `search` — полнотекстовый поиск по title, description
- `industry` — ID индустрии
- `specialization` — ID специализации
- `country`
- `city`
- `workFormat` — office|remote|hybrid
- `employmentType` — full-time|part-time|contract|internship|freelance
- `seniority` — intern|junior|middle|senior|lead|principal
- `salaryFrom`, `salaryTo`, `salaryCurrency`
- `experienceYears`
- `skills` — строки через запятую
- `languages` — коды языков
- `sourceType` — internal|external
- `urgent` — boolean
- `topPlacement` — boolean
- `sort` — newest|salary_asc|salary_desc|relevance (default: relevance)
- `page`, `pageSize`

Response:

```json
{
  "data": [{ ...VacancyCard }],
  "meta": { "total": 100, "page": 1, "pageSize": 20 }
}
```

### GET /vacancies/:id

Полная карточка вакансии. Увеличивает `views` и `uniqueViews`.

### POST /vacancies

Создать вакансию. Требует авторизации. Тратит кредит/лимит при переходе в moderation.

### PUT /vacancies/:id

Обновить. Если статус `published` — переводит обратно в `draft`.

### DELETE /vacancies/:id

Архивировать (статус → archived). Не удаляет данные.

### POST /vacancies/:id/publish

Подать на модерацию. Статус draft → moderation.

### POST /vacancies/:id/boost

Поднять вакансию. Тратит 1 буст из суточного лимита.

Response: `{ "success": true, "boostsRemaining": 4 }`

### POST /vacancies/:id/archive

Архивировать вручную.

### GET /vacancies/my

Мои вакансии (все статусы). Требует авторизации.

Query: `status`, `page`, `pageSize`

---

## Резюме

### GET /resumes

Поиск по базе резюме. Требует Max-подписки.

Query params:

- `search`
- `industry`, `specialization`
- `country`, `city`
- `workFormat`, `employmentType`
- `experienceYears`
- `skills`, `languages`
- `salaryTo`, `currency`
- `page`, `pageSize`

### GET /resumes/:id

Просмотр резюме. Увеличивает счётчик. Контакты возвращаются только работодателю (если есть одобренный отклик).

### POST /resumes

Создать резюме.

### PUT /resumes/:id

Обновить. Только владелец.

### DELETE /resumes/:id

Архивировать.

### POST /resumes/:id/publish

Подать на модерацию.

### GET /resumes/my

Мои резюме.

---

## Отклики

### GET /applications

Мои отклики (как кандидата). Требует авторизации.

Query: `status`, `page`, `pageSize`

### POST /applications

Подать отклик. Тратит 1 отклик из суточного лимита или applyCredits.

Request:

```json
{
  "vacancyId": 1,
  "resumeId": 1,
  "coverLetter": "..."
}
```

### GET /vacancies/:id/applications

Отклики на мою вакансию (как работодателя). Только владелец вакансии.

Query: `status`, `page`, `pageSize`

### PATCH /applications/:id

Сменить статус. Только работодатель (владелец вакансии).

Request: `{ "status": "interview" }`

Доступные переходы:

```
applied → viewed → in-review → interview | test-task | offer | rejected
interview/test-task → offer | rejected
offer → hired | rejected
```

---

## Подписки и платежи

### GET /subscription-plans

Список планов с ценами.

### POST /payments/subscribe

Инициировать покупку подписки.

Request: `{ "planCode": "pro" }`
Response: `{ "invoiceUrl": "https://t.me/invoice/..." }`

### POST /payments/vacancy-pack

Купить пакет вакансий.

Request: `{ "packageId": 1 }`
Response: `{ "invoiceUrl": "..." }`

### POST /payments/apply-pack

Request: `{ "packageId": 1 }`
Response: `{ "invoiceUrl": "..." }`

### POST /payments/webhook

Telegram Bot webhook. Только для Bot API (не REST клиентов).

---

## Уведомления

### GET /notifications

Мои уведомления. Требует авторизации.

Query: `isRead`, `page`, `pageSize`

### PATCH /notifications/:id/read

Отметить как прочитанное.

### POST /notifications/read-all

Отметить все как прочитанные.

---

## Сохранённые поиски

### GET /saved-searches

Мои сохранённые поиски.

### POST /saved-searches

Request: `{ "name": "...", "type": "vacancy", "filters": { ...queryParams } }`

### DELETE /saved-searches/:id

Удалить.

---

## Избранное

### GET /favorites

Мои избранные. Query: `type` (vacancy|resume|company)

### POST /favorites

Request: `{ "type": "vacancy", "targetId": 1 }`

### DELETE /favorites/:targetType/:targetId

Удалить из избранного.

---

## Жалобы

### POST /reports

Request:

```json
{
  "type": "vacancy",
  "targetId": 1,
  "reason": "spam",
  "comment": "..."
}
```

---

## Блокировки

### GET /blocks

Мои блокировки.

### POST /blocks

Request: `{ "targetType": "employer", "targetId": 1 }`

### DELETE /blocks/:id

Разблокировать.

---

## Аналитика

### GET /analytics/vacancies/:id

Аналитика по вакансии. Только владелец.

Query: `from`, `to` (даты, default: последние 30 дней)

Response:

```json
{
  "total": { "views": 100, "uniqueViews": 80, "applications": 12, "ctr": 15.0 },
  "daily": [{ "date": "2025-01-01", "views": 5, "uniqueViews": 4, "applications": 1 }]
}
```

### GET /analytics/resumes/:id

Аналитика по резюме. Только владелец.

---

## Категории

### GET /industries

Список индустрий со специализациями.

Response:

```json
[
  {
    "id": 1,
    "name": { "ru": "IT", "en": "IT" },
    "slug": "it",
    "specializations": [
      { "id": 1, "name": { "ru": "Frontend", "en": "Frontend" }, "slug": "frontend" }
    ]
  }
]
```

### GET /specializations

Все специализации (с industry).

---

## Общие паттерны

### Коды ошибок

| Код | Описание                                      |
| --- | --------------------------------------------- |
| 400 | Ошибка валидации                              |
| 401 | Не авторизован                                |
| 403 | Нет доступа (не владелец, недостаточный план) |
| 404 | Не найдено                                    |
| 409 | Конфликт (уже существует: отклик, favourite)  |
| 429 | Rate limit превышен                           |
| 503 | Временная недоступность                       |

### Формат ошибки

```json
{
  "error": {
    "code": "LIMIT_REACHED",
    "message": "You have reached your daily application limit",
    "details": { "limit": 3, "used": 3, "resetAt": "2025-01-02T00:00:00Z" }
  }
}
```

---

## Подписки и пакеты (Sprint 6)

### GET /subscription-plans

Список всех планов подписки (публичный).

Response:

```json
{
  "data": [
    {
      "documentId": "...",
      "code": "pro",
      "name": "Pro",
      "vacanciesPerMonth": 10,
      "activeVacanciesLimit": 10,
      "vacancyBoostsPerDay": 10,
      "applicationsPerDay": 10,
      "resumesLimit": 5,
      "resumeDatabaseAccess": false,
      "starsPrice": 299,
      "durationDays": 30
    }
  ]
}
```

### GET /vacancy-packages

Список пакетов вакансий (публичный).

Response: `{ "data": [{ "id": 1, "name": "Starter", "vacancyCredits": 10, "boostCredits": 10, "starsPrice": 199 }] }`

### GET /apply-packages

Список пакетов откликов (публичный).

Response: `{ "data": [{ "id": 1, "name": "Starter", "applyCredits": 50, "starsPrice": 149 }] }`

---

## Платежи (Sprint 6)

Все payment-эндпоинты требуют JWT-авторизацию.

### POST /payments/subscribe

Создать invoice ссылку для покупки подписки через Telegram Stars.

Request: `{ "planCode": "pro" }` — допустимые значения: `pro`, `max`, `vip`

VIP можно купить только при активном `max` или существующем `vip`.

Response `200`: `{ "invoiceUrl": "https://t.me/..." }`

Errors:

- `400` — невалидный `planCode`
- `403` — попытка купить VIP без активного Max
- `404` — план не найден

### POST /payments/vacancy-pack

Создать invoice для покупки пакета вакансий.

Request: `{ "packageId": 1 }`

Response `200`: `{ "invoiceUrl": "https://t.me/..." }`

### POST /payments/apply-pack

Создать invoice для покупки пакета откликов.

Request: `{ "packageId": 1 }`

Response `200`: `{ "invoiceUrl": "https://t.me/..." }`

---

## Telegram Webhook (Sprint 6)

### POST /telegram/webhook

Обрабатывает события от Telegram Bot API. Не требует JWT-авторизации, проверяет секрет через заголовок `X-Telegram-Bot-Api-Secret-Token`.

Обрабатывает:

- `pre_checkout_query` — валидирует payload, вызывает `answerPreCheckoutQuery`
- `message.successful_payment` — активирует подписку или добавляет кредиты пользователю

Response всегда `200 { "ok": true }` (даже при ошибках, чтобы Telegram не повторял запрос).

---

## Moderation Admin API (Sprint 8)

Все эндпоинты — **admin-only** (Strapi Admin JWT, policy `admin::isAuthenticatedAdmin`). Базовый префикс: `/moderation` (без `/api`).

### POST /moderation/:entityType/:documentId/approve

Одобрить сущность. `:entityType` — `vacancy`, `resume` или `company`.

Response `200`: `{ "ok": true }`

Errors:

- `400` — неизвестный entityType
- `404` — сущность не найдена
- `409` — статус не `moderation`

Side effects: статус → `published`; сброс `rejectionReason`/`rejectionComment`; запись в ModerationLog; lifecycle отправляет уведомление `moderation_approved`.

### POST /moderation/:entityType/:documentId/reject

Отклонить сущность с указанием причины.

Request:

```json
{
  "reason": "spam",
  "comment": "необязательный комментарий"
}
```

Причины: `spam`, `fake`, `inappropriate`, `incomplete`, `wrong_category`, `salary_mismatch`, `contact_info`, `other`. Для `other` комментарий обязателен.

Response `200`: `{ "ok": true }`

Errors:

- `400` — неизвестный entityType или невалидная причина (`INVALID_REASON`, `COMMENT_REQUIRED`)
- `404` — сущность не найдена
- `409` — статус не `moderation`

Side effects: статус → `rejected`; установка `rejectionReason`/`rejectionComment`; запись в ModerationLog; lifecycle отправляет уведомление `moderation_rejected` с меткой причины.

### POST /moderation/reports/:documentId/resolve

Подтвердить жалобу (Report) — статус → `resolved`.

Response `200`: `{ "ok": true }`

Errors: `404` — не найдена, `409` — статус не `pending`

### POST /moderation/reports/:documentId/dismiss

Отклонить жалобу — статус → `dismissed`.

Response `200`: `{ "ok": true }`

### GET /moderation/stats

Статистика очереди модерации.

Response:

```json
{
  "queue": {
    "vacancies": 5,
    "resumes": 3,
    "companies": 1,
    "reports": 2
  },
  "avgProcessingHours": 4.5,
  "decidedLast7Days": 42
}
```

---

### Коды бизнес-ошибок

| Код                     | Ситуация                                  |
| ----------------------- | ----------------------------------------- |
| `LIMIT_REACHED`         | Исчерпан лимит (отклики, вакансии, бусты) |
| `SUBSCRIPTION_REQUIRED` | Нужен план выше текущего                  |
| `ALREADY_APPLIED`       | Уже откликался на эту вакансию            |
| `MODERATION_PENDING`    | Сущность на модерации                     |
| `VACANCY_EXPIRED`       | Вакансия истекла                          |
| `BLOCKED`               | Пользователь заблокирован                 |

### Пагинация

Все list-эндпоинты возвращают:

```json
{
  "data": [...],
  "meta": { "total": 100, "page": 1, "pageSize": 20, "pageCount": 5 }
}
```

### Фильтры с Strapi

Strapi 5 поддерживает синтаксис `filters[field][$operator]=value`.
Для клиентского API используется упрощённый синтаксис (middleware транслирует).
