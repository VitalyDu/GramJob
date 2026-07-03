# Sprint 3 Backend — Vacancies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать полный CRUD для вакансий со всеми endpoint-ами, лимитами подписок, бустами, full-text search на PostgreSQL tsvector, lifecycle hooks и cron-задачей истечения срока публикации.

**Architecture:** Vacancy API следует паттернам Company API (Sprint 2): custom routes file с явным порядком, policy для проверки владельца, сервисный слой отделяет бизнес-логику от контроллера. Credits и лимиты планов хранятся на модели User, лимиты планов захардкожены до Sprint 6 (когда появится SubscriptionPlan content type). Full-text search реализован через PostgreSQL tsvector + GIN-индекс, который обновляется lifecycle-хуком. Cron-задача истечения срока запускается каждый час через `config/cron-tasks.ts`.

**Tech Stack:** Strapi 5, PostgreSQL, TypeScript, Jest (unit), Strapi Document Service API, raw Knex для FTS-запросов

---

## Карта файлов

**Создать:**

```
backend/src/api/vacancy/
├── content-types/vacancy/
│   ├── schema.json            -- Схема контент-типа Vacancy (все поля из БД-схемы)
│   └── lifecycles.ts          -- afterCreate/afterUpdate: обновить search_vector в БД
├── controllers/vacancy.ts     -- HTTP-хэндлеры всех endpoint-ов
├── routes/vacancy.ts          -- Маршруты (порядок критичен: /my и /slug/:slug ДО /:id)
├── services/
│   ├── vacancy.ts             -- createVacancy, помощники для FTS-поиска
│   ├── vacancy-utils.ts       -- Чистые функции: canPublish, canBoost, canArchive, canEdit
│   └── credit-service.ts      -- checkAndConsumeVacancyCredit, checkAndConsumeBoost
└── policies/is-vacancy-owner.ts  -- Policy: проверить что ctx.state.user = postedBy

backend/src/api/vacancy-source/
├── content-types/vacancy-source/
│   └── schema.json            -- VacancySource для внешних вакансий
├── controllers/vacancy-source.ts  -- Strapi default (no custom endpoints)
├── routes/vacancy-source.ts   -- Пустые маршруты (не публикуются)
└── services/vacancy-source.ts -- Strapi default

backend/config/cron-tasks.ts   -- Hourly cron: expire vacancies (expiresAt < now → expired)
```

**Изменить:**

```
backend/src/index.ts           -- bootstrap: добавить SQL для search_vector + GIN-индексов
backend/src/api/company/controllers/company.ts  -- replace stub vacancy check in delete
```

**Тесты:**

```
backend/tests/unit/vacancy-utils.test.ts    -- canPublish, canBoost, canArchive, canEdit
backend/tests/unit/is-vacancy-owner.test.ts -- checkIsOwner pure function
backend/tests/unit/credit-service.test.ts   -- getLimitForPlan, getBoostsLimitForPlan
```

---

## Task 1: Content type schema — Vacancy

**Files:**

- Create: `backend/src/api/vacancy/content-types/vacancy/schema.json`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "vacancies",
  "info": {
    "singularName": "vacancy",
    "pluralName": "vacancies",
    "displayName": "Vacancy",
    "description": "Job vacancy posting"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "company": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::company.company"
    },
    "postedBy": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "title": {
      "type": "string",
      "required": true
    },
    "industry": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::industry.industry",
      "required": true
    },
    "specialization": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::specialization.specialization",
      "required": true
    },
    "employmentType": {
      "type": "enumeration",
      "enum": ["full-time", "part-time", "contract", "internship", "freelance"],
      "required": true
    },
    "workFormat": {
      "type": "enumeration",
      "enum": ["office", "remote", "hybrid"],
      "required": true
    },
    "seniority": {
      "type": "enumeration",
      "enum": ["intern", "junior", "middle", "senior", "lead", "principal"],
      "required": true
    },
    "country": {
      "type": "string",
      "required": true
    },
    "city": {
      "type": "string"
    },
    "salaryFrom": {
      "type": "integer"
    },
    "salaryTo": {
      "type": "integer"
    },
    "salaryCurrency": {
      "type": "enumeration",
      "enum": ["USD", "EUR", "RUB", "GBP"]
    },
    "description": {
      "type": "richtext",
      "required": true
    },
    "responsibilities": {
      "type": "richtext",
      "required": true
    },
    "requirements": {
      "type": "richtext",
      "required": true
    },
    "conditions": {
      "type": "richtext"
    },
    "skills": {
      "type": "json"
    },
    "languages": {
      "type": "json"
    },
    "experienceYears": {
      "type": "integer"
    },
    "sourceType": {
      "type": "enumeration",
      "enum": ["internal", "external"],
      "default": "internal",
      "required": true
    },
    "sourceName": {
      "type": "string"
    },
    "sourceUrl": {
      "type": "string"
    },
    "highlighted": {
      "type": "boolean",
      "default": false
    },
    "urgent": {
      "type": "boolean",
      "default": false
    },
    "topPlacement": {
      "type": "boolean",
      "default": false
    },
    "views": {
      "type": "integer",
      "default": 0
    },
    "uniqueViews": {
      "type": "integer",
      "default": 0
    },
    "applicationsCount": {
      "type": "integer",
      "default": 0
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "moderation", "published", "rejected", "expired", "archived"],
      "default": "draft",
      "required": true
    },
    "expiresAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/vacancy/content-types/vacancy/schema.json
