# GramJob — Development Guide

---

## Предварительные требования

- Node.js 20+ (LTS)
- pnpm 9+
- Docker + Docker Compose
- Git

---

## Структура репозитория

```
gramjob/
├── CLAUDE.md                  # AI session context
├── docs/                      # Документация проекта
├── frontend/                  # Next.js 15 приложение
│   ├── src/
│   │   ├── app/               # Next.js App Router
│   │   ├── components/        # Компоненты
│   │   │   ├── ui/            # Shadcn/UI базовые
│   │   │   ├── layout/        # AppShell, WebHeader, MiniAppBottomNav
│   │   │   └── <domain>/      # Фиче-компоненты по доменам (vacancy/, resume/, company/, ...)
│   │   ├── stores/            # MobX stores
│   │   ├── services/          # API-клиент
│   │   ├── hooks/             # React hooks
│   │   ├── lib/               # Утилиты
│   │   └── locales/           # i18next переводы
│   ├── public/
│   └── package.json
├── backend/                   # Strapi 5
│   ├── src/
│   │   ├── api/               # Content types + контроллеры
│   │   ├── extensions/        # Расширения Strapi
│   │   ├── middlewares/       # Custom middleware
│   │   └── plugins/           # Custom plugins
│   ├── config/
│   └── package.json
├── .claude/
│   ├── agents/                # Claude AI агенты
│   └── commands/              # Project skills
└── docker-compose.yml
```

---

## Локальный запуск

### 1. Клонировать и установить зависимости

```bash
git clone ...
cd gramjob
cd backend && pnpm install
cd ../frontend && pnpm install
```

### 2. Запустить инфраструктуру через Docker

```bash
docker compose up -d
# postgres (5432) + minio (9000, console 9001) + mailpit (SMTP 1025, web UI 8025)
```

### 3. Настроить ENV

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### 4. Запустить Strapi

```bash
cd backend
pnpm develop
# Strapi Admin: http://localhost:1337/admin
```

### 5. Запустить Next.js

```bash
cd frontend
pnpm dev
# http://localhost:3000
```

---

## Environment Variables

### Backend (Strapi)

```env
# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gramjob
DATABASE_USERNAME=gramjob
DATABASE_PASSWORD=secret

# Strapi
APP_KEYS=key1,key2,key3,key4
API_TOKEN_SALT=salt
ADMIN_JWT_SECRET=secret
TRANSFER_TOKEN_SALT=salt
ENCRYPTION_KEY=key
JWT_SECRET=secret

# S3 Storage (MinIO local / Cloudflare R2 prod)
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_BUCKET=
S3_ENDPOINT=           # Для не-AWS S3
S3_FORCE_PATH_STYLE=true
S3_PUBLIC_URL=         # Публичный префикс media URL (prod)
S3_PUBLIC_HOSTNAME=    # Хост media-домена для CSP (prod)

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=gramjob_bot
TELEGRAM_WEBHOOK_URL=https://api.gramjob.com/api/telegram/webhook
TELEGRAM_WEBHOOK_SECRET=secret
ADMIN_TELEGRAM_CHAT_IDS=     # Chat ID администраторов (через запятую) — уведомления о модерации
ADMIN_URL=                   # Базовый URL Strapi Admin для ссылок в уведомлениях

# Email (SMTP; локально — Mailpit из docker-compose)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@gramjob.com

# App
FRONTEND_URL=http://localhost:3000
NODE_ENV=development

# TON / USDT Payments
TON_NETWORK=testnet                # mainnet или testnet
TON_MERCHANT_ADDRESS=              # TON-адрес кошелька мерчанта
TON_PAY_WEBHOOK_SECRET=            # HMAC-SHA256 секрет для вебхука
TON_USDT_MASTER_TESTNET=           # Jetton Master в testnet (mainnet вшит)
TONAPI_KEY=                        # Tonapi.io ключ для polling (опционально)
```

### Frontend (Next.js)

```env
NEXT_PUBLIC_API_URL=http://localhost:1337/api
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_BOT_USERNAME=gramjob_bot
NEXT_PUBLIC_MINI_APP_URL=https://t.me/gramjob_bot/app

# TON Connect (USDT платежи)
NEXT_PUBLIC_TONCONNECT_MANIFEST_URL=https://gramjob.com/tonconnect-manifest.json
NEXT_PUBLIC_TONAPI_KEY=            # Tonapi.io ключ для wallet lookup (опционально)
```

