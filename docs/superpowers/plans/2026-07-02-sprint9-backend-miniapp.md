# Sprint 9 Backend (Telegram Mini App) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Все защищённые endpoints принимают Telegram `initData` как альтернативу JWT; контракт deep links (`startapp=vacancy_{id}`, `startapp=application_{id}`) зафиксирован тестами.

**Architecture:** Глобальный middleware `global::telegram-auth` при наличии валидного заголовка `X-Telegram-Init-Data` находит пользователя по `telegramId` и инъектирует штатный JWT (users-permissions `jwt.issue`) в `Authorization` header. Дальше работает стандартная цепочка auth/permissions/policies без изменений. Кастомная auth-стратегия НЕ используется: стратегия users-permissions возвращает `authenticated: true` с public-ability при отсутствии JWT, поэтому стратегия, зарегистрированная после неё, никогда не выполнится.

**Tech Stack:** Strapi 5, TypeScript, Jest (unit + integration через `setupStrapi`), supertest.

**Контекст для исполнителя:**

- Middleware `backend/src/middlewares/telegram-auth.ts` существует с Sprint 1, но нигде не зарегистрирован. Он устанавливает `ctx.state.user` напрямую — это НЕ проходит route-level auth Strapi (роуты с `config: {}` требуют, чтобы одна из auth-стратегий вернула `authenticated: true`). Файл нужно переработать на JWT-инъекцию.
- Валидация initData уже реализована и покрыта тестами: `backend/src/api/telegram-auth/services/telegram-validation.ts` (`validateInitData`, `parseInitData`).
- Deep links уже генерируются backend'ом: `buildDeepLink` в `backend/src/api/payment/services/telegram-bot.ts:131` строит `vacancy_{documentId}` / `application_{documentId}` / `subscription` и вставляет в inline-кнопку `https://t.me/{BOT_USERNAME}/app?startapp={deepLink}`. Данные уведомлений кладут documentId (см. `backend/src/api/application/content-types/application/lifecycles.ts:44,81`). Задача Sprint 9 Backend — зафиксировать этот контракт тестами (роутинг `start_param` → страница делает frontend в своей части спринта).
- CORS уже пропускает заголовок `X-Telegram-Init-Data` (`backend/config/middlewares.ts:28`).
- Команды: unit-тесты `pnpm test`, integration `pnpm test:integration`, типы `pnpm typecheck` (из каталога `backend/`).

---

### Task 1: Переработать telegram-auth middleware на JWT-инъекцию

**Files:**

- Modify: `backend/src/middlewares/telegram-auth.ts`
- Test: `backend/tests/unit/telegram-auth-middleware.test.ts` (новый файл; существующий `telegram-middleware.test.ts` тестирует только validation-функции и остаётся без изменений)

- [ ] **Step 1: Написать падающие unit-тесты**

Создать `backend/tests/unit/telegram-auth-middleware.test.ts`:

```typescript
import crypto from 'crypto'
import createTelegramAuthMiddleware from '../../src/middlewares/telegram-auth'

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

function makeCtx(headers: Record<string, string> = {}): any {
  return { request: { headers: { ...headers } }, state: {}, status: 200, body: null }
}

describe('telegram-auth middleware — JWT injection', () => {
  const issueMock = jest.fn().mockReturnValue('fake.jwt.token')
  const findOneMock = jest.fn()

  const strapiMock = {
    db: { query: () => ({ findOne: findOneMock }) },
    plugin: () => ({ service: () => ({ issue: issueMock }) }),
  } as any

  const middleware = createTelegramAuthMiddleware({}, { strapi: strapiMock })

  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
    issueMock.mockClear()
    findOneMock.mockReset()
  })

  it('без заголовка initData — passthrough, authorization не устанавливается', async () => {
    const ctx = makeCtx()
    const next = jest.fn()
    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.request.headers.authorization).toBeUndefined()
  })

  it('с существующим Authorization — initData игнорируется, header не перезаписывается', async () => {
    const ctx = makeCtx({
      authorization: 'Bearer existing.jwt',
      'x-telegram-init-data': makeValidInitData(111),
    })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(next).toHaveBeenCalled()
    expect(ctx.request.headers.authorization).toBe('Bearer existing.jwt')
    expect(findOneMock).not.toHaveBeenCalled()
  })

  it('невалидный initData → 401, next не вызывается', async () => {
    const ctx = makeCtx({ 'x-telegram-init-data': 'user=%7B%7D&auth_date=1&hash=bad' })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('валидный initData + пользователь найден → инъекция Bearer JWT', async () => {
    findOneMock.mockResolvedValue({ id: 42, telegramId: '12345', blocked: false })
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(findOneMock).toHaveBeenCalledWith({ where: { telegramId: '12345' } })
    expect(issueMock).toHaveBeenCalledWith({ id: 42 })
    expect(ctx.request.headers.authorization).toBe('Bearer fake.jwt.token')
    expect(next).toHaveBeenCalled()
  })

  it('пользователь не найден → 401', async () => {
    findOneMock.mockResolvedValue(null)
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(99999) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('заблокированный пользователь → 401', async () => {
    findOneMock.mockResolvedValue({ id: 42, telegramId: '12345', blocked: true })
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('без TELEGRAM_BOT_TOKEN → 500', async () => {
    delete process.env.TELEGRAM_BOT_TOKEN
    const ctx = makeCtx({ 'x-telegram-init-data': makeValidInitData(12345) })
    const next = jest.fn()
    await middleware(ctx, next)
    expect(ctx.status).toBe(500)
    expect(next).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Убедиться, что тесты падают**

Run: `cd backend && pnpm test -- tests/unit/telegram-auth-middleware.test.ts`
Expected: FAIL — тесты «с существующим Authorization» и «валидный initData + пользователь найден» падают (текущая реализация ставит `ctx.state.user` вместо инъекции JWT и не пропускает запросы с Authorization).

- [ ] **Step 3: Переписать middleware**

Заменить содержимое `backend/src/middlewares/telegram-auth.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { validateInitData, parseInitData } from '../api/telegram-auth/services/telegram-validation'