git commit -m "feat(backend): add Vacancy content type schema"
```

---

## Task 2: Content type schema — VacancySource

**Files:**

- Create: `backend/src/api/vacancy-source/content-types/vacancy-source/schema.json`
- Create: `backend/src/api/vacancy-source/controllers/vacancy-source.ts`
- Create: `backend/src/api/vacancy-source/routes/vacancy-source.ts`
- Create: `backend/src/api/vacancy-source/services/vacancy-source.ts`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "vacancy_sources",
  "info": {
    "singularName": "vacancy-source",
    "pluralName": "vacancy-sources",
    "displayName": "VacancySource",
    "description": "External source metadata for parsed vacancies"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "vacancy": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "api::vacancy.vacancy",
      "mappedBy": "vacancySource"
    },
    "provider": {
      "type": "string",
      "required": true
    },
    "externalId": {
      "type": "string",
      "required": true
    },
    "originalUrl": {
      "type": "string",
      "required": true
    },
    "parsedAt": {
      "type": "datetime",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Создать контроллер (Strapi default)**

`backend/src/api/vacancy-source/controllers/vacancy-source.ts`:

```typescript
import { factories } from '@strapi/strapi'
export default factories.createCoreController('api::vacancy-source.vacancy-source')
```

- [ ] **Step 3: Создать маршруты (пустые — не публикуем)**

`backend/src/api/vacancy-source/routes/vacancy-source.ts`:

```typescript
export default { routes: [] }
```

- [ ] **Step 4: Создать сервис (Strapi default)**

`backend/src/api/vacancy-source/services/vacancy-source.ts`:

```typescript
import { factories } from '@strapi/strapi'
export default factories.createCoreService('api::vacancy-source.vacancy-source')
```

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy-source/
git commit -m "feat(backend): add VacancySource content type schema"
```

---

## Task 3: Utility functions + tests

**Files:**

- Create: `backend/src/api/vacancy/services/vacancy-utils.ts`
- Create: `backend/tests/unit/vacancy-utils.test.ts`

- [ ] **Step 1: Написать тесты (TDD)**

`backend/tests/unit/vacancy-utils.test.ts`:

```typescript
import {
  canPublish,
  canBoost,
  canArchive,
  canEdit,
  publishedTransitionsOnEdit,
} from '../../src/api/vacancy/services/vacancy-utils'

describe('canPublish', () => {
  it('allows publish from draft', () => {
    expect(canPublish('draft')).toBe(true)
  })

  it('blocks publish from moderation', () => {
    expect(canPublish('moderation')).toBe(false)
  })

  it('blocks publish from published', () => {
    expect(canPublish('published')).toBe(false)
  })

  it('blocks publish from rejected', () => {
    expect(canPublish('rejected')).toBe(false)
  })

  it('blocks publish from expired', () => {
    expect(canPublish('expired')).toBe(false)
  })

  it('blocks publish from archived', () => {
    expect(canPublish('archived')).toBe(false)
  })
})

describe('canBoost', () => {
  it('allows boost for published vacancy', () => {
    expect(canBoost('published')).toBe(true)
  })

  it('blocks boost for draft', () => {
    expect(canBoost('draft')).toBe(false)
  })

  it('blocks boost for moderation', () => {
    expect(canBoost('moderation')).toBe(false)
  })

  it('blocks boost for rejected', () => {
    expect(canBoost('rejected')).toBe(false)
  })

  it('blocks boost for expired', () => {
    expect(canBoost('expired')).toBe(false)
  })

  it('blocks boost for archived', () => {
    expect(canBoost('archived')).toBe(false)
  })
})

describe('canArchive', () => {
  it('allows archive for published', () => {
    expect(canArchive('published')).toBe(true)
  })

  it('allows archive for expired', () => {
    expect(canArchive('expired')).toBe(true)
  })

  it('allows archive for rejected', () => {
    expect(canArchive('rejected')).toBe(true)
  })

  it('allows archive for draft', () => {
    expect(canArchive('draft')).toBe(true)
  })

  it('blocks archive for already archived', () => {
    expect(canArchive('archived')).toBe(false)
  })

  it('blocks archive for moderation', () => {
    expect(canArchive('moderation')).toBe(false)
  })
})

describe('canEdit', () => {
  it('allows edit for draft', () => {
    expect(canEdit('draft')).toBe(true)
  })

  it('allows edit for rejected', () => {
    expect(canEdit('rejected')).toBe(true)
  })

  it('allows edit for published (triggers re-moderation)', () => {
    expect(canEdit('published')).toBe(true)
  })

  it('blocks edit for moderation', () => {
    expect(canEdit('moderation')).toBe(false)
  })

  it('blocks edit for expired', () => {
    expect(canEdit('expired')).toBe(false)
  })

  it('blocks edit for archived', () => {
    expect(canEdit('archived')).toBe(false)
  })
})

describe('publishedTransitionsOnEdit', () => {
  it('returns true for published status', () => {
    expect(publishedTransitionsOnEdit('published')).toBe(true)
  })

  it('returns false for draft', () => {
    expect(publishedTransitionsOnEdit('draft')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test -- --testPathPattern="vacancy-utils" --no-coverage
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Написать реализацию**

`backend/src/api/vacancy/services/vacancy-utils.ts`:

```typescript
export function canPublish(status: string): boolean {
  return status === 'draft'
}

