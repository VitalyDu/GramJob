# GramJob — Sprint Plan

## Обозначения

- `[ ]` — не начато
- `[~]` — в процессе
- `[x]` — выполнено

**Длительность спринта:** 2 недели  
**Всего:** 10 спринтов (~5 месяцев до запуска)

---

## Sprint 1 — Foundation & Auth (Неделя 1–2)

Цель: рабочая инфраструктура, оба проекта запускаются локально, авторизация работает.

### DevOps

- [x] Инициализировать монорепо (backend/ + frontend/ в одном репозитории)
- [x] Docker Compose: PostgreSQL 16 + MinIO (S3-local)
- [x] `.env.example` для backend и frontend
- [x] Pre-commit hooks: ESLint + Prettier + TypeScript check
- [x] GitHub Actions: CI pipeline (lint + typecheck + test на каждый PR)

### Backend (Strapi)

- [x] Инициализировать Strapi 5 проект (`pnpm create strapi@latest`)
- [x] Подключить PostgreSQL (config/database.ts)
- [x] Настроить S3-upload plugin (MinIO local, Cloudflare R2 prod)
- [x] Middleware: Telegram initData validation (`src/middlewares/telegram-auth.ts`)
- [x] Endpoint: `POST /auth/telegram` — создать/найти пользователя по telegramId
- [x] Email/Password auth через Strapi users-permissions (out of box)
- [x] Content type: User — добавить кастомные поля (subscriptionPlan, vacancyCredits, applyCredits, telegramId, language)
- [x] Endpoint: `GET /users/me`
- [x] Endpoint: `PUT /users/me`
- [x] Rate limiting middleware (koa-ratelimit)

### Frontend (Next.js)

- [x] Инициализировать Next.js 15 (`create-next-app`, App Router, TypeScript strict)
- [x] Настроить TailwindCSS 4
- [x] Установить Telegram UI + Shadcn/UI (базовые компоненты)
- [x] Настроить MobX: RootStore + StoreProvider
- [x] Настроить i18next (RU/EN, `useTranslation`, переводы в `locales/`)
- [x] API-клиент: типизированный fetch-wrapper с JWT в header
- [x] AuthStore: login, logout, refresh, persist
- [x] Страница: Telegram Login Widget (Web)
- [x] Страница: Email Login/Register форма (React Hook Form + Zod)
- [x] Telegram Mini App init: `tg.ready()`, `tg.expand()`, определение контекста
- [x] Layout: базовый shell (header/nav для Web, bottom-nav для Mini App)

---

## Sprint 2 — Categories & Companies (Неделя 3–4)

Цель: работодатель может создать компанию и отправить на модерацию.

### Backend

- [x] Content type: Industry (`id, name{ru,en}, slug`)
- [x] Content type: Specialization (`id, industryId, name{ru,en}, slug`)
- [x] Seed: заполнить industries и specializations (список из `docs/seed-data.md`)
- [x] `GET /industries` — с populate specializations
- [x] Content type: Company (все поля по схеме)
- [ ] `POST /companies` — создать (статус draft)
- [ ] `POST /companies/:id/submit` — draft → moderation
- [ ] `GET /companies` — список published (search + country фильтр + пагинация)
- [ ] `GET /companies/:id` — публичная карточка
- [ ] `GET /companies/slug/:slug` — по slug
- [ ] `PUT /companies/:id` — обновить (policy: is-company-owner)
- [ ] `DELETE /companies/:id` — проверка нет активных вакансий
- [ ] `GET /companies/my` — мои компании (все статусы)
- [ ] Lifecycle hook: Company afterUpdate(published) → Notification пользователю
- [ ] Policy: `is-company-owner`

### Frontend

- [ ] CompanyStore: список, текущая компания, CRUD-методы
- [ ] Страница: `/companies` — список с поиском и фильтром по стране
- [ ] Компонент: CompanyCard (лого, название, статус, размер, страна)
- [ ] Страница: `/companies/:id` — полная карточка компании
- [ ] Страница: `/dashboard/companies` — мои компании (список + статусы)
- [ ] Форма: создать/редактировать компанию (все поля, загрузка логотипа)
- [ ] Статус-badge: draft / на модерации / опубликована / отклонена + причина

---

## Sprint 3 — Vacancies (Неделя 5–6)

Цель: публикация вакансии с учётом лимитов, поиск и фильтрация работают.

### Backend

