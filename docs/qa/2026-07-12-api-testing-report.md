# Отчёт о ручном тестировании API — 2026-07-12

Ручной прогон API backend↔frontend на локальном окружении (Strapi dev :1337, Next.js dev :3000, PostgreSQL + Mailpit в Docker). Тестовые пользователи: работодатель (id 10), кандидат (id 11) — данные оставлены в локальной dev-БД для воспроизведения.

## Итог

- **Найдено багов: 7** (1 критический, 3 высоких, 2 средних, 1 низкий)
- Протестировано: auth (регистрация + email-верификация, логин, профиль), company CRUD, vacancy CRUD + лимиты + FTS, resume CRUD + лимиты, applications + переходы статусов, favorites, blocks, reports, notifications, `/users/me/limits`, SSR-страницы, rate limiting, инъекции, edge-кейсы пагинации.

## Статус фиксов (2026-07-12)

Все 7 багов починены в порядке BUG-3 → BUG-1 → BUG-5+6 → BUG-2 → BUG-4 → BUG-7 и покрыты интеграционными тестами:

| Баг     | Фикс                                                                                                                                                                                        | Тесты                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| BUG-3   | raw SQL в `resume.findOne` заменён на Query Engine с relation-фильтрами (`_lnk`-таблицы Strapi 5)                                                                                           | `tests/integration/resume-view-access.test.ts` |
| BUG-1   | guard в `company.update` разрешает редактирование published (запрещено только в moderation) + `canEditCompany` на frontend                                                                  | `tests/integration/company-submit.test.ts`     |
| BUG-5+6 | `resolveOptionalUserId` (ручная верификация Bearer на `auth: false` маршрутах) в vacancy/company; блок-фильтр добавлен в `resume.findPublic`; FTS-подзапрос через `vacancies_posted_by_lnk` | `tests/integration/blocks-filter.test.ts`      |
| BUG-2   | проверка `resumesLimit` плана в `resume.create` → 403 `LIMIT_REACHED` (archived/rejected не считаются)                                                                                      | `tests/integration/resume-limit.test.ts`       |
| BUG-4   | контакты открываются при любом статусе отклика; `contacts` добавлены в `APPLICATION_POPULATE` (список откликов работодателя)                                                                | `tests/integration/resume-view-access.test.ts` |
| BUG-7   | `notFound()` в `/vacancies/[id]` и `/companies/[id]` только при HTTP 404 от API (сетевой сбой не кэширует 404); `/resumes/[id]` уже `noindex`                                               | `src/lib/server-api.test.ts`                   |

Прогоны: backend unit 276, backend integration 48, frontend 449 — все зелёные; typecheck обоих пакетов чистый. Все фиксы проверены live на dev-окружении.

---

## Баги

### BUG-1 (High) — Владелец не может редактировать компанию после создания

`PUT /companies/:id` разрешён только из статусов `draft`/`rejected`, но при авто-модерации компания создаётся сразу в `moderation`, а после одобрения — `published`. Итог: **компанию невозможно отредактировать никогда**, кроме случая отклонения модератором.

- Воспроизведение: создать компанию → одобрить → `PUT /companies/:id` → `400 Cannot edit company with status "published"`.
- Код: `backend/src/api/company/controllers/company.ts:238` — guard `existingStatus !== 'draft' && existingStatus !== 'rejected'`. При этом ниже (строка ~285) update сам ставит `moderationStatus = 'moderation'` — guard противоречит собственной логике метода.
- Для сравнения: vacancy `canEdit` = `draft|rejected|published`, resume редактируется из `published` → уходит в `moderation` (проверено). Компания — единственная сущность с этим дефектом.
- Ожидаемое поведение: разрешить редактирование из `published` (и, возможно, `moderation`), как у vacancy/resume.

### BUG-2 (Medium) — Лимит резюме плана не проверяется при создании

`POST /resumes` не проверяет лимит резюме плана (Free = 1). На Free-плане успешно создано 2 резюме (HTTP 200). При этом `GET /users/me/limits` честно возвращает `resumes.remaining: 0` — enforcement есть только в UI (прогресс-бар), на backend отсутствует.

