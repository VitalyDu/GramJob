# GramJob — комплексный аудит проекта

**Дата:** 2026-07-18
**Ветка:** `main` @ `da9bc83`
**Фаза:** Production (Sprint 10 почти завершён)
**Область:** backend (Strapi 5) + frontend (Next.js 15) + интеграции (Telegram, Stars) + безопасность + производительность

---

## 1. Итог по здоровью проекта

| Категория               | Результат                                          |
| ----------------------- | -------------------------------------------------- |
| Backend unit-тесты      | ✅ **293 / 293** passed (33 suites, 20 сек)        |
| Backend integration     | ✅ **50 / 50** passed (11 suites, 84 сек)          |
| Frontend тесты          | ✅ **456 / 456** passed (64 files, 24 сек)         |
| Backend typecheck       | ✅ `tsc --noEmit` clean                            |
| Frontend typecheck      | ✅ `tsc --noEmit` clean                            |
| Backend startup         | ✅ 7.8 сек, DB подключилась, seed идемпотентен     |
| Frontend startup        | ✅ отвечает <2 сек                                 |
| Public endpoints (curl) | ✅ /vacancies, /companies, /industries, /plans     |
| Authenticated flow      | ✅ register→login→me→create resume/company/vacancy |
| Load (20 parallel GET)  | ✅ 205 мс всего (≈10 мс/запрос)                    |

Проект в целом **здоров** — тесты зелёные, типизация строгая, статус миграций и seed-логики нормальный. Однако найдено **11 багов разной степени критичности**, большинство — в permission-конфигурации и валидации входа. См. §3.

---

## 2. Скоуп аудита

**Backend (все API):**

- 19 content-types → полностью прочитаны схемы, relations, enums.
- Все controllers (`vacancy`, `resume`, `company`, `application`, `favorite`, `block`, `report`, `payment`, `notification`, `analytics`, `telegram-auth`, `health`, seed-endpoints).
- Все routes, policies, middlewares (`telegram-auth`, `api-rate-limit`, `auth-rate-limit`), lifecycle hooks (vacancy/resume/company).
- Сервисы: credit-service, apply-credit-service, moderation.service, notification.service, admin-notify, telegram-bot (webhook, invoice, sendMessage retry-очередь).
- Cron tasks: expireVacancies, expireSubscriptions, dailyWarnings, vacancyViewsDigest, cleanupNotifications, aggregateAnalytics.
- Seed: permissions, industries, plans, packages, password reset, email confirmation.

**Frontend:**

