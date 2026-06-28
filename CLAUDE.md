# GramJob — AI Session Context

## Что это за проект

**GramJob** — международная биржа вакансий и резюме в экосистеме Telegram.

Работает через три канала:

- **Web Platform** — основной (Next.js 15, SSR+ISR, SEO)
- **Telegram Mini App** — встроенное приложение в Telegram
- **Telegram Bot** — уведомления и быстрые действия

Аудитория: кандидаты, работодатели, рекрутеры, физлица.
Монетизация: подписки через Telegram Stars + разовые пакеты.

---

## Текущее состояние проекта

**Фаза: Разработка. Sprint 1 завершён, Sprint 2 завершён, Sprint 3 завершён (Backend + Frontend), Sprint 4 Backend завершён, Sprint 4 Frontend Part 1 (Resumes) завершён. Следующий: Sprint 4 Frontend Part 2 — Applications.**

Выполнено (Sprint 1):

- pnpm монорепо инициализировано (`backend/` + `frontend/`)
- Docker Compose: PostgreSQL 16 + MinIO готовы (`docker compose up -d`)
- `.env.example` созданы для backend и frontend
- Pre-commit хуки: Husky + lint-staged + Prettier
- GitHub Actions CI pipeline (lint + typecheck + test на PR)
- Репозиторий: `git@github.com:VitalyDu/GramJob.git`
- Strapi 5 инициализирован, PostgreSQL подключён, S3/MinIO настроен
- Telegram initData auth middleware, POST /auth/telegram, GET/PUT /users/me, rate limiting
- Next.js 15 (App Router, TypeScript strict + `noUncheckedIndexedAccess`)
- TailwindCSS 4 + Shadcn/UI (Button, Input, Label) + `@telegram-apps/telegram-ui`
- MobX: RootStore, AuthStore (JWT persist в localStorage), StoreProvider
- i18next RU/EN, типизированный API-клиент, Telegram Login Widget
- Email Login/Register (React Hook Form + Zod), Telegram Mini App init
- Layout shell: WebHeader (web) + MiniAppBottomNav (mini app)

Выполнено (Sprint 2 Backend):

- Content type: Industry (`name: json{ru,en}`, `slug`, oneToMany → Specialization)
- Content type: Specialization (`industry: manyToOne`, `name: json{ru,en}`, `slug`)
- Seed: 12 отраслей, 87 специализаций — idempotent bootstrap (`src/scripts/seed-industries.ts`)
- GET /industries — возвращает все отрасли с populate specializations
- Content type: Company (все поля: owner, name, slug, logo, cover, description, website, telegram, linkedin, country, city, companySize, status)
- Утилиты: `toSlug`, `canSubmit`, `canDelete` с unit-тестами (40 тестов)
- Примечание: `companySize` хранится как `size_1_10` и т.д. (ограничение Strapi 5 enum naming)
- Policy `is-company-owner` — проверка владельца через `ctx.state.user` + unit-тест
- Company routes — кастомный файл маршрутов (порядок: `/my`, `/slug/:slug` ДО `/:id`)
- Company service — `createCompany`, `generateUniqueSlug` (уникальный slug с суффиксом)
- POST /companies — создание компании (auth, валидация, slug)
- POST /companies/:id/submit — смена статуса draft → moderation
- GET /companies — публичный список (фильтры: search, country, companySize; пагинация)
- GET /companies/:id — публичная карточка (только published)
- GET /companies/slug/:slug — по slug (только published)
- PUT /companies/:id — обновление (owner via policy, slug re-gen при смене name)
- DELETE /companies/:id — удаление (только draft/rejected, реальная проверка вакансий)
- GET /companies/my — мои компании (все статусы, пагинация)
- Company lifecycle hook — логирует событие published (TODO Telegram notification Sprint 7)

Выполнено (Sprint 2 Frontend):

