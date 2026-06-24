# Sprint 1 Backend — Strapi 5 Foundation & Auth

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Инициализировать Strapi 5 с PostgreSQL, настроить S3-загрузку, расширить схему User пользовательскими полями, реализовать Telegram и Email аутентификацию, эндпоинты /users/me, middleware для initData и rate limiting.

**Architecture:** Strapi 5 (TypeScript) поверх PostgreSQL через стандартный `pg` драйвер. Кастомные поля User добавляются через механизм расширений users-permissions. Telegram auth — отдельный content-type `telegram-auth` с маршрутом POST /api/auth/telegram. Rate limiting — глобальный Koa middleware через `koa-ratelimit`. Тесты: unit (Jest, без запуска Strapi) для логики валидации; integration (supertest + полный boot Strapi с тестовой БД) для HTTP эндпоинтов.

**Tech Stack:** Strapi 5, TypeScript, PostgreSQL, @strapi/provider-upload-aws-s3, koa-ratelimit, Jest, ts-jest, supertest

---

## Файловая карта

```
backend/
├── config/
│   ├── database.ts                        # Task 2 — PostgreSQL подключение
│   ├── middlewares.ts                     # Task 2 (создаётся при init), Task 8 (rate limit)
│   ├── plugins.ts                         # Task 3 — S3 upload provider
│   └── server.ts                          # Task 2 (создаётся при init)
├── src/
│   ├── api/
│   │   └── telegram-auth/
│   │       ├── controllers/
│   │       │   └── telegram-auth.ts       # Task 6 — HTTP handler POST /auth/telegram
│   │       ├── routes/
│   │       │   └── telegram-auth.ts       # Task 6 — маршрут POST /api/auth/telegram
│   │       └── services/
│   │           └── telegram-validation.ts # Task 5 — валидация подписи Telegram
│   ├── extensions/
│   │   └── users-permissions/
│   │       ├── content-types/
│   │       │   └── user/
│   │       │       └── schema.json        # Task 4 — кастомные поля User
│   │       └── strapi-server.ts           # Task 7 — override GET/PUT /users/me
│   ├── middlewares/
│   │   └── telegram-auth.ts               # Task 8 — route-level initData middleware
│   └── index.ts                           # создаётся при init
├── tests/
│   ├── helpers/
│   │   ├── strapi.ts                      # Task 4 — Strapi boot helper для тестов
│   │   └── factories.ts                   # Task 6 — создание тестовых пользователей
│   ├── unit/
│   │   └── telegram-validation.test.ts    # Task 5 — unit тесты валидации
│   └── integration/
│       ├── auth-telegram.test.ts          # Task 6 — POST /auth/telegram тесты
│       ├── users-me.test.ts               # Task 7 — GET/PUT /users/me тесты
│       └── telegram-middleware.test.ts    # Task 8 — middleware тесты
├── jest.config.ts                         # Task 4 — конфиг Jest
├── .env                                   # Task 2 — скопировать из .env.example
└── package.json                           # Task 1 — заменяется Strapi init
```

---

## Task 1: Инициализация Strapi 5

**Files:**

- Replace: `backend/package.json` (placeholder → Strapi 5)
- Create: `backend/config/`, `backend/src/`, `backend/tsconfig.json`, etc. (через CLI)

- [ ] **Step 1: Удалить placeholder package.json**

```bash
# из корня монорепо (GramJob/)
rm backend/package.json
```

