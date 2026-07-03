# Sprint 5 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать бэкенд для Favorites, Saved Searches, Reports и Blocks — пользователь может сохранять избранное, подписываться на поисковые запросы, жаловаться и блокировать работодателей/кандидатов.

**Architecture:** Четыре новых Strapi 5 content type (Favorite, SavedSearch, Block, Report) с кастомными контроллерами и маршрутами. Дополнительный cron job для SavedSearch (каждые 2ч). Block filter встроен в существующие контроллеры vacancy и company.

**Tech Stack:** Strapi 5 (documents API), PostgreSQL, TypeScript strict, Jest unit tests.

---

## File Map

### Новые файлы

- `backend/src/api/favorite/content-types/favorite/schema.json`
- `backend/src/api/favorite/controllers/favorite.ts`
- `backend/src/api/favorite/routes/favorite.ts`
- `backend/src/api/favorite/services/favorite-utils.ts`
- `backend/tests/unit/favorite-utils.test.ts`
- `backend/src/api/saved-search/content-types/saved-search/schema.json`
- `backend/src/api/saved-search/controllers/saved-search.ts`
- `backend/src/api/saved-search/routes/saved-search.ts`
- `backend/src/api/saved-search/services/saved-search-utils.ts`
- `backend/tests/unit/saved-search-utils.test.ts`
- `backend/src/api/block/content-types/block/schema.json`
- `backend/src/api/block/controllers/block.ts`
- `backend/src/api/block/routes/block.ts`
- `backend/src/api/block/services/block-utils.ts`
- `backend/src/api/block/services/block-filter.ts`
- `backend/tests/unit/block-utils.test.ts`
- `backend/src/api/report/content-types/report/schema.json`
- `backend/src/api/report/controllers/report.ts`
- `backend/src/api/report/routes/report.ts`
- `backend/src/api/report/services/report-utils.ts`
- `backend/tests/unit/report-utils.test.ts`

### Изменяемые файлы

- `backend/config/cron-tasks.ts` — добавить cron SavedSearch каждые 2ч
- `backend/src/api/vacancy/controllers/vacancy.ts` — добавить block-фильтрацию в `findPublished`
- `backend/src/api/company/controllers/company.ts` — добавить block-фильтрацию в `findPublished`

---

## Task 1: Favorite — utils + тесты

**Files:**

- Create: `backend/src/api/favorite/services/favorite-utils.ts`
- Create: `backend/tests/unit/favorite-utils.test.ts`

- [ ] **Step 1: Написать failing тесты**

```typescript
// backend/tests/unit/favorite-utils.test.ts
import { isValidFavoriteType } from '../../src/api/favorite/services/favorite-utils'

describe('isValidFavoriteType', () => {
  it('returns true for vacancy', () => {
    expect(isValidFavoriteType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidFavoriteType('resume')).toBe(true)
  })

  it('returns true for company', () => {
    expect(isValidFavoriteType('company')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidFavoriteType('application')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidFavoriteType('')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что FAIL**

```bash
cd backend && pnpm test -- --testPathPattern="favorite-utils"
```

Ожидание: FAIL — `Cannot find module`

- [ ] **Step 3: Реализовать**

```typescript
// backend/src/api/favorite/services/favorite-utils.ts
const VALID_FAVORITE_TYPES = ['vacancy', 'resume', 'company'] as const
export type FavoriteType = (typeof VALID_FAVORITE_TYPES)[number]

export function isValidFavoriteType(type: string): type is FavoriteType {
  return (VALID_FAVORITE_TYPES as readonly string[]).includes(type)
}
```

- [ ] **Step 4: Запустить тест — убедиться что PASS**

```bash
cd backend && pnpm test -- --testPathPattern="favorite-utils"
```

Ожидание: PASS (5 tests)

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/favorite/services/favorite-utils.ts backend/tests/unit/favorite-utils.test.ts
git commit -m "feat(sprint5): add favorite-utils with isValidFavoriteType"
```

---

## Task 2: Favorite — content type schema

**Files:**

- Create: `backend/src/api/favorite/content-types/favorite/schema.json`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "favorites",
  "info": {
    "singularName": "favorite",
    "pluralName": "favorites",
    "displayName": "Favorite",
    "description": "User's saved vacancies, resumes and companies"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "type": {
      "type": "enumeration",
      "enum": ["vacancy", "resume", "company"],
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    }
  }
}
```

Уникальность пары (user, type, targetId) обеспечивается на уровне контроллера (аналогично Application — проверяем дубликат перед созданием).

- [ ] **Step 2: Коммит**

```bash
git add backend/src/api/favorite/content-types/favorite/schema.json
git commit -m "feat(sprint5): add Favorite content type schema"
```

---

## Task 3: Favorite — controller + routes

**Files:**

- Create: `backend/src/api/favorite/controllers/favorite.ts`
- Create: `backend/src/api/favorite/routes/favorite.ts`

- [ ] **Step 1: Создать контроллер**

```typescript
// backend/src/api/favorite/controllers/favorite.ts
import type { Core } from '@strapi/strapi'
import { isValidFavoriteType, type FavoriteType } from '../services/favorite-utils'