- Все MobX stores (Auth, Vacancy, Resume, Company, Application, Favorite, Block, Payment, Notification, Analytics, Limits).
- Public pages: `/`, `/vacancies`, `/vacancies/[id]`, `/companies`, `/companies/[id]`, `/resumes`, `/resumes/[id]`, `/subscription`.
- Auth pages: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/email-confirmed`.
- Dashboard: publications, vacancies, resumes, companies, applications, notifications, favorites, blocks, profile.
- SEO: `sitemap.ts`, `robots.ts`, Metadata API, OG + Twitter meta.
- API-клиент, telegram-init, useTelegramPayment, useTelegramInit.

**Интеграции:**

- Telegram Mini App auth (initData signature, JWT injection middleware).
- Telegram Login Widget (web).
- Telegram Stars payments — invoice creation, webhook, pre_checkout, successful_payment, идемпотентность.
- Telegram Bot команды.

**Тестирование:**

- Полный прогон unit + integration.
- Ручное тестирование через curl: registration → email confirm → login → create → publish → apply → status transitions.
- Проверка ownership (attacker vs victim).
- Проверка rate limit, block filter.
- SQL/XSS/URL scheme injection, race condition.

---

## 3. Найденные баги

Ранжирование: **P0** — блокирует функциональность / security-риск; **P1** — критичный dev-опыт / соответствие спецификации; **P2** — небольшой недосмотр / MVP-приемлемо.

### 3.1. P0 — сломанные фичи из-за отсутствия permissions ✅ ИСПРАВЛЕНО (2026-07-18)

**Файл:** `backend/src/scripts/seed-permissions.ts`
**Как воспроизвести:** `curl -X POST /api/payments/urgent … -H "Authorization: Bearer <jwt>"` → `403 Forbidden` (Policy: standard users-permissions).

Отсутствуют следующие `AUTHENTICATED_PERMISSIONS`:

| Действие                                    | Endpoint / роут                    | Последствие                                               |
| ------------------------------------------- | ---------------------------------- | --------------------------------------------------------- |
| `api::payment.payment.urgent`               | `POST /api/payments/urgent`        | Платная опция «🔥 Urgent Vacancy» (99 Stars) не работает. |
| `api::payment.payment.topPlacement`         | `POST /api/payments/top-placement` | Платная опция «TOP Vacancy» (199 Stars) не работает.      |
| `api::resume.resume.invite`                 | `POST /api/resumes/:id/invite`     | Max-фича «Пригласить кандидата откликнуться» не работает. |
| `api::analytics.analytics.companyAnalytics` | `GET /api/analytics/companies/:id` | Аналитика компаний в дашборде не работает.                |

Все четыре controller-метода реализованы полностью (включая валидацию владельца и статуса), но permission на роль `authenticated` не сеется — Strapi отдаёт `403 ForbiddenError`.

Также в `AUTHENTICATED_PERMISSIONS` есть строка `api::vacancy.vacancy.delete`, но контроллер `vacancy.ts` **не содержит метода `delete`**, а роут `DELETE /vacancies/:id` мапится на `vacancy.archive`. Permission «мёртвая», но безвредная.

**Fix:** добавлены `invite`, `urgent`, `topPlacement`, `companyAnalytics` в `AUTHENTICATED_PERMISSIONS`. После рестарта seed поднялся с 71 → 75. Verified curl:

- `/analytics/companies/:id` → 200
- `/resumes/:id/invite` → 403 SUBSCRIPTION_REQUIRED (правильно: Audit на free plan)
- `/payments/urgent` и `/payments/top-placement` → доходят до controller (500 в локальной среде из-за пустого `TELEGRAM_BOT_TOKEN`; в prod с настроенным токеном будут отдавать `invoiceUrl`).

### 3.2. P0 — утечка Telegram-контакта работодателя в POST /applications ✅ ИСПРАВЛЕНО (2026-07-18)

**Файл:** `backend/src/api/application/controllers/application.ts:136-165`

`POST /applications` (создание отклика) возвращает `application` с полем `vacancy.postedBy.telegramId` **без вызова `maskEmployerTelegram`**. Все остальные endpoints (`findMine`, `findByVacancy`, `findOne`) маскируют его для кандидата до статуса ≥ `interview`.

**Как воспроизвести:**

```bash
curl -s -X POST /api/applications -H "Authorization: Bearer <candidate_jwt>" \
     -d '{"vacancyId":"…","resumeId":"…"}'
# → data.vacancy.postedBy.telegramId раскрыт сразу при status='applied'
```

Нарушает бизнес-правило: «Кандидат видит контакты работодателя только после одобрения отклика» (`CLAUDE.md § Правила видимости контактов`).

**Фикс (концепт):**

```ts
const application = await create({ … })
return ctx.send({ data: maskEmployerTelegram(application, user.id) }, 201)
```

**Fix применён** в `application.ts:165`. Verified curl: `POST /applications` теперь возвращает `postedBy: { id }` — все чувствительные поля (`firstName`, `lastName`, `telegramId`) удалены до статуса `interview`.

### 3.3. P1 — race condition при создании Favorite (и Block) ✅ ИСПРАВЛЕНО (2026-07-18)

**Файлы:** `backend/src/api/favorite/controllers/favorite.ts:145-170`, `backend/src/api/block/controllers/block.ts:60-88`
**Схемы:** `favorite/schema.json`, `block/schema.json` — **нет unique constraint** на `(user, type, targetId)` / `(user, targetType, targetId)`.

Проверка через `findFirst → create` не атомарна. 5 параллельных POST c одним и тем же targetId создают 5 записей.

**Как воспроизвести:**

```bash
for i in 1 2 3 4 5; do
  curl -s -X POST /api/favorites -H "Authorization: Bearer $TOKEN" \
       -d '{"type":"vacancy","targetId":"same"}' &