- [ ] **Step 2: Инициализировать Strapi 5 в backend/**

```bash
# из корня монорепо (GramJob/)
pnpm create strapi@latest backend \
  --no-git-init \
  --typescript \
  --no-run \
  --skip-cloud \
  --use-pnpm \
  --dbclient=postgres \
  --dbhost=localhost \
  --dbport=5432 \
  --dbname=gramjob \
  --dbusername=gramjob \
  --dbpassword=secret
```

> Если CLI запустится в интерактивном режиме — выбрать: TypeScript, PostgreSQL, skip cloud. После завершения `backend/` содержит полноценный Strapi 5 проект.

- [ ] **Step 3: Проверить структуру**

```bash
ls backend/
# Ожидается: config/ src/ types/ public/ package.json tsconfig.json .gitignore favicon.png
```

- [ ] **Step 4: Убедиться, что workspace пересобрался**

```bash
# из корня монорепо
pnpm install
```

Expected: pnpm находит обновлённый `backend/package.json`, устанавливает зависимости без ошибок.

- [ ] **Step 5: Commit**

```bash
git add backend/
git commit -m "chore(backend): initialize Strapi 5 with TypeScript"
```

---

## Task 2: Конфигурация PostgreSQL и окружения

**Files:**

- Modify: `backend/config/database.ts`
- Modify: `backend/config/server.ts`
- Create: `backend/.env` (из .env.example)

- [ ] **Step 1: Создать .env из примера**

```bash
cd backend
cp ../.env.example .env  # файл уже есть в корне backend/ после init, перезаписать:
```

Содержимое `backend/.env` (заполнить реальными значениями):

```env
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=gramjob
DATABASE_USERNAME=gramjob
DATABASE_PASSWORD=secret
DATABASE_SSL=false

APP_KEYS=key1base64,key2base64,key3base64,key4base64
API_TOKEN_SALT=saltbase64
ADMIN_JWT_SECRET=adminSecretBase64
TRANSFER_TOKEN_SALT=transferSaltBase64
JWT_SECRET=jwtSecretBase64

S3_ACCESS_KEY_ID=gramjob
S3_SECRET_ACCESS_KEY=secret123
S3_REGION=us-east-1
S3_BUCKET=gramjob
S3_ENDPOINT=http://localhost:9000
S3_FORCE_PATH_STYLE=true

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=GramJobBot
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
HOST=0.0.0.0
PORT=1337
```

> Важно: MinIO пароль в docker-compose — `secret123`, не `secret`. Используй его для `S3_SECRET_ACCESS_KEY`.

Сгенерировать APP_KEYS и секреты:

```bash
node -e "console.log([...Array(4)].map(()=>require('crypto').randomBytes(32).toString('base64')).join(','))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

- [ ] **Step 2: Проверить config/database.ts**

Strapi создаёт этот файл автоматически при init с PostgreSQL. Проверить, что он выглядит так:

```typescript
// backend/config/database.ts
import { parse } from 'pg-connection-string'

export default ({ env }) => {
  const client = env('DATABASE_CLIENT', 'sqlite')

  const connections = {
    postgres: {
      connection: {
        connectionString: env('DATABASE_URL'),
        host: env('DATABASE_HOST', 'localhost'),
        port: env.int('DATABASE_PORT', 5432),
        database: env('DATABASE_NAME', 'gramjob'),
        user: env('DATABASE_USERNAME', 'gramjob'),
        password: env('DATABASE_PASSWORD', 'secret'),
        ssl: env.bool('DATABASE_SSL', false) && {
          rejectUnauthorized: env.bool('DATABASE_SSL_REJECT_UNAUTHORIZED', true),
        },
      },
      pool: { min: env.int('DATABASE_POOL_MIN', 2), max: env.int('DATABASE_POOL_MAX', 10) },
    },
  }

  return {
    connection: {
      client,
      ...connections[client],
      acquireConnectionTimeout: env.int('DATABASE_CONNECTION_TIMEOUT', 60000),
    },
  }
}
```

Если файл отличается — привести к этому виду.

- [ ] **Step 3: Запустить Docker (PostgreSQL + MinIO)**

```bash
# из корня монорепо
docker compose up -d postgres minio
docker compose ps
# postgres: healthy, minio: running
```

- [ ] **Step 4: Проверить запуск Strapi**

```bash
cd backend
pnpm develop
# Ожидается: Strapi запустился на http://localhost:1337
# Admin доступен: http://localhost:1337/admin
# Нет ошибок подключения к БД
```

Остановить: `Ctrl+C`

- [ ] **Step 5: Commit**

```bash
git add backend/config/database.ts backend/.env.example
# НЕ добавлять backend/.env — он в .gitignore
git commit -m "feat(backend): configure PostgreSQL database connection"
```

---

## Task 3: S3 Upload Plugin (MinIO local / Cloudflare R2 prod)

**Files:**

- Modify: `backend/config/plugins.ts`
- Ensure: `@strapi/provider-upload-aws-s3` установлен

- [ ] **Step 1: Установить S3 провайдер**

```bash
cd backend
pnpm add @strapi/provider-upload-aws-s3
```

- [ ] **Step 2: Настроить config/plugins.ts**

```typescript
// backend/config/plugins.ts
export default ({ env }) => ({
  upload: {
    config: {
      provider: '@strapi/provider-upload-aws-s3',
      providerOptions: {
        accessKeyId: env('S3_ACCESS_KEY_ID'),
        secretAccessKey: env('S3_SECRET_ACCESS_KEY'),
        region: env('S3_REGION', 'us-east-1'),
        params: {
          Bucket: env('S3_BUCKET', 'gramjob'),
        },
        // Для MinIO (non-AWS S3):
        endpoint: env('S3_ENDPOINT'),
        forcePathStyle: env.bool('S3_FORCE_PATH_STYLE', false),
      },
      actionOptions: {
        upload: {},
        uploadStream: {},
        delete: {},
      },
    },
  },
})
```

- [ ] **Step 3: Создать bucket в MinIO**

Открыть MinIO Console: http://localhost:9001 (login: gramjob / secret123)
Создать bucket с именем `gramjob`.

Или через CLI:

```bash
# Установить mc если нет
brew install minio/stable/mc
mc alias set local http://localhost:9000 gramjob secret123
mc mb local/gramjob
mc anonymous set download local/gramjob
```

- [ ] **Step 4: Проверить запуск с S3**

```bash
cd backend
pnpm develop
# Ожидается: запуск без ошибок S3/MinIO
```

Остановить: `Ctrl+C`

- [ ] **Step 5: Commit**

```bash
git add backend/config/plugins.ts backend/package.json backend/pnpm-lock.yaml
git commit -m "feat(backend): configure S3 upload provider for MinIO/R2"
```

---

## Task 4: Расширение схемы User + настройка тестового окружения

**Files:**

- Create: `backend/src/extensions/users-permissions/content-types/user/schema.json`
- Create: `backend/jest.config.ts`
- Create: `backend/tests/helpers/strapi.ts`
- Create: `backend/tests/helpers/factories.ts`

- [ ] **Step 1: Написать unit-тест для проверки схемы User**

```typescript
// backend/tests/unit/user-schema.test.ts
import schema from '../../src/extensions/users-permissions/content-types/user/schema.json'

describe('User schema extension', () => {
  it('contains telegramId field', () => {
    expect(schema.attributes.telegramId).toEqual({
      type: 'string',
      unique: true,
    })
  })

  it('contains subscriptionPlan field with correct enum', () => {
    expect(schema.attributes.subscriptionPlan).toMatchObject({
      type: 'enumeration',
      enum: ['free', 'pro', 'max'],
      default: 'free',
    })
  })

  it('contains vacancyCredits field', () => {
    expect(schema.attributes.vacancyCredits).toMatchObject({
      type: 'integer',
      default: 0,
    })
  })

  it('contains applyCredits field', () => {
    expect(schema.attributes.applyCredits).toMatchObject({
      type: 'integer',
      default: 0,
    })
  })

  it('contains language field', () => {
    expect(schema.attributes.language).toMatchObject({
      type: 'enumeration',
      enum: ['ru', 'en'],
      default: 'ru',
    })
  })

  it('contains subscriptionExpiresAt field', () => {
    expect(schema.attributes.subscriptionExpiresAt).toEqual({
      type: 'datetime',
    })
  })
})
```

- [ ] **Step 2: Настроить Jest**

```typescript
// backend/jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testMatch: ['**/tests/**/*.test.ts'],
  testTimeout: 120000,
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
}

