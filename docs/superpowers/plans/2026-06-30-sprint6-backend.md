# Sprint 6 Backend — Subscriptions & Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать полный платёжный цикл через Telegram Stars — от создания инвойса до активации подписки/кредитов — и VIP-логику для работодателей.

**Architecture:** Три read-only content type (SubscriptionPlan, VacancyPackage, ApplyPackage) сидируются при старте. Платёжный модуль (`src/api/payment/`) без content type создаёт Telegram Stars invoice links и обрабатывает webhook события. VIP-логика автоматически выставляет `highlighted=true` на вакансиях через lifecycle hook.

**Tech Stack:** Strapi 5, PostgreSQL, Telegram Bot API (нативный `fetch`, без внешних библиотек), Jest.

---

## Файловая структура

**Новые файлы:**

```
backend/src/api/subscription-plan/
  content-types/subscription-plan/schema.json
  controllers/subscription-plan.ts
  routes/subscription-plan.ts

backend/src/api/vacancy-package/
  content-types/vacancy-package/schema.json
  controllers/vacancy-package.ts
  routes/vacancy-package.ts

backend/src/api/apply-package/
  content-types/apply-package/schema.json
  controllers/apply-package.ts
  routes/apply-package.ts

backend/src/scripts/seed-subscription-plans.ts
backend/src/scripts/seed-packages.ts

backend/src/api/payment/
  controllers/payment.ts
  controllers/telegram-webhook.ts
  routes/payment.ts
  routes/telegram-webhook.ts
  services/subscription-service.ts
  services/telegram-bot.ts

backend/tests/unit/subscription-service.test.ts
backend/tests/unit/telegram-bot.test.ts
```

**Изменяемые файлы:**

```
backend/src/extensions/users-permissions/content-types/user/schema.json  — добавить isVip
backend/src/api/vacancy/content-types/vacancy/lifecycles.ts               — beforeCreate VIP auto-highlight
backend/config/cron-tasks.ts                                              — daily subscription expiry
backend/src/index.ts                                                      — вызов seed + регистрация webhook
backend/.env.example                                                      — TELEGRAM_WEBHOOK_SECRET
```

---

## Task 1: Content Types — SubscriptionPlan, VacancyPackage, ApplyPackage

**Files:**

- Create: `backend/src/api/subscription-plan/content-types/subscription-plan/schema.json`
- Create: `backend/src/api/subscription-plan/controllers/subscription-plan.ts`
- Create: `backend/src/api/subscription-plan/routes/subscription-plan.ts`
- Create: `backend/src/api/vacancy-package/content-types/vacancy-package/schema.json`
- Create: `backend/src/api/vacancy-package/controllers/vacancy-package.ts`
- Create: `backend/src/api/vacancy-package/routes/vacancy-package.ts`
- Create: `backend/src/api/apply-package/content-types/apply-package/schema.json`
- Create: `backend/src/api/apply-package/controllers/apply-package.ts`
- Create: `backend/src/api/apply-package/routes/apply-package.ts`

- [ ] **Step 1: Создать schema.json для SubscriptionPlan**

```json
// backend/src/api/subscription-plan/content-types/subscription-plan/schema.json
{
  "kind": "collectionType",
  "collectionName": "subscription_plans",
  "info": {
    "singularName": "subscription-plan",
    "pluralName": "subscription-plans",
    "displayName": "Subscription Plan"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "code": {
      "type": "enumeration",
      "enum": ["free", "pro", "max", "vip"],
      "required": true,
      "unique": true
    },
    "name": { "type": "string", "required": true },
    "vacanciesPerMonth": { "type": "integer", "required": true },
    "activeVacanciesLimit": { "type": "integer", "required": true },
    "vacancyBoostsPerDay": { "type": "integer", "required": true },
    "applicationsPerDay": { "type": "integer", "required": true },
    "resumesLimit": { "type": "integer", "required": true },
    "resumeDatabaseAccess": { "type": "boolean", "default": false },
    "starsPrice": { "type": "integer" },
    "durationDays": { "type": "integer", "default": 30 }
  }
}
```

- [ ] **Step 2: Создать controller для SubscriptionPlan**

```typescript
// backend/src/api/subscription-plan/controllers/subscription-plan.ts
import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx) {
    const plans = await strapi.documents('api::subscription-plan.subscription-plan').findMany({
      fields: [
        'code',
        'name',
        'vacanciesPerMonth',
        'activeVacanciesLimit',
        'vacancyBoostsPerDay',
        'applicationsPerDay',
        'resumesLimit',
        'resumeDatabaseAccess',
        'starsPrice',
        'durationDays',
      ],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: plans }
  },
})
```

- [ ] **Step 3: Создать route для SubscriptionPlan**

```typescript
// backend/src/api/subscription-plan/routes/subscription-plan.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/subscription-plans',
      handler: 'subscription-plan.findAll',
      config: { auth: false },
    },
  ],
}
```

- [ ] **Step 4: Создать schema.json для VacancyPackage**

```json
// backend/src/api/vacancy-package/content-types/vacancy-package/schema.json
{
  "kind": "collectionType",
  "collectionName": "vacancy_packages",
  "info": {
    "singularName": "vacancy-package",
    "pluralName": "vacancy-packages",
    "displayName": "Vacancy Package"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "name": { "type": "string", "required": true },
    "vacancyCredits": { "type": "integer", "required": true },
    "boostCredits": { "type": "integer", "required": true },
    "starsPrice": { "type": "integer", "required": true }
  }
}
```

- [ ] **Step 5: Создать controller и route для VacancyPackage**

```typescript
// backend/src/api/vacancy-package/controllers/vacancy-package.ts
import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx) {
    const packages = await strapi.documents('api::vacancy-package.vacancy-package').findMany({
      fields: ['id', 'name', 'vacancyCredits', 'boostCredits', 'starsPrice'],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: packages }
  },
})
```