---

## Соглашения по коду

### TypeScript

- Strict mode включён
- Явные типы для всех props и API ответов
- `interface` для объектов, `type` для объединений и утилитарных типов
- Zod-схемы для всей валидации форм и API ответов

### Компоненты (React)

- Функциональные компоненты с именованным экспортом
- Props-интерфейс в том же файле
- Один компонент = один файл
- Не используем `any`

```typescript
// Правильно
interface VacancyCardProps {
  vacancy: Vacancy
  onFavorite?: (id: number) => void
}

export function VacancyCard({ vacancy, onFavorite }: VacancyCardProps) { ... }
```

### MobX Stores

- `makeAutoObservable` в конструкторе
- Один store = одна предметная область (VacancyStore, AuthStore, etc.)
- Асинхронные действия через `flow` или `runInAction`
- Не хранить производные данные — использовать `computed`

```typescript
class VacancyStore {
  vacancies: Vacancy[] = []
  isLoading = false

  constructor() {
    makeAutoObservable(this)
  }

  get publishedVacancies() {
    return this.vacancies.filter((v) => v.moderationStatus === 'published')
  }

  async fetchVacancies(filters: VacancyFilters) {
    runInAction(() => {
      this.isLoading = true
    })
    const data = await api.vacancies.list(filters)
    runInAction(() => {
      this.vacancies = data
      this.isLoading = false
    })
  }
}
```

### Next.js App Router

- Server Components по умолчанию
- `'use client'` только когда нужны хуки, MobX или browser APIs
- Layouts для общих оберток
- Route Groups для организации
- Metadata API для SEO

### Именование файлов

```
components/VacancyCard/index.tsx
components/VacancyCard/VacancyCard.tsx
components/VacancyCard/VacancyCard.types.ts
stores/VacancyStore.ts
services/vacancies.ts
hooks/useVacancies.ts
```

### i18n

- Все UI-тексты через `useTranslation` / `t()`
- Ключи в формате `namespace.key` (например `vacancy.applyButton`)
- Файлы переводов: `locales/ru/common.json`, `locales/en/common.json`
- Никаких хардкодных строк в компонентах

### API Client

- Централизованный клиент в `services/api.ts`
- Zod-схемы для валидации ответов
- Типизированные ошибки

---

## Strapi Content Types

### Создание нового content type

1. Strapi Admin → Content-Type Builder
2. Или вручную: `backend/src/api/<name>/content-types/<name>/schema.json`
3. После изменений: `pnpm develop` (авто-перезапуск)
4. Обязательно документировать в `docs/database-schema.md`

### Custom routes

```
backend/src/api/<name>/routes/<name>.ts
backend/src/api/<name>/controllers/<name>.ts
backend/src/api/<name>/services/<name>.ts
```

### Lifecycle hooks

```typescript
// backend/src/api/vacancy/content-types/vacancy/lifecycles.ts
export default {
  async beforeCreate(event) { ... },
  async afterCreate(event) { ... },
}
```

---

## Тестирование

### Стратегия

- **Unit tests** — stores, утилиты, валидация (Vitest)
- **Integration tests** — API эндпоинты (Strapi test utils + real DB)
- **E2E tests** — ключевые user journeys (Playwright)

### Запуск

```bash
# Frontend unit
cd frontend && pnpm test

# Backend integration
cd backend && pnpm test

# E2E
pnpm e2e
```

### Обязательные E2E сценарии

- [ ] Telegram авторизация
- [ ] Создание и публикация вакансии
- [ ] Поиск и фильтрация вакансий
- [ ] Создание и публикация резюме
- [ ] Подача отклика
- [ ] Смена статуса отклика работодателем
- [ ] Покупка подписки (Telegram Stars тест-режим)
- [ ] Покупка подписки через USDT/TON (testnet)

---

## TON / USDT Payments

GramJob поддерживает оплату в USDT-on-TON через TON Connect как альтернативу Telegram Stars.

### Архитектура