- [ ] Content type: Vacancy (все поля)
- [ ] Content type: VacancySource (для external-вакансий)
- [ ] `POST /vacancies` — создать (статус draft)
- [ ] `POST /vacancies/:id/publish` — draft → moderation + проверка лимитов
- [ ] Сервис: `checkAndConsumeVacancyCredit(userId)` — кредиты пакета → лимит плана → LIMIT_REACHED
- [ ] `GET /vacancies` — поиск с полным набором фильтров + сортировка (see api-spec)
- [ ] `GET /vacancies/:id` — карточка (инкремент views + uniqueViews по IP)
- [ ] `PUT /vacancies/:id` — обновить (owner, переводит published → draft)
- [ ] `POST /vacancies/:id/boost` — буст (проверка vacancyBoostsPerDay)
- [ ] `POST /vacancies/:id/archive` — архивировать
- [ ] `GET /vacancies/my` — мои вакансии (все статусы)
- [ ] Full-text search: PostgreSQL `tsvector` индекс на title + description (миграция)
- [ ] Cron (ежечасно): Vacancy: expiresAt < now → status expired + уведомление

### Frontend

- [ ] VacancyStore: список/фильтры, текущая, CRUD
- [ ] Страница: `/vacancies` — поиск (панель фильтров + список + infinite scroll)
- [ ] Компонент: VacancyCard (все варианты: highlighted, urgent, top, external)
- [ ] Компонент: VacancyFilters (все фильтры из api-spec)
- [ ] Страница: `/vacancies/:id` — полная карточка (Apply / Apply on Source)
- [ ] Страница: `/dashboard/vacancies` — мои вакансии + управление (буст, архив)
- [ ] Форма: создать/редактировать вакансию (все поля, skills/languages теги)
- [ ] Компонент: LimitBar — `N/M вакансий использовано`, сброс через N дней
- [ ] Обработка ошибки `LIMIT_REACHED` → upsell-модал

---

## Sprint 4 — Resumes & Applications (Неделя 7–8)

Цель: кандидат откликается на вакансию, работодатель управляет откликами, контакты скрыты до одобрения.

### Backend

- [ ] Content type: Resume + Strapi Components: WorkExperience, Education
- [ ] `POST /resumes` — создать
- [ ] `POST /resumes/:id/publish` — draft → moderation
- [ ] `GET /resumes` — база резюме (только Max-план, policy: requires-max-plan)
- [ ] `GET /resumes/:id` — карточка (контакты = null если нет одобренного отклика)
- [ ] `PUT /resumes/:id` — обновить (owner)
- [ ] `GET /resumes/my` — мои резюме
- [ ] Content type: Application
- [ ] `POST /applications` — подать отклик (уникальность + лимит откликов)
- [ ] Сервис: `checkAndConsumeApplyCredit(userId)` — апплай-кредиты → суточный лимит → LIMIT_REACHED
- [ ] `GET /applications` — мои отклики (как кандидата)
- [ ] `GET /vacancies/:id/applications` — отклики на мою вакансию (как employer)
- [ ] `PATCH /applications/:id` — смена статуса (employer + валидация допустимых переходов)
- [ ] Lifecycle hook: Application создан → Notification работодателю (NewApplication)
- [ ] Lifecycle hook: Application статус изменён → Notification кандидату
- [ ] Policy: `requires-max-plan` для GET /resumes

### Frontend

- [ ] ResumeStore + ApplicationStore
- [ ] Страница: `/resumes` — база резюме (только для Max, поиск + фильтры)
- [ ] Страница: `/resumes/:id` — карточка резюме (контакты скрыты/открыты)
- [ ] Страница: `/dashboard/resumes` — мои резюме (список + статусы)
- [ ] Форма: создать/редактировать резюме (опыт + образование — динамические секции)
- [ ] Страница: `/dashboard/applications` — мои отклики (кандидат) — timeline статусов
- [ ] Страница: `/dashboard/vacancies/:id/applications` — отклики на вакансию (employer)
- [ ] Компонент: ApplicationCard + статус-badge
- [ ] Диалог: форма отклика (выбор резюме + cover letter)
- [ ] Компонент: ApplicationKanban или список с быстрой сменой статуса

---

## Sprint 5 — Favorites, Saved Searches, Reports & Blocks (Неделя 9–10)

Цель: пользователь может сохранять избранное, подписываться на поисковые запросы, жаловаться и блокировать.

### Backend

- [ ] Content type: Favorite (уникальный constraint на user+type+targetId)
- [ ] `GET/POST/DELETE /favorites` — CRUD
- [ ] Content type: SavedSearch
- [ ] `GET/POST/DELETE /saved-searches` — CRUD
- [ ] Cron (каждые 2ч): для каждого SavedSearch → запустить поиск → новые результаты → Telegram уведомление
- [ ] Content type: Block (уникальный constraint на user+targetId)
- [ ] `GET/POST/DELETE /blocks` — CRUD
- [ ] Middleware: фильтровать заблокированные сущности из /vacancies и /companies ответов
- [ ] Content type: Report
- [ ] `POST /reports` — создать жалобу

