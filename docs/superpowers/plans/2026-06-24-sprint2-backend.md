# Sprint 2 Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать оставшиеся задачи Sprint 2 Backend — эндпоинт GET /industries, content type Company с полным CRUD, статусный workflow (draft → moderation → published), публичные и приватные эндпоинты, политику is-company-owner, lifecycle hook.

**Architecture:** Кастомные Strapi 5 контроллеры с Document Service API. Industry переопределяет `find` для auto-populate specializations. Company использует полностью кастомный routes-файл (чтобы контролировать порядок маршрутов: `/my` и `/slug/:slug` должны стоять ДО `/:id`). Бизнес-логика (slug, статусные переходы) вынесена в чистые функции, покрытые unit-тестами. Lifecycle hook логирует событие публикации (полная notification-система — Sprint 7).

**Tech Stack:** Strapi 5.48.1, TypeScript, PostgreSQL via Strapi Document Service, Jest + ts-jest (unit tests в `backend/tests/unit/`).

---

## Статус задач

- [x] **Task 1** — Content type Industry (`src/api/industry/content-types/industry/schema.json`)
- [x] **Task 2** — Content type Specialization (`src/api/specialization/content-types/specialization/schema.json`)
- [x] **Task 3** — Seed data (`src/data/industries.ts`, `src/scripts/seed-industries.ts`, вызов в `src/index.ts` bootstrap)
- [x] **Task 4** — GET /industries (populate specializations)
- [x] **Task 5** — Company schema + skeleton файлы
- [x] **Task 6** — Company business logic utilities (unit-тесты)
- [x] **Task 7** — Policy `is-company-owner` (unit-тесты)
- [x] **Task 8** — Company routes (все маршруты)
- [x] **Task 9** — Company service (createCompany + generateUniqueSlug)
- [x] **Task 10** — POST /companies контроллер
- [x] **Task 11** — POST /companies/:id/submit контроллер
- [x] **Task 12** — GET /companies (публичный список + фильтры)
- [x] **Task 13** — GET /companies/:id + GET /companies/slug/:slug
- [x] **Task 14** — PUT /companies/:id
- [x] **Task 15** — DELETE /companies/:id
- [x] **Task 16** — GET /companies/my
- [x] **Task 17** — Company lifecycle hook (published → notification stub)

---

### Task 1: Content type Industry ✅

**Files:**

- Create: `backend/src/api/industry/content-types/industry/schema.json`
- Create: `backend/src/api/industry/controllers/industry.ts`
- Create: `backend/src/api/industry/routes/industry.ts`
- Create: `backend/src/api/industry/services/industry.ts`

- [x] **Step 1: Создать директории**

```bash
mkdir -p backend/src/api/industry/content-types/industry
mkdir -p backend/src/api/industry/controllers
mkdir -p backend/src/api/industry/routes
mkdir -p backend/src/api/industry/services
```

- [x] **Step 2: Создать schema.json**

`backend/src/api/industry/content-types/industry/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "industries",
  "info": {
    "singularName": "industry",
    "pluralName": "industries",
    "displayName": "Industry",
    "description": "Job industry category"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "name": { "type": "json", "required": true },
    "slug": { "type": "string", "unique": true, "required": true },
    "specializations": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "api::specialization.specialization",
      "mappedBy": "industry"
    }
  }
}
```

Ключевые решения:

- `name` как `json` (не отдельные поля), чтобы хранить `{ru, en}` без Strapi i18n плагина
- `specializations` — обратная сторона отношения (определяется через `mappedBy`); прямая сторона в Specialization

- [x] **Step 3: Создать factory boilerplate**

`controllers/industry.ts`, `routes/industry.ts`, `services/industry.ts` — стандартные `factories.createCore*('api::industry.industry')`. Кастомизация `find` делается в Task 4.

- [x] **Step 4: Генерировать TypeScript типы и проверить**

