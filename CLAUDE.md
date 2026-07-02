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

**Фаза: Разработка. Sprint 1–7 завершены (слиты в main). Следующий: Sprint 8 — Moderation.**

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

Выполнено (Sprint 4 Frontend Part 2 — Applications):

- `types/api.ts` — Application-типы: `Application`, `ApplicationStatusEnum`, `ApplicationVacancyRef`, `ApplicationResumeRef`, `ApplicationUserRef`, `ApplicationCreateInput`
- `stores/ApplicationStore.ts` — MobX стор: `createApplication` (403 LIMIT_REACHED, 409 ALREADY_APPLIED), `fetchMyApplications`, `fetchVacancyApplications`, `updateApplicationStatus`, `clearFlags` (14 тестов)
- `stores/RootStore.ts` — добавлен `application: ApplicationStore`
- `components/application/ApplicationStatusBadge.tsx` — бейдж (8 статусов)
- `components/application/ApplicationCard.tsx` — карточка (candidate mode + employer mode со сменой статусов)
- `components/application/ApplyDialog.tsx` — диалог отклика (загружает опубл. резюме, cover letter)
- `app/vacancies/[id]/VacancyDetailClient.tsx` — кнопка «Откликнуться» + ApplyDialog
- `app/dashboard/applications/page.tsx` + `MyApplicationsClient.tsx` — мои отклики (кандидат)
- `app/dashboard/vacancies/[id]/applications/page.tsx` + `VacancyApplicationsClient.tsx` — отклики на вакансию (работодатель)
- Итого: 209 тестов, 0 ошибок TypeScript

Выполнено (Sprint 5 Backend):

- Content type: Favorite (user, type: vacancy/resume/company, targetId string; uniqueness enforced в controller)
- Favorite controller: GET /favorites (paginated, type filter, block filter), POST /favorites (409 ALREADY_FAVORITED), DELETE /favorites/:type/:targetId
- Content type: SavedSearch (user, name optional, type: vacancy/resume, filters jsonb, lastNotifiedAt)
- SavedSearch controller: GET /saved-searches (paginated), POST /saved-searches, DELETE /saved-searches/:id
- Content type: Block (user, targetType: employer/candidate, targetId int; uniqueness enforced в controller)
- Block controller: GET /blocks (paginated), POST /blocks (self-block prevention, 409 ALREADY_BLOCKED), DELETE /blocks/:id
- Block filter service: `getBlockedUserIds` — интегрирован во все публичные endpoints (vacancies, resumes, companies)
- Content type: Report (reporter, type: vacancy/resume/company/user, targetId, reason: spam/fraud/inappropriate/other, comment, status: pending)
- Report controller: POST /reports (auth, валидация type + reason)
- Bug fix: FTS в vacancy findPublished не передавал block filter в searchByVector → вакансии заблокированных пользователей появлялись в FTS-результатах; исправлено передачей blockSql/blockParams в обе ветки

Выполнено (Sprint 5 Frontend):

