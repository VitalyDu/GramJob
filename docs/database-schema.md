# GramJob — Database Schema

Реализуется через Strapi 5 content types + PostgreSQL.

---

## Модели и связи

### User

Единая модель пользователя. Один пользователь может быть одновременно кандидатом и работодателем.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| email | string, unique, nullable | Null для Telegram-only пользователей |
| telegramId | string, unique, nullable | Telegram User ID |
| firstName | string | |
| lastName | string, nullable | |
| avatar | media, nullable | Загружается в S3 |
| language | enum(ru, en) | Default: ru |
| subscriptionPlan | enum(free, pro, max) | Default: free |
| subscriptionExpiresAt | datetime, nullable | Null = бессрочный Free |
| vacancyCredits | int | Default: 0, из пакетов |
| applyCredits | int | Default: 0, из пакетов |
| createdAt | datetime, auto | |

**Связи:**
- has many Company (через Company.ownerId)
- has many Resume
- has many Application
- has many Notification
- has many SavedSearch
- has many Favorite
- has many Block

**Индексы:** `telegramId`, `email`, `subscriptionPlan`

---

### Company

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| owner | relation → User | many-to-one |
| name | string | |
| slug | string, unique | URL-friendly идентификатор |
| logo | media, nullable | |
| cover | media, nullable | |
| description | richtext | |
| website | string, nullable | |
| telegram | string, nullable | @username или t.me/... |
| linkedin | string, nullable | |
| country | string | |
| city | string, nullable | |
| companySize | enum(1-10, 11-50, 51-200, 201-500, 500+) | |
| status | enum(draft, moderation, published, rejected) | Default: draft |
| createdAt | datetime, auto | |

**Связи:**
- belongs to User (owner)
- has many Vacancy

**Индексы:** `slug`, `status`, `owner`

---

### Vacancy

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| company | relation → Company, nullable | Null если физлицо |
| postedBy | relation → User | Кто опубликовал |
| title | string | |
| industry | relation → Industry | many-to-one |
| specialization | relation → Specialization | many-to-one |
| employmentType | enum(full-time, part-time, contract, internship, freelance) | |
| workFormat | enum(office, remote, hybrid) | |
| seniority | enum(intern, junior, middle, senior, lead, principal) | |
| country | string | |
| city | string, nullable | |
| salaryFrom | int, nullable | |
| salaryTo | int, nullable | |
| salaryCurrency | enum(USD, EUR, RUB, GBP), nullable | |
| description | richtext | |
| responsibilities | richtext | |
| requirements | richtext | |
| conditions | richtext, nullable | |
| skills | json array | Список строк |
| languages | json array | [{lang, level}] |
| experienceYears | int, nullable | |
| sourceType | enum(internal, external) | Default: internal |
| sourceName | string, nullable | Для external: название источника |
| sourceUrl | string, nullable | Для external: URL |
| highlighted | boolean | Default: false (Pro/Max подсветка) |
| urgent | boolean | Default: false (🔥 маркер) |
| topPlacement | boolean | Default: false (TOP закрепление) |
| views | int | Default: 0 |
| uniqueViews | int | Default: 0 |
| applicationsCount | int | Default: 0 |
| status | enum(draft, moderation, published, rejected, expired, archived) | Default: draft |
| expiresAt | datetime, nullable | Устанавливается при публикации +60 дней |
| createdAt | datetime, auto | |

**Связи:**
- belongs to Company (nullable)
- belongs to User (postedBy)
- belongs to Industry
- belongs to Specialization
- has one VacancySource (для external)
- has many Application
- has many VacancyAnalytics

**Индексы:** `status`, `industry`, `specialization`, `country`, `workFormat`, `employmentType`, `seniority`, `sourceType`, `expiresAt`, `topPlacement`, `urgent`, `company`

---

### Resume

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| user | relation → User | many-to-one |
| title | string | Желаемая должность |
| firstName | string | |
| lastName | string | |
| avatar | media, nullable | |
| country | string | |
| city | string, nullable | |
| desiredSalary | int, nullable | |
| currency | enum(USD, EUR, RUB, GBP), nullable | |
| workFormat | enum(office, remote, hybrid, any) | |
| employmentType | enum(full-time, part-time, contract, internship, freelance) | |
| experienceYears | int, nullable | |
| about | richtext, nullable | |
| skills | json array | Список строк |
| languages | json array | [{lang, level}] |
| contacts | json | {phone?, email?, telegram?, linkedin?} |
| workExperience | component[], repeatable | Записи о работе |
| education | component[], repeatable | Образование |
| views | int | Default: 0 |
| invitations | int | Default: 0 |
| status | enum(draft, moderation, published, rejected, archived) | Default: draft |
| createdAt | datetime, auto | |

**Компоненты Resume:**

WorkExperience:
- company (string)
- position (string)
- startDate (date)
- endDate (date, nullable)
- current (boolean)
- description (text, nullable)

Education:
- institution (string)
- degree (string)
- field (string)
- startDate (date)
- endDate (date, nullable)
- current (boolean)

**Связи:**
- belongs to User
- has many Application
- has many ResumeAnalytics

**Индексы:** `user`, `status`, `country`, `workFormat`, `employmentType`

---