- `types/api.ts` — Company-типы: `Company`, `CompanySizeEnum`, `CompanyStatusEnum`, `StrapiMedia`, `CompanyCreateInput`, `CompanyUpdateInput`, `CompanyListParams`
- `lib/media.ts` — `getMediaUrl()` для Strapi media URLs
- `lib/company-utils.ts` — `COMPANY_SIZE_LABELS` (size_1_10 → "1–10" и т.д.)
- `stores/CompanyStore.ts` — MobX стор: `fetchCompanies`, `fetchMyCompanies`, `fetchCompanyById`, `createCompany`, `updateCompany`, `deleteCompany`, `submitCompany` (16 тестов)
- `stores/RootStore.ts` — добавлен `company: CompanyStore`
- `components/company/StatusBadge.tsx` — бейдж статуса компании с цветовой кодировкой
- `components/company/CompanyCard.tsx` — карточка компании (лого, название, статус, размер, страна)
- `components/company/CompanyForm.tsx` — форма создания/редактирования (React Hook Form + Zod)
- `app/companies/page.tsx` — публичный каталог компаний (поиск, фильтр по стране, пагинация)
- `app/companies/[id]/page.tsx` — публичный профиль компании
- `app/dashboard/companies/page.tsx` — список своих компаний (подать на модерацию, удалить)
- `app/dashboard/companies/new/page.tsx` — создание компании → редирект на dashboard
- `app/dashboard/companies/[id]/edit/page.tsx` — редактирование компании → редирект на dashboard
- Итого: 89 тестов, 0 ошибок TypeScript

Выполнено (Sprint 3 Backend):

- Content type: Vacancy (все поля из БД-схемы: relations, enums, json, boolean, integer, datetime)
- Content type: VacancySource (oneToOne → Vacancy, provider, externalId, originalUrl, parsedAt)
- Утилиты: `canPublish`, `canBoost`, `canArchive`, `canEdit`, `publishedTransitionsOnEdit` + 26 тестов
- Credit service: `PLAN_LIMITS`, `getLimitForPlan`, `getBoostsLimitForPlan`, `checkAndConsumeVacancyCredit`, `checkAndConsumeBoost` + 9 тестов
- Policy `is-vacancy-owner` — проверка владельца через `postedBy` + 4 теста
- Vacancy routes — кастомный файл маршрутов (порядок: `/my` ДО `/:id`), включает DELETE /vacancies/:id
- Vacancy service — `createVacancy`, `searchByVector` (raw SQL tsvector, GIN-индекс)
- Vacancy controller — все endpoint-ы: create, publish, findPublished (FTS + filters), findOne (views/uniqueViews), update, boost, archive, findMine
- Lifecycle hook `beforeUpdate` — устанавливает `expiresAt = now + 60 дней` при переходе в published
- Lifecycle hook `afterCreate/afterUpdate` — обновляет `search_vector` через raw SQL
- FTS setup в bootstrap: `ALTER TABLE vacancies ADD COLUMN search_vector tsvector` + GIN-индекс (idempotent)
- Cron job (hourly): находит `published` вакансии с `expiresAt < now`, переводит в `expired`
- DELETE /companies/:id — реальная проверка активных вакансий (published/moderation) вместо stub
- POST /vacancies — проверяет владение компанией (`companyId`) перед созданием
- Credit filter исправлен: считает только `moderation/published` вакансии в месячный лимит
- Итого: 79 тестов, 0 ошибок TypeScript

Известные MVP-ограничения Sprint 3 (запланированы к исправлению в Sprint 6):

- Boost/views счётчики хранятся in-memory (сбрасываются при рестарте, не масштабируются)
- Кредитный лимит без атомарных транзакций (race condition при высокой нагрузке)
- FTS возвращает максимум первые 10 000 результатов по релевантности

Выполнено (Sprint 3 Frontend, Tasks 1–15):