- `types/api.ts` — Sprint 5 типы: `FavoriteType`, `FavoriteVacancyCard`, `FavoriteResumeCard`, `FavoriteCompanyCard`, `FavoriteEntity`, `Favorite`, `FavoriteCreateInput`, `SavedSearchType`, `SavedSearchFilters`, `SavedSearch`, `SavedSearchCreateInput`, `BlockTargetType`, `Block`, `BlockCreateInput`, `ReportType`, `ReportReason`, `ReportCreateInput`; добавлено поле `postedBy` в `Vacancy`
- `stores/FavoriteStore.ts` — MobX стор: `fetchFavorites` (type filter), `addFavorite` (ALREADY_FAVORITED handling), `removeFavorite`, `clearFlags`, `pageCount` (11 тестов)
- `stores/SavedSearchStore.ts` — MobX стор: `fetchSavedSearches`, `createSavedSearch` (prepend + total++), `removeSavedSearch`, `pageCount` (8 тестов)
- `stores/BlockStore.ts` — MobX стор: `fetchBlocks`, `createBlock` (ALREADY_BLOCKED handling), `removeBlock`, `clearFlags`, `pageCount` (10 тестов)
- `stores/RootStore.ts` — добавлены `favorite`, `savedSearch`, `block` stores
- `components/favorite/FavoriteButton.tsx` — кнопка ★/☆ (amber/серый), local state, auth guard
- `components/saved-search/SaveSearchButton.tsx` — inline-форма с необязательным именем, try/catch
- `components/report/ReportDialog.tsx` — модал: select причины + textarea, success state, error state
- `components/block/BlockButton.tsx` — кнопка блокировки с confirm, self-block guard, ALREADY_BLOCKED handling
- `app/dashboard/favorites/` — страница с 4 вкладками (Все/Вакансии/Резюме/Компании), рендер карточек по типу, remove, pagination
- `app/dashboard/saved-searches/` — список с badge типа, «Открыть» link (реконструкция query string из filters), «Удалить» с confirm
- `app/dashboard/blocks/` — список (Работодатель/Кандидат #id, дата), кнопка разблокировать
- `app/vacancies/VacanciesClient.tsx` — добавлена `SaveSearchButton`
- `app/resumes/ResumesClient.tsx` — добавлена `SaveSearchButton`
- `app/vacancies/[id]/VacancyDetailClient.tsx` — добавлены `FavoriteButton` + «Пожаловаться» + `BlockButton` (employer)
- `app/resumes/[id]/ResumeDetailClient.tsx` — добавлены `FavoriteButton` + «Пожаловаться» + `BlockButton` (candidate)
- `app/companies/[id]/CompanyDetailClient.tsx` — добавлены `FavoriteButton` + «Пожаловаться»
- Итого: 241 тест, 0 ошибок TypeScript

Выполнено (Sprint 6 Backend — Subscriptions & Payments):

- Content type: SubscriptionPlan (code, name, лимиты, starsPrice, durationDays) — seed при старте
- Content type: VacancyPackage (name, vacancyCredits, boostCredits, starsPrice) — seed при старте
- Content type: ApplyPackage (name, applyCredits, starsPrice) — seed при старте
- GET /subscription-plans, GET /vacancy-packages, GET /apply-packages — публичные
- User schema: добавлено поле `isVip: boolean` (default: false)
- Subscription service: `activateSubscription`, `addCredits`, `expireSubscription`, `calculateExpiresAt`, `buildUserUpdateData`
- Telegram Bot service: `createInvoiceLink`, `answerPreCheckoutQuery`, `setWebhook`, `buildInvoicePayload`, `parseInvoicePayload`
- POST /payments/subscribe — создаёт Telegram Stars invoice для подписки (pro/max/vip; VIP требует активный max)
- POST /payments/vacancy-pack, POST /payments/apply-pack — invoice для пакетов
- POST /telegram/webhook — обработчик pre_checkout_query + successful_payment; проверка TELEGRAM_WEBHOOK_SECRET
- Vacancy lifecycle beforeCreate: VIP-работодатель → highlighted=true автоматически
- Cron 02:00 UTC: истечение подписок → откат на Free + isVip=false
- Cron 09:00 UTC: предупреждение за 7 дней до истечения (TODO Sprint 7: уведомление)
- Bootstrap: seed plans + seed packages + регистрация Telegram webhook
- Итого: 189 тестов backend, 0 ошибок TypeScript

Выполнено (Sprint 6 Frontend — Subscriptions & Payments):

- `types/api.ts` — добавлены: `isVip` в User, `SubscriptionPlan`, `VacancyPackage`, `ApplyPackage`
- `lib/subscription-utils.ts` — `PLAN_LABELS`, `PLAN_COLORS`, `formatStarsPrice`, `canUpgradeToPlan`, `getPlanBadgeClasses`
- `stores/PaymentStore.ts` — MobX стор: `fetchPlans`, `fetchVacancyPackages`, `fetchApplyPackages`, `subscribeToPlan`, `buyVacancyPack`, `buyApplyPack`, `clearError`
- `stores/RootStore.ts` — добавлен `payment: PaymentStore`
- `hooks/useTelegramPayment.ts` — `openInvoice()`: Mini App WebApp.openInvoice + web fallback window.open
- `components/subscription/SubscriptionBadge.tsx` — бейдж плана с датой истечения
- `components/subscription/SubscriptionPlanCard.tsx` — карточка плана с лимитами и кнопкой покупки
- `components/subscription/PackageCard.tsx` — карточка vacancy/apply пакета
- `app/subscription/page.tsx` + `SubscriptionClient.tsx` — страница /subscription: текущий план, планы, пакеты, "Обновить статус" после оплаты
- `components/layout/WebHeader.tsx` — SubscriptionBadge рядом с Dashboard, ссылка на /subscription
- Итого: 269 тестов frontend, 0 ошибок TypeScript

Исправления после ревью Sprint 6:

- Bug fix: `isVip` добавлен в `SAFE_RESPONSE_FIELDS` (`GET /users/me` теперь возвращает поле)
- `contentTypes.d.ts`: добавлены `isVip` в PluginUsersPermissionsUser + Sprint 6 content types (SubscriptionPlan, VacancyPackage, ApplyPackage)

Выполнено (Sprint 7 Backend — Notifications & Analytics, ветка `worktree-sprint7-backend`, ещё не слита):

- Content type: Notification (16 типов), сервис `sendNotification` (БД + Telegram sendMessage)
- Telegram Bot команды, lifecycle hooks и cron tasks подключены к уведомлениям
- GET /notifications (isRead + пагинация), PATCH /notifications/:id/read, POST /notifications/read-all
- Content types: VacancyAnalytics, ResumeAnalytics + cron-агрегация
- GET /analytics/vacancies/:id, GET /analytics/resumes/:id (total + daily, только владелец)
- Детали: `docs/sprint-plan.md` (Sprint 7 Backend — все чекбоксы отмечены)

Выполнено (Sprint 7 Frontend — Notifications & Analytics, ветка `worktree-sprint7-frontend`):

- `types/api.ts` — `NotificationType` (16 типов), `NotificationData`, `Notification`, `VacancyAnalyticsResponse`, `ResumeAnalyticsResponse` (+ daily/total записи)
- `stores/NotificationStore.ts` — MobX стор: `fetchNotifications(isRead?, page)`, `fetchUnreadCount` (тихо игнорирует ошибки), `markRead`, `markAllRead`, `pageCount` (11 тестов)
- `stores/AnalyticsStore.ts` — MobX стор: `fetchVacancyAnalytics(documentId, from?, to?)`, `fetchResumeAnalytics(documentId, from?, to?)` (8 тестов)
- `stores/RootStore.ts` — добавлены `notification` + `analytics` stores
- recharts ^3.9.1 установлен
- `components/notification/NotificationBadge.tsx` — 🔔 с бейджем непрочитанных (99+ cap), в WebHeader между SubscriptionBadge и Dashboard
- `app/dashboard/notifications/` — страница уведомлений: фильтры Все/Непрочитанные/Прочитанные, иконки по типу, «Прочитано», «Прочитать все», пагинация
- `app/dashboard/vacancies/[id]/analytics/` — AreaChart (просмотры + отклики), 4 стат-карточки (views, uniqueViews, applications, CTR), date range (30 дней по умолчанию)
- `app/dashboard/resumes/[id]/analytics/` — AreaChart (просмотры + приглашения), 3 стат-карточки
- Ссылки «Аналитика» добавлены в MyVacanciesClient и MyResumesClient
- Примечание: recharts v3 типизирует `labelFormatter` как ReactNode → используется inferred-параметр + `String(v)`
- Итого: 288 тестов frontend, 0 ошибок TypeScript

Выполнено (Sprint 8 Backend — Moderation):

- Content type: ModerationLog (audit log: entityType, entityDocumentId, action, reason, comment, moderatorId/Name)
- Поля `rejectionReason` (8 причин) + `rejectionComment` добавлены в Vacancy, Resume, Company
- Report status enum: pending/resolved/dismissed (было pending/reviewed/resolved)
- `src/services/moderation-utils.ts` — причины отклонения, метки, `validateRejection`, `computeAvgProcessingHours` + тесты
- `src/services/moderation.service.ts` — `approveEntity`, `rejectEntity`, `decideReport`, `getModerationStats`, `logModeration`
- Admin-роуты (type: 'admin', policy `admin::isAuthenticatedAdmin`, регистрация в `src/index.ts` register): POST /moderation/:entityType/:documentId/approve|reject, POST /moderation/reports/:documentId/resolve|dismiss, GET /moderation/stats
- Lifecycles (vacancy/resume/company): status=moderation → лог `submitted`; status=rejected → уведомление `moderation_rejected` с причиной; vacancy published → `moderation_approved` (закрыт TODO Sprint 8)
- `buildNotificationData` — generic entityType/entityId для moderation\_\* уведомлений
- Admin UI (`src/admin/app.tsx`): Document Actions «Одобрить»/«Отклонить» (модал с причиной) для vacancy/resume/company, «Жалоба подтверждена»/«Отклонить жалобу» для report, пункт меню «Модерация» со страницей статистики (очереди + среднее время обработки + решения за 7 дней)
- Кредит при отклонении вакансии возвращается автоматически (лимит считает только moderation/published)

Выполнено (Sprint 8 Frontend — Moderation):

- `backend/src/api/vacancy/controllers/vacancy.ts` — `REJECTION_FIELDS`, `VACANCY_OWNER_CARD_FIELDS`, `VACANCY_OWNER_FULL_FIELDS`; owner-эндпоинты возвращают rejectionReason/rejectionComment
- `backend/src/api/resume/controllers/resume.ts` — `RESUME_OWNER_CARD_FIELDS`; `findMine` возвращает rejection-поля
- `backend/src/api/company/controllers/company.ts` — `findMineById` и `findMine` возвращают rejection-поля
- `frontend/src/types/api.ts` — `ModerationRejectionReason` union (8 значений); поля `rejectionReason?/rejectionComment?` добавлены в Company/Vacancy/Resume
- `frontend/src/lib/moderation-utils.ts` + тест — `REJECTION_REASON_LABELS`, `getRejectionReasonLabel()` (5 тестов)
- `frontend/src/components/moderation/RejectionNotice.tsx` + тест — блок причины отклонения с кнопками «Исправить»/«Отправить повторно» (6 тестов)
- `frontend/src/components/moderation/ModerationToastWatcher.tsx` + тест — polling `/notifications?isRead=false` раз в 60 сек, toasts для moderation_approved/rejected (4 теста)
- `frontend/src/components/layout/AppShell.tsx` — sonner `<Toaster>` + `<ModerationToastWatcher>`
- `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx` — async handlePublish + toast + RejectionNotice
- `frontend/src/app/dashboard/resumes/MyResumesClient.tsx` — async handlePublish + toast + RejectionNotice
- `frontend/src/app/dashboard/companies/MyCompaniesClient.tsx` — async handleSubmit + toast + RejectionNotice (обёртка карточки)
- `frontend/src/app/dashboard/publications/` — сводная страница «Мои публикации» (PublicationsClient + page.tsx, 5 тестов)
- `frontend/src/components/layout/WebHeader.tsx` — ссылка «Мои публикации» → `/dashboard/publications`
- `frontend/src/locales/ru/common.json` + `en/common.json` — ключ `nav.publications`
- Итого: 310 тестов frontend, 0 ошибок TypeScript

Текущий шаг — Sprint 9 (Telegram Mini App).
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