### Frontend

- [ ] Кнопка ♥ «В избранное» на VacancyCard, ResumeCard, CompanyCard
- [ ] Страница: `/dashboard/favorites` — три вкладки (вакансии / резюме / компании)
- [ ] Кнопка «Сохранить поиск» в панели фильтров (с именем)
- [ ] Страница: `/dashboard/saved-searches` — список с управлением
- [ ] Диалог: «Пожаловаться» (тип + причина + комментарий)
- [ ] Кнопка «Заблокировать работодателя» на карточке компании/вакансии
- [ ] Страница: `/dashboard/blocks` — список заблокированных

---

## Sprint 6 — Subscriptions & Payments (Неделя 11–12)

Цель: полный платёжный цикл через Telegram Stars работает end-to-end.

### Backend

- [ ] Content type: SubscriptionPlan — seed (Free, Pro 299★, Max 999★, VIP +499★)
- [ ] Content type: VacancyPackage — seed (10/20/50/100 вакансий)
- [ ] Content type: ApplyPackage — seed (50/100/500 откликов)
- [ ] `GET /subscription-plans` — список с ценами
- [ ] `GET /vacancy-packages` — список пакетов вакансий
- [ ] `GET /apply-packages` — список пакетов откликов
- [ ] Telegram Bot: инициализировать (Bot API, установить webhook)
- [ ] `POST /payments/subscribe` → sendInvoice (Stars) → вернуть invoice link
- [ ] `POST /payments/vacancy-pack` → sendInvoice → invoice link
- [ ] `POST /payments/apply-pack` → sendInvoice → invoice link
- [ ] `POST /telegram/webhook` — обработать `pre_checkout_query` (answerPreCheckoutQuery)
- [ ] `POST /telegram/webhook` — обработать `successful_payment` → активировать план/кредиты
- [ ] Сервис: `activateSubscription(userId, planCode)` — обновить план + expiresAt
- [ ] Сервис: `addCredits(userId, type, amount)` — добавить vacancyCredits или applyCredits
- [ ] Cron (ежедневно): за 7 дней до истечения → Notification пользователю
- [ ] VIP Employer: флаг `User.isVip`, автопроставление `Vacancy.highlighted` для VIP-работодателей

### Frontend

- [ ] SubscriptionStore
- [ ] Страница: `/subscription` — сравнение планов (таблица) + кнопки купить
- [ ] Страница: `/subscription/packages` — пакеты вакансий + откликов
- [ ] Компонент: PlanCard (features list, цена, CTA, текущий план выделен)
- [ ] Обработка `LIMIT_REACHED` → UpsellModal (с deeplink на подписку)
- [ ] Индикатор плана + кредитов в профиле/хедере
- [ ] Открытие Telegram Stars платёжного экрана (tg.openInvoice или window.open)

---

## Sprint 7 — Notifications & Analytics (Неделя 13–14)

Цель: все Telegram-уведомления отправляются, аналитика собирается и отображается.

### Backend

- [ ] Content type: Notification
- [ ] Сервис: `sendNotification(userId, type, data)` — создать запись в БД + sendMessage в Telegram
- [ ] Telegram Bot: команды `/start`, `/help`, `/profile`, `/notifications`
- [ ] Все lifecycle hooks подключены к sendNotification (по списку из telegram-bot-specification.md)
- [ ] `GET /notifications` — список (фильтр isRead + пагинация)
- [ ] `PATCH /notifications/:id/read`
- [ ] `POST /notifications/read-all`
- [ ] Content type: VacancyAnalytics
- [ ] Content type: ResumeAnalytics
- [ ] Cron (ежедневно 01:00 UTC): агрегация аналитики за вчера
- [ ] `GET /analytics/vacancies/:id` — аналитика вакансии (total + daily breakdown)
- [ ] `GET /analytics/resumes/:id` — аналитика резюме

### Frontend

- [ ] NotificationStore
- [ ] Страница: `/dashboard/notifications` — список + mark read
- [ ] Компонент: NotificationBadge — счётчик непрочитанных в навигации
- [ ] Страница: `/dashboard/vacancies/:id/analytics` — графики (recharts или chart.js)
- [ ] Страница: `/dashboard/resumes/:id/analytics` — просмотры + приглашения по дням