- `types/api.ts` — Vacancy-типы: `Vacancy`, `VacancyStatusEnum`, `WorkFormatEnum`, `EmploymentTypeEnum`, `SeniorityEnum`, `SalaryCurrencyEnum`, `VacancyCreateInput`, `VacancyUpdateInput`, `VacancyListParams`, `Industry`, `Specialization`
- `lib/vacancy-utils.ts` — `WORK_FORMAT_LABELS`, `EMPLOYMENT_TYPE_LABELS`, `SENIORITY_LABELS`, `formatSalary`, `canPublishVacancy`, `canBoostVacancy`, `canArchiveVacancy`, `canEditVacancy`
- `stores/VacancyStore.ts` — MobX стор: `fetchVacancies`, `fetchMyVacancies`, `fetchVacancyById`, `createVacancy`, `updateVacancy`, `publishVacancy`, `boostVacancy`, `archiveVacancy`, `deleteVacancy`, `clearLimitReached`, `boostsRemaining` (16 тестов)
- `stores/RootStore.ts` — добавлен `vacancy: VacancyStore`
- `components/vacancy/VacancyStatusBadge.tsx` — бейдж статуса (6 статусов: draft/moderation/published/rejected/expired/archived)
- `components/vacancy/VacancyCard.tsx` — карточка вакансии (urgent, top, highlighted, external badge)
- `components/vacancy/LimitBar.tsx` — прогресс-бар кредитов (зелёный/жёлтый/красный)
- `components/vacancy/UpsellModal.tsx` — модал при LIMIT_REACHED с планами Pro и Max
- `components/vacancy/VacancyFilters.tsx` — панель фильтров (workFormat, employmentType, seniority, sort)
- `components/vacancy/VacancyForm.tsx` — форма создания/редактирования (все поля, React Hook Form + Zod)
- `app/vacancies/page.tsx` + `VacanciesClient.tsx` — публичный поиск (фильтры + карточки + пагинация)
- `app/vacancies/[id]/page.tsx` + `VacancyDetailClient.tsx` — полная карточка (Apply on Source для external)
- `app/dashboard/vacancies/page.tsx` + `MyVacanciesClient.tsx` — дашборд вакансий (publish/boost/archive, LimitBar, UpsellModal)
- `app/dashboard/vacancies/new/page.tsx` + `CreateVacancyClient.tsx` — создание вакансии
- `app/dashboard/vacancies/[id]/edit/page.tsx` + `EditVacancyClient.tsx` — редактирование вакансии
- Итого: 169 тестов, 0 ошибок TypeScript

Выполнено (Sprint 4 Backend):

- Strapi компоненты: `resume.work-experience`, `resume.education` (JSON-схемы)
- Content type: Resume (title, firstName, lastName, country, city, desiredSalary, currency, workFormat, employmentType, experienceYears, about, skills, languages, contacts, status: draft/moderation/published/rejected/archived)
- Утилиты: `canPublishResume`, `canEditResume`, `canArchiveResume`, `publishedTransitionsOnEditResume` + тесты
- Policy `is-resume-owner` — проверка владельца резюме + тест
- Policy `requires-max-plan` — gate для доступа к базе резюме (Max + VIP) + тесты
- Resume service — `createResume` factory
- Resume controller — create, publish (→ moderation), findPublic (фильтры + пагинация), findOne (views++, контакты masked), update, archive, findMine
- Resume routes — `/resumes`, `/resumes/my`, `/resumes/:id`, `/resumes/:id/publish`
- Content type: Application (vacancy, resume, user, status, coverLetter)
- Lifecycle hook Application `afterCreate` — INCREMENT applicationsCount на vacancy через raw SQL
- Lifecycle hook Application `afterUpdate` — лог + TODO Sprint 7 Telegram
- Утилиты: `STATUS_TRANSITIONS` map + `canTransitionTo` + 19 тестов
- Apply credit service: `APPLY_PLAN_LIMITS`, `getApplyLimitForPlan`, `checkAndConsumeApplyCredit` (in-memory daily tracker) + тесты
- Application controller — create (валидация vacancy/resume, дедупликация, кредитный лимит), findMine, findByVacancy (employer), updateStatus (employer + валидация переходов)
- Application routes — GET/POST /applications, GET /vacancies/:id/applications, PATCH /applications/:id
- Итого: 132 теста, 0 ошибок TypeScript

Известные MVP-ограничения Sprint 4 (запланированы к исправлению в Sprint 6):

- Апплай-кредиты хранятся in-memory (сбрасываются при рестарте, не масштабируются)

Выполнено (Sprint 4 Frontend Part 1 — Resumes):