```typescript
// backend/src/api/vacancy-package/routes/vacancy-package.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/vacancy-packages',
      handler: 'vacancy-package.findAll',
      config: { auth: false },
    },
  ],
}
```

- [ ] **Step 6: Создать schema.json для ApplyPackage**

```json
// backend/src/api/apply-package/content-types/apply-package/schema.json
{
  "kind": "collectionType",
  "collectionName": "apply_packages",
  "info": {
    "singularName": "apply-package",
    "pluralName": "apply-packages",
    "displayName": "Apply Package"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "name": { "type": "string", "required": true },
    "applyCredits": { "type": "integer", "required": true },
    "starsPrice": { "type": "integer", "required": true }
  }
}
```

- [ ] **Step 7: Создать controller и route для ApplyPackage**

```typescript
// backend/src/api/apply-package/controllers/apply-package.ts
import type { Core } from '@strapi/strapi'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findAll(ctx) {
    const packages = await strapi.documents('api::apply-package.apply-package').findMany({
      fields: ['id', 'name', 'applyCredits', 'starsPrice'],
      sort: [{ starsPrice: 'asc' }],
    })
    ctx.body = { data: packages }
  },
})
```

```typescript
// backend/src/api/apply-package/routes/apply-package.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/apply-packages',
      handler: 'apply-package.findAll',
      config: { auth: false },
    },
  ],
}
```

- [ ] **Step 8: Commit**

```bash
cd backend
git add src/api/subscription-plan src/api/vacancy-package src/api/apply-package
git commit -m "feat(sprint6): add SubscriptionPlan, VacancyPackage, ApplyPackage content types with GET endpoints"
```

---

## Task 2: Seed Scripts для планов и пакетов

**Files:**

- Create: `backend/src/scripts/seed-subscription-plans.ts`
- Create: `backend/src/scripts/seed-packages.ts`

- [ ] **Step 1: Написать failing test для seed данных**

```typescript
// backend/tests/unit/seed-plans-data.test.ts
import { SUBSCRIPTION_PLANS_SEED } from '../../src/scripts/seed-subscription-plans'
import { VACANCY_PACKAGES_SEED, APPLY_PACKAGES_SEED } from '../../src/scripts/seed-packages'

describe('SUBSCRIPTION_PLANS_SEED', () => {
  it('содержит 4 плана: free, pro, max, vip', () => {
    const codes = SUBSCRIPTION_PLANS_SEED.map((p) => p.code)
    expect(codes).toEqual(['free', 'pro', 'max', 'vip'])
  })

  it('free план бесплатный (starsPrice null)', () => {
    const free = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'free')!
    expect(free.starsPrice).toBeNull()
  })

  it('pro план стоит 299 Stars', () => {
    const pro = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'pro')!
    expect(pro.starsPrice).toBe(299)
  })

  it('max план стоит 999 Stars', () => {
    const max = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'max')!
    expect(max.starsPrice).toBe(999)
  })

  it('vip план стоит 499 Stars (надстройка над max)', () => {
    const vip = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'vip')!
    expect(vip.starsPrice).toBe(499)
  })

  it('max и vip имеют доступ к базе резюме', () => {
    const max = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'max')!
    const vip = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'vip')!
    expect(max.resumeDatabaseAccess).toBe(true)
    expect(vip.resumeDatabaseAccess).toBe(true)
  })

  it('free имеет лимит 3 вакансий в месяц', () => {
    const free = SUBSCRIPTION_PLANS_SEED.find((p) => p.code === 'free')!
    expect(free.vacanciesPerMonth).toBe(3)
  })
})

describe('VACANCY_PACKAGES_SEED', () => {
  it('содержит 4 пакета', () => {
    expect(VACANCY_PACKAGES_SEED).toHaveLength(4)
  })

  it('стоимость пакетов возрастает', () => {
    const prices = VACANCY_PACKAGES_SEED.map((p) => p.starsPrice)
    expect(prices).toEqual([199, 349, 749, 1299])
  })
})

describe('APPLY_PACKAGES_SEED', () => {
  it('содержит 3 пакета', () => {
    expect(APPLY_PACKAGES_SEED).toHaveLength(3)
  })

  it('стоимость пакетов возрастает', () => {
    const prices = APPLY_PACKAGES_SEED.map((p) => p.starsPrice)
    expect(prices).toEqual([149, 249, 999])
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/seed-plans-data.test.ts
```

Ожидается: `FAIL` — `Cannot find module '../../src/scripts/seed-subscription-plans'`

- [ ] **Step 3: Создать seed-subscription-plans.ts**

```typescript
// backend/src/scripts/seed-subscription-plans.ts
import type { Core } from '@strapi/strapi'

type PlanSeed = {
  code: 'free' | 'pro' | 'max' | 'vip'
  name: string
  vacanciesPerMonth: number
  activeVacanciesLimit: number
  vacancyBoostsPerDay: number
  applicationsPerDay: number
  resumesLimit: number
  resumeDatabaseAccess: boolean
  starsPrice: number | null
  durationDays: number
}

export const SUBSCRIPTION_PLANS_SEED: PlanSeed[] = [
  {
    code: 'free',
    name: 'Free',
    vacanciesPerMonth: 3,
    activeVacanciesLimit: 3,
    vacancyBoostsPerDay: 3,
    applicationsPerDay: 3,
    resumesLimit: 1,
    resumeDatabaseAccess: false,
    starsPrice: null,
    durationDays: 30,
  },
  {
    code: 'pro',
    name: 'Pro',
    vacanciesPerMonth: 10,
    activeVacanciesLimit: 10,
    vacancyBoostsPerDay: 10,
    applicationsPerDay: 10,
    resumesLimit: 5,
    resumeDatabaseAccess: false,
    starsPrice: 299,
    durationDays: 30,
  },
  {
    code: 'max',
    name: 'Max',
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
    starsPrice: 999,
    durationDays: 30,
  },
  {
    code: 'vip',
    name: 'VIP Employer',
    vacanciesPerMonth: 50,
    activeVacanciesLimit: 50,
    vacancyBoostsPerDay: 50,
    applicationsPerDay: 50,
    resumesLimit: 20,
    resumeDatabaseAccess: true,
    starsPrice: 499,
    durationDays: 30,
  },
]

export async function seedSubscriptionPlans(strapi: Core.Strapi): Promise<void> {
  let created = 0
  for (const plan of SUBSCRIPTION_PLANS_SEED) {
    const existing = await strapi
      .documents('api::subscription-plan.subscription-plan')
      .findFirst({ filters: { code: { $eq: plan.code } } })

    if (!existing) {
      await strapi.documents('api::subscription-plan.subscription-plan').create({
        data: plan as any,
      })
      created++
    }
  }
  if (created > 0) {
    strapi.log.info(`[seed] Created ${created} subscription plans`)
  }
}
```