/**
 * Global middleware: accepts X-Telegram-Init-Data header as auth.
 * On valid initData issues a standard users-permissions JWT and injects it
 * into the Authorization header, so the regular auth strategy chain
 * (permissions, policies, ctx.state.user) works unchanged downstream.
 * Requests that already carry an Authorization header pass through untouched.
 */
export default (_config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  return async (ctx: any, next: () => Promise<void>) => {
    const initDataHeader = ctx.request.headers['x-telegram-init-data'] as string | undefined

    if (!initDataHeader || ctx.request.headers.authorization) {
      return next()
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      ctx.status = 500
      ctx.body = { error: { message: 'Telegram bot not configured' } }
      return
    }

    const params = validateInitData(initDataHeader, botToken)
    if (!params) {
      ctx.status = 401
      ctx.body = { error: { message: 'Invalid or expired Telegram initData' } }
      return
    }

    const telegramUser = parseInitData(params)
    const user = await strapi.db.query('plugin::users-permissions.user').findOne({
      where: { telegramId: String(telegramUser.id) },
    })

    if (!user) {
      ctx.status = 401
      ctx.body = {
        error: { message: 'Telegram user not registered. Call POST /api/auth/telegram first.' },
      }
      return
    }

    if (user.blocked) {
      ctx.status = 401
      ctx.body = { error: { message: 'User account is blocked' } }
      return
    }

    const jwt = strapi.plugin('users-permissions').service('jwt').issue({ id: user.id })
    ctx.request.headers.authorization = `Bearer ${jwt}`

    await next()
  }
}
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `cd backend && pnpm test -- tests/unit/telegram-auth-middleware.test.ts`
Expected: PASS (7 тестов)

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: все unit-тесты зелёные, 0 ошибок TypeScript

- [ ] **Step 5: Commit**

```bash
git add backend/src/middlewares/telegram-auth.ts backend/tests/unit/telegram-auth-middleware.test.ts
git commit -m "feat(auth): telegram-auth middleware injects users-permissions JWT for initData requests"
```

---

### Task 2: Зарегистрировать global::telegram-auth глобально + integration-тесты

**Files:**

- Modify: `backend/config/middlewares.ts`
- Test: `backend/tests/integration/initdata-auth.test.ts`

- [ ] **Step 1: Написать integration-тест**

Создать `backend/tests/integration/initdata-auth.test.ts` (helper `makeValidInitData` повторяет существующий из `tests/integration/auth-telegram.test.ts`):