```bash
cd backend && npx strapi ts:generate-types --silent && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [x] **Step 5: Commit**

```bash
git add backend/src/api/industry/
git commit -m "feat(backend): add Industry content type"
```

---

### Task 2: Content type Specialization ✅

**Files:**

- Create: `backend/src/api/specialization/content-types/specialization/schema.json`
- Create: `backend/src/api/specialization/controllers/specialization.ts`
- Create: `backend/src/api/specialization/routes/specialization.ts`
- Create: `backend/src/api/specialization/services/specialization.ts`

- [x] **Step 1: Создать директории**

```bash
mkdir -p backend/src/api/specialization/content-types/specialization
mkdir -p backend/src/api/specialization/{controllers,routes,services}
```

- [x] **Step 2: Создать schema.json**

`backend/src/api/specialization/content-types/specialization/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "specializations",
  "info": {
    "singularName": "specialization",
    "pluralName": "specializations",
    "displayName": "Specialization",
    "description": "Job specialization within an industry"
  },
  "options": { "draftAndPublish": false },
  "pluginOptions": {},
  "attributes": {
    "industry": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::industry.industry",
      "inversedBy": "specializations"
    },
    "name": { "type": "json", "required": true },
    "slug": { "type": "string", "unique": true, "required": true }
  }
}
```

Ключевое решение: `inversedBy: "specializations"` замыкает двунаправленное отношение с Industry.

- [x] **Step 3: Создать factory boilerplate**

`controllers/specialization.ts`, `routes/specialization.ts`, `services/specialization.ts` — стандартные `factories.createCore*('api::specialization.specialization')`.

- [x] **Step 4: Генерировать типы и проверить**

```bash
cd backend && npx strapi ts:generate-types --silent && npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add backend/src/api/specialization/
git commit -m "feat(backend): add Specialization content type"
```

---

### Task 3: Seed data — industries и specializations ✅

**Files:**

- Create: `backend/src/data/industries.ts`
- Create: `backend/src/scripts/seed-industries.ts`
- Modify: `backend/src/index.ts` (bootstrap)

- [x] **Step 1: Создать данные для seed**

`backend/src/data/industries.ts` — массив `INDUSTRIES_SEED: IndustrySeed[]` с 12 отраслями и 87 специализациями из `docs/seed-data.md`. Структура:

```typescript
export interface IndustrySeed {
  name: { ru: string; en: string }
  slug: string
  specializations: Array<{ name: { ru: string; en: string }; slug: string }>
}
```

- [x] **Step 2: Создать idempotent seed-функцию**

`backend/src/scripts/seed-industries.ts`:

```typescript
export async function seedIndustries(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.documents('api::industry.industry').count({})
  if (existing > 0) return // idempotent — пропускает, если данные уже есть

  for (const industry of INDUSTRIES_SEED) {
    const created = await strapi.documents('api::industry.industry').create({
      data: { name: industry.name, slug: industry.slug },
    })
    for (const spec of industry.specializations) {
      await strapi.documents('api::specialization.specialization').create({
        data: { name: spec.name, slug: spec.slug, industry: created.documentId },
      })
    }
  }
}
```

Ключевое решение: связь через `industry: created.documentId` — Document Service API Strapi 5 принимает documentId для relations.

- [x] **Step 3: Подключить к bootstrap**

`backend/src/index.ts` — изменить `bootstrap` на `async`, добавить `await seedIndustries(strapi)` в начало:

```typescript
async bootstrap({ strapi }: { strapi: Core.Strapi }) {
  await seedIndustries(strapi)
  // ... rate limit middleware ...
}
```

- [x] **Step 4: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

- [x] **Step 5: Commit**

```bash
git add backend/src/data/ backend/src/scripts/ backend/src/index.ts
git commit -m "feat(backend): seed industries and specializations on bootstrap"
```

---

### Task 4: GET /industries — возвращает все индустрии с populate specializations ✅

**Files:**

- Modify: `backend/src/api/industry/controllers/industry.ts`

- [x] **Step 1: Переопределить `find` в контроллере**

Заменить содержимое `backend/src/api/industry/controllers/industry.ts`:

```typescript
import { factories } from '@strapi/strapi'

export default factories.createCoreController('api::industry.industry', ({ strapi }) => ({
  async find(ctx) {
    const industries = await strapi.documents('api::industry.industry').findMany({
      populate: { specializations: true },
      sort: 'slug:asc',
    })
    ctx.send(industries)
  },
}))
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Настроить публичный доступ в Strapi Admin**

Запустить Strapi: `pnpm develop`
Перейти: Admin → Settings → Users & Permissions → Roles → Public → Industry → включить `find`.
Проверить:

```bash
curl http://localhost:1337/api/industries
```