- Код: `backend/src/api/resume/controllers/resume.ts` (create) — проверки лимита нет вовсе, в отличие от vacancy (`checkAndConsumeVacancyCredit`) и applications.

### BUG-3 (Critical) — Просмотр чужого резюме → 500, база резюме сломана

`GET /resumes/:id` для любого не-владельца возвращает **500 Internal Server Error**. Raw SQL использует FK-колонки, которых не существует: в Strapi 5 связи хранятся в `_lnk`-таблицах.

- Несуществующие колонки: `a.resume_id`, `a.vacancy_id` (реально: `applications_resume_lnk`, `applications_vacancy_lnk`), `v.posted_by_id` (реально: `vacancies_posted_by_lnk`), `r.user_id` (реально: `resumes_user_lnk`).
- Код: `backend/src/api/resume/controllers/resume.ts` — два raw-запроса в `findOne` (~239–247 — проверка входящего отклика, ~288–297 — раскрытие контактов).
- Последствия: **база резюме (ключевая фича Max/VIP) не работает ни для кого**; работодатель не может открыть резюме откликнувшегося кандидата (500 подтверждён и при наличии входящего отклика). Первый падающий запрос выполняется до plan-check, поэтому 500 получают все.
- Своя карточка (владелец) работает — ветка isOwner не выполняет raw SQL.

### BUG-4 (Medium) — Контакты кандидата не видны работодателю при отклике

По бизнес-правилам (`docs/business-logic.md`, CLAUDE.md): «Работодатель видит контакты кандидата сразу при получении отклика». Фактически:

- В `GET /vacancies/:id/applications` контакты резюме не возвращаются вовсе.
- В `resume.findOne` контакты раскрываются только при статусе отклика `in-review|interview|test-task|offer|hired` — статусы `applied`/`viewed` исключены (код ~294, тот же сломанный raw SQL из BUG-3).

Т.е. даже после фикса BUG-3 поведение не соответствует бизнес-правилу: на этапе `applied` работодатель контактов не увидит.

### BUG-5 (High) — Блокировки не скрывают контент: фильтр мёртв на публичных списках

Sprint 5 фича «блокировки скрывают вакансии/резюме/компании заблокированных» фактически не работает:

- **5a.** `GET /vacancies` и `GET /companies` объявлены `auth: false` → Strapi не популяет `ctx.state.user` даже при валидном `Authorization: Bearer` → `getBlockedUserIds` никогда не вызывается для залогиненных. Проверено: кандидат заблокировал работодателя — все его вакансии по-прежнему видны (и с `search`, и без).
- **5b.** В `resume.findPublic` (база резюме, auth есть и работал бы) блок-фильтра **нет вообще** — работодатель (Max), заблокировавший кандидата, видит его резюме. CLAUDE.md утверждает «интегрирован во все публичные endpoints» — неверно для resumes.
- Код: `backend/src/api/vacancy/routes/vacancy.ts:8`, `backend/src/api/vacancy/controllers/vacancy.ts:321` (`if (ctx.state.user)` — всегда false на этом маршруте), аналогично company; `backend/src/api/resume/controllers/resume.ts` (findPublic — фильтр отсутствует).
- Возможный фикс: оставить маршруты публичными, но резолвить пользователя опционально (например, вручную верифицировать JWT в контроллере/middleware), либо перенести фильтрацию на клиент.

### BUG-6 (High, латентный) — Block-фильтр FTS упадёт с 500 после фикса BUG-5

SQL-фрагмент block-фильтра для FTS-поиска использует несуществующую колонку `posted_by_id` таблицы `vacancies` (связь хранится в `vacancies_posted_by_lnk`):

```
ERROR:  column "posted_by_id" does not exist
```

- Код: `backend/src/api/vacancy/controllers/vacancy.ts:338` — `AND posted_by_id NOT IN (...)`, передаётся в `searchByVector`.
- Сейчас не проявляется только потому, что из-за BUG-5 `blockedUserIds` всегда пуст. Как только BUG-5 починят, любой поиск пользователя с блокировками → 500. Чинить нужно вместе.