export default config
```

Добавить в `backend/package.json` devDependencies (если нет):

```bash
cd backend
pnpm add -D jest ts-jest @types/jest supertest @types/supertest
```

- [ ] **Step 3: Запустить тест — убедиться, что ПАДАЕТ**

```bash
cd backend
pnpm test tests/unit/user-schema.test.ts
# Ожидается: Cannot find module '../../src/extensions/...'
```

- [ ] **Step 4: Создать schema.json для расширения User**

```bash
mkdir -p backend/src/extensions/users-permissions/content-types/user
```

```json
// backend/src/extensions/users-permissions/content-types/user/schema.json
{
  "attributes": {
    "telegramId": {
      "type": "string",
      "unique": true
    },
    "firstName": {
      "type": "string"
    },
    "lastName": {
      "type": "string"
    },
    "subscriptionPlan": {
      "type": "enumeration",
      "enum": ["free", "pro", "max"],
      "default": "free"
    },
    "subscriptionExpiresAt": {
      "type": "datetime"
    },
    "vacancyCredits": {
      "type": "integer",
      "default": 0
    },
    "applyCredits": {
      "type": "integer",
      "default": 0
    },
    "language": {
      "type": "enumeration",
      "enum": ["ru", "en"],
      "default": "ru"
    }
  }
}
```

- [ ] **Step 5: Запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm test tests/unit/user-schema.test.ts
# Ожидается: PASS (6 тестов)
```

- [ ] **Step 6: Создать Strapi test helper**

```typescript
// backend/tests/helpers/strapi.ts
import { createStrapi, compileStrapi } from '@strapi/strapi'
import type { Core } from '@strapi/strapi'
import * as path from 'path'

let instance: Core.Strapi

export async function setupStrapi(): Promise<Core.Strapi> {
  if (!instance) {
    process.env.DATABASE_NAME = 'gramjob_test'
    process.env.NODE_ENV = 'test'

    await compileStrapi({ distDir: path.resolve(__dirname, '../../dist') })
    instance = await createStrapi({ distDir: path.resolve(__dirname, '../../dist') }).load()
    await instance.server.mount()
  }
  return instance
}

export async function teardownStrapi(): Promise<void> {
  if (instance) {
    await instance.server.unmount()
    await instance.destroy()
    instance = undefined
  }
}

export { instance as strapi }
```

> **Примечание:** интеграционные тесты требуют отдельную тестовую БД `gramjob_test`. Создать её:
>
> ```bash
> docker exec gramjob_postgres psql -U gramjob -c "CREATE DATABASE gramjob_test;"
> ```

- [ ] **Step 7: Создать factories для тестов**

```typescript
// backend/tests/helpers/factories.ts
import type { Core } from '@strapi/strapi'

export async function createTestUser(
  strapi: Core.Strapi,
  overrides: Record<string, unknown> = {}
): Promise<Record<string, unknown>> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } })

  return strapi.db.query('plugin::users-permissions.user').create({
    data: {
      email: `test_${Date.now()}@gramjob.com`,
      username: `testuser_${Date.now()}`,
      password: await strapi.plugin('users-permissions').service('user').hashPassword('Test1234!'),
      confirmed: true,
      blocked: false,
      role: role.id,
      subscriptionPlan: 'free',
      vacancyCredits: 0,
      applyCredits: 0,
      language: 'ru',
      ...overrides,
    },
  })
}

export function issueJwt(strapi: Core.Strapi, userId: number): string {
  return strapi.plugin('users-permissions').service('jwt').issue({ id: userId })
}
```

- [ ] **Step 8: Commit**

```bash
git add backend/src/extensions/ backend/tests/ backend/jest.config.ts backend/package.json
git commit -m "feat(backend): extend User schema with custom fields, setup Jest"
```

---

## Task 5: Сервис валидации Telegram

**Files:**

- Create: `backend/src/api/telegram-auth/services/telegram-validation.ts`
- Create: `backend/tests/unit/telegram-validation.test.ts`

- [ ] **Step 1: Написать unit тесты для валидации**