const VACANCY_CARD_POPULATE = {
  industry: { fields: ['documentId', 'slug', 'name'] },
  specialization: { fields: ['documentId', 'slug', 'name'] },
  company: { fields: ['documentId', 'name', 'slug'], populate: { logo: true } },
  postedBy: { fields: ['id', 'firstName', 'lastName'] },
} as const

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

const RESUME_CARD_FIELDS = [
  'documentId',
  'title',
  'firstName',
  'lastName',
  'country',
  'city',
  'desiredSalary',
  'currency',
  'workFormat',
  'employmentType',
  'experienceYears',
  'skills',
  'languages',
  'views',
  'status',
  'createdAt',
] as const

const COMPANY_CARD_FIELDS = [
  'documentId',
  'name',
  'slug',
  'country',
  'city',
  'companySize',
  'status',
  'createdAt',
] as const

async function populateEntity(strapi: Core.Strapi, type: FavoriteType, targetId: string) {
  if (type === 'vacancy') {
    return (strapi.documents as any)('api::vacancy.vacancy').findFirst({
      filters: { documentId: { $eq: targetId } },
      fields: VACANCY_CARD_FIELDS as any,
      populate: VACANCY_CARD_POPULATE as any,
    })
  }
  if (type === 'resume') {
    return (strapi.documents as any)('api::resume.resume').findFirst({
      filters: { documentId: { $eq: targetId } },
      fields: RESUME_CARD_FIELDS as any,
      populate: { user: { fields: ['id', 'firstName', 'lastName'] } },
    })
  }
  if (type === 'company') {
    return (strapi.documents as any)('api::company.company').findFirst({
      filters: { documentId: { $eq: targetId }, status: { $eq: 'published' } },
      fields: COMPANY_CARD_FIELDS as any,
      populate: { logo: true },
    })
  }
  return null
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { type, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    if (type && !isValidFavoriteType(type)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company')
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (type) filters.type = { $eq: type }

    const [favorites, total] = await Promise.all([
      (strapi.documents as any)('api::favorite.favorite').findMany({
        filters,
        fields: ['documentId', 'type', 'targetId', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::favorite.favorite').count({ filters }),
    ])

    const enriched = await Promise.all(
      favorites.map(async (fav: any) => {
        const entity = await populateEntity(strapi, fav.type, fav.targetId)
        return { ...fav, entity }
      })
    )

    return ctx.send({
      data: enriched,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { type, targetId } = body

    if (!type || !targetId) return ctx.badRequest('type and targetId are required')
    if (!isValidFavoriteType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company')
    }

    // Enforce uniqueness: (user, type, targetId)
    const existing = await (strapi.documents as any)('api::favorite.favorite').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        type: { $eq: type as string },
        targetId: { $eq: targetId as string },
      },
    })
    if (existing) {
      ctx.status = 409
      return ctx.send({
        error: { code: 'ALREADY_FAVORITED', message: 'Already in favorites' },
      })
    }

    const favorite = await (strapi.documents as any)('api::favorite.favorite').create({
      data: {
        user: user.id,
        type: type as string,
        targetId: targetId as string,
      },
      fields: ['documentId', 'type', 'targetId', 'createdAt'],
    })

    ctx.status = 201
    return ctx.send({ data: favorite })
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { targetType, targetId } = ctx.params as { targetType: string; targetId: string }

    if (!isValidFavoriteType(targetType)) {
      return ctx.badRequest('targetType must be one of: vacancy, resume, company')
    }

    const favorite = await (strapi.documents as any)('api::favorite.favorite').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        type: { $eq: targetType },
        targetId: { $eq: targetId },
      },
    })
    if (!favorite) return ctx.notFound('Favorite not found')

    await (strapi.documents as any)('api::favorite.favorite').delete({
      documentId: favorite.documentId,
    })

    ctx.status = 204
    return ctx.send(null)
  },
})
```

- [ ] **Step 2: Создать маршруты**

```typescript
// backend/src/api/favorite/routes/favorite.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/favorites',
      handler: 'favorite.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/favorites',
      handler: 'favorite.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/favorites/:targetType/:targetId',
      handler: 'favorite.remove',
      config: {},
    },
  ],
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 4: Коммит**

```bash
git add backend/src/api/favorite/controllers/favorite.ts backend/src/api/favorite/routes/favorite.ts
git commit -m "feat(sprint5): add Favorite controller and routes"
```

---

## Task 4: SavedSearch — utils + тесты

**Files:**

- Create: `backend/src/api/saved-search/services/saved-search-utils.ts`
- Create: `backend/tests/unit/saved-search-utils.test.ts`