```
Frontend (TonPaymentButton)
  → useTonPayment hook
    → POST /api/payments/ton/intent          (создать intent, получить txParams)
    → Tonapi.io                              (получить Jetton wallet адрес пользователя)
    → TonConnect sendTransaction             (пользователь подписывает jetton transfer)
    → pollIntentStatus                       (ждёт webhook или cron подтверждения)
  ← Backend (подтверждение → активация)
```

### Курс конвертации

`1 Telegram Star = $0.013 USDT`. Цена в звёздах умножается на курс для получения суммы в USDT. Курс задан константой `STARS_TO_USDT_RATE` в `backend/src/api/payment/services/ton-payment.ts` и `frontend/src/lib/ton.ts`.

### Локальная настройка (testnet)

1. Установить переменные в `backend/.env`:

   ```bash
   TON_NETWORK=testnet
   TON_MERCHANT_ADDRESS=<ваш testnet TON кошелёк>
   TON_PAY_WEBHOOK_SECRET=<случайная строка>
   TON_USDT_MASTER_TESTNET=<адрес testnet USDT Jetton Master>
   ```

2. Установить переменные в `frontend/.env.local`:

   ```bash
   NEXT_PUBLIC_TONCONNECT_MANIFEST_URL=http://localhost:3000/tonconnect-manifest.json
   ```

3. Для тестирования переводов USDT использовать [Testnet Tonkeeper](https://testnet.tonkeeper.com) или [TON testnet faucet](https://t.me/testgiver_ton_bot).

### Подтверждение транзакции

Транзакция подтверждается двумя способами (оба ведут к одному `confirmIntent`):

- **Webhook** (`POST /api/payments/ton/webhook`) — TON Pay провайдер присылает уведомление о получении USDT. Проверяется HMAC-SHA256 сигнатурой (`x-signature` заголовок).
- **Cron poller** — каждые 5 минут `tonPayPoller` запрашивает Tonapi.io по всем `processing` интентам и подтверждает завершённые транзакции. Служит fallback при недоступности webhook.

### Production setup

1. Установить `TON_NETWORK=mainnet` — адрес USDT Jetton Master для mainnet вшит в код (`EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs`).
2. Настроить TON Pay провайдер → указать URL webhook: `https://api.gramjob.com/api/payments/ton/webhook` и секрет из `TON_PAY_WEBHOOK_SECRET`.
3. Обновить `frontend/public/tonconnect-manifest.json` — проверить `url`, `name`, `iconUrl`.
4. Получить API-ключ Tonapi.io на [tonconsole.com](https://tonconsole.com) и задать `TONAPI_KEY` / `NEXT_PUBLIC_TONAPI_KEY`.

### Схема базы данных (payment)

Новые поля в таблице `payments` (миграция `2026-07-20-add-ton-fields-to-payments.js`):

| Поле         | Тип             | Описание                         |
| ------------ | --------------- | -------------------------------- |
| `provider`   | enum            | `telegram` (default) или `ton`   |
| `intentId`   | string (unique) | `gj-<uuid>` идентификатор intent |
| `usdtAmount` | double          | Сумма в USDT (6 decimal)         |
| `tonTxHash`  | string (unique) | Хэш TON транзакции               |

---

## Деплой

### Инфраструктура (Production)

```
Frontend: VPS (Next.js), gramjob.com
Backend:  VPS (Strapi + PostgreSQL), api.gramjob.com
Storage:  MinIO на VPS (план: Cloudflare R2)
CDN:      Cloudflare
```

### CI/CD (GitHub Actions)

- `ci.yml` — lint + typecheck + test на PR и push в main
- `deploy.yml` — push в main: paths-filter определяет изменённую часть (backend/frontend), деплой по SSH (`appleboy/ssh-action`) — запускает `/opt/gramjob/deploy-backend.sh` / `deploy-frontend.sh` на соответствующем VPS

### Переменные продакшн-окружения

Хранятся в GitHub Secrets (SSH-ключи, хосты) и `.env` на VPS.
Никаких .env файлов в репозитории (кроме .env.example).

---

## Полезные команды

```bash
# Strapi
pnpm strapi generate              # Генератор content type
pnpm strapi import --file backup  # Импорт данных
pnpm strapi export                # Экспорт данных

# БД
psql -U gramjob -d gramjob        # Подключиться к БД
```