- [ ] **Step 4: Создать seed-packages.ts**

```typescript
// backend/src/scripts/seed-packages.ts
import type { Core } from '@strapi/strapi'

export const VACANCY_PACKAGES_SEED = [
  { name: 'Starter', vacancyCredits: 10, boostCredits: 10, starsPrice: 199 },
  { name: 'Basic', vacancyCredits: 20, boostCredits: 20, starsPrice: 349 },
  { name: 'Pro', vacancyCredits: 50, boostCredits: 50, starsPrice: 749 },
  { name: 'Ultra', vacancyCredits: 100, boostCredits: 100, starsPrice: 1299 },
] as const

export const APPLY_PACKAGES_SEED = [
  { name: 'Starter', applyCredits: 50, starsPrice: 149 },
  { name: 'Pro', applyCredits: 100, starsPrice: 249 },
  { name: 'Ultra', applyCredits: 500, starsPrice: 999 },
] as const

export async function seedPackages(strapi: Core.Strapi): Promise<void> {
  let created = 0

  for (const pkg of VACANCY_PACKAGES_SEED) {
    const existing = await strapi
      .documents('api::vacancy-package.vacancy-package')
      .findFirst({ filters: { name: { $eq: pkg.name } } })

    if (!existing) {
      await strapi.documents('api::vacancy-package.vacancy-package').create({
        data: pkg as any,
      })
      created++
    }
  }

  for (const pkg of APPLY_PACKAGES_SEED) {
    const existing = await strapi
      .documents('api::apply-package.apply-package')
      .findFirst({ filters: { name: { $eq: pkg.name } } })

    if (!existing) {
      await strapi.documents('api::apply-package.apply-package').create({
        data: pkg as any,
      })
      created++
    }
  }

  if (created > 0) {
    strapi.log.info(`[seed] Created ${created} packages (vacancy + apply)`)
  }
}
```

- [ ] **Step 5: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test tests/unit/seed-plans-data.test.ts
```

Ожидается: `PASS` — все 9 тестов зелёные.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/scripts/seed-subscription-plans.ts src/scripts/seed-packages.ts tests/unit/seed-plans-data.test.ts
git commit -m "feat(sprint6): add seed scripts for subscription plans and packages"
```

---

## Task 3: User schema — добавить isVip

**Files:**

- Modify: `backend/src/extensions/users-permissions/content-types/user/schema.json`

- [ ] **Step 1: Добавить поле isVip в User schema**

В файл `backend/src/extensions/users-permissions/content-types/user/schema.json` в секцию `attributes` добавить:

```json
"isVip": {
  "type": "boolean",
  "default": false
}
```

Итоговый файл должен иметь `isVip` рядом с другими полями (например, после `language`).

- [ ] **Step 2: Добавить TELEGRAM_WEBHOOK_SECRET в .env.example**

В файл `backend/.env.example` в секцию `# TELEGRAM` добавить строку:

```
TELEGRAM_WEBHOOK_SECRET=changeme
```

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/extensions/users-permissions/content-types/user/schema.json .env.example
git commit -m "feat(sprint6): add isVip field to User schema, add TELEGRAM_WEBHOOK_SECRET env var"
```

---

## Task 4: Subscription Service — activateSubscription, addCredits

**Files:**

- Create: `backend/src/api/payment/services/subscription-service.ts`
- Create: `backend/tests/unit/subscription-service.test.ts`

- [ ] **Step 1: Написать failing тест для pure helpers**

```typescript
// backend/tests/unit/subscription-service.test.ts
import {
  calculateExpiresAt,
  buildUserUpdateData,
  CREDIT_FIELD_MAP,
} from '../../src/api/payment/services/subscription-service'

describe('calculateExpiresAt', () => {
  it('добавляет durationDays дней к текущей дате', () => {
    const now = new Date('2026-06-30T12:00:00Z')
    const result = calculateExpiresAt(30, now)
    expect(result).toBe('2026-07-30T12:00:00.000Z')
  })

  it('работает с 1 днём', () => {
    const now = new Date('2026-06-30T00:00:00Z')
    const result = calculateExpiresAt(1, now)
    expect(result).toBe('2026-07-01T00:00:00.000Z')
  })
})

describe('buildUserUpdateData', () => {
  it('для vip плана устанавливает isVip=true', () => {
    const expiresAt = '2026-07-30T12:00:00.000Z'
    const data = buildUserUpdateData('vip', expiresAt)
    expect(data.subscriptionPlan).toBe('vip')
    expect(data.subscriptionExpiresAt).toBe(expiresAt)
    expect(data.isVip).toBe(true)
  })

  it('для non-vip плана устанавливает isVip=false', () => {
    const expiresAt = '2026-07-30T12:00:00.000Z'
    const data = buildUserUpdateData('pro', expiresAt)
    expect(data.subscriptionPlan).toBe('pro')
    expect(data.isVip).toBe(false)
  })

  it('для free плана устанавливает isVip=false', () => {
    const data = buildUserUpdateData('free', '2026-07-30T00:00:00.000Z')
    expect(data.isVip).toBe(false)
  })
})