---

## Sprint 8 — Moderation (Неделя 15–16)

Цель: модераторы могут обрабатывать очередь в Strapi Admin, пользователи видят результат.

### Backend (Strapi Admin)

- [ ] Кастомный список «На модерации»: фильтр `status=moderation` для Vacancy/Resume/Company
- [ ] Кастомные actions в Admin: «Одобрить» (→ published + set expiresAt для вакансий)
- [ ] Кастомные actions в Admin: «Отклонить» (select причины → rejected + Notification)
- [ ] При одобрении Vacancy: `expiresAt = now + 60 days`
- [ ] Очередь жалоб: Report список в Admin с действиями (resolve/dismiss/take action)
- [ ] Audit log: кто, когда, какое решение (через Strapi lifecycle + отдельная таблица или log)
- [ ] Страница модератора: статистика (сколько в очереди, среднее время обработки)

### Frontend

- [ ] Индикатор статуса модерации на карточках (pending / rejected + причина)
- [ ] Страница: «Мои публикации» — статус с объяснением что делать при отклонении
- [ ] Кнопка «Исправить и отправить повторно» (переводит в draft → edit → submit)
- [ ] Уведомление в UI (toast) о смене статуса модерации

---

## Sprint 9 — Telegram Mini App (Неделя 17–18)

Цель: приложение полноценно работает внутри Telegram с нативным UX.

### Backend

- [ ] Все существующие endpoints принимают initData auth (не только JWT)
- [ ] Deep link routing: `startapp=vacancy_123` → `/vacancies/123`
- [ ] Deep link routing: `startapp=application_456` → `/dashboard/applications/456`

### Frontend

- [ ] Контекст-детектор: `isTelegramMiniApp()` — разный layout и поведение
- [ ] Адаптация layout: убрать браузерный header, добавить Mini App toolbar
- [ ] `tg.MainButton` на всех экранах с основным действием
- [ ] `tg.BackButton` на всех вложенных экранах (заменяет ← браузера)
- [ ] `tg.HapticFeedback` на кнопках и успешных действиях
- [ ] CSS: адаптация под `--tg-theme-*` переменные (light + dark)
- [ ] Bottom navigation bar для Mini App (вакансии / избранное / отклики / профиль)
- [ ] Платёжный флоу: `tg.openInvoice()` вместо window.open
- [ ] QA: полный прогон всех флоу внутри Telegram (iOS + Android + Desktop)
- [ ] `tg.setHeaderColor()` + `tg.setBackgroundColor()` для брендинга

---

## Sprint 10 — SEO, Performance & Launch (Неделя 19–20)

Цель: производительность ≥ 90 Lighthouse, всё развёрнуто в production.

### SEO & Performance

- [ ] Metadata API: динамические title/description/OG для vacancy, company, resume страниц
- [ ] ISR: `revalidate = 3600` для списков вакансий, `revalidate = 300` для карточек
- [ ] `sitemap.xml`: динамический (published vacancies + companies)
- [ ] `robots.txt`: закрыть dashboard/\*, открыть /vacancies, /companies
- [ ] Lighthouse audit: добиться ≥ 90 по всем метрикам
- [ ] `next/image` на всех изображениях (лого компаний, аватары)
- [ ] Bundle analysis (`@next/bundle-analyzer`): устранить тяжёлые зависимости
- [ ] Preload критических шрифтов (`next/font`)

### DevOps & Launch

- [ ] Strapi: деплой на VPS (Hetzner CX21), PM2, systemd
- [ ] Nginx: reverse proxy для api.gramjob.com + SSL (certbot)
- [ ] Next.js: деплой на Vercel, production ENV variables
- [ ] Cloudflare R2: настроить как production S3 (перенести медиа)
- [ ] Telegram Bot: установить webhook на production URL
- [ ] Sentry: подключить frontend (next.js) + backend (Strapi)
- [ ] UptimeRobot: мониторинг api.gramjob.com + gramjob.com
- [ ] PostgreSQL backup: ежедневный cron → R2
- [ ] GitHub Actions: автодеплой backend (SSH) + frontend (Vercel trigger)
- [ ] Smoke tests: пройти все критические флоу в production

---

## Backlog (после запуска)

- [ ] Внешние вакансии: парсер (по `docs/vacancy-parser.md`)
- [ ] Saved Search алерты через email (дайджест)
- [ ] PDF-экспорт резюме
- [ ] AI-matching вакансий и резюме (из roadmap.md)
- [ ] Company Reviews
- [ ] Verified Badge для компаний
- [ ] Recruiter CRM (kanban-доска)