Ожидаемый результат: массив объектов, каждый содержит `specializations[]`.

- [x] **Step 4: Commit**

```bash
git add backend/src/api/industry/controllers/industry.ts
git commit -m "feat(backend): GET /industries returns all industries with specializations"
```

---

### Task 5: Company schema + skeleton файлы ✅

**Files:**

- Create: `backend/src/api/company/content-types/company/schema.json`
- Create: `backend/src/api/company/controllers/company.ts` (skeleton)
- Create: `backend/src/api/company/routes/company.ts` (skeleton)
- Create: `backend/src/api/company/services/company.ts` (skeleton)
- Create: `backend/src/api/company/policies/` (пустая директория)

- [ ] **Step 1: Создать директории**

```bash
mkdir -p backend/src/api/company/content-types/company
mkdir -p backend/src/api/company/controllers
mkdir -p backend/src/api/company/routes
mkdir -p backend/src/api/company/services
mkdir -p backend/src/api/company/policies
```

- [ ] **Step 2: Создать schema.json**

Создать `backend/src/api/company/content-types/company/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "companies",
  "info": {
    "singularName": "company",
    "pluralName": "companies",
    "displayName": "Company",
    "description": "Employer company profile"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "owner": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "name": {
      "type": "string",
      "required": true
    },
    "slug": {
      "type": "string",
      "unique": true,
      "required": true
    },
    "logo": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "cover": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "description": {
      "type": "richtext",
      "required": true
    },
    "website": {
      "type": "string"
    },
    "telegram": {
      "type": "string"
    },
    "linkedin": {
      "type": "string"
    },
    "country": {
      "type": "string",
      "required": true
    },
    "city": {
      "type": "string"
    },
    "companySize": {
      "type": "enumeration",
      "enum": ["1-10", "11-50", "51-200", "201-500", "500+"],
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "moderation", "published", "rejected"],
      "default": "draft",
      "required": true
    }
  }
}
```

- [ ] **Step 3: Создать skeleton controller**

Создать `backend/src/api/company/controllers/company.ts`:

```typescript
import type { Core } from '@strapi/strapi'

// handlers добавляются в Tasks 10-16
export default ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({})
```

- [ ] **Step 4: Создать skeleton routes**

Создать `backend/src/api/company/routes/company.ts`:

```typescript
// маршруты добавляются в Task 8
export default { routes: [] }
```

- [ ] **Step 5: Создать skeleton service**

Создать `backend/src/api/company/services/company.ts`:

```typescript
import type { Core } from '@strapi/strapi'

// методы добавляются в Task 9
export default ({ strapi: _strapi }: { strapi: Core.Strapi }) => ({})
```

- [ ] **Step 6: Генерировать TypeScript типы и проверить**

```bash
cd backend && npx strapi ts:generate-types --silent && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 7: Commit**

```bash
git add backend/src/api/company/
git commit -m "feat(backend): add Company content type schema and skeleton files"
```

---

### Task 6: Company business logic utilities (pure functions + unit tests) ✅

**Files:**

- Create: `backend/src/api/company/services/company-utils.ts`
- Create: `backend/tests/unit/company-utils.test.ts`

- [ ] **Step 1: Написать failing tests**

Создать `backend/tests/unit/company-utils.test.ts`:

```typescript
import { toSlug, canSubmit, canDelete } from '../../src/api/company/services/company-utils'

describe('toSlug', () => {
  it('converts name to lowercase hyphenated slug', () => {
    expect(toSlug('Acme Corp')).toBe('acme-corp')
  })

  it('removes non-alphanumeric characters', () => {
    expect(toSlug('Hello & World!')).toBe('hello-world')
  })

  it('collapses multiple spaces into single hyphen', () => {
    expect(toSlug('Hello   World')).toBe('hello-world')
  })

  it('trims leading/trailing whitespace', () => {
    expect(toSlug('  MyCompany  ')).toBe('mycompany')
  })

  it('collapses consecutive hyphens', () => {
    expect(toSlug('A--B')).toBe('a-b')
  })
})

describe('canSubmit', () => {
  it('allows transition from draft', () => {
    expect(canSubmit('draft')).toBe(true)
  })

  it('blocks transition from moderation', () => {
    expect(canSubmit('moderation')).toBe(false)
  })

  it('blocks transition from published', () => {
    expect(canSubmit('published')).toBe(false)
  })

  it('blocks transition from rejected', () => {
    expect(canSubmit('rejected')).toBe(false)
  })
})