export function canBoost(status: string): boolean {
  return status === 'published'
}

export function canArchive(status: string): boolean {
  return ['draft', 'published', 'rejected', 'expired'].includes(status)
}

export function canEdit(status: string): boolean {
  return ['draft', 'rejected', 'published'].includes(status)
}

export function publishedTransitionsOnEdit(status: string): boolean {
  return status === 'published'
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test -- --testPathPattern="vacancy-utils" --no-coverage
```

Expected: PASS (12 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy/services/vacancy-utils.ts backend/tests/unit/vacancy-utils.test.ts
git commit -m "feat(backend): add vacancy utility functions with tests"
```

---

## Task 4: Credit service + tests

**Files:**

- Create: `backend/src/api/vacancy/services/credit-service.ts`
- Create: `backend/tests/unit/credit-service.test.ts`

- [ ] **Step 1: Написать тесты (TDD)**

`backend/tests/unit/credit-service.test.ts`:

```typescript
import {
  getLimitForPlan,
  getBoostsLimitForPlan,
  PLAN_LIMITS,
} from '../../src/api/vacancy/services/credit-service'

describe('getLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan (defaults to free)', () => {
    expect(getLimitForPlan('unknown')).toBe(3)
  })
})

describe('getBoostsLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getBoostsLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getBoostsLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getBoostsLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan', () => {
    expect(getBoostsLimitForPlan('unknown')).toBe(3)
  })
})

describe('PLAN_LIMITS', () => {
  it('has entries for free, pro, max', () => {
    expect(PLAN_LIMITS).toHaveProperty('free')
    expect(PLAN_LIMITS).toHaveProperty('pro')
    expect(PLAN_LIMITS).toHaveProperty('max')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test -- --testPathPattern="credit-service" --no-coverage
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Написать реализацию**

`backend/src/api/vacancy/services/credit-service.ts`:

```typescript
import type { Core } from '@strapi/strapi'

export const PLAN_LIMITS = {
  free: { vacanciesPerMonth: 3, boostsPerDay: 3 },
  pro: { vacanciesPerMonth: 10, boostsPerDay: 10 },
  max: { vacanciesPerMonth: 50, boostsPerDay: 50 },
} as const

type PlanCode = keyof typeof PLAN_LIMITS

export function getLimitForPlan(plan: string): number {
  return PLAN_LIMITS[plan as PlanCode]?.vacanciesPerMonth ?? PLAN_LIMITS.free.vacanciesPerMonth
}

export function getBoostsLimitForPlan(plan: string): number {
  return PLAN_LIMITS[plan as PlanCode]?.boostsPerDay ?? PLAN_LIMITS.free.boostsPerDay
}

// In-memory daily boost tracker (resets on restart — sufficient for MVP, replaced in Sprint 6)
const dailyBoosts = new Map<number, { count: number; date: string }>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getBoostsUsedToday(userId: number): number {
  const entry = dailyBoosts.get(userId)
  if (!entry || entry.date !== todayUTC()) return 0
  return entry.count
}

export function incrementBoostCount(userId: number): void {
  const today = todayUTC()
  const entry = dailyBoosts.get(userId)
  if (!entry || entry.date !== today) {
    dailyBoosts.set(userId, { count: 1, date: today })
  } else {
    entry.count++
  }
}

type UserWithPlan = {
  subscriptionPlan: string
  vacancyCredits: number
}

export async function checkAndConsumeVacancyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan', 'vacancyCredits'],
  })) as unknown as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority
  if (user.vacancyCredits > 0) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { vacancyCredits: user.vacancyCredits - 1 },
    })
    return
  }

  // 2. Check plan monthly limit
  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)

  const usedThisMonth = await strapi.documents('api::vacancy.vacancy').count({
    filters: {
      postedBy: { id: { $eq: userId } },
      status: { $notIn: ['draft'] },
      createdAt: { $gte: monthStart.toISOString() },
    },
  })

  const limit = getLimitForPlan(user.subscriptionPlan)

  if (usedThisMonth >= limit) {
    const resetAt = new Date()
    resetAt.setUTCMonth(resetAt.getUTCMonth() + 1, 1)
    resetAt.setUTCHours(0, 0, 0, 0)

    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used: usedThisMonth, resetAt: resetAt.toISOString() },
    })
  }
}