### Application

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| vacancy | relation → Vacancy | many-to-one |
| resume | relation → Resume | many-to-one |
| user | relation → User | many-to-one (для быстрого доступа) |
| status | enum(applied, viewed, in-review, interview, test-task, offer, hired, rejected) | Default: applied |
| coverLetter | text, nullable | |
| createdAt | datetime, auto | |

**Ограничение:** один пользователь не может подать два отклика на одну вакансию.

**Индексы:** `vacancy`, `resume`, `user`, `status`

---

### Industry

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| name | json | {ru, en} |
| slug | string, unique | |

**Связи:**
- has many Specialization

---

### Specialization

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| industry | relation → Industry | many-to-one |
| name | json | {ru, en} |
| slug | string, unique | |

---

### VacancySource

Для внешних вакансий (sourceType = external).

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| vacancy | relation → Vacancy | one-to-one |
| provider | string | Название источника (hh.ru, linkedin, etc.) |
| externalId | string | ID на источнике |
| originalUrl | string | |
| parsedAt | datetime | |
| updatedAt | datetime | |

**Индексы:** `provider + externalId` (unique)

---

### SubscriptionPlan

Статические данные, управляются через Strapi Admin.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| code | enum(free, pro, max) | unique |
| name | string | |
| vacanciesPerMonth | int | |
| activeVacanciesLimit | int | |
| vacancyBoostsPerDay | int | |
| applicationsPerDay | int | |
| resumesLimit | int | |
| resumeDatabaseAccess | boolean | |
| starsPrice | int, nullable | Цена в Telegram Stars (null = бесплатно) |
| durationDays | int | Default: 30 |

---

### VacancyPackage

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| name | string | |
| vacancyCredits | int | |
| boostCredits | int | |
| starsPrice | int | |

---

### ApplyPackage

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| name | string | |
| applyCredits | int | |
| starsPrice | int | |

---

### VacancyAnalytics

Агрегация по дням для каждой вакансии.

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| vacancy | relation → Vacancy | many-to-one |
| date | date | |
| views | int | Default: 0 |
| uniqueViews | int | Default: 0 |
| applications | int | Default: 0 |
| ctr | float | Default: 0 |

**Индексы:** `vacancy + date` (unique)

---

### ResumeAnalytics

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| resume | relation → Resume | many-to-one |
| date | date | |
| views | int | Default: 0 |
| uniqueViews | int | Default: 0 |
| invitations | int | Default: 0 |

**Индексы:** `resume + date` (unique)

---

### Notification

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| user | relation → User | many-to-one |
| type | enum (см. ниже) | |
| title | string | |
| body | text | |
| isRead | boolean | Default: false |
| data | json, nullable | {entityType, entityId} для ссылки |
| createdAt | datetime, auto | |

**Типы уведомлений:**
- Кандидат: resume_viewed, application_approved, application_rejected, interview_invitation, offer_received, subscription_expired
- Работодатель: new_application, vacancy_viewed, subscription_expired, limits_reached, vacancy_expiring_soon

**Индексы:** `user`, `isRead`, `createdAt`

---

### SavedSearch

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| user | relation → User | many-to-one |
| name | string, nullable | |
| type | enum(vacancy, resume) | |
| filters | json | Объект с параметрами фильтров |
| lastNotifiedAt | datetime, nullable | Дата последнего уведомления |
| createdAt | datetime, auto | |

---

### Favorite

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| user | relation → User | many-to-one |
| type | enum(vacancy, resume, company) | |
| targetId | int | ID целевой сущности |
| createdAt | datetime, auto | |

**Ограничение:** уникальная пара (user, type, targetId).
**Индексы:** `user + type`, `user + type + targetId` (unique)

---

### Report (Жалоба)

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| reporter | relation → User | many-to-one |
| type | enum(vacancy, resume, company, user) | |
| targetId | int | |
| reason | enum(spam, fraud, inappropriate, other) | |
| comment | text, nullable | |
| status | enum(pending, reviewed, resolved) | Default: pending |
| createdAt | datetime, auto | |

---

### Block (Блокировки)

| Поле | Тип | Описание |
|------|-----|----------|
| id | int, PK, auto | |
| user | relation → User | many-to-one (кто блокирует) |
| targetType | enum(employer, candidate) | |
| targetId | int | ID заблокированного User |
| createdAt | datetime, auto | |

**Индексы:** `user + targetId` (unique)

---

## Диаграмма связей (текстовая)

```
User ──────────────────────────────────────────────┐
│ owns → Company → Vacancy → Application ← Resume │
│ has → Resume                                      │
│ has → Application                                 │
│ has → Notification                                │
│ has → SavedSearch                                 │
│ has → Favorite                                    │
│ has → Block                                       │
└───────────────────────────────────────────────────┘

Industry → Specialization → Vacancy

Vacancy → VacancySource (external only)
Vacancy → VacancyAnalytics[]
Resume → ResumeAnalytics[]
```

---

## Примечания по реализации

- `skills` и `languages` хранятся как JSON arrays — не отдельные таблицы (для производительности поиска используется PostgreSQL full-text search и GIN индексы)
- `contacts` в Resume — JSON, видны работодателю без ограничений; кандидату — только после одобрения отклика (логика в API)
- Аналитику лучше писать в отдельную таблицу (не накапливать в модели) для historical reporting
- `SavedSearch.filters` — зеркало параметров endpoint `/api/vacancies` или `/api/resumes`