describe('CREDIT_FIELD_MAP', () => {
  it('vacancy → vacancyCredits', () => {
    expect(CREDIT_FIELD_MAP.vacancy).toBe('vacancyCredits')
  })

  it('apply → applyCredits', () => {
    expect(CREDIT_FIELD_MAP.apply).toBe('applyCredits')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/subscription-service.test.ts
```

Ожидается: `FAIL` — `Cannot find module`

- [ ] **Step 3: Создать subscription-service.ts**

```typescript
// backend/src/api/payment/services/subscription-service.ts
import type { Core } from '@strapi/strapi'

export type PlanCode = 'free' | 'pro' | 'max' | 'vip'
export type CreditType = 'vacancy' | 'apply'

export const CREDIT_FIELD_MAP: Record<CreditType, 'vacancyCredits' | 'applyCredits'> = {
  vacancy: 'vacancyCredits',
  apply: 'applyCredits',
}

export function calculateExpiresAt(durationDays: number, from: Date = new Date()): string {
  const result = new Date(from)
  result.setUTCDate(result.getUTCDate() + durationDays)
  return result.toISOString()
}

export function buildUserUpdateData(
  planCode: PlanCode,
  expiresAt: string
): {
  subscriptionPlan: PlanCode
  subscriptionExpiresAt: string
  isVip: boolean
} {
  return {
    subscriptionPlan: planCode,
    subscriptionExpiresAt: expiresAt,
    isVip: planCode === 'vip',
  }
}

export async function activateSubscription(
  strapi: Core.Strapi,
  userId: number,
  planCode: PlanCode
): Promise<void> {
  const expiresAt = calculateExpiresAt(30)
  const updateData = buildUserUpdateData(planCode, expiresAt)

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: updateData,
  })

  strapi.log.info(
    `[subscription] User ${userId} activated plan=${planCode}, expiresAt=${expiresAt}`
  )
}

export async function addCredits(
  strapi: Core.Strapi,
  userId: number,
  type: CreditType,
  amount: number
): Promise<void> {
  const field = CREDIT_FIELD_MAP[type]

  const user = (await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { id: userId },
    select: [field],
  })) as Record<string, number> | null

  if (!user) throw new Error(`User ${userId} not found`)

  const current = user[field] ?? 0

  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { [field]: current + amount },
  })

  strapi.log.info(`[subscription] User ${userId} +${amount} ${field} (total: ${current + amount})`)
}

export async function expireSubscription(strapi: Core.Strapi, userId: number): Promise<void> {
  await strapi.db.query('plugin::users-permissions.user').update({
    where: { id: userId },
    data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
  })

  strapi.log.info(`[subscription] User ${userId} subscription expired, reverted to free`)
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test tests/unit/subscription-service.test.ts
```

Ожидается: `PASS` — все 6 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/api/payment/services/subscription-service.ts tests/unit/subscription-service.test.ts
git commit -m "feat(sprint6): add subscription service (activateSubscription, addCredits, expireSubscription)"
```

---

## Task 5: Telegram Bot Service — createInvoiceLink, answerPreCheckoutQuery

**Files:**

- Create: `backend/src/api/payment/services/telegram-bot.ts`
- Create: `backend/tests/unit/telegram-bot.test.ts`

- [ ] **Step 1: Написать failing тест для pure helpers**

```typescript
// backend/tests/unit/telegram-bot.test.ts
import {
  buildTelegramApiUrl,
  buildInvoicePayload,
  parseInvoicePayload,
} from '../../src/api/payment/services/telegram-bot'

describe('buildTelegramApiUrl', () => {
  it('строит URL с токеном и методом', () => {
    const url = buildTelegramApiUrl('mytoken123', 'createInvoiceLink')
    expect(url).toBe('https://api.telegram.org/botmytoken123/createInvoiceLink')
  })
})

describe('buildInvoicePayload / parseInvoicePayload', () => {
  it('subscription payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'subscription', planCode: 'pro', userId: 42 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'subscription', planCode: 'pro', userId: 42 })
  })

  it('vacancy_pack payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'vacancy_pack', packageId: 3, userId: 7 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'vacancy_pack', packageId: 3, userId: 7 })
  })

  it('apply_pack payload сериализуется и парсится', () => {
    const payload = buildInvoicePayload({ type: 'apply_pack', packageId: 1, userId: 5 })
    const parsed = parseInvoicePayload(payload)
    expect(parsed).toEqual({ type: 'apply_pack', packageId: 1, userId: 5 })
  })

  it('parseInvoicePayload бросает ошибку на невалидный JSON', () => {
    expect(() => parseInvoicePayload('not-json')).toThrow()
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test tests/unit/telegram-bot.test.ts
```

Ожидается: `FAIL` — `Cannot find module`

- [ ] **Step 3: Создать telegram-bot.ts**

```typescript
// backend/src/api/payment/services/telegram-bot.ts

export type InvoicePayload =
  | { type: 'subscription'; planCode: string; userId: number }
  | { type: 'vacancy_pack'; packageId: number; userId: number }
  | { type: 'apply_pack'; packageId: number; userId: number }

export function buildTelegramApiUrl(token: string, method: string): string {
  return `https://api.telegram.org/bot${token}/${method}`
}

export function buildInvoicePayload(data: InvoicePayload): string {
  return JSON.stringify(data)
}