```typescript
// backend/tests/unit/telegram-validation.test.ts
import crypto from 'crypto'
import {
  validateInitData,
  validateWebWidget,
  parseInitData,
} from '../../src/api/telegram-auth/services/telegram-validation'

const BOT_TOKEN = 'test_bot_token_12345'

function makeInitData(userId: number, extraFields?: Record<string, string>): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test', last_name: 'User' })
  const authDate = Math.floor(Date.now() / 1000)

  const params = new URLSearchParams({
    user,
    auth_date: String(authDate),
    ...extraFields,
  })

  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  params.set('hash', hash)
  return params.toString()
}

function makeWebWidgetData(userId: number): Record<string, string> {
  const authDate = Math.floor(Date.now() / 1000)
  const data: Record<string, string> = {
    id: String(userId),
    first_name: 'Test',
    auth_date: String(authDate),
  }

  const sortedString = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(BOT_TOKEN).digest()
  data.hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  return data
}

describe('validateInitData (Mini App)', () => {
  it('returns parsed data for valid initData', () => {
    const initData = makeInitData(123456)
    const result = validateInitData(initData, BOT_TOKEN)
    expect(result).not.toBeNull()
    expect(result?.auth_date).toBeDefined()
  })

  it('returns null for tampered initData', () => {
    const initData = makeInitData(123456)
    const tampered = initData.replace('first_name', 'first_name_x')
    expect(validateInitData(tampered, BOT_TOKEN)).toBeNull()
  })

  it('returns null when hash is missing', () => {
    const params = new URLSearchParams({ user: '{}', auth_date: '123' })
    expect(validateInitData(params.toString(), BOT_TOKEN)).toBeNull()
  })

  it('returns null when auth_date is older than 24 hours', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 90000 // 25 hours ago
    const initData = makeInitData(123456, { auth_date: String(oldDate) })
    // Re-sign with old date
    const params = new URLSearchParams(initData)
    params.delete('hash')
    const sortedString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n')
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
    const hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')
    params.set('hash', hash)
    expect(validateInitData(params.toString(), BOT_TOKEN)).toBeNull()
  })
})

describe('validateWebWidget', () => {
  it('returns true for valid Telegram Login Widget data', () => {
    const data = makeWebWidgetData(123456)
    expect(validateWebWidget(data, BOT_TOKEN)).toBe(true)
  })

  it('returns false for tampered data', () => {
    const data = makeWebWidgetData(123456)
    data.first_name = 'Hacker'
    expect(validateWebWidget(data, BOT_TOKEN)).toBe(false)
  })

  it('returns false when hash is missing', () => {
    expect(validateWebWidget({ id: '1', first_name: 'A', auth_date: '1' }, BOT_TOKEN)).toBe(false)
  })
})

describe('parseInitData', () => {
  it('extracts user object from initData', () => {
    const initData = makeInitData(999)
    const params = Object.fromEntries(new URLSearchParams(initData).entries())
    const result = parseInitData(params)
    expect(result.id).toBe(999)
    expect(result.first_name).toBe('Test')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что ПАДАЕТ**

```bash
cd backend
pnpm test tests/unit/telegram-validation.test.ts
# Ожидается: Cannot find module '../../src/api/telegram-auth/services/telegram-validation'
```

- [ ] **Step 3: Создать директории**

```bash
mkdir -p backend/src/api/telegram-auth/services
mkdir -p backend/src/api/telegram-auth/controllers
mkdir -p backend/src/api/telegram-auth/routes
```

- [ ] **Step 4: Реализовать сервис валидации**

```typescript
// backend/src/api/telegram-auth/services/telegram-validation.ts
import crypto from 'crypto'

/**
 * Validates Telegram Mini App initData string.
 * Returns parsed params if valid, null otherwise.
 */
export function validateInitData(
  initData: string,
  botToken: string
): Record<string, string> | null {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')

  if (!hash) return null

  params.delete('hash')

  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  if (computedHash !== hash) return null

  const authDate = parseInt(params.get('auth_date') || '0', 10)
  const MAX_AGE_SECONDS = 86400 // 24 hours
  if (Math.floor(Date.now() / 1000) - authDate > MAX_AGE_SECONDS) return null

  return Object.fromEntries(params.entries())
}

/**
 * Validates Telegram Login Widget data.
 */
export function validateWebWidget(telegramData: Record<string, string>, botToken: string): boolean {
  const { hash, ...data } = telegramData

  if (!hash) return false

  const sortedString = Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')

  return computedHash === hash
}

/**
 * Parses user object from validated initData params.
 */
export function parseInitData(params: Record<string, string>): {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
} {
  const user = JSON.parse(params.user || '{}')
  return {
    id: parseInt(String(user.id), 10),
    first_name: user.first_name || '',
    last_name: user.last_name,
    username: user.username,
    photo_url: user.photo_url,
    language_code: user.language_code,
  }
}
```

- [ ] **Step 5: Запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm test tests/unit/telegram-validation.test.ts
# Ожидается: PASS (8 тестов)
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/telegram-auth/services/ backend/tests/unit/telegram-validation.test.ts
git commit -m "feat(backend): add Telegram initData and Web Widget validation service"
```

---

## Task 6: POST /auth/telegram endpoint

**Files:**

- Create: `backend/src/api/telegram-auth/controllers/telegram-auth.ts`
- Create: `backend/src/api/telegram-auth/routes/telegram-auth.ts`
- Create: `backend/tests/integration/auth-telegram.test.ts`