done; wait
# → все 5 возвращают 201, в БД 5 дубликатов
```

Подтверждено локально: 5 записей для одного `targetId`.

**Фикс:** добавить в Postgres unique index (миграция или bootstrap-хук):

```sql
CREATE UNIQUE INDEX IF NOT EXISTS favorites_user_type_target_uq
  ON favorites (user_id_column, type, target_id);
```

**Fix применён.** UNIQUE через lnk-таблицу Strapi 5 невозможен без денормализации, поэтому обернули `create` в `strapi.db.transaction` + `pg_advisory_xact_lock(hashtextextended(key, 0))`. Параллельные запросы с одним `(user, type, targetId)` сериализуются на транзакцию. Verified: 5 параллельных POST → 1×201 + 4×409, в БД 1 запись. То же для `blocks`.

### 3.4. P1 — валидация зарплаты и длины строк не покрыта ✅ ИСПРАВЛЕНО (2026-07-18)

**Файл:** `backend/src/api/vacancy/controllers/vacancy.ts:91-231`

Проблемы:

- Нет проверки `salaryFrom >= 0` — можно сохранить отрицательные значения.
- Нет проверки `salaryFrom <= salaryTo` — можно сохранить «инвертированные» вилки.
- Нет ограничения длины `title`. `title` объявлен как `string` в Strapi (по умолчанию VARCHAR(255)), но при передаче 10000 символов бэкенд отдаёт **`500 Internal Server Error`** вместо 400.

Аналогично `resume` (`title`, `firstName`, `lastName`).

**Как воспроизвести:**

```bash
curl -s -X POST /api/vacancies -d '{"title":"'"$(python3 -c 'print("X"*10000)')"'", …}' \
  → HTTP 500
curl -s -X POST /api/vacancies -d '{"salaryFrom":-1000,"salaryTo":-500, …}' \
  → HTTP 201 (сохранено)
```

**Fix применён.** Новая утилита `backend/src/utils/input-validation.ts` (26 unit-тестов) с `validateShortText` (≤200 символов), `validateLongText` (≤20 000 символов), `validateSalaryRange` (≥0, from ≤ to). Подключено в create/update контроллерах `vacancy`, `resume`, `company`. Verified: huge title → 400 «title must be at most 200 characters», negative salary → 400 «salaryFrom must be non-negative», from > to → 400 «salaryFrom must be less than or equal to salaryTo».

### 3.5. P1 — нет валидации URL-схем в website / linkedin / sourceUrl ✅ ИСПРАВЛЕНО (2026-07-18)

**Файлы:** `backend/src/api/company/controllers/company.ts:346-424`, `vacancy/controllers/vacancy.ts:605-772`
**Фронтенд:** `frontend/src/app/companies/[id]/CompanyDetailClient.tsx:106,126`, `vacancies/[id]/VacancyDetailClient.tsx:233`

Бэкенд не проверяет схему URL. `company.website`, `company.linkedin`, `vacancy.sourceUrl` могут содержать `javascript:alert(1)`. Фронтенд рендерит их как `<a href={value}>`. React 19 частично защищает (`javascript:` схема выдаёт warning, но не блокируется во всех сценариях).

**Подтверждено:** `UPDATE companies SET website='javascript:alert(1)'` → GET /companies/:id возвращает это значение → рендерится в `href`.

**Фикс:** валидация в Strapi (regex `^https?://…`) или frontend-sanitizer перед `<a href>`.

**Fix применён.** `validateHttpUrl` (в input-validation.ts) через `new URL()` + allowlist `{http:, https:}`. Подключено в vacancy create (`sourceUrl`) и company create/update (`website`, `linkedin`). Verified: `javascript:alert(1)` → 400 «website must use http or https scheme», то же для `data:` схем; `https://example.com` → 201.

### 3.6. P1 — Frontend не отдаёт Content-Security-Policy ✅ ИСПРАВЛЕНО (2026-07-18)

**Файл:** `frontend/next.config.ts:6-10`