- `types/api.ts` — Resume-типы: `Resume`, `ResumeStatusEnum`, `ResumeWorkFormatEnum`, `ResumeCurrencyEnum`, `WorkExperience`, `Education`, `ResumeCreateInput`, `ResumeUpdateInput`, `ResumeListParams`
- `lib/resume-utils.ts` — `RESUME_WORK_FORMAT_LABELS`, `RESUME_EMPLOYMENT_TYPE_LABELS`, `APPLY_PLAN_LIMITS`, `canPublishResume`, `canEditResume`, `canArchiveResume` (10 тестов)
- `stores/ResumeStore.ts` — MobX стор: `fetchResumes` (403 → accessDenied), `fetchMyResumes`, `fetchResumeById`, `createResume`, `updateResume`, `publishResume`, `archiveResume`, `clearAccessDenied`, `pageCount` (16 тестов)
- `stores/RootStore.ts` — добавлен `resume: ResumeStore`
- `components/resume/ResumeStatusBadge.tsx` — бейдж статуса (5 статусов)
- `components/resume/ResumeCard.tsx` — карточка резюме (аватар-инициал, skills tags, href → Link)
- `components/resume/ResumeForm.tsx` — форма с динамическими секциями workExperience + education (`useFieldArray`)
- `app/resumes/page.tsx` + `ResumesClient.tsx` — публичная база резюме (Max-gate на 403, фильтры + пагинация)
- `app/resumes/[id]/page.tsx` + `ResumeDetailClient.tsx` — карточка резюме (опыт, образование, контакты)
- `app/dashboard/resumes/page.tsx` + `MyResumesClient.tsx` — мои резюме (publish/archive, лимит откликов)
- `app/dashboard/resumes/new/page.tsx` + `CreateResumeClient.tsx` — создание резюме
- `app/dashboard/resumes/[id]/edit/page.tsx` + `EditResumeClient.tsx` — редактирование резюме
- Итого: 195 тестов, 0 ошибок TypeScript

Ключевой паттерн (критично для всего frontend): `exactOptionalPropertyTypes: true` в tsconfig требует использовать conditional spread (`...(x ? { field: x } : {})`) вместо `field: x || undefined` при передаче опциональных параметров.

Текущий шаг — Sprint 4 Frontend Part 2 (Applications).
Планы: `docs/superpowers/plans/`

---

## Tech Stack

| Слой      | Технология                            |
| --------- | ------------------------------------- |
| Frontend  | Next.js 15, React 19, TypeScript      |
| State     | MobX                                  |
| Стили     | TailwindCSS 4, Telegram UI, Shadcn/UI |
| Формы     | React Hook Form + Zod                 |
| i18n      | i18next (RU, EN)                      |
| Backend   | Strapi 5 (headless CMS)               |
| БД        | PostgreSQL                            |
| Хранилище | S3-compatible                         |
| Auth      | Telegram Login + Email/Password       |
| API       | REST                                  |
| Рендеринг | SSR + ISR                             |
| Оплата    | Telegram Stars                        |

---

## Архитектура

```
Next.js 15 (Web + Mini App)
        ↕ REST API
Strapi 5 (Headless CMS)
        ↕
   PostgreSQL         S3 Storage
        ↕
  Telegram Bot API (уведомления)
```

---

## Ключевые бизнес-правила

### Планы подписки

| План | Вакансий/мес | Активных | Буст/день | Откликов/день | Резюме  | База резюме | Подсветка       | Цена/мес          |
| ---- | ------------ | -------- | --------- | ------------- | ------- | ----------- | --------------- | ----------------- |
| Free | 3            | 3        | 3         | 3             | 1       | ✗           | —               | Бесплатно         |
| Pro  | 10           | 10       | 10        | 10            | 5       | ✗           | Синяя           | 299 Stars (~$6)   |
| Max  | 50           | 50       | 50        | 50            | 20      | ✓           | Золотая         | 999 Stars (~$20)  |
| VIP  | как Max      | как Max  | как Max   | как Max       | как Max | ✓           | Золотая + бейдж | +499 Stars (~$10) |

- Оплата: Telegram Stars
- Сброс лимитов: ежемесячно
- Доступ к базе резюме только для Max-подписки

### Статусы вакансий

```
Draft → Moderation → Published → Rejected
                              → Expired (через 60 дней)
                              → Archived (вручную)
```

- Срок публикации: **60 дней**
- После истечения вакансию можно переопубликовать (тратятся кредиты)

### Статусы резюме

```
Draft → Moderation → Published → Rejected
                              → Archived (вручную)
```

### Статусы компании

```
Draft → Moderation → Published → Rejected
```

### Статусы отклика

```
Applied → Viewed → InReview → Interview
                            → TestTask
                            → Offer → Hired
                            → Rejected
```

### Правила видимости контактов

- **Кандидат** видит контакты работодателя только после одобрения отклика
- **Работодатель** видит контакты кандидата сразу при получении отклика

### Типы вакансий

- **Internal** — размещена на GramJob, отклик через платформу
- **External** — спарсена снаружи, кнопка «Apply on Source» → редирект

### Модерация

Обязательная для: вакансий, резюме, компаний.
Проходит через Strapi Admin панель.

### Иерархия категорий

```
Industry → Specialization
Пример: IT → Frontend Developer, Backend Developer
```