- [ ] **Step 1: Написать failing тесты**

```typescript
// backend/tests/unit/saved-search-utils.test.ts
import {
  isValidSavedSearchType,
  buildVacancyFiltersFromSaved,
  buildResumeFiltersFromSaved,
} from '../../src/api/saved-search/services/saved-search-utils'

describe('isValidSavedSearchType', () => {
  it('returns true for vacancy', () => {
    expect(isValidSavedSearchType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidSavedSearchType('resume')).toBe(true)
  })

  it('returns false for unknown', () => {
    expect(isValidSavedSearchType('company')).toBe(false)
  })
})

describe('buildVacancyFiltersFromSaved', () => {
  it('always includes status=published filter', () => {
    const filters = buildVacancyFiltersFromSaved({})
    expect(filters.status).toEqual({ $eq: 'published' })
  })

  it('always includes non-expired filter', () => {
    const filters = buildVacancyFiltersFromSaved({})
    expect(filters.expiresAt).toBeDefined()
  })

  it('maps industry to Strapi relation filter', () => {
    const filters = buildVacancyFiltersFromSaved({ industry: 'abc123' })
    expect(filters.industry).toEqual({ documentId: { $eq: 'abc123' } })
  })

  it('maps country to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ country: 'RU' })
    expect(filters.country).toEqual({ $eq: 'RU' })
  })

  it('maps workFormat to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ workFormat: 'remote' })
    expect(filters.workFormat).toEqual({ $eq: 'remote' })
  })

  it('maps employmentType to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ employmentType: 'full-time' })
    expect(filters.employmentType).toEqual({ $eq: 'full-time' })
  })

  it('maps seniority to equality filter', () => {
    const filters = buildVacancyFiltersFromSaved({ seniority: 'senior' })
    expect(filters.seniority).toEqual({ $eq: 'senior' })
  })

  it('ignores unknown filter keys', () => {
    const filters = buildVacancyFiltersFromSaved({ unknown: 'value' })
    expect(Object.keys(filters)).not.toContain('unknown')
  })
})

describe('buildResumeFiltersFromSaved', () => {
  it('always includes status=published filter', () => {
    const filters = buildResumeFiltersFromSaved({})
    expect(filters.status).toEqual({ $eq: 'published' })
  })

  it('maps country to equality filter', () => {
    const filters = buildResumeFiltersFromSaved({ country: 'RU' })
    expect(filters.country).toEqual({ $eq: 'RU' })
  })

  it('maps workFormat to equality filter', () => {
    const filters = buildResumeFiltersFromSaved({ workFormat: 'remote' })
    expect(filters.workFormat).toEqual({ $eq: 'remote' })
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что FAIL**

```bash
cd backend && pnpm test -- --testPathPattern="saved-search-utils"
```

Ожидание: FAIL — `Cannot find module`

- [ ] **Step 3: Реализовать**

```typescript
// backend/src/api/saved-search/services/saved-search-utils.ts
const VALID_SAVED_SEARCH_TYPES = ['vacancy', 'resume'] as const
export type SavedSearchType = (typeof VALID_SAVED_SEARCH_TYPES)[number]

export function isValidSavedSearchType(type: string): type is SavedSearchType {
  return (VALID_SAVED_SEARCH_TYPES as readonly string[]).includes(type)
}

export function buildVacancyFiltersFromSaved(
  saved: Record<string, unknown>
): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    status: { $eq: 'published' },
    expiresAt: { $gt: new Date().toISOString() },
  }
  if (saved.industry) filters.industry = { documentId: { $eq: saved.industry } }
  if (saved.specialization) filters.specialization = { documentId: { $eq: saved.specialization } }
  if (saved.country) filters.country = { $eq: saved.country }
  if (saved.workFormat) filters.workFormat = { $eq: saved.workFormat }
  if (saved.employmentType) filters.employmentType = { $eq: saved.employmentType }
  if (saved.seniority) filters.seniority = { $eq: saved.seniority }
  return filters
}

export function buildResumeFiltersFromSaved(
  saved: Record<string, unknown>
): Record<string, unknown> {
  const filters: Record<string, unknown> = {
    status: { $eq: 'published' },
  }
  if (saved.country) filters.country = { $eq: saved.country }
  if (saved.workFormat) filters.workFormat = { $eq: saved.workFormat }
  if (saved.employmentType) filters.employmentType = { $eq: saved.employmentType }
  if (saved.experienceYears) filters.experienceYears = { $lte: saved.experienceYears }
  return filters
}
```

- [ ] **Step 4: Запустить тест — убедиться что PASS**

```bash
cd backend && pnpm test -- --testPathPattern="saved-search-utils"
```

Ожидание: PASS (13 tests)

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/saved-search/services/saved-search-utils.ts backend/tests/unit/saved-search-utils.test.ts
git commit -m "feat(sprint5): add saved-search-utils with filter builders"
```