Настроены `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. **Нет** `Content-Security-Policy` и `X-Frame-Options` / `frame-ancestors`.

**Ответ:**

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
# Отсутствует: Content-Security-Policy, X-Frame-Options
```

Bэкенд Strapi имеет CSP (koa-helmet default), фронтенд — не имеет. Clickjacking на публичных страницах возможен.

**Замечание:** для Telegram Mini App нужен `frame-ancestors https://web.telegram.org`, чтобы не сломать embed. Фронтенд должен отдавать CSP как минимум для публичных страниц (Web-версия), а для Mini App-роутов допускать `web.telegram.org`.

**Fix применён.** В `next.config.ts` добавлен `Content-Security-Policy` с:

- `frame-ancestors 'self' https://web.telegram.org https://k.telegram.org` (замена X-Frame-Options, Mini App продолжает работать)
- `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`
- `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://telegram.org` (Next.js hydration + telegram-web-app.js)
- `img-src`/`connect-src` permissive (https/http) для MinIO/R2/Sentry.

Verified: header присутствует в ответе `/` и `/vacancies`, страницы загружаются 200. `unsafe-inline`/`unsafe-eval` — приемлемая уступка, полностью убрать можно позже через nonces в Next.js middleware.

### 3.7. P1 — Upload API принимает любые файлы и любой размер ✅ ИСПРАВЛЕНО (2026-07-18)

**Endpoint:** `POST /api/upload` (permission `plugin::upload.content-api.upload` есть у `authenticated`)

Подтверждено:

- `.txt` файл: загрузился → 201 (несмотря на то, что `resume.avatar` `allowedTypes: ["images"]` — эта проверка идёт при записи в relation, не при `/upload`).
- 10 MB файл: загрузился → 201 (нет лимита в конфиге).

Это позволяет authenticated-пользователю злоупотреблять S3/R2 хранилищем (расход по деньгам, доверенная точка загрузки для phishing-контента).

**Фикс:**

- Добавить `sizeLimit` в конфиг upload (`config/plugins.ts` → `upload.config.sizeLimit: 5 * 1024 * 1024`).
- Ограничить MIME на API-уровне (не только по content-type schema).

**Fix применён.** В `config/plugins.ts` добавлены `upload.config.sizeLimit: 5 MB` и `upload.config.security.allowedTypes: ['image/*']` (native mime-validation Strapi 5, читает magic bytes для detection). Verified: `.txt` → 400 «File type 'text/plain' is not allowed», 7 MB PNG → 413 PayloadTooLargeError, реальный JPG → 201. Известная граница: `.txt`-файл переименованный в `.jpg` пропускается (declared MIME по расширению совпадает с allowlist) — но браузер отдаст его с `Content-Type: image/jpeg`, XSS не выполнится.

### 3.8. P2 — In-memory счётчики (boost / apply / uniqueViews) не переживают рестарт и multi-instance ✅ ЧАСТИЧНО ИСПРАВЛЕНО (2026-07-18)

**Файлы:**

- `backend/src/api/vacancy/services/credit-service.ts:20-41` (`dailyBoosts`)
- `backend/src/api/application/services/apply-credit-service.ts:19-40` (`dailyApplies`)
- `backend/src/api/vacancy/controllers/vacancy.ts:28-37` (`viewedIPs`)
- `backend/src/api/resume/controllers/resume.ts:11-31` (`notifiedViewers`, `viewedIPs`)
- `backend/src/api/company/controllers/company.ts:9-18` (`viewedCompanyIPs`)

Задокументировано как MVP-ограничение (Sprint 6). При рестарте: сброс до 0 — user может пересдать лимит откликов/бустов. При multi-instance деплое: инстансы не синхронизируются.

**Фикс:** миграция в БД или Redis (типовая архитектура).

**Fix применён для boost/apply счётчиков.** Добавлены колонки `up_users.daily_apply_count / date`, `daily_boost_count / date` через bootstrap-миграцию (`setupDailyLimitCounters`). Новый сервис `backend/src/services/daily-limits.ts` с атомарным SQL `UPDATE ... WHERE (< limit) RETURNING new_count` — параллельные попытки безопасны. `credit-service` и `apply-credit-service` переведены на DB-backend (in-memory Map удалены). Verified:

