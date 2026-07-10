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
│   │   │   ├── forms/         # Формы с React Hook Form
│   │   │   └── features/      # Фиче-компоненты
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

### 2. Запустить PostgreSQL через Docker

```bash
docker-compose up -d postgres
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
JWT_SECRET=secret

# S3 Storage
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_REGION=
S3_BUCKET=
S3_ENDPOINT=           # Для не-AWS S3

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=GramJobBot
TELEGRAM_WEBHOOK_URL=https://api.gramjob.com/telegram/webhook

# App
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### Frontend (Next.js)

```env
NEXT_PUBLIC_API_URL=http://localhost:1337/api
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
NEXT_PUBLIC_BOT_USERNAME=GramJobBot
NEXT_PUBLIC_MINI_APP_URL=https://t.me/GramJobBot/app

# Auth
NEXTAUTH_SECRET=secret
NEXTAUTH_URL=http://localhost:3000
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
    return this.vacancies.filter((v) => v.status === 'published')
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

---

## Деплой

### Инфраструктура (Production)

```
Frontend: Vercel (Next.js)
Backend:  VPS / Hetzner / Railway (Strapi + PostgreSQL)
Storage:  Cloudflare R2 (S3-compatible)
CDN:      Cloudflare
```

### CI/CD (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
on: [push to main]
jobs:
  frontend: deploy to Vercel
  backend: deploy to server via SSH
```

### Переменные продакшн-окружения

Хранятся в GitHub Secrets / Vercel Environment Variables.
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