describe('canDelete', () => {
  it('allows delete when no active vacancies', () => {
    expect(canDelete(0)).toBe(true)
  })

  it('blocks delete when active vacancies exist', () => {
    expect(canDelete(1)).toBe(false)
    expect(canDelete(10)).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться что FAIL**

```bash
cd backend && pnpm test
```

Ожидаемый результат: FAIL — Cannot find module `company-utils`.

- [ ] **Step 3: Реализовать функции**

Создать `backend/src/api/company/services/company-utils.ts`:

```typescript
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function canSubmit(status: string): boolean {
  return status === 'draft'
}

export function canDelete(activeVacancyCount: number): boolean {
  return activeVacancyCount === 0
}
```

- [ ] **Step 4: Запустить тесты — убедиться что PASS**

```bash
cd backend && pnpm test
```

Ожидаемый результат: PASS — 8 тестов.

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/company/services/company-utils.ts backend/tests/unit/company-utils.test.ts
git commit -m "feat(backend): add company business logic utilities with unit tests"
```

---

### Task 7: Policy `is-company-owner`

**Files:**

- Create: `backend/src/api/company/policies/is-company-owner.ts`
- Create: `backend/tests/unit/is-company-owner.test.ts`

- [ ] **Step 1: Написать failing tests**

Создать `backend/tests/unit/is-company-owner.test.ts`:

```typescript
import { checkIsOwner } from '../../src/api/company/policies/is-company-owner'

describe('checkIsOwner', () => {
  it('returns true when userId matches company owner id', () => {
    expect(checkIsOwner({ owner: { id: 42 } }, 42)).toBe(true)
  })

  it('returns false when userId does not match owner', () => {
    expect(checkIsOwner({ owner: { id: 42 } }, 99)).toBe(false)
  })

  it('returns false when company has no owner', () => {
    expect(checkIsOwner({ owner: null }, 42)).toBe(false)
  })
})
```

- [ ] **Step 2: Запустить тесты — убедиться что FAIL**

```bash
cd backend && pnpm test
```

Ожидаемый результат: FAIL — Cannot find module.

- [ ] **Step 3: Реализовать policy**

Создать `backend/src/api/company/policies/is-company-owner.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type CompanyWithOwner = { owner: { id: number } | null }

export function checkIsOwner(company: CompanyWithOwner, userId: number): boolean {
  return company.owner?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const company = await strapi.documents('api::company.company').findOne({
    documentId: id,
    populate: { owner: { fields: ['id'] } },
  })

  if (!company) return false

  return checkIsOwner(company as CompanyWithOwner, user.id)
}
```

- [ ] **Step 4: Запустить тесты — убедиться что PASS**

```bash
cd backend && pnpm test
```

Ожидаемый результат: PASS — 3 теста.

- [ ] **Step 5: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/company/policies/is-company-owner.ts backend/tests/unit/is-company-owner.test.ts
git commit -m "feat(backend): add is-company-owner policy with unit tests"
```

---

### Task 8: Company routes — определить все маршруты

**Files:**

- Modify: `backend/src/api/company/routes/company.ts`

**Важно:** `/companies/my` и `/companies/slug/:slug` должны идти ДО `/companies/:id`, иначе строки `my` и `slug` будут захвачены параметром `:id`.

- [ ] **Step 1: Заменить skeleton на полный routes файл**

Заменить `backend/src/api/company/routes/company.ts`:

```typescript
export default {
  routes: [
    // Публичные (без авторизации)
    {
      method: 'GET',
      path: '/companies',
      handler: 'company.findPublished',
      config: { auth: false },
    },

    // Авторизованные без параметра :id — должны идти ДО /:id
    {
      method: 'GET',
      path: '/companies/my',
      handler: 'company.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/companies',
      handler: 'company.create',
      config: {},
    },

    // Публичные по slug — до /:id
    {
      method: 'GET',
      path: '/companies/slug/:slug',
      handler: 'company.findBySlug',
      config: { auth: false },
    },

    // По id — публичные
    {
      method: 'GET',
      path: '/companies/:id',
      handler: 'company.findOne',
      config: { auth: false },
    },

    // По id — авторизованные
    {
      method: 'POST',
      path: '/companies/:id/submit',
      handler: 'company.submit',
      config: {},
    },

    // По id — только владелец (policy)
    {
      method: 'PUT',
      path: '/companies/:id',
      handler: 'company.update',
      config: {
        policies: ['api::company.is-company-owner'],
      },
    },
    {
      method: 'DELETE',
      path: '/companies/:id',
      handler: 'company.delete',
      config: {
        policies: ['api::company.is-company-owner'],
      },
    },
  ],
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/routes/company.ts
git commit -m "feat(backend): define all company routes with correct ordering"
```

---

### Task 9: Company service — createCompany + generateUniqueSlug

**Files:**

- Modify: `backend/src/api/company/services/company.ts`

- [ ] **Step 1: Реализовать service**

Заменить `backend/src/api/company/services/company.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { toSlug } from './company-utils'

type CreateCompanyInput = {
  name: string
  description: string
  country: string
  companySize: string
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createCompany(ownerId: number, input: CreateCompanyInput) {
    const baseSlug = toSlug(input.name)
    const slug = await generateUniqueSlug(strapi, baseSlug)

    return strapi.documents('api::company.company').create({
      data: {
        ...input,
        slug,
        status: 'draft',
        owner: ownerId,
      },
    })
  },

  async generateUniqueSlug(base: string, excludeDocumentId?: string): Promise<string> {
    return generateUniqueSlug(strapi, base, excludeDocumentId)
  },
})

async function generateUniqueSlug(
  strapi: Core.Strapi,
  base: string,
  excludeDocumentId?: string
): Promise<string> {
  let slug = base
  let attempt = 0

  while (true) {
    const existing = await strapi.documents('api::company.company').findFirst({
      filters: { slug: { $eq: slug } },
      fields: ['documentId'],
    })

    if (!existing || existing.documentId === excludeDocumentId) return slug

    attempt++
    slug = `${base}-${attempt}`
  }
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/services/company.ts
git commit -m "feat(backend): Company service — createCompany with unique slug generation"
```

---

### Task 10: POST /companies — создать компанию

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handler `create`**

Заменить `backend/src/api/company/controllers/company.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { toSlug, canSubmit, canDelete } from '../services/company-utils'
import type companyServiceFactory from '../services/company'

type CompanyService = ReturnType<typeof companyServiceFactory>

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::company.company') as unknown as CompanyService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number }
      const body = ctx.request.body as Record<string, unknown>

      const { name, description, country, companySize } = body
      if (!name || !description || !country || !companySize) {
        return ctx.badRequest('name, description, country and companySize are required')
      }

      const company = await svc().createCompany(user.id, {
        name: name as string,
        description: description as string,
        country: country as string,
        companySize: companySize as string,
        city: body.city as string | undefined,
        website: body.website as string | undefined,
        telegram: body.telegram as string | undefined,
        linkedin: body.linkedin as string | undefined,
      })

      ctx.status = 201
      ctx.send({ data: company })
    },
  }
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): POST /companies — create company with auto slug"
```

---

### Task 11: POST /companies/:id/submit — draft → moderation

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handler `submit`**

Добавить в объект, возвращаемый контроллером (после `create`):

```typescript
    async submit(ctx: any) {
      const user = ctx.state.user as { id: number }
      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findOne({
        documentId: id,
        populate: { owner: { fields: ['id'] } },
      })

      if (!company) return ctx.notFound('Company not found')

      const owner = company.owner as { id: number } | null
      if (!owner || owner.id !== user.id) {
        return ctx.forbidden('You are not the owner of this company')
      }

      if (!canSubmit(company.status)) {
        return ctx.badRequest(
          `Cannot submit company with status "${company.status}". Must be "draft".`
        )
      }

      const updated = await strapi.documents('api::company.company').update({
        documentId: id,
        data: { status: 'moderation' },
      })

      ctx.send({ data: updated })
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): POST /companies/:id/submit — draft → moderation"
```

---

### Task 12: GET /companies — публичный список с фильтрами

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handler `findPublished`**

Добавить в объект, возвращаемый контроллером:

```typescript
    async findPublished(ctx: any) {
      const {
        search,
        country,
        companySize,
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10))
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)))

      const filters: Record<string, unknown> = { status: { $eq: 'published' } }

      if (search) {
        filters.$or = [
          { name: { $containsi: search } },
          { description: { $containsi: search } },
        ]
      }
      if (country) filters.country = { $eq: country }
      if (companySize) filters.companySize = { $eq: companySize }

      const [companies, total] = await Promise.all([
        strapi.documents('api::company.company').findMany({
          filters,
          fields: ['documentId', 'name', 'slug', 'country', 'city', 'companySize', 'status', 'createdAt'],
          populate: { logo: true },
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::company.company').count({ filters }),
      ])

      ctx.send({
        data: companies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): GET /companies — public list with search/country/size filters"
```

---

### Task 13: GET /companies/:id + GET /companies/slug/:slug

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handlers `findOne` и `findBySlug`**

Добавить в объект, возвращаемый контроллером:

```typescript
    async findOne(ctx: any) {
      const { id } = ctx.params as { id: string }

      const company = await strapi.documents('api::company.company').findOne({
        documentId: id,
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company || company.status !== 'published') {
        return ctx.notFound('Company not found')
      }

      ctx.send({ data: company })
    },

    async findBySlug(ctx: any) {
      const { slug } = ctx.params as { slug: string }

      const company = await strapi.documents('api::company.company').findFirst({
        filters: { slug: { $eq: slug }, status: { $eq: 'published' } },
        populate: {
          logo: true,
          cover: true,
          owner: { fields: ['id', 'firstName', 'lastName'] },
        },
      })

      if (!company) return ctx.notFound('Company not found')

      ctx.send({ data: company })
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): GET /companies/:id and GET /companies/slug/:slug"
```

---

### Task 14: PUT /companies/:id — обновить (только владелец)

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handler `update`**

Добавить в объект, возвращаемый контроллером:

```typescript
    async update(ctx: any) {
      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const ALLOWED_FIELDS = [
        'name', 'description', 'country', 'companySize',
        'city', 'website', 'telegram', 'linkedin',
      ] as const

      const data: Record<string, unknown> = {}
      for (const field of ALLOWED_FIELDS) {
        if (body[field] !== undefined) data[field] = body[field]
      }

      if (typeof body.name === 'string') {
        const existing = await strapi.documents('api::company.company').findOne({
          documentId: id,
          fields: ['name'],
        })
        if (existing && existing.name !== body.name) {
          const baseSlug = toSlug(body.name)
          data.slug = await svc().generateUniqueSlug(baseSlug, id)
        }
      }

      const updated = await strapi.documents('api::company.company').update({
        documentId: id,
        data,
      })

      ctx.send({ data: updated })
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): PUT /companies/:id — update company, regenerate slug on name change"
```

---

### Task 15: DELETE /companies/:id — проверка активных вакансий

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

**Примечание:** Content type Vacancy создаётся в Sprint 3. До этого count вакансий возвращает 0 (stub). Когда Sprint 3 будет готов — убрать stub и раскомментировать реальный запрос.

- [ ] **Step 1: Добавить handler `delete`**

Добавить в объект, возвращаемый контроллером:

```typescript
    async delete(ctx: any) {
      const { id } = ctx.params as { id: string }

      // TODO Sprint 3: заменить на реальный count после создания Vacancy content type
      // const activeCount = await strapi.documents('api::vacancy.vacancy').count({
      //   filters: {
      //     company: { documentId: { $eq: id } },
      //     status: { $in: ['published', 'moderation'] },
      //   },
      // })
      const activeCount = 0

      if (!canDelete(activeCount)) {
        return ctx.badRequest(
          `Cannot delete company with ${activeCount} active vacancy(ies). Archive them first.`
        )
      }

      await strapi.documents('api::company.company').delete({ documentId: id })

      ctx.status = 204
      ctx.send()
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): DELETE /companies/:id — delete company (vacancy check stubbed for Sprint 3)"
```

---

### Task 16: GET /companies/my — мои компании (все статусы)

**Files:**

- Modify: `backend/src/api/company/controllers/company.ts`

- [ ] **Step 1: Добавить handler `findMine`**

Добавить в объект, возвращаемый контроллером:

```typescript
    async findMine(ctx: any) {
      const user = ctx.state.user as { id: number }
      const {
        status,
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10))
      const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10)))

      const filters: Record<string, unknown> = {
        owner: { id: { $eq: user.id } },
      }
      if (status) filters.status = { $eq: status }

      const [companies, total] = await Promise.all([
        strapi.documents('api::company.company').findMany({
          filters,
          populate: { logo: true },
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc',
        }),
        strapi.documents('api::company.company').count({ filters }),
      ])

      ctx.send({
        data: companies,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/controllers/company.ts
git commit -m "feat(backend): GET /companies/my — return authenticated user's companies"
```

---

### Task 17: Company lifecycle hook — published → notification stub

**Files:**

- Create: `backend/src/api/company/content-types/company/lifecycles.ts`

- [ ] **Step 1: Создать lifecycle файл**

Создать `backend/src/api/company/content-types/company/lifecycles.ts`:

```typescript
type CompanyUpdateEvent = {
  result: {
    documentId: string
    name: string
    status: string
    owner?: { id: number }
  }
  params: {
    data?: { status?: string }
  }
}

export default {
  async afterUpdate(event: CompanyUpdateEvent) {
    const { result, params } = event

    // Срабатывает только при смене статуса на 'published'
    if (params.data?.status !== 'published') return

    const ownerId = result.owner?.id
    if (!ownerId) return

    // TODO Sprint 7: заменить на strapi.service('api::notification.notification').send(...)
    strapi.log.info(
      `[lifecycle] Company "${result.name}" (${result.documentId}) published — notify owner ${ownerId}`
    )
  },
}
```

- [ ] **Step 2: Проверить TypeScript**

```bash
cd backend && npx tsc --noEmit
```

Ожидаемый результат: нет ошибок.

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/company/content-types/company/lifecycles.ts
git commit -m "feat(backend): Company lifecycle hook — log published event (notification stub for Sprint 7)"
```

---

## Self-Review

### Spec coverage

| Требование из sprint-plan.md                                     | Task             |
| ---------------------------------------------------------------- | ---------------- |
| Content type Industry                                            | ✅ Task 1 (done) |
| Content type Specialization                                      | ✅ Task 2 (done) |
| Seed industries + specializations                                | ✅ Task 3 (done) |
| GET /industries с populate specializations                       | Task 4           |
| Content type Company                                             | Task 5           |
| POST /companies — создать (статус draft)                         | Task 10          |
| POST /companies/:id/submit — draft → moderation                  | Task 11          |
| GET /companies — список published (search + country + пагинация) | Task 12          |
| GET /companies/:id — публичная карточка                          | Task 13          |
| GET /companies/slug/:slug                                        | Task 13          |
| PUT /companies/:id — обновить (policy: is-company-owner)         | Task 14          |
| DELETE /companies/:id — проверка нет активных вакансий           | Task 15          |
| GET /companies/my — мои компании                                 | Task 16          |
| Lifecycle hook: Company afterUpdate(published) → Notification    | Task 17          |
| Policy: is-company-owner                                         | Task 7           |

### Gaps

- **Strapi Admin permissions:** После реализации каждого endpoint нужно вручную открыть доступ в Admin → Settings → Users & Permissions → Roles (Public для публичных маршрутов, Authenticated для приватных). Это не автоматизируется через код.
- **DELETE /companies/:id vacancy check:** Стаб (activeCount = 0) до Sprint 3. В Sprint 3 заменить на реальный запрос к `api::vacancy.vacancy`.
- **Lifecycle notification:** Стаб (log.info) до Sprint 7. В Sprint 7 заменить вызовом notification service.
- **Integration tests:** Unit-тесты покрывают только чистые функции. HTTP-тесты (supertest + Strapi test harness) вынесены за рамки — jest config настроен только на `tests/unit/`.

### Placeholder scan

Нет TBD/TODO, кроме явно задокументированных Sprint 3 и Sprint 7 стабов.

### Type consistency

- `toSlug` определена в Task 6 (`company-utils.ts`), используется в Tasks 10 и 14 ✓
- `canSubmit` определена в Task 6, используется в Task 11 ✓
- `canDelete` определена в Task 6, используется в Task 15 ✓
- `checkIsOwner` определена в Task 7, используется внутри policy default export ✓
- `CompanyService` тип через `ReturnType<typeof companyServiceFactory>` используется в Task 10, Tasks 14 обращаются к `svc()` ✓
- `generateUniqueSlug` определена в Task 9 (service), вызывается в Task 14 (update) ✓