- 5 параллельных откликов при limit=3 → 3×201 + 2×403, `daily_apply_count=3` в БД
- Счётчик персистит после рестарта (был обнулён между тестами через SQL — восстанавливался при новом запросе)

`viewedIPs`/`notifiedViewers` (просмотры + one-shot notifier для resume_viewed) **остаются in-memory** — они не аффектят лимиты плана, только точность unique-views счётчика. Полная миграция views потребует отдельной таблицы `view_events` + фонового агрегатора; вынесено в бэклог.

### 3.9. P2 — Лимиты плана хардкоднуты и не синхронизированы с БД ✅ ИСПРАВЛЕНО (2026-07-18)

**Файлы:** `credit-service.ts:3-8`, `apply-credit-service.ts:3-8`

```ts
export const PLAN_LIMITS = {
  free: { vacanciesPerMonth: 3, boostsPerDay: 3 },
  pro: { vacanciesPerMonth: 10, boostsPerDay: 10 },
  max: { vacanciesPerMonth: 50, boostsPerDay: 50 },
  vip: { vacanciesPerMonth: 50, boostsPerDay: 50 },
}
```

Одновременно `subscription_plan` в БД содержит `vacanciesPerMonth`, `vacancyBoostsPerDay`, `applicationsPerDay`. Если админ изменит план в БД — кредит-логика проигнорирует. Только `resumesLimit` читается из БД (см. `resume.ts:118-124`).

**Fix применён.** Новый сервис `backend/src/services/plan-limits.ts` — единая точка правды: читает `api::subscription-plan.subscription-plan` из БД, кеширует на 5 мин, fallback-ит на hardcoded константы если запись отсутствует / DB упала. `credit-service` (vacancy/boost) и `apply-credit-service` перешли на `await getPlanLimits(strapi, plan)`. Verified: `UPDATE subscription_plans SET applications_per_day=1 WHERE code='free'` + рестарт → следующий отклик получает `LIMIT_REACHED` с `details.limit=1` (было бы 3 при хардкоде).

### 3.10. P2 — Email confirmation `from` = `no-reply@strapi.io` ✅ ИСПРАВЛЕНО (2026-07-18)

**Файл:** `backend/src/scripts/setup-email-confirmation.ts`

Скрипт устанавливает `email_confirmation` и `email_confirmation_redirection`, но не переопределяет `email_confirmation_from_email` / `email_confirmation_from_name` в `advanced` настройках users-permissions.

**Подтверждено через Mailpit:** все три письма подтверждения пришли от `no-reply@strapi.io`, а не от `noreply@gramjob.com` (значение переменной `EMAIL_FROM`).

Не критично для функциональности, но плохо для брендинга и deliverability (may hit spam filters).

**Fix применён.** `configureEmailConfirmation` расширен: помимо `advanced.email_confirmation` также обновляет `email.reset_password.options.from` и `email.email_confirmation.options.from` из env `EMAIL_FROM` (default `noreply@gramjob.com`) + `EMAIL_FROM_NAME` (default `GramJob`). Idempotent. Verified через Mailpit: новое письмо `Account confirmation` приходит от `GramJob <noreply@gramjob.com>`.

### 3.11. P2 — Block-фильтр не применяется в `resume.findOne` и `vacancy.findOne` ✅ ИСПРАВЛЕНО (2026-07-18)

**Файлы:** `resume.ts:309-416`, `vacancy.ts:564-603`, `company.ts:239-344`

При блокировке кандидата работодатель не видит его в `/resumes` (список), но **прямая ссылка** на `/resumes/:documentId` возвращает данные. То же для `/vacancies/:id` при блокировке employer.

Так как block-фича — «скрыть из ленты», а не полный ban, это может быть by design. Стоит документировать явно в специфике.

**Fix применён.** `getBlockedIds` теперь вызывается в:

- `resume.findOne` — 404, если viewer заблокировал автора резюме
- `vacancy.findOne` — 404, если заблокирован employer или его company
- `company.findOne` и `findBySlug` — 404, если заблокирован владелец или компания

