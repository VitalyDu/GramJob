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

**Фаза: Проектирование.** Кода нет. Только документация.

Следующий шаг — реализация Strapi backend, затем Next.js frontend.

---

## Tech Stack

| Слой | Технология |
|------|-----------|
| Frontend | Next.js 15, React 19, TypeScript |
| State | MobX |
| Стили | TailwindCSS 4, Telegram UI, Shadcn/UI |
| Формы | React Hook Form + Zod |
| i18n | i18next (RU, EN) |
| Backend | Strapi 5 (headless CMS) |
| БД | PostgreSQL |
| Хранилище | S3-compatible |
| Auth | Telegram Login + Email/Password |
| API | REST |
| Рендеринг | SSR + ISR |
| Оплата | Telegram Stars |

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

| План | Вакансий/мес | Активных | Буст/день | Откликов/день | Резюме | База резюме | Подсветка | Цена/мес |
|------|-------------|----------|-----------|---------------|--------|-------------|-----------|----------|
| Free | 3 | 3 | 3 | 3 | 1 | ✗ | — | Бесплатно |
| Pro  | 10 | 10 | 10 | 10 | 5 | ✗ | Синяя | 299 Stars (~$6) |
| Max  | 50 | 50 | 50 | 50 | 20 | ✓ | Золотая | 999 Stars (~$20) |
| VIP  | как Max | как Max | как Max | как Max | как Max | ✓ | Золотая + бейдж | +499 Stars (~$10) |

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

| Модель | Ключевые поля |
|--------|---------------|
| User | id, email, telegramId, subscriptionPlan, vacancyCredits, applyCredits |
| Company | id, ownerId, name, slug, status |
| Vacancy | id, companyId, title, industryId, sourceType, status, expiresAt |
| Resume | id, userId, title, status |
| Application | id, vacancyId, resumeId, userId, status |
| Industry | id, name, slug |
| Specialization | id, industryId, name, slug |

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

| Файл | Содержание |
|------|-----------|
| `docs/business-logic.md` | Полная бизнес-логика, все сущности, правила |
| `docs/technical-specification.md` | Tech stack, модели данных |
| `docs/database-schema.md` | Схема БД: поля, типы, связи, индексы |
| `docs/api-specification.md` | REST API: все эндпоинты, параметры, ответы |
| `docs/subscription-system.md` | Подписки, кредиты, пакеты, платёжный флоу |
| `docs/moderation-system.md` | Воркфлоу модерации, статусы, правила |
| `docs/telegram-bot-specification.md` | Bot-команды, Mini App экраны, уведомления |
| `docs/development-guide.md` | Setup, ENV, конвенции, тесты, деплой |
| `docs/search-specification.md` | Full-text search, фильтры, SQL, GIN-индексы |
| `docs/notification-system.md` | Архитектура уведомлений, retry, rate limits, шаблоны |
| `docs/seed-data.md` | Начальные данные: industries, specializations, языки, страны |
| `docs/sprint-plan.md` | План разработки по спринтам с чеклистами задач |
| `docs/roadmap.md` | Планируемые фичи (backlog) |

---

## Агенты (.claude/agents/)

| Агент | Использовать когда |
|-------|-------------------|
| `product-manager` | Вопросы по бизнес-логике, scope, приоритеты |
| `system-architect` | Архитектурные решения, выбор подходов |
| `frontend-architect` | Next.js, React, MobX, компоненты, routing |
| `backend-architect` | Strapi, API, бизнес-логика бэкенда |
| `database-architect` | Схема, миграции, запросы, индексы |
| `telegram-miniapp-expert` | Telegram Mini App, Bot API, Stars оплата |
| `strapi-expert` | Content types, плагины, хуки, middleware |
| `qa-engineer` | Тест-стратегия, edge cases, quality |
| `security-engineer` | Auth, RBAC, уязвимости, review |
| `devops-engineer` | CI/CD, деплой, инфраструктура |

---

## Локализация

Поддержка: **RU** и **EN** через i18next.
Архитектура должна позволять добавлять языки без изменения бизнес-логики.

---

## Для следующей сессии

Этот файл даёт полный контекст. Для деталей открывать нужный doc-файл из индекса выше.
Перед реализацией любой фичи — проверять `docs/business-logic.md` на наличие бизнес-правил.