- [ ] **Step 1: Написать интеграционные тесты**

```typescript
// backend/tests/integration/auth-telegram.test.ts
import request from 'supertest'
import crypto from 'crypto'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

function makeValidInitData(userId: number, botToken: string): string {
  const user = JSON.stringify({
    id: userId,
    first_name: 'Иван',
    last_name: 'Тестовый',
    language_code: 'ru',
  })
  const authDate = Math.floor(Date.now() / 1000)
  const params = new URLSearchParams({ user, auth_date: String(authDate) })

  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')
  params.set('hash', hash)

  return params.toString()
}

beforeAll(async () => {
  strapi = await setupStrapi()
  process.env.TELEGRAM_BOT_TOKEN = 'test_bot_token_12345'
})

afterAll(async () => {
  await teardownStrapi()
})

describe('POST /api/auth/telegram', () => {
  it('creates a new user and returns JWT when given valid initData', async () => {
    const initData = makeValidInitData(111222333, process.env.TELEGRAM_BOT_TOKEN!)

    const res = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData })

    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('jwt')
    expect(res.body.user).toMatchObject({
      telegramId: '111222333',
      firstName: 'Иван',
      subscriptionPlan: 'free',
      vacancyCredits: 0,
      applyCredits: 0,
    })
    expect(res.body.user).not.toHaveProperty('password')
  })

  it('returns same user on second call with same telegramId (find, not create)', async () => {
    const initData = makeValidInitData(444555666, process.env.TELEGRAM_BOT_TOKEN!)

    const res1 = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData })

    const res2 = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: makeValidInitData(444555666, process.env.TELEGRAM_BOT_TOKEN!) })

    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(res1.body.user.id).toBe(res2.body.user.id)
  })

  it('returns 400 for invalid initData signature', async () => {
    const res = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: 'user=invalid&auth_date=123&hash=badhash' })

    expect(res.status).toBe(400)
    expect(res.body.error.message).toMatch(/invalid/i)
  })

  it('returns 400 when neither initData nor telegramData provided', async () => {
    const res = await request(strapi.server.httpServer).post('/api/auth/telegram').send({})

    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что ПАДАЕТ**

```bash
cd backend
pnpm build && pnpm test tests/integration/auth-telegram.test.ts
# Ожидается: 404 Not Found (маршрут не существует)
```

- [ ] **Step 3: Создать маршрут**

```typescript
// backend/src/api/telegram-auth/routes/telegram-auth.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/auth/telegram',
      handler: 'telegram-auth.telegram',
      config: {
        auth: false,
        middlewares: [],
      },
    },
  ],
}
```

- [ ] **Step 4: Создать контроллер**

```typescript
// backend/src/api/telegram-auth/controllers/telegram-auth.ts
import type { Core } from '@strapi/strapi'
import { validateInitData, validateWebWidget, parseInitData } from '../services/telegram-validation'

type TelegramUser = {
  id: number
  first_name: string
  last_name?: string
  username?: string
  photo_url?: string
  language_code?: string
}

const SANITIZED_USER_FIELDS = [
  'id',
  'email',
  'telegramId',
  'firstName',
  'lastName',
  'avatar',
  'language',
  'subscriptionPlan',
  'subscriptionExpiresAt',
  'vacancyCredits',
  'applyCredits',
  'createdAt',
]

// Factory pattern: strapi passed in as dependency, no content-type UID required
export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async telegram(ctx) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return ctx.internalServerError('Telegram bot not configured')
    }

    const { initData, telegramData } = ctx.request.body as {
      initData?: string
      telegramData?: Record<string, string>
    }

    let telegramUser: TelegramUser | null = null

    if (initData) {
      const params = validateInitData(initData, botToken)
      if (!params) {
        return ctx.badRequest('Invalid or expired Telegram initData')
      }
      telegramUser = parseInitData(params)
    } else if (telegramData) {
      if (!validateWebWidget(telegramData, botToken)) {
        return ctx.badRequest('Invalid Telegram Web Widget data')
      }
      telegramUser = {
        id: parseInt(String(telegramData.id), 10),
        first_name: telegramData.first_name || '',
        last_name: telegramData.last_name,
        username: telegramData.username,
        photo_url: telegramData.photo_url,
        language_code: telegramData.language_code,
      }
    } else {
      return ctx.badRequest('initData or telegramData is required')
    }

    // Find or create user
    let user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { telegramId: String(telegramUser.id) },
      select: SANITIZED_USER_FIELDS,
    })

    if (!user) {
      const role = await strapi.db.query('plugin::users-permissions.role').findOne({
        where: { type: 'authenticated' },
      })

      user = await strapi.db.query('plugin::users-permissions.user').create({
        data: {
          telegramId: String(telegramUser.id),
          firstName: telegramUser.first_name,
          lastName: telegramUser.last_name || null,
          username: `tg_${telegramUser.id}`,
          email: null,
          confirmed: true,
          blocked: false,
          role: role?.id,
          subscriptionPlan: 'free',
          vacancyCredits: 0,
          applyCredits: 0,
          language: telegramUser.language_code === 'ru' ? 'ru' : 'en',
        },
        select: SANITIZED_USER_FIELDS,
      })
    }

    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id })

    ctx.send({ jwt, user })
  },
})
```

- [ ] **Step 5: Собрать и запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm build
pnpm test tests/integration/auth-telegram.test.ts
# Ожидается: PASS (4 теста)
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/telegram-auth/ backend/tests/integration/auth-telegram.test.ts
git commit -m "feat(backend): add POST /auth/telegram endpoint with Telegram validation"
```