---

## Task 5: SavedSearch — content type schema + controller + routes

**Files:**

- Create: `backend/src/api/saved-search/content-types/saved-search/schema.json`
- Create: `backend/src/api/saved-search/controllers/saved-search.ts`
- Create: `backend/src/api/saved-search/routes/saved-search.ts`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "saved_searches",
  "info": {
    "singularName": "saved-search",
    "pluralName": "saved-searches",
    "displayName": "SavedSearch",
    "description": "User's saved search subscriptions"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "name": {
      "type": "string"
    },
    "type": {
      "type": "enumeration",
      "enum": ["vacancy", "resume"],
      "required": true
    },
    "filters": {
      "type": "json",
      "required": true
    },
    "lastNotifiedAt": {
      "type": "datetime"
    }
  }
}
```

- [ ] **Step 2: Создать контроллер**

```typescript
// backend/src/api/saved-search/controllers/saved-search.ts
import type { Core } from '@strapi/strapi'
import { isValidSavedSearchType } from '../services/saved-search-utils'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { page = '1', pageSize = '20' } = ctx.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters = { user: { id: { $eq: user.id } } }

    const [searches, total] = await Promise.all([
      (strapi.documents as any)('api::saved-search.saved-search').findMany({
        filters,
        fields: ['documentId', 'name', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::saved-search.saved-search').count({ filters }),
    ])

    return ctx.send({
      data: searches,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { type, filters: savedFilters } = body

    if (!type) return ctx.badRequest('type is required')
    if (!isValidSavedSearchType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume')
    }
    if (!savedFilters || typeof savedFilters !== 'object') {
      return ctx.badRequest('filters is required and must be an object')
    }

    const search = await (strapi.documents as any)('api::saved-search.saved-search').create({
      data: {
        user: user.id,
        name: (body.name as string | undefined) ?? null,
        type: type as string,
        filters: savedFilters,
      },
      fields: ['documentId', 'name', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
    })

    ctx.status = 201
    return ctx.send({ data: search })
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const search = await (strapi.documents as any)('api::saved-search.saved-search').findFirst({
      filters: { documentId: { $eq: id }, user: { id: { $eq: user.id } } },
    })
    if (!search) return ctx.notFound('Saved search not found')

    await (strapi.documents as any)('api::saved-search.saved-search').delete({
      documentId: id,
    })

    ctx.status = 204
    return ctx.send(null)
  },
})
```

- [ ] **Step 3: Создать маршруты**

```typescript
// backend/src/api/saved-search/routes/saved-search.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/saved-searches',
      handler: 'saved-search.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/saved-searches',
      handler: 'saved-search.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/saved-searches/:id',
      handler: 'saved-search.remove',
      config: {},
    },
  ],
}
```

- [ ] **Step 4: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/saved-search/
git commit -m "feat(sprint5): add SavedSearch content type, controller and routes"
```

---

## Task 6: SavedSearch — cron job (каждые 2 часа)

**Files:**

- Modify: `backend/config/cron-tasks.ts`

- [ ] **Step 1: Добавить cron задачу в cron-tasks.ts**

Открыть `backend/config/cron-tasks.ts`. Текущий файл содержит только вакансии (expiry). Добавить вторую задачу.

Заменить содержимое файла на:

```typescript
// backend/config/cron-tasks.ts
import type { Core } from '@strapi/strapi'
import {
  buildVacancyFiltersFromSaved,
  buildResumeFiltersFromSaved,
} from '../src/api/saved-search/services/saved-search-utils'

export default {
  // Every hour at minute 0: expire vacancies
  '0 * * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const now = new Date().toISOString()

        const expired = await strapi.documents('api::vacancy.vacancy').findMany({
          filters: {
            status: { $eq: 'published' },
            expiresAt: { $lt: now },
          },
          fields: ['documentId', 'title'],
          limit: 1000,
        })

        if (expired.length === 0) return

        strapi.log.info(`[cron] Expiring ${expired.length} vacancies`)

        for (const vacancy of expired) {
          await strapi.documents('api::vacancy.vacancy').update({
            documentId: vacancy.documentId,
            data: { status: 'expired' },
          })
          // TODO Sprint 7: send Telegram notification vacancy_expiring_soon to postedBy user
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to expire vacancies', err)
      }
    },
    options: {
      tz: 'UTC',
    },
  },

  // Every 2 hours: check saved searches for new results and notify
  '0 */2 * * *': {
    task: async ({ strapi }: { strapi: Core.Strapi }) => {
      try {
        const searches = await (strapi.documents as any)('api::saved-search.saved-search').findMany(
          {
            fields: ['documentId', 'type', 'filters', 'lastNotifiedAt', 'createdAt'],
            populate: { user: { fields: ['id', 'telegramId'] } },
            limit: 5000,
          }
        )

        if (searches.length === 0) return

        strapi.log.info(`[cron] Checking ${searches.length} saved searches`)

        for (const search of searches) {
          try {
            const since = search.lastNotifiedAt ?? search.createdAt
            const savedFilters = (search.filters ?? {}) as Record<string, unknown>

            let newCount = 0

            if (search.type === 'vacancy') {
              const filters = {
                ...buildVacancyFiltersFromSaved(savedFilters),
                createdAt: { $gt: since },
              }
              newCount = await (strapi.documents as any)('api::vacancy.vacancy').count({ filters })
            } else if (search.type === 'resume') {
              const filters = {
                ...buildResumeFiltersFromSaved(savedFilters),
                createdAt: { $gt: since },
              }
              newCount = await (strapi.documents as any)('api::resume.resume').count({ filters })
            }

            if (newCount > 0) {
              strapi.log.info(
                `[cron] SavedSearch ${search.documentId}: ${newCount} new ${search.type}(s) for user ${search.user?.id}`
              )
              // TODO Sprint 7: send Telegram notification to search.user.telegramId
              // with message: `${newCount} new ${search.type} matches for "${search.name}"`

              await (strapi.documents as any)('api::saved-search.saved-search').update({
                documentId: search.documentId,
                data: { lastNotifiedAt: new Date().toISOString() },
              })
            }
          } catch (searchErr) {
            strapi.log.warn(`[cron] Failed to check saved search ${search.documentId}`, searchErr)
          }
        }
      } catch (err) {
        strapi.log.error('[cron] Failed to process saved searches', err)
      }
    },
    options: {
      tz: 'UTC',
    },
  },
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 3: Коммит**

```bash
git add backend/config/cron-tasks.ts
git commit -m "feat(sprint5): add SavedSearch cron job (every 2h) for new result notifications"
```

---

## Task 7: Block — utils + тесты

**Files:**

- Create: `backend/src/api/block/services/block-utils.ts`
- Create: `backend/tests/unit/block-utils.test.ts`

- [ ] **Step 1: Написать failing тесты**

```typescript
// backend/tests/unit/block-utils.test.ts
import { isValidTargetType } from '../../src/api/block/services/block-utils'