Verified: Audit блокировал candidate #14; прямой `GET /resumes/{attacker_resume}` теперь → 404 (ранее возвращал резюме).

---

## 4. Наблюдения без бага (best practice / технический долг)

### 4.1. Сообщение об устаревании драйверов

Backend log содержит повторяющиеся warnings:

- `DeprecationWarning: pg client.query() when already executing` — используется в raw SQL для FTS и counter updates. Не критично.
- `NodeVersionSupportWarning: AWS SDK v3 после января 2027 требует node >= 22`. Сейчас Node 20.16 — успеть обновить.

### 4.2. Sitemap и SEO

- `MAX_PAGES = 10 × PAGE_SIZE = 100 = 1000` — предел для sitemap. При росте датасета нужен split sitemap-index. Sprint-11+.
- Sitemap корректно содержит только `published` вакансии (backend `/vacancies` фильтрует).
- Публичные страницы отдают полные `<title>`, `og:title`, `og:description`, `twitter:card` — SEO работает.

### 4.3. Rate limiting

- Работает: 8-я попытка `/api/auth/local` возвращает 429 (лимит `10 req/min`).
- Работает на общем API (`100 req/min`) — но глобально по IP, значит корпоративные NAT-пользователи могут делить лимит. Приемлемо для MVP.

### 4.4. Ownership policies

- `is-vacancy-owner`, `is-resume-owner`, `is-company-owner` — работают: attacker получает `403 PolicyError` при PUT/POST на чужую сущность.
- `findMineById` возвращает `404` при попытке доступа к чужому — правильно.

### 4.5. Модерация workflow

- Vacancy/resume/company при create/update автоматически идут в `moderation`.
- Автопереход `applied → viewed` при первом просмотре employer — работает.
- Валидация state-transitions `application.status` — работает (нельзя `applied → hired` напрямую).
- Раскрытие telegramId работодателя при `interview+` — работает (проверено с реальным `telegramId=9999999`).

### 4.6. FTS для вакансий

- `plainto_tsquery('russian', $)` — параметризован, SQL-injection нет.
- FTS ограничен `LIMIT 10000` — задокументировано.

### 4.7. Payment webhook

- Идемпотентность через `unique telegramChargeId` — правильно.
- Webhook secret проверяется, fail-closed без переменной — правильно.
- `parseInvoicePayload` не валидирует, что все поля объединения соответствуют `type` — но так как payload генерируется бэкендом, риск низкий.

### 4.8. Frontend

- `authToken` — module-scope, но `setAuthToken` early-return на SSR → нет утечек между запросами. OK.
- `strict TypeScript` (`exactOptionalPropertyTypes: true`) — соблюдается.
- 456 тестов покрывают компоненты, stores, hooks, утилиты.

### 4.9. XSS

- Backend хранит `<script>alert(1)</script>` как есть в title/description.
- Frontend рендерит через JSX (`{v.title}`) — React автоматически escape'ит. Ручных `dangerouslySetInnerHTML` в проекте не встречено.
- Telegram bot template'ы отправляются без `parse_mode` → plain text, `<script>` не выполнится.
- Основной риск: неправильный `href` (см. §3.5).

### 4.10. Отсутствие Sentry в локальной среде

- `SENTRY_DSN` не установлен, `initSentry()` возвращает false — норма для dev.
- В production Sentry настроен (см. Sprint 10). Полезно добавить простой health-check «Sentry alive» в CI/CD.

---

## 5. Тестовые артефакты

- Локальный запуск backend: `pnpm --filter backend develop` → готов за 7.8 сек.
- Локальный запуск frontend: `pnpm --filter frontend dev` (turbopack) → готов за ~5 сек.
- Docker: `postgres:16-alpine`, `minio/minio:latest`, `axllent/mailpit:latest` — все healthy.
- Тесты запускаются из корня: `pnpm test` (backend jest + frontend vitest).

Ключевые файлы, задействованные в аудите (для быстрой навигации):