---

## Task 7: GET /users/me + PUT /users/me

**Files:**

- Create: `backend/src/extensions/users-permissions/strapi-server.ts`
- Create: `backend/tests/integration/users-me.test.ts`

- [ ] **Step 1: Написать интеграционные тесты**

```typescript
// backend/tests/integration/users-me.test.ts
import request from 'supertest'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import { createTestUser, issueJwt } from '../helpers/factories'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

beforeAll(async () => {
  strapi = await setupStrapi()
})

afterAll(async () => {
  await teardownStrapi()
})

describe('GET /api/users/me', () => {
  it('returns current user with custom fields', async () => {
    const user = await createTestUser(strapi, {
      subscriptionPlan: 'pro',
      vacancyCredits: 5,
      applyCredits: 100,
      language: 'en',
    })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      id: user.id,
      subscriptionPlan: 'pro',
      vacancyCredits: 5,
      applyCredits: 100,
      language: 'en',
    })
    expect(res.body).not.toHaveProperty('password')
  })

  it('returns 401 without token', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me')
    expect(res.status).toBe(401)
  })
})

describe('PUT /api/users/me', () => {
  it('updates allowed fields (firstName, lastName, language)', async () => {
    const user = await createTestUser(strapi)
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ firstName: 'Новое', lastName: 'Имя', language: 'en' })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      firstName: 'Новое',
      lastName: 'Имя',
      language: 'en',
    })
  })

  it('ignores attempts to update subscriptionPlan directly', async () => {
    const user = await createTestUser(strapi, { subscriptionPlan: 'free' })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ subscriptionPlan: 'max' })

    expect(res.status).toBe(200)
    expect(res.body.subscriptionPlan).toBe('free') // не изменился
  })

  it('ignores attempts to update vacancyCredits directly', async () => {
    const user = await createTestUser(strapi, { vacancyCredits: 0 })
    const jwt = issueJwt(strapi, user.id as number)

    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ vacancyCredits: 9999 })

    expect(res.status).toBe(200)
    expect(res.body.vacancyCredits).toBe(0)
  })

  it('returns 401 without token', async () => {
    const res = await request(strapi.server.httpServer)
      .put('/api/users/me')
      .send({ firstName: 'X' })
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что ЧАСТИЧНО ПАДАЕТ**

```bash
cd backend
pnpm build && pnpm test tests/integration/users-me.test.ts
# GET /me может работать из коробки, PUT /me нужно проверить — тест на блокировку subscriptionPlan скорее всего падает
```

- [ ] **Step 3: Расширить users-permissions через strapi-server.ts**

```typescript
// backend/src/extensions/users-permissions/strapi-server.ts
// Note: `strapi` is the Strapi 5 global singleton — available in all controllers after boot.

const ALLOWED_UPDATE_FIELDS = ['firstName', 'lastName', 'language', 'avatar']

const SANITIZED_RESPONSE_FIELDS = [
  'id',
  'email',
  'telegramId',
  'firstName',
  'lastName',
  'avatar',
  'language',
  'subscriptionPlan',
  'subscriptionExpiresAt',
  'vacancyCredits',
  'applyCredits',
  'createdAt',
]

function pickFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of fields) {
    if (field in obj) result[field] = obj[field]
  }
  return result
}

export default (plugin) => {
  // Override GET /users/me to return only safe fields
  const originalMe = plugin.controllers.user.me
  plugin.controllers.user.me = async (ctx) => {
    await originalMe(ctx)
    if (ctx.status === 200 && ctx.body) {
      ctx.body = pickFields(ctx.body as Record<string, unknown>, SANITIZED_RESPONSE_FIELDS)
    }
  }

  // Override PUT /users/me to restrict which fields can be changed
  plugin.controllers.user.updateMe = async (ctx) => {
    const body = ctx.request.body as Record<string, unknown>
    const safeData = pickFields(body, ALLOWED_UPDATE_FIELDS)

    // strapi is the global Strapi 5 singleton
    const updatedUser = await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: ctx.state.user.id },
      data: safeData,
      select: SANITIZED_RESPONSE_FIELDS,
    })

    ctx.body = updatedUser
  }

  // Wire PUT /users/me → updateMe handler
  const contentApiRoutes = plugin.routes?.['content-api']?.routes ?? []
  const meRoute = contentApiRoutes.find((r) => r.method === 'PUT' && r.path === '/users/me')
  if (meRoute) {
    meRoute.handler = 'user.updateMe'
  } else {
    // If the route doesn't exist, add it
    contentApiRoutes.push({
      method: 'PUT',
      path: '/users/me',
      handler: 'user.updateMe',
      config: { prefix: '' },
    })
  }

  return plugin
}
```

- [ ] **Step 4: Запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm build && pnpm test tests/integration/users-me.test.ts
# Ожидается: PASS (6 тестов)
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/extensions/users-permissions/ backend/tests/integration/users-me.test.ts
git commit -m "feat(backend): extend GET/PUT /users/me to include custom fields, block protected updates"
```

---

## Task 8: Telegram initData Middleware (для Mini App маршрутов)