```typescript
import request from 'supertest'
import crypto from 'crypto'
import { setupStrapi, teardownStrapi } from '../helpers/strapi'
import type { Core } from '@strapi/strapi'

let strapi: Core.Strapi

const BOT_TOKEN = 'test_bot_token_12345'

function makeValidInitData(userId: number): string {
  const user = JSON.stringify({
    id: userId,
    first_name: 'Мини',
    last_name: 'Апп',
    language_code: 'ru',
  })
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
  process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN
  strapi = await setupStrapi()
})

afterAll(async () => {
  await teardownStrapi()
})

describe('initData auth on protected endpoints', () => {
  const telegramUserId = 777888999

  it('GET /api/users/me с X-Telegram-Init-Data (без JWT) → 200', async () => {
    // Регистрация пользователя (создаёт запись с telegramId)
    const registerRes = await request(strapi.server.httpServer)
      .post('/api/auth/telegram')
      .send({ initData: makeValidInitData(telegramUserId) })
    expect(registerRes.status).toBe(200)

    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', makeValidInitData(telegramUserId))

    expect(res.status).toBe(200)
    expect(res.body.telegramId).toBe(String(telegramUserId))
  })

  it('GET /api/vacancies/my с X-Telegram-Init-Data (без JWT) → 200', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/vacancies/my')
      .set('X-Telegram-Init-Data', makeValidInitData(telegramUserId))

    expect(res.status).toBe(200)
  })

  it('невалидный X-Telegram-Init-Data → 401', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', 'user=%7B%7D&auth_date=1&hash=bad')

    expect(res.status).toBe(401)
  })

  it('initData незарегистрированного пользователя → 401', async () => {
    const res = await request(strapi.server.httpServer)
      .get('/api/users/me')
      .set('X-Telegram-Init-Data', makeValidInitData(555000111))

    expect(res.status).toBe(401)
  })

  it('без auth-заголовков защищённый endpoint по-прежнему закрыт', async () => {
    const res = await request(strapi.server.httpServer).get('/api/users/me')
    expect([401, 403]).toContain(res.status)
  })

  it('публичный endpoint без заголовков работает', async () => {
    const res = await request(strapi.server.httpServer).get('/api/vacancies')
    expect(res.status).toBe(200)
  })
})
```

- [ ] **Step 2: Убедиться, что тест падает**

Run: `cd backend && pnpm test:integration -- tests/integration/initdata-auth.test.ts`
Expected: FAIL — первые два теста получают 401/403 (middleware ещё не зарегистрирован глобально)

- [ ] **Step 3: Зарегистрировать middleware**

В `backend/config/middlewares.ts` добавить `'global::telegram-auth'` последним элементом массива (после `'strapi::public'` — глобальные middleware выполняются до route-level auth):

```typescript
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::telegram-auth',
]
```

- [ ] **Step 4: Убедиться, что тесты проходят**

Run: `cd backend && pnpm test:integration`
Expected: PASS — новый файл зелёный, существующие integration-тесты (`auth-telegram`, `users-me`) не сломаны

Run: `cd backend && pnpm typecheck`
Expected: 0 ошибок

- [ ] **Step 5: Commit**

```bash
git add backend/config/middlewares.ts backend/tests/integration/initdata-auth.test.ts
git commit -m "feat(auth): enable initData auth on all endpoints via global telegram-auth middleware"
```

---

### Task 3: Контрактные тесты deep links (startapp)

Реализация `buildDeepLink` уже существует (`backend/src/api/payment/services/telegram-bot.ts:131`) — задача фиксирует контракт, на который будет опираться frontend-роутинг `start_param` в Sprint 9 Frontend. Тесты должны пройти сразу; если какой-то падает — это реальное расхождение контракта, чинить реализацию, а не тест.

**Files:**

- Test: `backend/tests/unit/telegram-bot-send.test.ts` (дополнить существующий файл)

- [ ] **Step 1: Добавить контрактные тесты**

Дописать в конец `backend/tests/unit/telegram-bot-send.test.ts` новый describe-блок (импорт `buildNotificationMessage` в файле уже есть):

```typescript
describe('deep links (startapp) — контракт для Mini App роутинга', () => {
  function extractUrl(msg: ReturnType<typeof buildNotificationMessage>): string | undefined {
    return msg.options?.reply_markup?.inline_keyboard?.[0]?.[0]?.url
  }

  it('new_application → startapp=vacancy_{documentId}', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyId: 'abc123doc',
      vacancyTitle: 'Frontend Dev',
      candidateName: 'Иван',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=vacancy_abc123doc$/)
  })

  it('application_approved → startapp=application_{documentId}', () => {
    const msg = buildNotificationMessage('application_approved', {
      applicationId: 'xyz456doc',
      vacancyTitle: 'Frontend Dev',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=application_xyz456doc$/)
  })

  it('offer_received → startapp=application_{documentId}', () => {
    const msg = buildNotificationMessage('offer_received', {
      applicationId: 'off789doc',
      vacancyTitle: 'Frontend Dev',
    })
    expect(extractUrl(msg)).toMatch(/\?startapp=application_off789doc$/)
  })

  it('subscription_expired → startapp=subscription', () => {
    const msg = buildNotificationMessage('subscription_expired', {})
    expect(extractUrl(msg)).toMatch(/\?startapp=subscription$/)
  })

  it('deep link ведёт на t.me с BOT_USERNAME', () => {
    const msg = buildNotificationMessage('new_application', {
      vacancyId: 'abc',
      vacancyTitle: 'X',
      candidateName: 'Y',
    })
    expect(extractUrl(msg)).toMatch(/^https:\/\/t\.me\/[A-Za-z0-9_]+\/app\?startapp=/)
  })
})
```