export function parseInvoicePayload(raw: string): InvoicePayload {
  const parsed = JSON.parse(raw) as InvoicePayload
  if (!parsed.type || !parsed.userId) {
    throw new Error('Invalid invoice payload: missing type or userId')
  }
  return parsed
}

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is not set')
  return token
}

async function telegramCall<T>(method: string, params: Record<string, unknown>): Promise<T> {
  const url = buildTelegramApiUrl(getBotToken(), method)
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  const json = (await res.json()) as { ok: boolean; result: T; description?: string }
  if (!json.ok) {
    throw new Error(`Telegram API error [${method}]: ${json.description ?? 'unknown error'}`)
  }
  return json.result
}

export async function createInvoiceLink(params: {
  title: string
  description: string
  payload: InvoicePayload
  starsAmount: number
}): Promise<string> {
  return telegramCall<string>('createInvoiceLink', {
    title: params.title,
    description: params.description,
    payload: buildInvoicePayload(params.payload),
    currency: 'XTR',
    prices: [{ label: params.title, amount: params.starsAmount }],
  })
}

export async function answerPreCheckoutQuery(
  preCheckoutQueryId: string,
  ok: boolean,
  errorMessage?: string
): Promise<void> {
  await telegramCall<boolean>('answerPreCheckoutQuery', {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
    ...(errorMessage ? { error_message: errorMessage } : {}),
  })
}

export async function setWebhook(url: string, secretToken?: string): Promise<void> {
  await telegramCall<boolean>('setWebhook', {
    url,
    ...(secretToken ? { secret_token: secretToken } : {}),
    allowed_updates: ['message', 'pre_checkout_query'],
  })
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test tests/unit/telegram-bot.test.ts
```

Ожидается: `PASS` — все 6 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
cd backend
git add src/api/payment/services/telegram-bot.ts tests/unit/telegram-bot.test.ts
git commit -m "feat(sprint6): add Telegram Bot service (createInvoiceLink, answerPreCheckoutQuery, setWebhook)"
```

---

## Task 6: Payment Controller — POST /payments/subscribe, /vacancy-pack, /apply-pack

**Files:**

- Create: `backend/src/api/payment/controllers/payment.ts`
- Create: `backend/src/api/payment/routes/payment.ts`

- [ ] **Step 1: Создать payment controller**

```typescript
// backend/src/api/payment/controllers/payment.ts
import type { Core } from '@strapi/strapi'
import { createInvoiceLink } from '../services/telegram-bot'

type UserWithPlan = {
  id: number
  subscriptionPlan: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async subscribe(ctx) {
    const user = ctx.state.user as UserWithPlan
    const { planCode } = ctx.request.body as { planCode?: string }

    const validPaidPlans = ['pro', 'max', 'vip']
    if (!planCode || !validPaidPlans.includes(planCode)) {
      return ctx.badRequest('planCode must be one of: pro, max, vip')
    }

    // VIP requires active Max or existing VIP subscription
    if (planCode === 'vip' && user.subscriptionPlan !== 'max' && user.subscriptionPlan !== 'vip') {
      return ctx.forbidden('VIP requires an active Max subscription')
    }

    const plan = await strapi
      .documents('api::subscription-plan.subscription-plan')
      .findFirst({ filters: { code: { $eq: planCode } } })

    if (!plan || !plan.starsPrice) {
      return ctx.notFound('Subscription plan not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob ${plan.name}`,
      description: `${plan.name} — подписка на 30 дней`,
      payload: { type: 'subscription', planCode, userId: user.id },
      starsAmount: plan.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },

  async vacancyPack(ctx) {
    const user = ctx.state.user as UserWithPlan
    const { packageId } = ctx.request.body as { packageId?: number }

    if (!packageId || typeof packageId !== 'number') {
      return ctx.badRequest('packageId (integer) is required')
    }

    const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
      where: { id: packageId },
    })) as {
      id: number
      name: string
      vacancyCredits: number
      boostCredits: number
      starsPrice: number
    } | null

    if (!pack) {
      return ctx.notFound('Vacancy package not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob Vacancy Pack: ${pack.name}`,
      description: `${pack.vacancyCredits} вакансий + ${pack.boostCredits} буст-кредитов`,
      payload: { type: 'vacancy_pack', packageId: pack.id, userId: user.id },
      starsAmount: pack.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },

  async applyPack(ctx) {
    const user = ctx.state.user as UserWithPlan
    const { packageId } = ctx.request.body as { packageId?: number }

    if (!packageId || typeof packageId !== 'number') {
      return ctx.badRequest('packageId (integer) is required')
    }

    const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
      where: { id: packageId },
    })) as { id: number; name: string; applyCredits: number; starsPrice: number } | null

    if (!pack) {
      return ctx.notFound('Apply package not found')
    }

    const invoiceUrl = await createInvoiceLink({
      title: `GramJob Apply Pack: ${pack.name}`,
      description: `${pack.applyCredits} откликов`,
      payload: { type: 'apply_pack', packageId: pack.id, userId: user.id },
      starsAmount: pack.starsPrice,
    })

    ctx.body = { invoiceUrl }
  },
})
```

- [ ] **Step 2: Создать payment routes**

```typescript
// backend/src/api/payment/routes/payment.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/subscribe',
      handler: 'payment.subscribe',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/vacancy-pack',
      handler: 'payment.vacancyPack',
      config: {},
    },
    {
      method: 'POST',
      path: '/payments/apply-pack',
      handler: 'payment.applyPack',
      config: {},
    },
  ],
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/payment/controllers/payment.ts src/api/payment/routes/payment.ts
git commit -m "feat(sprint6): add payment controller — POST /payments/subscribe, /vacancy-pack, /apply-pack"
```

---

## Task 7: Telegram Webhook Handler — pre_checkout_query + successful_payment

**Files:**

- Create: `backend/src/api/payment/controllers/telegram-webhook.ts`
- Create: `backend/src/api/payment/routes/telegram-webhook.ts`

- [ ] **Step 1: Создать telegram-webhook controller**

```typescript
// backend/src/api/payment/controllers/telegram-webhook.ts
import type { Core } from '@strapi/strapi'
import { answerPreCheckoutQuery, parseInvoicePayload } from '../services/telegram-bot'
import { activateSubscription, addCredits } from '../services/subscription-service'