export async function checkAndConsumeBoost(strapi: Core.Strapi, userId: number): Promise<number> {
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan'],
  })) as unknown as { subscriptionPlan: string } | null

  if (!user) throw new Error('User not found')

  const limit = getBoostsLimitForPlan(user.subscriptionPlan)
  const used = getBoostsUsedToday(userId)

  if (used >= limit) {
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt: `${todayUTC()}T23:59:59Z` },
    })
  }

  incrementBoostCount(userId)
  return limit - used - 1
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test -- --testPathPattern="credit-service" --no-coverage
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy/services/credit-service.ts backend/tests/unit/credit-service.test.ts
git commit -m "feat(backend): add vacancy credit service with plan limits"
```

---

## Task 5: is-vacancy-owner policy + tests

**Files:**

- Create: `backend/src/api/vacancy/policies/is-vacancy-owner.ts`
- Create: `backend/tests/unit/is-vacancy-owner.test.ts`

- [ ] **Step 1: Написать тест**

`backend/tests/unit/is-vacancy-owner.test.ts`:

```typescript
import { checkIsOwner } from '../../src/api/vacancy/policies/is-vacancy-owner'

describe('checkIsOwner (vacancy)', () => {
  it('returns true when userId matches postedBy id', () => {
    expect(checkIsOwner({ postedBy: { id: 42 } }, 42)).toBe(true)
  })

  it('returns false when userId does not match postedBy', () => {
    expect(checkIsOwner({ postedBy: { id: 42 } }, 99)).toBe(false)
  })

  it('returns false when vacancy has no postedBy', () => {
    expect(checkIsOwner({ postedBy: null }, 42)).toBe(false)
  })

  it('returns false when postedBy is undefined', () => {
    expect(checkIsOwner({ postedBy: undefined }, 42)).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd backend && pnpm test -- --testPathPattern="is-vacancy-owner" --no-coverage
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: Написать реализацию**

`backend/src/api/vacancy/policies/is-vacancy-owner.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type VacancyWithPostedBy = { postedBy: { id: number } | null | undefined }

export function checkIsOwner(vacancy: VacancyWithPostedBy, userId: number): boolean {
  return vacancy.postedBy?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
    documentId: id,
    populate: { postedBy: { fields: ['id'] } },
  })

  if (!vacancy) return false

  return checkIsOwner(vacancy as unknown as VacancyWithPostedBy, user.id)
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd backend && pnpm test -- --testPathPattern="is-vacancy-owner" --no-coverage
```

Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/vacancy/policies/is-vacancy-owner.ts backend/tests/unit/is-vacancy-owner.test.ts
git commit -m "feat(backend): add is-vacancy-owner policy with tests"
```

---

## Task 6: Vacancy routes

**Files:**

- Create: `backend/src/api/vacancy/routes/vacancy.ts`

- [ ] **Step 1: Создать routes файл**

Порядок критичен: `/vacancies/my` и пустые маршруты без `:id` ДОЛЖНЫ быть ДО `/vacancies/:id`, иначе Koa перехватит `/my` как `:id`.

`backend/src/api/vacancy/routes/vacancy.ts`:

```typescript
export default {
  routes: [
    // Public — no auth
    {
      method: 'GET',
      path: '/vacancies',
      handler: 'vacancy.findPublished',
      config: { auth: false },
    },

    // Authenticated — no :id param — MUST come before /:id
    {
      method: 'GET',
      path: '/vacancies/my',
      handler: 'vacancy.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/vacancies',
      handler: 'vacancy.create',
      config: {},
    },

    // Public by id
    {
      method: 'GET',
      path: '/vacancies/:id',
      handler: 'vacancy.findOne',
      config: { auth: false },
    },

    // Owner-only actions via policy
    {
      method: 'POST',
      path: '/vacancies/:id/publish',
      handler: 'vacancy.publish',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'POST',
      path: '/vacancies/:id/boost',
      handler: 'vacancy.boost',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'POST',
      path: '/vacancies/:id/archive',
      handler: 'vacancy.archive',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
    {
      method: 'PUT',
      path: '/vacancies/:id',
      handler: 'vacancy.update',
      config: {
        policies: ['api::vacancy.is-vacancy-owner'],
      },
    },
  ],
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/vacancy/routes/vacancy.ts
git commit -m "feat(backend): add vacancy routes"
```

---

## Task 7: Vacancy service

**Files:**

- Create: `backend/src/api/vacancy/services/vacancy.ts`

- [ ] **Step 1: Создать сервис**

`backend/src/api/vacancy/services/vacancy.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type CreateVacancyInput = {
  title: string
  industryId: string
  specializationId: string
  employmentType: string
  workFormat: string
  seniority: string
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: string
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  experienceYears?: number
  sourceType?: 'internal' | 'external'
  sourceName?: string
  sourceUrl?: string
  urgent?: boolean
  companyId?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createVacancy(postedById: number, input: CreateVacancyInput) {
    return strapi.documents('api::vacancy.vacancy').create({
      data: {
        title: input.title,
        industry: input.industryId,
        specialization: input.specializationId,
        employmentType: input.employmentType as
          | 'full-time'
          | 'part-time'
          | 'contract'
          | 'internship'
          | 'freelance',
        workFormat: input.workFormat as 'office' | 'remote' | 'hybrid',
        seniority: input.seniority as
          | 'intern'
          | 'junior'
          | 'middle'
          | 'senior'
          | 'lead'
          | 'principal',
        country: input.country,
        city: input.city,
        salaryFrom: input.salaryFrom,
        salaryTo: input.salaryTo,
        salaryCurrency: input.salaryCurrency as 'USD' | 'EUR' | 'RUB' | 'GBP' | undefined,
        description: input.description,
        responsibilities: input.responsibilities,
        requirements: input.requirements,
        conditions: input.conditions,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        experienceYears: input.experienceYears,
        sourceType: (input.sourceType ?? 'internal') as 'internal' | 'external',
        sourceName: input.sourceName,
        sourceUrl: input.sourceUrl,
        urgent: input.urgent ?? false,
        highlighted: false,
        topPlacement: false,
        views: 0,
        uniqueViews: 0,
        applicationsCount: 0,
        status: 'draft',
        postedBy: postedById,
        company: input.companyId ?? null,
      },
    })
  },

  async searchByVector(
    searchQuery: string,
    offset: number,
    limit: number,
    extraFilters: string,
    extraParams: unknown[]
  ): Promise<{ documentIds: string[]; total: number }> {
    const tsQuery = `plainto_tsquery('russian', ?)`

    const rows = await strapi.db.connection.raw(
      `SELECT document_id
       FROM vacancies
       WHERE status = 'published'
         AND expires_at > NOW()
         AND search_vector @@ ${tsQuery}
         ${extraFilters}
       ORDER BY ts_rank(search_vector, ${tsQuery}) DESC, top_placement DESC, created_at DESC
       LIMIT ? OFFSET ?`,
      [searchQuery, searchQuery, ...extraParams, limit, offset]
    )

    const countRows = await strapi.db.connection.raw(
      `SELECT COUNT(*) AS total
       FROM vacancies
       WHERE status = 'published'
         AND expires_at > NOW()
         AND search_vector @@ ${tsQuery}
         ${extraFilters}`,
      [searchQuery, ...extraParams]
    )

    return {
      documentIds: rows.rows.map((r: { document_id: string }) => r.document_id),
      total: parseInt(countRows.rows[0]?.total ?? '0', 10),
    }
  },
})
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/api/vacancy/services/vacancy.ts
git commit -m "feat(backend): add vacancy service (createVacancy, FTS search)"
```

---

## Task 8: Vacancy controller

**Files:**

- Create: `backend/src/api/vacancy/controllers/vacancy.ts`

Это самый объёмный файл. Содержит все HTTP-хэндлеры.

- [ ] **Step 1: Создать контроллер**

`backend/src/api/vacancy/controllers/vacancy.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import {
  canPublish,
  canBoost,
  canArchive,
  canEdit,
  publishedTransitionsOnEdit,
} from '../services/vacancy-utils'
import { checkAndConsumeVacancyCredit, checkAndConsumeBoost } from '../services/credit-service'
import type vacancyServiceFactory from '../services/vacancy'

type VacancyService = ReturnType<typeof vacancyServiceFactory>

const VALID_EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
] as const
const VALID_WORK_FORMATS = ['office', 'remote', 'hybrid'] as const
const VALID_SENIORITIES = ['intern', 'junior', 'middle', 'senior', 'lead', 'principal'] as const
const VALID_CURRENCIES = ['USD', 'EUR', 'RUB', 'GBP'] as const

// In-memory unique-view tracker (resets on restart — sufficient for MVP)
const viewedIPs = new Map<string, Set<string>>()

function isUniqueView(documentId: string, ip: string): boolean {
  return !(viewedIPs.get(documentId)?.has(ip) ?? false)
}

function recordView(documentId: string, ip: string): void {
  if (!viewedIPs.has(documentId)) viewedIPs.set(documentId, new Set())
  viewedIPs.get(documentId)!.add(ip)
}

const VACANCY_CARD_FIELDS = [
  'documentId',
  'title',
  'country',
  'city',
  'workFormat',
  'employmentType',
  'seniority',
  'salaryFrom',
  'salaryTo',
  'salaryCurrency',
  'urgent',
  'topPlacement',
  'highlighted',
  'sourceType',
  'status',
  'expiresAt',
  'createdAt',
] as const

const VACANCY_FULL_FIELDS = [
  ...VACANCY_CARD_FIELDS,
  'description',
  'responsibilities',
  'requirements',
  'conditions',
  'skills',
  'languages',
  'experienceYears',
  'sourceName',
  'sourceUrl',
  'views',
  'uniqueViews',
  'applicationsCount',
] as const

const VACANCY_POPULATE = {
  industry: { fields: ['documentId', 'slug', 'name'] },
  specialization: { fields: ['documentId', 'slug', 'name'] },
  company: { fields: ['documentId', 'name', 'slug'], populate: { logo: true } },
  postedBy: { fields: ['id', 'firstName', 'lastName'] },
} as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::vacancy.vacancy') as unknown as VacancyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>

      const {
        title,
        industryId,
        specializationId,
        employmentType,
        workFormat,
        seniority,
        country,
        description,
        responsibilities,
        requirements,
      } = body

      if (
        !title ||
        !industryId ||
        !specializationId ||
        !employmentType ||
        !workFormat ||
        !seniority ||
        !country ||
        !description ||
        !responsibilities ||
        !requirements
      ) {
        return ctx.badRequest(
          'title, industryId, specializationId, employmentType, workFormat, seniority, country, description, responsibilities, requirements are required'
        )
      }

      if (!VALID_EMPLOYMENT_TYPES.includes(employmentType as any)) {
        return ctx.badRequest(`employmentType must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`)
      }
      if (!VALID_WORK_FORMATS.includes(workFormat as any)) {
        return ctx.badRequest(`workFormat must be one of: ${VALID_WORK_FORMATS.join(', ')}`)
      }
      if (!VALID_SENIORITIES.includes(seniority as any)) {
        return ctx.badRequest(`seniority must be one of: ${VALID_SENIORITIES.join(', ')}`)
      }

      const vacancy = await svc().createVacancy(user.id, {
        title: title as string,
        industryId: industryId as string,
        specializationId: specializationId as string,
        employmentType: employmentType as string,
        workFormat: workFormat as string,
        seniority: seniority as string,
        country: country as string,
        city: body.city as string | undefined,
        salaryFrom: body.salaryFrom as number | undefined,
        salaryTo: body.salaryTo as number | undefined,
        salaryCurrency: body.salaryCurrency as string | undefined,
        description: description as string,
        responsibilities: responsibilities as string,
        requirements: requirements as string,
        conditions: body.conditions as string | undefined,
        skills: body.skills as string[] | undefined,
        languages: body.languages as Array<{ lang: string; level: string }> | undefined,
        experienceYears: body.experienceYears as number | undefined,
        sourceType: (body.sourceType as 'internal' | 'external') ?? 'internal',
        sourceName: body.sourceName as string | undefined,
        sourceUrl: body.sourceUrl as string | undefined,
        urgent: body.urgent as boolean | undefined,
        companyId: body.companyId as string | undefined,
      })

      ctx.status = 201
      return ctx.send({ data: vacancy })
    },

    async publish(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      const status = vacancy.status as string
      if (!canPublish(status)) {
        return ctx.badRequest(`Cannot publish vacancy with status "${status}". Must be "draft".`)
      }

      try {
        await checkAndConsumeVacancyCredit(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          ctx.status = 403
          return ctx.send({
            error: {
              code: 'LIMIT_REACHED',
              message: 'Vacancy limit reached',
              details: err.details,
            },
          })
        }
        throw err
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { status: 'moderation' },
        fields: ['documentId', 'title', 'status', 'createdAt'],
      })

      return ctx.send({ data: updated })
    },

    async findPublished(ctx: any) {
      const {
        search,
        industry,
        specialization,
        country,
        city,
        workFormat,
        employmentType,
        seniority,
        salaryFrom,
        salaryTo,
        salaryCurrency,
        sourceType,
        urgent,
        topPlacement,
        sort = 'relevance',
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))
      const offset = (pageNum - 1) * pageSizeNum

      // Full-text search via raw SQL
      if (search) {
        const { documentIds, total } = await svc().searchByVector(
          search,
          offset,
          pageSizeNum,
          '',
          []
        )

        if (documentIds.length === 0) {
          return ctx.send({
            data: [],
            meta: { total: 0, page: pageNum, pageSize: pageSizeNum, pageCount: 0 },
          })
        }

        const vacancies = await strapi.documents('api::vacancy.vacancy').findMany({
          filters: { documentId: { $in: documentIds } },
          fields: VACANCY_CARD_FIELDS as unknown as string[],
          populate: VACANCY_POPULATE as any,
        })

        // Re-sort to match SQL relevance order
        const sorted = documentIds
          .map((docId) => vacancies.find((v) => v.documentId === docId))
          .filter(Boolean)

        return ctx.send({
          data: sorted,
          meta: {
            total,
            page: pageNum,
            pageSize: pageSizeNum,
            pageCount: Math.ceil(total / pageSizeNum),
          },
        })
      }

      // Standard filter-based listing
      const filters: Record<string, unknown> = {
        status: { $eq: 'published' },
        expiresAt: { $gt: new Date().toISOString() },
      }

      if (industry) filters.industry = { documentId: { $eq: industry } }
      if (specialization) filters.specialization = { documentId: { $eq: specialization } }
      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (workFormat) filters.workFormat = { $eq: workFormat }
      if (employmentType) filters.employmentType = { $eq: employmentType }
      if (seniority) filters.seniority = { $eq: seniority }
      if (salaryCurrency) filters.salaryCurrency = { $eq: salaryCurrency }
      if (salaryFrom) filters.salaryTo = { $gte: parseInt(salaryFrom, 10) }
      if (salaryTo) filters.salaryFrom = { $lte: parseInt(salaryTo, 10) }
      if (sourceType) filters.sourceType = { $eq: sourceType }
      if (urgent === 'true') filters.urgent = { $eq: true }
      if (topPlacement === 'true') filters.topPlacement = { $eq: true }

      const sortMap: Record<string, string> = {
        newest: 'createdAt:desc',
        salary_asc: 'salaryFrom:asc',
        salary_desc: 'salaryFrom:desc',
        relevance: 'topPlacement:desc,createdAt:desc',
      }
      const strapiSort = sortMap[sort] ?? sortMap.relevance

      const [vacancies, total] = await Promise.all([
        strapi.documents('api::vacancy.vacancy').findMany({
          filters,
          fields: VACANCY_CARD_FIELDS as unknown as string[],
          populate: VACANCY_POPULATE as any,
          start: offset,
          limit: pageSizeNum,
          sort: strapiSort,
        }),
        strapi.documents('api::vacancy.vacancy').count({ filters }),
      ])

      return ctx.send({
        data: vacancies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },

    async findOne(ctx: any) {
      const { id } = ctx.params as { id: string }
      const ip = ctx.request.ip ?? 'unknown'

      const vacancy = await strapi.documents('api::vacancy.vacancy').findFirst({
        filters: {
          documentId: { $eq: id },
          status: { $eq: 'published' },
        },
        fields: VACANCY_FULL_FIELDS as unknown as string[],
        populate: VACANCY_POPULATE as any,
      })

      if (!vacancy) return ctx.notFound('Vacancy not found')

      const unique = isUniqueView(id, ip)
      recordView(id, ip)

      await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: {
          views: (vacancy.views ?? 0) + 1,
          uniqueViews: unique ? (vacancy.uniqueViews ?? 0) + 1 : (vacancy.uniqueViews ?? 0),
        },
      })

      return ctx.send({ data: { ...vacancy, views: (vacancy.views ?? 0) + 1 } })
    },

    async update(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const existing = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!existing) return ctx.notFound('Vacancy not found')

      const status = existing.status as string
      if (!canEdit(status)) {
        return ctx.badRequest(`Cannot edit vacancy with status "${status}".`)
      }

      const allowedFields = [
        'title',
        'employmentType',
        'workFormat',
        'seniority',
        'country',
        'city',
        'salaryFrom',
        'salaryTo',
        'salaryCurrency',
        'description',
        'responsibilities',
        'requirements',
        'conditions',
        'skills',
        'languages',
        'experienceYears',
        'urgent',
      ]

      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      if (publishedTransitionsOnEdit(status)) {
        updateData.status = 'draft'
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: updateData as any,
        fields: VACANCY_FULL_FIELDS as unknown as string[],
        populate: VACANCY_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async boost(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canBoost(vacancy.status as string)) {
        return ctx.badRequest(
          `Cannot boost vacancy with status "${vacancy.status}". Must be "published".`
        )
      }

      let boostsRemaining: number
      try {
        boostsRemaining = await checkAndConsumeBoost(strapi, user.id)
      } catch (err: any) {
        if (err?.code === 'LIMIT_REACHED') {
          ctx.status = 403
          return ctx.send({
            error: {
              code: 'LIMIT_REACHED',
              message: 'Daily boost limit reached',
              details: err.details,
            },
          })
        }
        throw err
      }

      // Touch updatedAt to bump the vacancy in sort order
      await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: {},
      })

      return ctx.send({ data: { success: true, boostsRemaining } })
    },

    async archive(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!vacancy) return ctx.notFound('Vacancy not found')

      if (!canArchive(vacancy.status as string)) {
        return ctx.badRequest(`Cannot archive vacancy with status "${vacancy.status}".`)
      }

      const updated = await strapi.documents('api::vacancy.vacancy').update({
        documentId: id,
        data: { status: 'archived' },
        fields: ['documentId', 'title', 'status'],
      })

      return ctx.send({ data: updated })
    },

    async findMine(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

      const filters: Record<string, unknown> = {
        postedBy: { id: { $eq: user.id } },
      }
      if (status) filters.status = { $eq: status }

      const [vacancies, total] = await Promise.all([
        strapi.documents('api::vacancy.vacancy').findMany({
          filters,
          fields: VACANCY_CARD_FIELDS as unknown as string[],
          populate: VACANCY_POPULATE as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::vacancy.vacancy').count({ filters }),
      ])

      return ctx.send({
        data: vacancies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },
  }
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Expected: 0 ошибок TypeScript

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/vacancy/controllers/vacancy.ts
git commit -m "feat(backend): add vacancy controller (all endpoints)"
```

---

## Task 9: Full-text search — PostgreSQL setup + lifecycle hook

**Files:**

- Modify: `backend/src/index.ts`
- Create: `backend/src/api/vacancy/content-types/vacancy/lifecycles.ts`

- [ ] **Step 1: Добавить SQL миграцию в bootstrap**

Открыть `backend/src/index.ts` и добавить вызов `setupVacancySearch(strapi)` в bootstrap, ПОСЛЕ `seedIndustries`:

```typescript
import { apiRateLimit, authRateLimit } from './middlewares/rate-limit'
import { seedIndustries } from './scripts/seed-industries'
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
    // Table may not exist on very first boot before content types sync
    strapi.log.warn('[vacancy] search index setup skipped (will retry on next boot)')
  }
}

export default {
  register({ strapi: _strapi }: { strapi: Core.Strapi }) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await seedIndustries(strapi)
    await setupVacancySearch(strapi)

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

- [ ] **Step 2: Создать lifecycle hook**

`backend/src/api/vacancy/content-types/vacancy/lifecycles.ts`:

```typescript
type VacancyEvent = {
  result: { documentId?: string; id?: number; status?: string; expiresAt?: string | null }
  params: unknown
}

export default {
  async afterCreate(event: VacancyEvent) {
    await updateSearchVector(event.result.id)
  },

  async afterUpdate(event: VacancyEvent) {
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

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Expected: 0 ошибок

- [ ] **Step 4: Commit**

```bash
git add backend/src/index.ts backend/src/api/vacancy/content-types/vacancy/lifecycles.ts
git commit -m "feat(backend): add PostgreSQL FTS indexes and vacancy lifecycle hook"
```

---

## Task 10: Cron job — expire vacancies

**Files:**

- Create: `backend/config/cron-tasks.ts`

- [ ] **Step 1: Проверить наличие папки config**

```bash
ls backend/config/
```

Expected: видны `database.ts`, `middlewares.ts`, `plugins.ts` и т.д.

- [ ] **Step 2: Создать cron-tasks.ts**

`backend/config/cron-tasks.ts`:

```typescript
import type { Core } from '@strapi/strapi'

export default {
  // Every hour at minute 0
  '0 * * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      const now = new Date().toISOString()

      const expired = await strapi.documents('api::vacancy.vacancy').findMany({
        filters: {
          status: { $eq: 'published' },
          expiresAt: { $lt: now },
        },
        fields: ['documentId', 'title'],
      })

      if (expired.length === 0) return

      strapi.log.info(`[cron] Expiring ${expired.length} vacancies`)

      for (const vacancy of expired) {
        await strapi.documents('api::vacancy.vacancy').update({
          documentId: vacancy.documentId,
          data: { status: 'expired' },
        })
        strapi.log.info(`[cron] Vacancy ${vacancy.documentId} ("${vacancy.title}") expired`)
        // TODO Sprint 7: send Telegram notification vacancy_expiring_soon to postedBy user
      }
    },
    options: {
      tz: 'UTC',
    },
  },
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Expected: 0 ошибок

- [ ] **Step 4: Commit**

```bash
git add backend/config/cron-tasks.ts
git commit -m "feat(backend): add hourly cron to expire published vacancies"
```

---

## Task 11: Fix Company delete — replace stub vacancy check

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

В Sprint 2 в методе `delete` стоял закомментированный stub: `const activeVacancies = 0`. Теперь делаем реальную проверку.

- [ ] **Step 1: Найти stub в компании**

В `backend/src/api/company/controllers/company.ts` найти строку:

```typescript
// MVP stub: vacancy count is always 0 (real check in Sprint 3)
const activeVacancies = 0
```

- [ ] **Step 2: Заменить stub на реальную проверку**

Заменить этот блок на:

```typescript
const activeVacancies = await strapi.documents('api::vacancy.vacancy').count({
  filters: {
    company: { documentId: { $eq: id } },
    status: { $in: ['published', 'moderation'] },
  },
})
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm typecheck
```

Expected: 0 ошибок

- [ ] **Step 4: Запустить все unit-тесты**

```bash
cd backend && pnpm test --no-coverage
```

Expected: все тесты зелёные (ранее 40 + новые 24 = 64+ тестов)

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "fix(backend): replace stub vacancy check in company delete with real count"
```

---

## Self-Review

### Покрытие требований sprint-plan.md

| Требование                                                | Task                      |
| --------------------------------------------------------- | ------------------------- |
| Content type: Vacancy                                     | Task 1                    |
| Content type: VacancySource                               | Task 2                    |
| POST /vacancies — создать                                 | Task 8 (create)           |
| POST /vacancies/:id/publish — draft → moderation + лимиты | Task 8 (publish) + Task 4 |
| checkAndConsumeVacancyCredit                              | Task 4                    |
| GET /vacancies — поиск с фильтрами + сортировка           | Task 8 (findPublished)    |
| GET /vacancies/:id — карточка + views                     | Task 8 (findOne)          |
| PUT /vacancies/:id — обновить                             | Task 8 (update)           |
| POST /vacancies/:id/boost                                 | Task 8 (boost) + Task 4   |
| POST /vacancies/:id/archive                               | Task 8 (archive)          |
| GET /vacancies/my                                         | Task 8 (findMine)         |
| Full-text search (tsvector + GIN)                         | Task 9                    |
| Cron: истечение срока                                     | Task 10                   |

### Проверка placeholder'ов

- Все шаги содержат реальный код
- Нет "TODO implement later" в основном коде (только Sprint 7 уведомления — намеренно)
- Все типы согласованы между задачами: `canPublish` из Task 3 используется в Task 8 без переименования

### Согласованность типов

- `VACANCY_CARD_FIELDS` и `VACANCY_FULL_FIELDS` определены один раз в контроллере и используются во всех методах
- `VacancyService` тип в контроллере ссылается на `vacancyServiceFactory` из Task 7
- `checkIsOwner` в policy (Task 5) принимает `{ postedBy: ... }`, что соответствует `populate: { postedBy: ... }` в контроллере

---

**План сохранён в `docs/superpowers/plans/2026-06-24-sprint3-backend-vacancies.md`.**

**Два варианта выполнения:**

**1. Subagent-Driven (рекомендуется)** — свежий субагент на каждую задачу, ревью между задачами, быстрая итерация

**2. Inline Execution** — выполнение в текущей сессии через executing-plans, блоками с checkpoint'ами

**Какой подход выбираете?**