- Backend controllers: `backend/src/api/*/controllers/*.ts`
- Backend routes: `backend/src/api/*/routes/*.ts`
- Policies: `backend/src/api/{vacancy,resume,company}/policies/*.ts`
- Lifecycles: `backend/src/api/{vacancy,resume,company}/content-types/*/lifecycles.ts`
- Middlewares: `backend/src/middlewares/{telegram-auth,api-rate-limit,auth-rate-limit,rate-limit}.ts`
- Services: `backend/src/services/{notification,moderation,admin-notify,moderation-routes}.ts`
- Credit: `backend/src/api/vacancy/services/credit-service.ts`, `application/services/apply-credit-service.ts`
- Seed permissions: `backend/src/scripts/seed-permissions.ts`
- Frontend types: `frontend/src/types/api.ts`
- Frontend stores: `frontend/src/stores/*.ts`
- Frontend security: `frontend/next.config.ts`
- Sitemap: `frontend/src/app/sitemap.ts`

---

## 6. Приоритизация исправлений

| #   | Приоритет | Задача                                                                      | Затраты |
| --- | --------- | --------------------------------------------------------------------------- | ------- |
| 1   | **P0**    | Добавить 4 отсутствующих permission в `seed-permissions.ts` (§3.1)          | 15 мин  |
| 2   | **P0**    | Обернуть `POST /applications` response через `maskEmployerTelegram` (§3.2)  | 10 мин  |
| 3   | **P1**    | Unique index на `favorites (user, type, targetId)` и `blocks` (§3.3)        | 30 мин  |
| 4   | **P1**    | Валидация `salary`, `title` длины на backend (§3.4)                         | 30 мин  |
| 5   | **P1**    | Санитизация URL-схем для `website`/`linkedin`/`sourceUrl` (§3.5)            | 30 мин  |
| 6   | **P1**    | Добавить CSP + X-Frame-Options в `next.config.ts`, учесть Mini App (§3.6)   | 45 мин  |
| 7   | **P1**    | Upload size + MIME limit в `config/plugins.ts` (§3.7)                       | 15 мин  |
| 8   | **P2**    | Мигрировать boost/apply counters в БД (или Redis для multi-instance) (§3.8) | 2–4 ч   |
| 9   | **P2**    | Читать limits из `subscription_plan` таблицы, убрать хардкод (§3.9)         | 1 ч     |
| 10  | **P2**    | Прописать `email_confirmation_from_email = noreply@gramjob.com` (§3.10)     | 10 мин  |
| 11  | **P2**    | Явно решить: применять block filter в findOne или задокументировать (§3.11) | 15 мин  |

**Итого P0+P1: ~2.5–3 часа**. Все P0/P1 логически изолированы, каждая правка тривиальна для локализованного тестового покрытия.

---

## 7. Что НЕ проверено этим аудитом

- Ручное тестирование через реальный Telegram Mini App (нет доступа к боту `gramjob_bot` с dev-инстансом).
- Production-сборка frontend (`next build`) — не запускали, могут вылезти prerender-баги.
- Load-тестирование на 1000+ req/sec (проверено только 20 параллельных).
- Реальный Telegram Stars flow (нужен настроенный бот и invoice).
- Cross-browser (Safari/Firefox) — только curl.
- Cloudflare R2, Sentry, UptimeRobot, PG backup — не настроены локально (Sprint 10 остатки).
- Admin UI (Strapi Content Manager) кастомизации: только чтение исходников `src/admin/app.tsx`.

---

## 8. Заключение

Проект в состоянии, соответствующем production. **Тестовое покрытие сильное** (749 автоматизированных тестов, все зелёные). **Архитектура последовательна**: чистое разделение controllers/services/policies, MobX-store с типизированным API-клиентом, строгий TypeScript.

Найденные 11 багов — точечные, не архитектурные. **4 из них** (P0) — простые пропуски в seed-permissions и обёртке маски контактов; исправляются менее чем за час. **5 P1-багов** касаются валидации входа и security-headers; типовая работа на 2–3 часа. **P2** — MVP-ограничения, задокументированные в CLAUDE.md и sprint-plan.

Рекомендуется закрыть все P0/P1 перед публичным релизом.