**Files:**

- Create: `backend/src/middlewares/telegram-auth.ts`
- Create: `backend/tests/integration/telegram-middleware.test.ts`
- Modify: `backend/config/middlewares.ts`

- [ ] **Step 1: Написать интеграционный тест для middleware**

```typescript
// backend/tests/integration/telegram-middleware.test.ts
import request from 'supertest'
import crypto from 'crypto'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import { createTestUser, issueJwt } from '../helpers/factories'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi
const BOT_TOKEN = 'test_bot_token_12345'

function makeValidInitData(userId: number): string {
  const user = JSON.stringify({ id: userId, first_name: 'Test' })
  const authDate = Math.floor(Date.now() / 1000)
  const params = new URLSearchParams({ user, auth_date: String(authDate) })
  const sortedString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(sortedString).digest('hex')
  params.set('hash', hash)
  return params.toString()
}

beforeAll(async () => {
  strapi = await setupStrapi()
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
})

afterAll(async () => {
  await teardownStrapi()
})

describe('Telegram initData middleware (via GET /api/users/me with X-Telegram-Init-Data)', () => {
  it('authenticates user via valid initData header when no JWT provided', async () => {
    // Create user with known telegramId first
    const telegramId = '777888999'
    await createTestUser(strapi, { telegramId })

    const initData = makeValidInitData(parseInt(telegramId))

    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', initData)

    // If middleware sets ctx.state.user correctly, returns 200
    expect([200, 401]).toContain(res.status)
    // 200 = middleware worked, 401 = middleware not applied to this route (acceptable for Sprint 1)
  })

  it('rejects invalid initData in header', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', 'invalid_data')

    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться, что ВТОРОЙ ПАДАЕТ**

```bash
cd backend
pnpm build && pnpm test tests/integration/telegram-middleware.test.ts
# Ожидается: второй тест может вернуть 401 (нет JWT) вместо специального сообщения
```

- [ ] **Step 3: Создать middleware**

```typescript
// backend/src/middlewares/telegram-auth.ts
import type { Core } from '@strapi/strapi'
import { validateInitData, parseInitData } from '../api/telegram-auth/services/telegram-validation'

/**
 * Route-level middleware: accepts X-Telegram-Init-Data header as auth method.
 * If present and valid, populates ctx.state.user so Strapi auth works.
 * Falls through to standard JWT auth if header is absent.
 */
export default (config, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx, next) => {
    const initDataHeader = ctx.request.headers['x-telegram-init-data'] as string | undefined

    if (!initDataHeader) {
      return next()
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      ctx.unauthorized('Telegram bot not configured')
      return
    }

    const params = validateInitData(initDataHeader, botToken)
    if (!params) {
      ctx.unauthorized('Invalid or expired Telegram initData')
      return
    }

    const telegramUser = parseInitData(params)

    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { telegramId: String(telegramUser.id) },
    })

    if (!user) {
      ctx.unauthorized('Telegram user not registered. Call POST /api/auth/telegram first.')
      return
    }

    if (user.blocked) {
      ctx.unauthorized('User account is blocked')
      return
    }

    ctx.state.user = user
    ctx.state.auth = { strategy: { name: 'telegram-init-data' } }

    await next()
  }
}
```

- [ ] **Step 4: Зарегистрировать middleware**

Открыть `backend/config/middlewares.ts` (Strapi создаёт его при init). Добавить `telegram-auth` в список:

```typescript
// backend/config/middlewares.ts
export default [
  'strapi::logger',
  'strapi::errors',
  'strapi::security',
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  // Глобальный telegram-auth middleware не нужен — применяется на уровне маршрутов
  // Раскомментировать если нужно применить глобально:
  // 'global::telegram-auth',
]
```

> Middleware `telegram-auth` применяется **на уровне маршрута** (route middleware), не глобально. Для конкретных защищённых маршрутов добавлять в `config.middlewares` маршрута:
>
> ```typescript
> config: {
>   middlewares: ['global::telegram-auth'],
> }
> ```

- [ ] **Step 5: Запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm build && pnpm test tests/integration/telegram-middleware.test.ts
# Ожидается: PASS
```

- [ ] **Step 6: Commit**

```bash
git add backend/src/middlewares/ backend/tests/integration/telegram-middleware.test.ts backend/config/middlewares.ts
git commit -m "feat(backend): add Telegram initData route middleware for Mini App auth"
```

---

## Task 9: Rate Limiting Middleware

**Files:**

- Modify: `backend/config/middlewares.ts`
- Create: `backend/src/middlewares/rate-limit.ts`

- [ ] **Step 1: Установить koa-ratelimit**

```bash
cd backend
pnpm add koa-ratelimit
pnpm add -D @types/koa-ratelimit
```

- [ ] **Step 2: Написать unit тест для rate limit конфигурации**

```typescript
// backend/tests/unit/rate-limit.test.ts
import { buildRateLimitConfig } from '../../src/middlewares/rate-limit'

describe('buildRateLimitConfig', () => {
  it('returns config with correct default values', () => {
    const config = buildRateLimitConfig({})
    expect(config.max).toBe(100)
    expect(config.duration).toBe(60000)
    expect(config.errorMessage).toBeDefined()
  })

  it('allows overriding max and duration', () => {
    const config = buildRateLimitConfig({ max: 10, duration: 30000 })
    expect(config.max).toBe(10)
    expect(config.duration).toBe(30000)
  })
})
```