Примечание: если TypeScript ругается на типизацию `msg.options` (поле типизировано как `Record<string, unknown>`), использовать каст в helper'е:

```typescript
function extractUrl(msg: { options: Record<string, unknown> }): string | undefined {
  const markup = msg.options['reply_markup'] as
    | { inline_keyboard?: Array<Array<{ url?: string }>> }
    | undefined
  return markup?.inline_keyboard?.[0]?.[0]?.url
}
```

- [ ] **Step 2: Запустить тесты**

Run: `cd backend && pnpm test -- tests/unit/telegram-bot-send.test.ts`
Expected: PASS (существующие + 5 новых). Если тест падает — исправить `buildDeepLink` в `backend/src/api/payment/services/telegram-bot.ts` до соответствия контракту (форматы `vacancy_{id}`, `application_{id}`, `subscription`), тесты не менять.

- [ ] **Step 3: Полный прогон**

Run: `cd backend && pnpm test && pnpm typecheck`
Expected: все тесты зелёные, 0 ошибок TypeScript

- [ ] **Step 4: Commit**

```bash
git add backend/tests/unit/telegram-bot-send.test.ts
git commit -m "test(telegram): lock deep link startapp contract for Mini App routing"
```

---

### Task 4: Обновить документацию спринта

**Files:**

- Modify: `docs/sprint-plan.md` (строки 303–307 — чекбоксы Backend-секции Sprint 9)
- Modify: `CLAUDE.md` (добавить раздел «Выполнено (Sprint 9 Backend)»)

- [ ] **Step 1: Отметить чекбоксы Sprint 9 Backend в `docs/sprint-plan.md`**

```markdown
### Backend

- [x] Все существующие endpoints принимают initData auth (не только JWT)
- [x] Deep link routing: `startapp=vacancy_123` → `/vacancies/123`
- [x] Deep link routing: `startapp=application_456` → `/dashboard/applications/456`
```

- [ ] **Step 2: Добавить раздел в `CLAUDE.md`** (после раздела «Выполнено (Sprint 8 Frontend — Moderation)», перед «Текущий шаг»):

```markdown
Выполнено (Sprint 9 Backend — Telegram Mini App):

- `src/middlewares/telegram-auth.ts` переработан: при валидном `X-Telegram-Init-Data` инъектирует штатный JWT (users-permissions `jwt.issue`) в `Authorization` — вся цепочка permissions/policies работает без изменений; запросы с существующим `Authorization` не трогает
- `global::telegram-auth` зарегистрирован в `config/middlewares.ts` — все endpoints принимают initData auth (не только JWT)
- Integration-тесты: `/users/me` и `/vacancies/my` через initData без JWT, невалидный/незарегистрированный initData → 401
- Контрактные unit-тесты deep links: `startapp=vacancy_{documentId}`, `startapp=application_{documentId}`, `startapp=subscription` (реализация `buildDeepLink` существовала со Sprint 7)
```

Также обновить строку «Текущий шаг» при необходимости (frontend-часть Sprint 9 остаётся).

- [ ] **Step 3: Commit**

```bash
git add docs/sprint-plan.md CLAUDE.md
git commit -m "docs: mark Sprint 9 Backend (Telegram Mini App) as completed"
```

---

## Self-Review

- **Spec coverage:** «endpoints принимают initData» → Tasks 1–2; «deep link routing vacancy/application» → Task 3 (backend-контракт; сам роутинг `start_param` → страница — frontend-часть Sprint 9). Пробелов нет.
- **Placeholder scan:** каждый шаг содержит готовый код и точные команды; заглушек нет.
- **Type consistency:** `createTelegramAuthMiddleware({}, { strapi })` соответствует сигнатуре default-export middleware; `issue({ id })` — реальный API users-permissions jwt service; `buildNotificationMessage` уже экспортируется.