### Монетизация вакансий

- **Vacancy Boost** — поднять в выдаче + в блок рекомендаций
- **TOP Vacancy** — закрепление в топе выдачи
- **Urgent Vacancy** — маркер 🔥 Urgent
- **VIP Employer** — надстройка над Max: бейдж + приоритет в поиске + блок «Рекомендуем» на главной + модерация < 4ч. Требует активный Max. +499 Stars/мес
- **Vacancy пакеты** — 10/20/50/100 вакансий (включают бусты)
- **Apply пакеты** — 50/100/500 откликов

---

## Основные модели (краткая справка)

| Модель         | Ключевые поля                                                         |
| -------------- | --------------------------------------------------------------------- |
| User           | id, email, telegramId, subscriptionPlan, vacancyCredits, applyCredits |
| Company        | id, ownerId, name, slug, status                                       |
| Vacancy        | id, companyId, title, industryId, sourceType, status, expiresAt       |
| Resume         | id, userId, title, status                                             |
| Application    | id, vacancyId, resumeId, userId, status                               |
| Industry       | id, name, slug                                                        |
| Specialization | id, industryId, name, slug                                            |

Полная схема: `docs/database-schema.md`

---

## Telegram Bot Events

**Для кандидата:**
ResumeViewed, ApplicationApproved, ApplicationRejected, InterviewInvitation, OfferReceived, SubscriptionExpired

**Для работодателя:**
NewApplication, VacancyViewed, SubscriptionExpired, LimitsReached, VacancyExpiringSoon

---

## Требования к производительности

- TTFB < 500 ms
- Lighthouse > 90
- SEO на всех публичных страницах (SSR/ISR)

---

## Требования к безопасности

JWT, Telegram Signature Validation, Rate Limiting, CSRF Protection, RBAC, Audit Logs

---

## Индекс документации

| Файл                                 | Содержание                                                   |
| ------------------------------------ | ------------------------------------------------------------ |
| `docs/business-logic.md`             | Полная бизнес-логика, все сущности, правила                  |
| `docs/technical-specification.md`    | Tech stack, модели данных                                    |
| `docs/database-schema.md`            | Схема БД: поля, типы, связи, индексы                         |
| `docs/api-specification.md`          | REST API: все эндпоинты, параметры, ответы                   |
| `docs/subscription-system.md`        | Подписки, кредиты, пакеты, платёжный флоу                    |
| `docs/moderation-system.md`          | Воркфлоу модерации, статусы, правила                         |
| `docs/telegram-bot-specification.md` | Bot-команды, Mini App экраны, уведомления                    |
| `docs/development-guide.md`          | Setup, ENV, конвенции, тесты, деплой                         |
| `docs/search-specification.md`       | Full-text search, фильтры, SQL, GIN-индексы                  |
| `docs/notification-system.md`        | Архитектура уведомлений, retry, rate limits, шаблоны         |
| `docs/seed-data.md`                  | Начальные данные: industries, specializations, языки, страны |
| `docs/sprint-plan.md`                | План разработки по спринтам с чеклистами задач               |
| `docs/roadmap.md`                    | Планируемые фичи (backlog)                                   |

---

## Агенты (.claude/agents/)

| Агент                     | Использовать когда                          |
| ------------------------- | ------------------------------------------- |
| `product-manager`         | Вопросы по бизнес-логике, scope, приоритеты |
| `system-architect`        | Архитектурные решения, выбор подходов       |
| `frontend-architect`      | Next.js, React, MobX, компоненты, routing   |
| `backend-architect`       | Strapi, API, бизнес-логика бэкенда          |
| `database-architect`      | Схема, миграции, запросы, индексы           |
| `telegram-miniapp-expert` | Telegram Mini App, Bot API, Stars оплата    |
| `strapi-expert`           | Content types, плагины, хуки, middleware    |
| `qa-engineer`             | Тест-стратегия, edge cases, quality         |
| `security-engineer`       | Auth, RBAC, уязвимости, review              |
| `devops-engineer`         | CI/CD, деплой, инфраструктура               |

---

## Локализация

Поддержка: **RU** и **EN** через i18next.
Архитектура должна позволять добавлять языки без изменения бизнес-логики.

---

## Для следующей сессии

Этот файл даёт полный контекст. Для деталей открывать нужный doc-файл из индекса выше.
Перед реализацией любой фичи — проверять `docs/business-logic.md` на наличие бизнес-правил.