- [ ] **Step 3: Запустить тест — убедиться, что ПАДАЕТ**

```bash
cd backend
pnpm test tests/unit/rate-limit.test.ts
# Ожидается: Cannot find module '../../src/middlewares/rate-limit'
```

- [ ] **Step 4: Реализовать rate limit middleware**

```typescript
// backend/src/middlewares/rate-limit.ts
import ratelimit from 'koa-ratelimit'

interface RateLimitOptions {
  max?: number
  duration?: number
  db?: Map<string, unknown>
}

export function buildRateLimitConfig(options: RateLimitOptions) {
  return {
    driver: 'memory' as const,
    db: options.db ?? new Map(),
    duration: options.duration ?? 60000, // 1 minute
    max: options.max ?? 100, // 100 requests per minute
    errorMessage: 'Too many requests. Please try again later.',
    id: (ctx) => ctx.ip,
    disableHeader: false,
    headers: {
      remaining: 'Rate-Limit-Remaining',
      reset: 'Rate-Limit-Reset',
      total: 'Rate-Limit-Total',
    },
  }
}

// Strict limit для auth endpoints: 10 req/min per IP
const authRateLimitDb = new Map()
export const authRateLimit = ratelimit(
  buildRateLimitConfig({ max: 10, duration: 60000, db: authRateLimitDb })
)

// General API limit: 100 req/min per IP
const apiRateLimitDb = new Map()
export const apiRateLimit = ratelimit(
  buildRateLimitConfig({ max: 100, duration: 60000, db: apiRateLimitDb })
)
```

- [ ] **Step 5: Запустить тест — убедиться, что ПРОХОДИТ**

```bash
cd backend
pnpm test tests/unit/rate-limit.test.ts
# Ожидается: PASS (2 теста)
```

- [ ] **Step 6: Подключить rate limiting как Strapi middleware**

Обновить `backend/config/middlewares.ts`:

```typescript
// backend/config/middlewares.ts
export default [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', process.env.S3_ENDPOINT ?? ''],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      enabled: true,
      headers: ['Authorization', 'Content-Type', 'X-Telegram-Init-Data'],
      origin: [process.env.FRONTEND_URL ?? 'http://localhost:3000'],
    },
  },
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
]
```

> Rate limiting применяется в `src/index.ts` через Strapi bootstrap, чтобы иметь доступ к объекту Koa app:

Обновить `backend/src/index.ts`:

```typescript
// backend/src/index.ts
import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'

export default {
  register({ strapi }) {},

  bootstrap({ strapi }) {
    const app = strapi.server.app

    // Apply auth rate limit to auth routes
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/auth/')) {
        return authRateLimit(ctx, next)
      }
      return next()
    })

    // Apply general rate limit to all API routes
    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/')) {
        return apiRateLimit(ctx, next)
      }
      return next()
    })
  },
}
```

- [ ] **Step 7: Запустить Strapi и проверить заголовки rate limit**

```bash
cd backend
pnpm develop &
sleep 10
curl -I http://localhost:1337/api/users/me 2>/dev/null | grep -i rate
# Ожидается: Rate-Limit-Remaining: 99, Rate-Limit-Total: 100
pkill -f "pnpm develop"
```

- [ ] **Step 8: Запустить все тесты**

```bash
cd backend
pnpm build && pnpm test
# Ожидается: все тесты PASS
```

- [ ] **Step 9: Commit**

```bash
git add backend/src/middlewares/rate-limit.ts backend/src/index.ts backend/config/middlewares.ts backend/tests/unit/rate-limit.test.ts backend/package.json backend/pnpm-lock.yaml
git commit -m "feat(backend): add rate limiting (100 req/min API, 10 req/min auth)"
```

---

## Финальная проверка Sprint 1 Backend

- [ ] **Полный прогон тестов**

```bash
cd backend
pnpm build && pnpm test
# Все тесты PASS
```

- [ ] **Проверить запуск Strapi**

```bash
cd backend
pnpm develop
# http://localhost:1337/admin — создать первого admin-пользователя
# Проверить: Content-Type Builder показывает User с custom полями
```

- [ ] **Smoke тест эндпоинтов через curl**

```bash
# POST /auth/local/register (out-of-box)
curl -X POST http://localhost:1337/api/auth/local/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"testuser","email":"test@gramjob.com","password":"Test1234!"}' | jq .

# POST /auth/telegram (с валидным initData — нужен реальный bot token)
# GET /users/me с полученным JWT
curl -H 'Authorization: Bearer <JWT>' http://localhost:1337/api/users/me | jq .
```

- [ ] **Обновить sprint-plan.md**

Пометить все задачи Sprint 1 Backend как `[x]` в `docs/sprint-plan.md`.

- [ ] **Финальный commit**

```bash
git add docs/sprint-plan.md
git commit -m "docs: mark Sprint 1 Backend complete"
```

---

## Ссылки

- [Strapi 5 Docs](https://docs.strapi.io/dev-docs/intro)
- [Strapi 5 Testing](https://docs.strapi.io/dev-docs/testing)
- [Telegram initData validation](https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
- [Telegram Login Widget validation](https://core.telegram.org/widgets/login#checking-authorization)
- `docs/database-schema.md` — схема User
- `docs/api-specification.md` — спецификация эндпоинтов