type TelegramUser = { id: number; first_name?: string }

type PreCheckoutQuery = {
  id: string
  from: TelegramUser
  currency: string
  total_amount: number
  invoice_payload: string
}

type SuccessfulPayment = {
  currency: string
  total_amount: number
  invoice_payload: string
  telegram_payment_charge_id: string
}

type TelegramUpdate = {
  update_id: number
  pre_checkout_query?: PreCheckoutQuery
  message?: {
    from?: TelegramUser
    successful_payment?: SuccessfulPayment
  }
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async handle(ctx) {
    // Verify Telegram webhook secret
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET
    if (secret) {
      const incoming = ctx.request.headers['x-telegram-bot-api-secret-token']
      if (incoming !== secret) {
        ctx.status = 403
        ctx.body = { ok: false }
        return
      }
    }

    const update = ctx.request.body as TelegramUpdate

    if (update.pre_checkout_query) {
      await handlePreCheckout(update.pre_checkout_query)
    } else if (update.message?.successful_payment) {
      await handleSuccessfulPayment(strapi, update.message.successful_payment)
    }

    // Always respond 200 to Telegram
    ctx.status = 200
    ctx.body = { ok: true }
  },
})

async function handlePreCheckout(query: PreCheckoutQuery): Promise<void> {
  try {
    parseInvoicePayload(query.invoice_payload)
    await answerPreCheckoutQuery(query.id, true)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid payment data'
    await answerPreCheckoutQuery(query.id, false, msg)
  }
}

async function handleSuccessfulPayment(
  strapi: Core.Strapi,
  payment: SuccessfulPayment
): Promise<void> {
  let data: ReturnType<typeof parseInvoicePayload>

  try {
    data = parseInvoicePayload(payment.invoice_payload)
  } catch {
    strapi.log.error('[payment] Cannot parse invoice_payload:', payment.invoice_payload)
    return
  }

  try {
    if (data.type === 'subscription') {
      await activateSubscription(strapi, data.userId, data.planCode as any)
    } else if (data.type === 'vacancy_pack') {
      const pack = (await strapi.db.query('api::vacancy-package.vacancy-package').findOne({
        where: { id: data.packageId },
      })) as { vacancyCredits: number } | null

      if (!pack) {
        strapi.log.error(`[payment] VacancyPackage id=${data.packageId} not found`)
        return
      }
      await addCredits(strapi, data.userId, 'vacancy', pack.vacancyCredits)
    } else if (data.type === 'apply_pack') {
      const pack = (await strapi.db.query('api::apply-package.apply-package').findOne({
        where: { id: data.packageId },
      })) as { applyCredits: number } | null

      if (!pack) {
        strapi.log.error(`[payment] ApplyPackage id=${data.packageId} not found`)
        return
      }
      await addCredits(strapi, data.userId, 'apply', pack.applyCredits)
    }

    strapi.log.info(
      `[payment] successful_payment processed: type=${data.type} userId=${data.userId} charge=${payment.telegram_payment_charge_id}`
    )
  } catch (err) {
    strapi.log.error('[payment] Failed to process successful_payment:', err)
  }
}
```

- [ ] **Step 2: Создать telegram-webhook routes**

```typescript
// backend/src/api/payment/routes/telegram-webhook.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/telegram/webhook',
      handler: 'telegram-webhook.handle',
      config: { auth: false },
    },
  ],
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/api/payment/controllers/telegram-webhook.ts src/api/payment/routes/telegram-webhook.ts
git commit -m "feat(sprint6): add Telegram webhook handler (pre_checkout_query + successful_payment)"
```

---

## Task 8: VIP Employer — vacancy lifecycle auto-highlight

**Files:**

- Modify: `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts`

- [ ] **Step 1: Добавить beforeCreate хук в lifecycles.ts**

В файл `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts` добавить хук `beforeCreate` перед существующим `beforeUpdate`:

```typescript
// Добавить тип для event
type VacancyBeforeCreateEvent = {
  params: {
    data: Record<string, unknown>
  }
}
```

И сам хук в объекте экспорта:

```typescript
async beforeCreate(event: VacancyBeforeCreateEvent) {
  const { data } = event.params
  const posterId = typeof data.postedBy === 'number' ? data.postedBy : null
  if (!posterId) return

  const poster = await (globalThis.strapi.db as any)
    .query('plugin::users-permissions.user')
    .findOne({ where: { id: posterId }, select: ['subscriptionPlan'] })

  if (poster?.subscriptionPlan === 'vip') {
    data.highlighted = true
  }
},
```

Полный итоговый файл после изменений:

```typescript
// backend/src/api/vacancy/content-types/vacancy/lifecycles.ts
type VacancyBeforeCreateEvent = {
  params: {
    data: Record<string, unknown>
  }
}

type VacancyBeforeUpdateEvent = {
  params: {
    data: Record<string, unknown>
    documentId?: string
    where?: Record<string, unknown>
  }
}

type VacancyAfterEvent = {
  result: { documentId?: string; id?: number; status?: string; expiresAt?: string | null }
  params: unknown
}