### BUG-7 (Low, SEO) — Soft-404 на страницах карточек

`/vacancies/:id`, `/companies/:id`, `/resumes/:id` для несуществующих сущностей отдают **HTTP 200** (рендерится клиентский компонент без данных, title «Вакансия | GramJob»), а не 404. Для SEO это soft-404 — поисковики будут индексировать пустые страницы удалённых/несуществующих вакансий.

- Код: `frontend/src/app/vacancies/[id]/page.tsx` (и аналогичные) — при `!vacancy` не вызывается `notFound()` из `next/navigation`.
- Нюанс: карточка может быть недоступна публично, но существовать (владелец смотрит свой черновик через клиентский fetch) — при фиксе учесть этот сценарий.

---

## Что работает корректно (проверено)

**Auth:** регистрация → `confirmed: false` → письмо в Mailpit → подтверждение → логин; логин до подтверждения → 400; неверный пароль → 400; `/users/me` без токена → 403; PUT `/users/me` обновляет профиль, попытка записать `subscriptionPlan`/`vacancyCredits` игнорируется (эскалация невозможна); rate limiting: 429 после 10 попыток логина.

**Company:** создание → авто-`moderation`; `GET /companies/my`; публичная карточка/slug только для `published`; PUT чужим → 403; submit не из `draft|rejected` → 400; DELETE из `moderation` → 400; PUT из `rejected` → `moderation`; submit из `rejected` → `moderation`; rejection-поля в `/companies/my`.

**Vacancy:** создание с валидацией обязательных полей; авто-`moderation`; лимит Free=3 → 403 `LIMIT_REACHED` с деталями; PUT из `published` → `moderation`; boost (декремент остатка), boost/archive чужим → 403; publish (resubmit) из `rejected` → `moderation`; создание вакансии в чужой компании → 403; archive; `DELETE /vacancies/:id` = archive (by design); FTS-поиск, фильтры, populate company, счётчик views; 404 на несуществующую.

**Resume:** создание → авто-`moderation`; база резюме без Max → 403 (policy); archive чужим → 403; publish из `archived` → 400, из `rejected` → `moderation`; PUT из `published` → `moderation`, из `moderation` → 400; своя карточка с контактами.

**Applications:** создание, дубль → 409 `ALREADY_APPLIED`; `applicationsCount` инкрементится; списки кандидата/работодателя; список откликов чужим → 403; переходы статусов (`applied→viewed` ок, `viewed→hired` → 400); PATCH кандидатом → 403; дневной лимит Free=3 → 403 `LIMIT_REACHED`; отклик с чужим резюме → 403; отклик на несуществующую вакансию → 404; уведомления `new_application` работодателю созданы.

**Favorites/Blocks/Reports/Notifications:** избранное add/dup 409/list с populate entity/delete 204; self-block → 400, дубль блока → 409; жалоба с невалидной причиной → 400, валидная → 201; notifications: список, mark-read, чужое → 403, read-all; `/users/me/limits` — корректные цифры по всем 4 лимитам (включая учёт использованного).

**Frontend SSR:** все публичные страницы (/, /vacancies, /companies, /resumes, карточки, /login, /register, /subscription, /forgot-password) → 200 без error-маркеров; title вакансии в SSR HTML; sitemap.xml, robots.txt → 200; несуществующий route → 404.

**Безопасность/edge:** SQL-инъекция в FTS `search` безопасна (параметризованный `plainto_tsquery`); битый JSON → 400; `pageSize=100000` → cap 50; `page=-5` → 1.

## Примечания

- Модерация тестировалась симуляцией через прямые UPDATE в dev-БД (admin-роуты требуют admin-сессию Strapi).
- Тестовые данные (пользователи `qa_emp_*`/`qa_cand_*`, компания id 8, 7 вакансий, 2 резюме, 4 отклика, блокировки, жалоба) оставлены в локальной dev-БД.