describe('isValidTargetType', () => {
  it('returns true for employer', () => {
    expect(isValidTargetType('employer')).toBe(true)
  })

  it('returns true for candidate', () => {
    expect(isValidTargetType('candidate')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidTargetType('admin')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isValidTargetType('')).toBe(false)
  })

  it('returns false for vacancy (wrong entity type)', () => {
    expect(isValidTargetType('vacancy')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что FAIL**

```bash
cd backend && pnpm test -- --testPathPattern="block-utils"
```

Ожидание: FAIL — `Cannot find module`

- [ ] **Step 3: Реализовать**

```typescript
// backend/src/api/block/services/block-utils.ts
const VALID_TARGET_TYPES = ['employer', 'candidate'] as const
export type BlockTargetType = (typeof VALID_TARGET_TYPES)[number]

export function isValidTargetType(type: string): type is BlockTargetType {
  return (VALID_TARGET_TYPES as readonly string[]).includes(type)
}
```

- [ ] **Step 4: Запустить тест — убедиться что PASS**

```bash
cd backend && pnpm test -- --testPathPattern="block-utils"
```

Ожидание: PASS (5 tests)

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/block/services/block-utils.ts backend/tests/unit/block-utils.test.ts
git commit -m "feat(sprint5): add block-utils with isValidTargetType"
```

---

## Task 8: Block — content type schema + block-filter service

**Files:**

- Create: `backend/src/api/block/content-types/block/schema.json`
- Create: `backend/src/api/block/services/block-filter.ts`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "blocks",
  "info": {
    "singularName": "block",
    "pluralName": "blocks",
    "displayName": "Block",
    "description": "User blocks (hidden employers or candidates)"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "targetType": {
      "type": "enumeration",
      "enum": ["employer", "candidate"],
      "required": true
    },
    "targetId": {
      "type": "integer",
      "required": true
    }
  }
}
```

Уникальность (user, targetId) обеспечивается на уровне контроллера.

- [ ] **Step 2: Создать block-filter.ts**

```typescript
// backend/src/api/block/services/block-filter.ts
import type { Core } from '@strapi/strapi'

export async function getBlockedUserIds(strapi: Core.Strapi, userId: number): Promise<number[]> {
  const blocks = await (strapi.documents as any)('api::block.block').findMany({
    filters: { user: { id: { $eq: userId } } },
    fields: ['targetId'],
    limit: 1000,
  })
  return blocks.map((b: any) => b.targetId as number)
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 4: Коммит**

```bash
git add backend/src/api/block/content-types/block/schema.json backend/src/api/block/services/block-filter.ts
git commit -m "feat(sprint5): add Block content type schema and block-filter service"
```

---

## Task 9: Block — controller + routes

**Files:**

- Create: `backend/src/api/block/controllers/block.ts`
- Create: `backend/src/api/block/routes/block.ts`

- [ ] **Step 1: Создать контроллер**

```typescript
// backend/src/api/block/controllers/block.ts
import type { Core } from '@strapi/strapi'
import { isValidTargetType } from '../services/block-utils'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { page = '1', pageSize = '20' } = ctx.query as Record<string, string>
    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters = { user: { id: { $eq: user.id } } }

    const [blockList, total] = await Promise.all([
      (strapi.documents as any)('api::block.block').findMany({
        filters,
        fields: ['documentId', 'targetType', 'targetId', 'createdAt'],
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc',
      }),
      (strapi.documents as any)('api::block.block').count({ filters }),
    ])

    return ctx.send({
      data: blockList,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { targetType, targetId } = body

    if (!targetType || !targetId) return ctx.badRequest('targetType and targetId are required')
    if (!isValidTargetType(targetType as string)) {
      return ctx.badRequest('targetType must be one of: employer, candidate')
    }
    if (typeof targetId !== 'number' && typeof targetId !== 'string') {
      return ctx.badRequest('targetId must be a number')
    }
    const targetIdNum = typeof targetId === 'string' ? parseInt(targetId, 10) : targetId
    if (isNaN(targetIdNum)) return ctx.badRequest('targetId must be a valid number')

    // Prevent self-block
    if (targetIdNum === user.id) {
      return ctx.badRequest('Cannot block yourself')
    }

    // Enforce uniqueness: (user, targetId)
    const existing = await (strapi.documents as any)('api::block.block').findFirst({
      filters: {
        user: { id: { $eq: user.id } },
        targetId: { $eq: targetIdNum },
      },
    })
    if (existing) {
      ctx.status = 409
      return ctx.send({
        error: { code: 'ALREADY_BLOCKED', message: 'This user is already blocked' },
      })
    }

    const block = await (strapi.documents as any)('api::block.block').create({
      data: {
        user: user.id,
        targetType: targetType as string,
        targetId: targetIdNum,
      },
      fields: ['documentId', 'targetType', 'targetId', 'createdAt'],
    })

    ctx.status = 201
    return ctx.send({ data: block })
  },

  async remove(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }

    const block = await (strapi.documents as any)('api::block.block').findFirst({
      filters: { documentId: { $eq: id }, user: { id: { $eq: user.id } } },
    })
    if (!block) return ctx.notFound('Block not found')

    await (strapi.documents as any)('api::block.block').delete({ documentId: id })

    ctx.status = 204
    return ctx.send(null)
  },
})
```

- [ ] **Step 2: Создать маршруты**

```typescript
// backend/src/api/block/routes/block.ts
export default {
  routes: [
    {
      method: 'GET',
      path: '/blocks',
      handler: 'block.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/blocks',
      handler: 'block.create',
      config: {},
    },
    {
      method: 'DELETE',
      path: '/blocks/:id',
      handler: 'block.remove',
      config: {},
    },
  ],
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 4: Коммит**

```bash
git add backend/src/api/block/controllers/block.ts backend/src/api/block/routes/block.ts
git commit -m "feat(sprint5): add Block controller and routes"
```

---

## Task 10: Block filter — интеграция с vacancy и company

Блокировки работают для авторизованных пользователей: вакансии и компании, принадлежащие заблокированным пользователям, исключаются из публичных списков.

**Files:**

- Modify: `backend/src/api/vacancy/controllers/vacancy.ts` (метод `findPublished`)
- Modify: `backend/src/api/company/controllers/company.ts` (метод `findPublished`)

- [ ] **Step 1: Обновить vacancy.ts — добавить import и block-filter в findPublished**

В файле `backend/src/api/vacancy/controllers/vacancy.ts` найти строку с импортами наверху и добавить:

```typescript
import { getBlockedUserIds } from '../../block/services/block-filter'
```

Затем в методе `findPublished`, после строки `const offset = (pageNum - 1) * pageSizeNum`, но перед блоком FTS, добавить получение blockedIds:

```typescript
// Block filter: hide vacancies from users the current user has blocked
let blockedUserIds: number[] = []
if (ctx.state.user) {
  blockedUserIds = await getBlockedUserIds(strapi, (ctx.state.user as { id: number }).id)
}
```

Затем найти место где строится `baseFilters` для FTS-ветки (после `const allFtsIds`):

```typescript
const baseFilters: Record<string, unknown> = {
  documentId: { $in: allFtsIds },
  status: { $eq: 'published' },
  expiresAt: { $gt: new Date().toISOString() },
}
```

И добавить после этой декларации:

```typescript
if (blockedUserIds.length > 0) {
  baseFilters.postedBy = { id: { $notIn: blockedUserIds } }
}
```

Также найти место где строится `filters` для non-FTS ветки:

```typescript
const filters: Record<string, unknown> = {
  status: { $eq: 'published' },
  expiresAt: { $gt: new Date().toISOString() },
}
```

И добавить после:

```typescript
if (blockedUserIds.length > 0) {
  filters.postedBy = { id: { $notIn: blockedUserIds } }
}
```

- [ ] **Step 2: Обновить company.ts — добавить import и block-filter в findPublished**

В файле `backend/src/api/company/controllers/company.ts` добавить import:

```typescript
import { getBlockedUserIds } from '../../block/services/block-filter'
```

В методе `findPublished`, после чтения query params, добавить:

```typescript
// Block filter: hide companies owned by blocked users
let blockedUserIds: number[] = []
if (ctx.state.user) {
  blockedUserIds = await getBlockedUserIds(strapi, (ctx.state.user as { id: number }).id)
}
```

И в блоке формирования filters, после `if (companySize) filters.companySize = { $eq: companySize }`, добавить:

```typescript
if (blockedUserIds.length > 0) {
  filters.owner = { id: { $notIn: blockedUserIds } }
}
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 4: Запустить все тесты**

```bash
cd backend && pnpm test
```

Ожидание: все тесты PASS (существующие тесты не должны сломаться)

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/vacancy/controllers/vacancy.ts backend/src/api/company/controllers/company.ts
git commit -m "feat(sprint5): apply block filter to GET /vacancies and GET /companies"
```

---

## Task 11: Report — utils + тесты

**Files:**

- Create: `backend/src/api/report/services/report-utils.ts`
- Create: `backend/tests/unit/report-utils.test.ts`

- [ ] **Step 1: Написать failing тесты**

```typescript
// backend/tests/unit/report-utils.test.ts
import { isValidReportType, isValidReportReason } from '../../src/api/report/services/report-utils'

describe('isValidReportType', () => {
  it('returns true for vacancy', () => {
    expect(isValidReportType('vacancy')).toBe(true)
  })

  it('returns true for resume', () => {
    expect(isValidReportType('resume')).toBe(true)
  })

  it('returns true for company', () => {
    expect(isValidReportType('company')).toBe(true)
  })

  it('returns true for user', () => {
    expect(isValidReportType('user')).toBe(true)
  })

  it('returns false for unknown type', () => {
    expect(isValidReportType('application')).toBe(false)
  })
})

describe('isValidReportReason', () => {
  it('returns true for spam', () => {
    expect(isValidReportReason('spam')).toBe(true)
  })

  it('returns true for fraud', () => {
    expect(isValidReportReason('fraud')).toBe(true)
  })

  it('returns true for inappropriate', () => {
    expect(isValidReportReason('inappropriate')).toBe(true)
  })

  it('returns true for other', () => {
    expect(isValidReportReason('other')).toBe(true)
  })

  it('returns false for unknown reason', () => {
    expect(isValidReportReason('duplicate')).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что FAIL**

```bash
cd backend && pnpm test -- --testPathPattern="report-utils"
```

Ожидание: FAIL — `Cannot find module`

- [ ] **Step 3: Реализовать**

```typescript
// backend/src/api/report/services/report-utils.ts
const VALID_REPORT_TYPES = ['vacancy', 'resume', 'company', 'user'] as const
const VALID_REPORT_REASONS = ['spam', 'fraud', 'inappropriate', 'other'] as const

export type ReportType = (typeof VALID_REPORT_TYPES)[number]
export type ReportReason = (typeof VALID_REPORT_REASONS)[number]

export function isValidReportType(type: string): type is ReportType {
  return (VALID_REPORT_TYPES as readonly string[]).includes(type)
}

export function isValidReportReason(reason: string): reason is ReportReason {
  return (VALID_REPORT_REASONS as readonly string[]).includes(reason)
}
```

- [ ] **Step 4: Запустить тест — убедиться что PASS**

```bash
cd backend && pnpm test -- --testPathPattern="report-utils"
```

Ожидание: PASS (9 tests)

- [ ] **Step 5: Коммит**

```bash
git add backend/src/api/report/services/report-utils.ts backend/tests/unit/report-utils.test.ts
git commit -m "feat(sprint5): add report-utils with isValidReportType and isValidReportReason"
```

---

## Task 12: Report — content type schema + controller + routes

**Files:**

- Create: `backend/src/api/report/content-types/report/schema.json`
- Create: `backend/src/api/report/controllers/report.ts`
- Create: `backend/src/api/report/routes/report.ts`

- [ ] **Step 1: Создать schema.json**

```json
{
  "kind": "collectionType",
  "collectionName": "reports",
  "info": {
    "singularName": "report",
    "pluralName": "reports",
    "displayName": "Report",
    "description": "User complaint reports"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "reporter": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "type": {
      "type": "enumeration",
      "enum": ["vacancy", "resume", "company", "user"],
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "reason": {
      "type": "enumeration",
      "enum": ["spam", "fraud", "inappropriate", "other"],
      "required": true
    },
    "comment": {
      "type": "text"
    },
    "status": {
      "type": "enumeration",
      "enum": ["pending", "reviewed", "resolved"],
      "default": "pending",
      "required": true
    }
  }
}
```

- [ ] **Step 2: Создать контроллер**

```typescript
// backend/src/api/report/controllers/report.ts
import type { Core } from '@strapi/strapi'
import { isValidReportType, isValidReportReason } from '../services/report-utils'

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { type, targetId, reason } = body

    if (!type || !targetId || !reason) {
      return ctx.badRequest('type, targetId and reason are required')
    }
    if (!isValidReportType(type as string)) {
      return ctx.badRequest('type must be one of: vacancy, resume, company, user')
    }
    if (!isValidReportReason(reason as string)) {
      return ctx.badRequest('reason must be one of: spam, fraud, inappropriate, other')
    }

    const report = await (strapi.documents as any)('api::report.report').create({
      data: {
        reporter: user.id,
        type: type as string,
        targetId: String(targetId),
        reason: reason as string,
        comment: (body.comment as string | undefined) ?? null,
        status: 'pending',
      },
      fields: ['documentId', 'type', 'targetId', 'reason', 'comment', 'status', 'createdAt'],
    })

    ctx.status = 201
    return ctx.send({ data: report })
  },
})
```

- [ ] **Step 3: Создать маршруты**

```typescript
// backend/src/api/report/routes/report.ts
export default {
  routes: [
    {
      method: 'POST',
      path: '/reports',
      handler: 'report.create',
      config: {},
    },
  ],
}
```

- [ ] **Step 4: Запустить typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Step 5: Запустить все тесты**

```bash
cd backend && pnpm test
```

Ожидание: все тесты PASS. Проверить итоговое число тестов (должно быть ≥ 132 + 27 новых = ~159).

- [ ] **Step 6: Коммит**

```bash
git add backend/src/api/report/
git commit -m "feat(sprint5): add Report content type, controller and routes"
```

---

## Финальная проверка

- [ ] **Запустить полный typecheck**

```bash
cd backend && pnpm tsc --noEmit
```

Ожидание: 0 ошибок

- [ ] **Запустить полный набор тестов**

```bash
cd backend && pnpm test
```

Ожидание: все тесты PASS

- [ ] **Проверить структуру новых API-директорий**

```bash
find backend/src/api/favorite backend/src/api/saved-search backend/src/api/block backend/src/api/report -type f | sort
```

Ожидаемый вывод (22 файла):

```
backend/src/api/block/content-types/block/schema.json
backend/src/api/block/controllers/block.ts
backend/src/api/block/routes/block.ts
backend/src/api/block/services/block-filter.ts
backend/src/api/block/services/block-utils.ts
backend/src/api/favorite/content-types/favorite/schema.json
backend/src/api/favorite/controllers/favorite.ts
backend/src/api/favorite/routes/favorite.ts
backend/src/api/favorite/services/favorite-utils.ts
backend/src/api/report/content-types/report/schema.json
backend/src/api/report/controllers/report.ts
backend/src/api/report/routes/report.ts
backend/src/api/report/services/report-utils.ts
backend/src/api/saved-search/content-types/saved-search/schema.json
backend/src/api/saved-search/controllers/saved-search.ts
backend/src/api/saved-search/routes/saved-search.ts
backend/src/api/saved-search/services/saved-search-utils.ts
```

---

## Покрытие спецификации

| Требование Sprint 5 Backend                                        | Task  | Статус |
| ------------------------------------------------------------------ | ----- | ------ |
| Content type: Favorite (unique constraint user+type+targetId)      | 1–3   | ✓      |
| GET/POST/DELETE /favorites                                         | 3     | ✓      |
| Content type: SavedSearch                                          | 5     | ✓      |
| GET/POST/DELETE /saved-searches                                    | 5     | ✓      |
| Cron каждые 2ч: новые результаты → уведомление (TODO Sprint 7)     | 6     | ✓      |
| Content type: Block (unique constraint user+targetId)              | 8–9   | ✓      |
| GET/POST/DELETE /blocks                                            | 9     | ✓      |
| Middleware: фильтровать заблокированных из /vacancies и /companies | 10    | ✓      |
| Content type: Report                                               | 11–12 | ✓      |
| POST /reports                                                      | 12    | ✓      |

## Известные MVP-ограничения (Sprint 6+)

- Telegram уведомления для SavedSearch — заглушки (Sprint 7 подключит реальную отправку)
- Block filter только для авторизованных пользователей (публичные запросы без JWT не фильтруются)
- GET /favorites с populate entity выполняет N+1 запросов (достаточно для MVP, оптимизировать в Sprint 9/10)