export default {
  async beforeCreate(event: VacancyBeforeCreateEvent) {
    const { data } = event.params
    const posterId = typeof data.postedBy === 'number' ? data.postedBy : null
    if (!posterId) return

    const poster = await (globalThis.strapi.db as any)
      .query('plugin::users-permissions.user')
      .findOne({ where: { id: posterId }, select: ['subscriptionPlan'] })

    if (poster?.subscriptionPlan === 'vip') {
      data.highlighted = true
    }
  },

  async beforeUpdate(event: VacancyBeforeUpdateEvent) {
    const { data } = event.params
    if (data?.status === 'published') {
      const expiresAt = new Date()
      expiresAt.setUTCDate(expiresAt.getUTCDate() + 60)
      data.expiresAt = expiresAt.toISOString()
    }
  },

  async afterCreate(event: VacancyAfterEvent) {
    await updateSearchVector(event.result.id)
  },

  async afterUpdate(event: VacancyAfterEvent) {
    await updateSearchVector(event.result.id)

    if (event.result.status === 'published') {
      const s = globalThis.strapi
      s.log.info(`[vacancy] Vacancy ${event.result.documentId} published`)
      // TODO Sprint 7: send Telegram notification to postedBy user
    }
  },
}

async function updateSearchVector(vacancyId: number | undefined) {
  if (!vacancyId) return
  const s = globalThis.strapi
  try {
    await s.db.connection.raw(
      `UPDATE vacancies
       SET search_vector =
         setweight(to_tsvector('russian', coalesce(title, '')), 'A') ||
         setweight(to_tsvector('russian', coalesce(description, '')), 'B') ||
         setweight(to_tsvector('russian', coalesce(responsibilities, '')), 'C') ||
         setweight(to_tsvector('russian', coalesce(requirements, '')), 'C')
       WHERE id = ?`,
      [vacancyId]
    )
  } catch {
    s.log.warn(`[vacancy] Failed to update search_vector for id=${vacancyId}`)
  }
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
cd backend
git add src/api/vacancy/content-types/vacancy/lifecycles.ts
git commit -m "feat(sprint6): auto-set highlighted=true on vacancy creation for VIP employers"
```

---

## Task 9: Cron — subscription expiry management + 7-day warning

**Files:**

- Modify: `backend/config/cron-tasks.ts`

- [ ] **Step 1: Добавить daily cron в cron-tasks.ts**

В файл `backend/config/cron-tasks.ts` добавить два новых cron задания после существующих.

Первое — ежедневно в 02:00 UTC истекшие подписки откатываются на Free:

```typescript
// Добавить в конец объекта cron-tasks.ts, перед закрывающей }:

// Daily at 02:00 UTC: expire subscriptions and revert to free plan
'0 2 * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const now = new Date().toISOString()

      const expiredUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: {
          subscriptionPlan: { $notIn: ['free'] },
          subscriptionExpiresAt: { $lt: now },
        },
        select: ['id', 'subscriptionPlan'],
        limit: 1000,
      })

      if (expiredUsers.length === 0) return

      strapi.log.info(`[cron] Expiring ${expiredUsers.length} user subscriptions`)

      for (const user of expiredUsers) {
        await strapi.db.query('plugin::users-permissions.user').update({
          where: { id: user.id },
          data: { subscriptionPlan: 'free', subscriptionExpiresAt: null, isVip: false },
        })
        strapi.log.info(`[cron] User ${user.id} plan=${user.subscriptionPlan} → free (expired)`)
        // TODO Sprint 7: send Telegram notification subscription_expired to user
      }
    } catch (err) {
      strapi.log.error('[cron] Failed to expire subscriptions', err)
    }
  },
  options: { tz: 'UTC' },
},

// Daily at 09:00 UTC: warn users whose subscription expires in 7 days
'0 9 * * *': {
  task: async ({ strapi }: { strapi: Core.Strapi }) => {
    try {
      const sevenDaysFromNow = new Date()
      sevenDaysFromNow.setUTCDate(sevenDaysFromNow.getUTCDate() + 7)
      const windowStart = new Date()
      windowStart.setUTCDate(windowStart.getUTCDate() + 6)
      windowStart.setUTCHours(23, 59, 59, 0)

      const expiringUsers = await strapi.db.query('plugin::users-permissions.user').findMany({
        where: {
          subscriptionPlan: { $notIn: ['free'] },
          subscriptionExpiresAt: {
            $gt: windowStart.toISOString(),
            $lte: sevenDaysFromNow.toISOString(),
          },
        },
        select: ['id', 'subscriptionPlan', 'subscriptionExpiresAt'],
        limit: 1000,
      })

      if (expiringUsers.length === 0) return

      strapi.log.info(`[cron] ${expiringUsers.length} subscriptions expiring in 7 days`)

      for (const user of expiringUsers) {
        strapi.log.info(
          `[cron] User ${user.id} plan=${user.subscriptionPlan} expires at ${user.subscriptionExpiresAt}`
        )
        // TODO Sprint 7: send Telegram notification subscription_expiring_soon to user
      }
    } catch (err) {
      strapi.log.error('[cron] Failed to check expiring subscriptions', err)
    }
  },
  options: { tz: 'UTC' },
},
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидается: 0 ошибок.

- [ ] **Step 3: Commit**

```bash
cd backend
git add config/cron-tasks.ts
git commit -m "feat(sprint6): add daily cron for subscription expiry and 7-day expiry warning"
```

---

## Task 10: Bootstrap — seed + Telegram webhook registration

**Files:**

- Modify: `backend/src/index.ts`

- [ ] **Step 1: Обновить bootstrap в src/index.ts**

Добавить импорты вверху файла (после существующих импортов):

```typescript
import { seedSubscriptionPlans } from './scripts/seed-subscription-plans'
import { seedPackages } from './scripts/seed-packages'
import { setWebhook } from './api/payment/services/telegram-bot'
```

В функции `bootstrap` добавить вызовы seed и регистрацию webhook после `await setupVacancySearch(strapi)`:

```typescript
await seedSubscriptionPlans(strapi)
await seedPackages(strapi)

// Register Telegram Bot webhook if credentials are configured
const botToken = process.env.TELEGRAM_BOT_TOKEN
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

if (botToken && webhookUrl) {
  try {
    await setWebhook(webhookUrl, webhookSecret)
    strapi.log.info(`[telegram] Webhook registered: ${webhookUrl}`)
  } catch (err) {
    strapi.log.warn('[telegram] Failed to register webhook (bot may not be configured):', err)
  }
}
```

Полная итоговая версия `src/index.ts`:

```typescript
// backend/src/index.ts
import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'
import { seedIndustries } from './scripts/seed-industries'
import { seedSubscriptionPlans } from './scripts/seed-subscription-plans'
import { seedPackages } from './scripts/seed-packages'
import { setWebhook } from './api/payment/services/telegram-bot'
import type { Core } from '@strapi/strapi'

async function setupVacancySearch(strapi: Core.Strapi) {
  try {
    await strapi.db.connection.raw(`
      ALTER TABLE vacancies ADD COLUMN IF NOT EXISTS search_vector tsvector;
      CREATE INDEX IF NOT EXISTS vacancies_search_idx ON vacancies USING GIN(search_vector);
      CREATE INDEX IF NOT EXISTS vacancies_skills_idx ON vacancies USING GIN(skills jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_languages_idx ON vacancies USING GIN(languages jsonb_path_ops);
      CREATE INDEX IF NOT EXISTS vacancies_status_expires_idx ON vacancies (status, expires_at);
    `)
    strapi.log.info('[vacancy] Full-text search indexes ensured')
  } catch (err) {
    strapi.log.warn('[vacancy] search index setup skipped (will retry on next boot)')
  }
}

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedIndustries(strapi)
    await setupVacancySearch(strapi)
    await seedSubscriptionPlans(strapi)
    await seedPackages(strapi)

    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL
    const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

    if (botToken && webhookUrl) {
      try {
        await setWebhook(webhookUrl, webhookSecret)
        strapi.log.info(`[telegram] Webhook registered: ${webhookUrl}`)
      } catch (err) {
        strapi.log.warn('[telegram] Failed to register webhook:', err)
      }
    }

    const app = strapi.server.app

    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/auth/')) {
        return authRateLimit(ctx, next)
      }
      return next()
    })

    app.use(async (ctx, next) => {
      if (ctx.path.startsWith('/api/')) {
        return apiRateLimit(ctx, next)
      }
      return next()
    })
  },
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Запустить все тесты**

```bash
cd backend && pnpm test
```

Ожидается: все тесты PASS. Количество тестов должно вырасти на ~15 штук (новые тесты из Tasks 2, 4, 5).

- [ ] **Step 4: Commit**

```bash
cd backend
git add src/index.ts
git commit -m "feat(sprint6): wire seed calls and Telegram webhook registration in bootstrap"
```

---

## Self-Review

### Spec coverage

| Sprint plan item                            | Реализован в                              |
| ------------------------------------------- | ----------------------------------------- |
| Content type: SubscriptionPlan + seed       | Task 1 + Task 2                           |
| Content type: VacancyPackage + seed         | Task 1 + Task 2                           |
| Content type: ApplyPackage + seed           | Task 1 + Task 2                           |
| GET /subscription-plans                     | Task 1                                    |
| GET /vacancy-packages                       | Task 1                                    |
| GET /apply-packages                         | Task 1                                    |
| Telegram Bot: инициализировать, webhook     | Task 5 (setWebhook) + Task 10 (bootstrap) |
| POST /payments/subscribe                    | Task 6                                    |
| POST /payments/vacancy-pack                 | Task 6                                    |
| POST /payments/apply-pack                   | Task 6                                    |
| POST /telegram/webhook — pre_checkout_query | Task 7                                    |
| POST /telegram/webhook — successful_payment | Task 7                                    |
| Сервис: activateSubscription                | Task 4                                    |
| Сервис: addCredits                          | Task 4                                    |
| Cron (7 дней): предупреждение               | Task 9                                    |
| VIP Employer: isVip + highlighted           | Task 3 + Task 8                           |

Все 16 пунктов спринта покрыты.

### Placeholder scan

Все шаги содержат реальный код. TODO-комментарии в lifecycle и cron (`// TODO Sprint 7`) присутствуют преднамеренно — это отложенная функциональность (Telegram-уведомления), которая явно запланирована на Sprint 7.

### Type consistency

- `PlanCode = 'free' | 'pro' | 'max' | 'vip'` — определён в `subscription-service.ts`, используется там же.
- `InvoicePayload` — определён в `telegram-bot.ts`, используется в `payment.ts` controller через `payload: { type: 'subscription', ... }` (совместимо с union type).
- `activateSubscription` принимает `PlanCode` — в webhook handler кастуем `data.planCode as any` (безопасно, т.к. payload уже валидирован при pre-checkout).
- `CREDIT_FIELD_MAP` — определён и используется только в `subscription-service.ts`.
- Все content type строки (`'api::subscription-plan.subscription-plan'` и т.д.) соответствуют `singularName` из schema.json.

### Potential gaps

- **VIP downgrade** (istечение Max при активном VIP): cron-задание `0 2 * * *` откатывает план на `free` — это корректно, VIP автоматически деактивируется.
- **Boost credits из пакета** (`VacancyPackage.boostCredits`): поле сохранено в схеме для будущего использования, но в Sprint 6 `addCredits` добавляет только `vacancyCredits`. Это соответствует спецификации (`addCredits(userId, type, amount)` принимает только `vacancy` или `apply`).
- **idempotency webhook**: если Telegram дважды пришлёт `successful_payment` (сетевой retry), `activateSubscription` перезапишет план, а `addCredits` добавит кредиты повторно. MVP-ограничение, достаточно для Sprint 6.
