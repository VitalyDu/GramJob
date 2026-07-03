# Sprint 4 Backend — Resumes & Applications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Resume and Application backend: candidates can create/publish resumes, apply to vacancies with daily credit limits, and employers can manage application status transitions with contact visibility rules.

**Architecture:** Resume mirrors the Vacancy pattern (content type + utils + owner policy + controller + routes). Application introduces `apply-credit-service.ts` (mirrors `credit-service.ts`), status transition validation in `application-utils.ts`, and lifecycle hooks that increment `vacancy.applicationsCount` and stub Sprint-7 Telegram notifications. Contact masking lives in the resume controller — contacts are exposed only when the requester is the owner or an employer with an approved application (status ∈ `in-review|interview|test-task|offer|hired`).

**Tech Stack:** Strapi 5, PostgreSQL, TypeScript strict, Vitest.

---

## File Map

**Create:**

- `backend/src/components/resume/work-experience.json` — Strapi repeatable component schema
- `backend/src/components/resume/education.json` — Strapi repeatable component schema
- `backend/src/api/resume/content-types/resume/schema.json` — Resume content type
- `backend/src/api/resume/content-types/resume/lifecycles.ts` — afterUpdate log + notification stub
- `backend/src/api/resume/services/resume-utils.ts` — canPublishResume / canEditResume / canArchiveResume / publishedTransitionsOnEditResume
- `backend/src/api/resume/services/resume.ts` — createResume factory
- `backend/src/api/resume/policies/is-resume-owner.ts` — ownership check
- `backend/src/api/resume/policies/requires-max-plan.ts` — Max-plan gate
- `backend/src/api/resume/controllers/resume.ts` — create / publish / findPublic / findOne / update / archive / findMine
- `backend/src/api/resume/routes/resume.ts` — route definitions
- `backend/src/api/application/content-types/application/schema.json` — Application content type
- `backend/src/api/application/content-types/application/lifecycles.ts` — afterCreate (increment applicationsCount) + afterUpdate notification stub
- `backend/src/api/application/services/application-utils.ts` — STATUS_TRANSITIONS map + canTransitionTo
- `backend/src/api/application/services/apply-credit-service.ts` — APPLY_PLAN_LIMITS / getApplyLimitForPlan / checkAndConsumeApplyCredit
- `backend/src/api/application/controllers/application.ts` — create / findMine / findByVacancy / updateStatus
- `backend/src/api/application/routes/application.ts` — route definitions (including GET /vacancies/:id/applications)
- `backend/tests/unit/resume-utils.test.ts`
- `backend/tests/unit/is-resume-owner.test.ts`
- `backend/tests/unit/requires-max-plan.test.ts`
- `backend/tests/unit/application-utils.test.ts`
- `backend/tests/unit/apply-credit-service.test.ts`

---

## Task 1: Strapi Components — WorkExperience + Education

**Files:**

- Create: `backend/src/components/resume/work-experience.json`
- Create: `backend/src/components/resume/education.json`

- [ ] **Step 1: Create components directory**

```bash
mkdir -p backend/src/components/resume
```

- [ ] **Step 2: Write work-experience.json**

`backend/src/components/resume/work-experience.json`:

```json
{
  "collectionName": "components_resume_work_experiences",
  "info": {
    "singularName": "work-experience",
    "pluralName": "work-experiences",
    "displayName": "Work Experience"
  },
  "options": {},
  "attributes": {
    "company": { "type": "string", "required": true },
    "position": { "type": "string", "required": true },
    "startDate": { "type": "date", "required": true },
    "endDate": { "type": "date" },
    "current": { "type": "boolean", "default": false },
    "description": { "type": "text" }
  }
}
```

- [ ] **Step 3: Write education.json**

`backend/src/components/resume/education.json`:

```json
{
  "collectionName": "components_resume_educations",
  "info": {
    "singularName": "education",
    "pluralName": "educations",
    "displayName": "Education"
  },
  "options": {},
  "attributes": {
    "institution": { "type": "string", "required": true },
    "degree": { "type": "string", "required": true },
    "field": { "type": "string", "required": true },
    "startDate": { "type": "date", "required": true },
    "endDate": { "type": "date" },
    "current": { "type": "boolean", "default": false }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/components/resume/
git commit -m "feat(backend): add Strapi components WorkExperience and Education for Resume"
```

---

## Task 2: Resume Utils + Tests (TDD)

**Files:**

- Create: `backend/src/api/resume/services/resume-utils.ts`
- Create: `backend/tests/unit/resume-utils.test.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p backend/src/api/resume/services
mkdir -p backend/tests/unit
```

- [ ] **Step 2: Write failing tests**

`backend/tests/unit/resume-utils.test.ts`:

```typescript
import {
  canPublishResume,
  canEditResume,
  canArchiveResume,
  publishedTransitionsOnEditResume,
} from '../../src/api/resume/services/resume-utils'

describe('canPublishResume', () => {
  it('allows publish from draft', () => {
    expect(canPublishResume('draft')).toBe(true)
  })

  it('allows publish from rejected', () => {
    expect(canPublishResume('rejected')).toBe(true)
  })

  it('blocks publish from moderation', () => {
    expect(canPublishResume('moderation')).toBe(false)
  })

  it('blocks publish from published', () => {
    expect(canPublishResume('published')).toBe(false)
  })

  it('blocks publish from archived', () => {
    expect(canPublishResume('archived')).toBe(false)
  })
})

describe('canEditResume', () => {
  it('allows edit for draft', () => {
    expect(canEditResume('draft')).toBe(true)
  })

  it('allows edit for rejected', () => {
    expect(canEditResume('rejected')).toBe(true)
  })

  it('allows edit for published (triggers re-moderation)', () => {
    expect(canEditResume('published')).toBe(true)
  })

  it('blocks edit for moderation', () => {
    expect(canEditResume('moderation')).toBe(false)
  })

  it('blocks edit for archived', () => {
    expect(canEditResume('archived')).toBe(false)
  })
})

describe('canArchiveResume', () => {
  it('allows archive for draft', () => {
    expect(canArchiveResume('draft')).toBe(true)
  })

  it('allows archive for published', () => {
    expect(canArchiveResume('published')).toBe(true)
  })

  it('allows archive for rejected', () => {
    expect(canArchiveResume('rejected')).toBe(true)
  })

  it('blocks archive for moderation', () => {
    expect(canArchiveResume('moderation')).toBe(false)
  })

  it('blocks archive for already archived', () => {
    expect(canArchiveResume('archived')).toBe(false)
  })
})

describe('publishedTransitionsOnEditResume', () => {
  it('returns true for published', () => {
    expect(publishedTransitionsOnEditResume('published')).toBe(true)
  })

  it('returns false for draft', () => {
    expect(publishedTransitionsOnEditResume('draft')).toBe(false)
  })

  it('returns false for rejected', () => {
    expect(publishedTransitionsOnEditResume('rejected')).toBe(false)
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
cd backend && pnpm test tests/unit/resume-utils.test.ts 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 4: Implement resume-utils.ts**

`backend/src/api/resume/services/resume-utils.ts`:

```typescript
export function canPublishResume(status: string): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditResume(status: string): boolean {
  return status === 'draft' || status === 'rejected' || status === 'published'
}

export function canArchiveResume(status: string): boolean {
  return ['draft', 'published', 'rejected'].includes(status)
}

export function publishedTransitionsOnEditResume(status: string): boolean {
  return status === 'published'
}
```

- [ ] **Step 5: Run to verify pass**

```bash
cd backend && pnpm test tests/unit/resume-utils.test.ts 2>&1 | tail -5
```

Expected: PASS — 11 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/resume/services/resume-utils.ts backend/tests/unit/resume-utils.test.ts
git commit -m "feat(backend): add Resume status utilities with tests (canPublish/canEdit/canArchive)"
```

---

## Task 3: Resume Content Type Schema + Lifecycle Hook

**Files:**

- Create: `backend/src/api/resume/content-types/resume/schema.json`
- Create: `backend/src/api/resume/content-types/resume/lifecycles.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p backend/src/api/resume/content-types/resume
```

- [ ] **Step 2: Write schema.json**

`backend/src/api/resume/content-types/resume/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "resumes",
  "info": {
    "singularName": "resume",
    "pluralName": "resumes",
    "displayName": "Resume",
    "description": "Candidate resume"
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
    "title": {
      "type": "string",
      "required": true
    },
    "firstName": {
      "type": "string",
      "required": true
    },
    "lastName": {
      "type": "string",
      "required": true
    },
    "avatar": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "country": {
      "type": "string",
      "required": true
    },
    "city": {
      "type": "string"
    },
    "desiredSalary": {
      "type": "integer"
    },
    "currency": {
      "type": "enumeration",
      "enum": ["USD", "EUR", "RUB", "GBP"]
    },
    "workFormat": {
      "type": "enumeration",
      "enum": ["office", "remote", "hybrid", "any"],
      "required": true
    },
    "employmentType": {
      "type": "enumeration",
      "enum": ["full-time", "part-time", "contract", "internship", "freelance"],
      "required": true
    },
    "experienceYears": {
      "type": "integer"
    },
    "about": {
      "type": "richtext"
    },
    "skills": {
      "type": "json"
    },
    "languages": {
      "type": "json"
    },
    "contacts": {
      "type": "json"
    },
    "workExperience": {
      "type": "component",
      "repeatable": true,
      "component": "resume.work-experience"
    },
    "education": {
      "type": "component",
      "repeatable": true,
      "component": "resume.education"
    },
    "views": {
      "type": "integer",
      "default": 0
    },
    "invitations": {
      "type": "integer",
      "default": 0
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "moderation", "published", "rejected", "archived"],
      "default": "draft",
      "required": true
    }
  }
}
```

- [ ] **Step 3: Write lifecycle hook**

`backend/src/api/resume/content-types/resume/lifecycles.ts`:

```typescript
type ResumeAfterEvent = {
  result: { documentId?: string; status?: string }
  params: unknown
}

export default {
  async afterUpdate(event: ResumeAfterEvent) {
    if (event.result.status === 'published') {
      const s = globalThis.strapi
      s.log.info(`[resume] Resume ${event.result.documentId} published`)
      // TODO Sprint 7: send Telegram notification to resume.user
    }
  },
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/resume/content-types/
git commit -m "feat(backend): add Resume content type schema with WorkExperience/Education components"
```

---

## Task 4: is-resume-owner Policy + Tests (TDD)

**Files:**

- Create: `backend/src/api/resume/policies/is-resume-owner.ts`
- Create: `backend/tests/unit/is-resume-owner.test.ts`

- [ ] **Step 1: Create policies directory**

```bash
mkdir -p backend/src/api/resume/policies
```

- [ ] **Step 2: Write failing tests**

`backend/tests/unit/is-resume-owner.test.ts`:

```typescript
import { checkIsResumeOwner } from '../../src/api/resume/policies/is-resume-owner'

describe('checkIsResumeOwner', () => {
  it('returns true when user owns the resume', () => {
    const resume = { user: { id: 42 } }
    expect(checkIsResumeOwner(resume, 42)).toBe(true)
  })

  it('returns false when user does not own the resume', () => {
    const resume = { user: { id: 42 } }
    expect(checkIsResumeOwner(resume, 99)).toBe(false)
  })

  it('returns false when resume.user is null', () => {
    const resume = { user: null }
    expect(checkIsResumeOwner(resume, 42)).toBe(false)
  })

  it('returns false when resume.user is undefined', () => {
    const resume = { user: undefined }
    expect(checkIsResumeOwner(resume, 42)).toBe(false)
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
cd backend && pnpm test tests/unit/is-resume-owner.test.ts 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 4: Implement is-resume-owner.ts**

`backend/src/api/resume/policies/is-resume-owner.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type ResumeWithUser = { user: { id: number } | null | undefined }

export function checkIsResumeOwner(resume: ResumeWithUser, userId: number): boolean {
  return resume.user?.id === userId
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const { id } = ctx.params as { id: string }

  const resume = await strapi.documents('api::resume.resume').findOne({
    documentId: id,
    populate: { user: { fields: ['id'] } },
  })

  if (!resume) return false

  return checkIsResumeOwner(resume as unknown as ResumeWithUser, user.id)
}
```

- [ ] **Step 5: Run to verify pass**

```bash
cd backend && pnpm test tests/unit/is-resume-owner.test.ts 2>&1 | tail -5
```

Expected: PASS — 4 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/resume/policies/is-resume-owner.ts backend/tests/unit/is-resume-owner.test.ts
git commit -m "feat(backend): add is-resume-owner policy with tests"
```

---

## Task 5: requires-max-plan Policy + Tests (TDD)

**Files:**

- Create: `backend/src/api/resume/policies/requires-max-plan.ts`
- Create: `backend/tests/unit/requires-max-plan.test.ts`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/requires-max-plan.test.ts`:

```typescript
import { checkIsMaxPlan } from '../../src/api/resume/policies/requires-max-plan'

describe('checkIsMaxPlan', () => {
  it('returns true for max plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'max' })).toBe(true)
  })

  it('returns false for free plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'free' })).toBe(false)
  })

  it('returns false for pro plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'pro' })).toBe(false)
  })

  it('returns false for unknown plan', () => {
    expect(checkIsMaxPlan({ subscriptionPlan: 'unknown' })).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && pnpm test tests/unit/requires-max-plan.test.ts 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement requires-max-plan.ts**

`backend/src/api/resume/policies/requires-max-plan.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type UserWithPlan = { subscriptionPlan: string }

export function checkIsMaxPlan(user: UserWithPlan): boolean {
  return user.subscriptionPlan === 'max'
}

export default async (
  ctx: any,
  _config: unknown,
  { strapi }: { strapi: Core.Strapi }
): Promise<boolean> => {
  const user = ctx.state.user as { id: number } | undefined
  if (!user) return false

  const fullUser = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(user.id),
    fields: ['id', 'subscriptionPlan'],
  })) as unknown as UserWithPlan | null

  if (!fullUser) return false

  if (!checkIsMaxPlan(fullUser)) {
    ctx.status = 403
    ctx.body = {
      error: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Max subscription plan required to access resume database',
      },
    }
    return false
  }

  return true
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd backend && pnpm test tests/unit/requires-max-plan.test.ts 2>&1 | tail -5
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/resume/policies/requires-max-plan.ts backend/tests/unit/requires-max-plan.test.ts
git commit -m "feat(backend): add requires-max-plan policy with tests"
```

---

## Task 6: Resume Service

**Files:**

- Create: `backend/src/api/resume/services/resume.ts`

- [ ] **Step 1: Write resume service**

`backend/src/api/resume/services/resume.ts`:

```typescript
import type { Core } from '@strapi/strapi'

type CreateResumeInput = {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: string
  workFormat: string
  employmentType: string
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: {
    phone?: string
    email?: string
    telegram?: string
    linkedin?: string
  }
  workExperience?: Array<{
    company: string
    position: string
    startDate: string
    endDate?: string
    current?: boolean
    description?: string
  }>
  education?: Array<{
    institution: string
    degree: string
    field: string
    startDate: string
    endDate?: string
    current?: boolean
  }>
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async createResume(userId: number, input: CreateResumeInput) {
    return strapi.documents('api::resume.resume').create({
      data: {
        user: userId,
        title: input.title,
        firstName: input.firstName,
        lastName: input.lastName,
        country: input.country,
        city: input.city,
        desiredSalary: input.desiredSalary,
        currency: input.currency as 'USD' | 'EUR' | 'RUB' | 'GBP' | undefined,
        workFormat: input.workFormat as 'office' | 'remote' | 'hybrid' | 'any',
        employmentType: input.employmentType as
          | 'full-time'
          | 'part-time'
          | 'contract'
          | 'internship'
          | 'freelance',
        experienceYears: input.experienceYears,
        about: input.about,
        skills: input.skills ?? [],
        languages: input.languages ?? [],
        contacts: input.contacts ?? {},
        workExperience: input.workExperience ?? [],
        education: input.education ?? [],
        views: 0,
        invitations: 0,
        status: 'draft',
      },
    })
  },
})
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd backend && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add backend/src/api/resume/services/resume.ts
git commit -m "feat(backend): add Resume service with createResume factory"
```

---

## Task 7: Resume Controller

**Files:**

- Create: `backend/src/api/resume/controllers/resume.ts`

- [ ] **Step 1: Create controllers directory**

```bash
mkdir -p backend/src/api/resume/controllers
```

- [ ] **Step 2: Write resume controller**

`backend/src/api/resume/controllers/resume.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import {
  canPublishResume,
  canEditResume,
  canArchiveResume,
  publishedTransitionsOnEditResume,
} from '../services/resume-utils'
import type resumeServiceFactory from '../services/resume'

type ResumeService = ReturnType<typeof resumeServiceFactory>

const VALID_WORK_FORMATS = ['office', 'remote', 'hybrid', 'any'] as const
const VALID_EMPLOYMENT_TYPES = [
  'full-time',
  'part-time',
  'contract',
  'internship',
  'freelance',
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

const RESUME_FULL_FIELDS = [...RESUME_CARD_FIELDS, 'about', 'contacts', 'invitations'] as const

const RESUME_POPULATE = {
  user: { fields: ['id', 'firstName', 'lastName'] },
  avatar: true,
  workExperience: true,
  education: true,
} as const

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const svc = () => strapi.service('api::resume.resume') as unknown as ResumeService

  return {
    async create(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const body = ctx.request.body as Record<string, unknown>
      const { title, firstName, lastName, country, workFormat, employmentType } = body

      if (!title || !firstName || !lastName || !country || !workFormat || !employmentType) {
        return ctx.badRequest(
          'title, firstName, lastName, country, workFormat, employmentType are required'
        )
      }

      if (!VALID_WORK_FORMATS.includes(workFormat as any)) {
        return ctx.badRequest(`workFormat must be one of: ${VALID_WORK_FORMATS.join(', ')}`)
      }
      if (!VALID_EMPLOYMENT_TYPES.includes(employmentType as any)) {
        return ctx.badRequest(`employmentType must be one of: ${VALID_EMPLOYMENT_TYPES.join(', ')}`)
      }

      const resume = await svc().createResume(user.id, {
        title: title as string,
        firstName: firstName as string,
        lastName: lastName as string,
        country: country as string,
        city: body.city as string | undefined,
        desiredSalary: body.desiredSalary as number | undefined,
        currency: body.currency as string | undefined,
        workFormat: workFormat as string,
        employmentType: employmentType as string,
        experienceYears: body.experienceYears as number | undefined,
        about: body.about as string | undefined,
        skills: body.skills as string[] | undefined,
        languages: body.languages as Array<{ lang: string; level: string }> | undefined,
        contacts: body.contacts as any,
        workExperience: body.workExperience as any,
        education: body.education as any,
      })

      ctx.status = 201
      return ctx.send({ data: resume })
    },

    async publish(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const resume = await strapi.documents('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!resume) return ctx.notFound('Resume not found')

      const status = resume.status as string
      if (!canPublishResume(status)) {
        return ctx.badRequest(
          `Cannot publish resume with status "${status}". Must be "draft" or "rejected".`
        )
      }

      const updated = await strapi.documents('api::resume.resume').update({
        documentId: id,
        data: { status: 'moderation' },
        fields: ['documentId', 'title', 'status', 'createdAt'],
      })

      return ctx.send({ data: updated })
    },

    async findPublic(ctx: any) {
      const {
        search,
        country,
        city,
        workFormat,
        employmentType,
        experienceYears,
        page = '1',
        pageSize = '20',
      } = ctx.query as Record<string, string>

      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const pageSizeNum = Math.min(50, Math.max(1, parseInt(pageSize, 10) || 20))

      const filters: Record<string, unknown> = { status: { $eq: 'published' } }

      if (country) filters.country = { $eq: country }
      if (city) filters.city = { $containsi: city }
      if (workFormat) filters.workFormat = { $eq: workFormat }
      if (employmentType) filters.employmentType = { $eq: employmentType }
      if (experienceYears) {
        const years = parseInt(experienceYears, 10)
        if (!isNaN(years)) filters.experienceYears = { $lte: years }
      }
      if (search) {
        filters.$or = [
          { title: { $containsi: search } },
          { firstName: { $containsi: search } },
          { lastName: { $containsi: search } },
        ]
      }

      const [resumes, total] = await Promise.all([
        strapi.documents('api::resume.resume').findMany({
          filters,
          fields: RESUME_CARD_FIELDS as any,
          populate: { user: { fields: ['id', 'firstName', 'lastName'] }, avatar: true } as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc' as any,
        }),
        strapi.documents('api::resume.resume').count({ filters }),
      ])

      return ctx.send({
        data: resumes,
        meta: {
          total,
          page: pageNum,
          pageSize: pageSizeNum,
          pageCount: Math.ceil(total / pageSizeNum),
        },
      })
    },

    async findOne(ctx: any) {
      const requestUser = ctx.state.user as { id: number } | undefined
      const { id } = ctx.params as { id: string }

      const resume = await strapi.documents('api::resume.resume').findOne({
        documentId: id,
        fields: RESUME_FULL_FIELDS as any,
        populate: RESUME_POPULATE as any,
      })

      if (!resume || (resume as any).status !== 'published') {
        return ctx.notFound('Resume not found')
      }

      // Increment views
      const newViews = ((resume as any).views ?? 0) + 1
      await strapi.documents('api::resume.resume').update({
        documentId: id,
        data: { views: newViews },
      })

      // Determine contacts visibility
      const resumeOwnerId = (resume as any).user?.id
      let contacts: unknown = null

      if (requestUser) {
        if (requestUser.id === resumeOwnerId) {
          contacts = (resume as any).contacts
        } else {
          // Employer can see contacts if they have an approved application from this candidate
          const approvedApp = await strapi.documents('api::application.application').findFirst({
            filters: {
              resume: { user: { id: { $eq: resumeOwnerId } } },
              vacancy: { postedBy: { id: { $eq: requestUser.id } } },
              status: { $in: ['in-review', 'interview', 'test-task', 'offer', 'hired'] },
            },
          })
          if (approvedApp) contacts = (resume as any).contacts
        }
      }

      return ctx.send({ data: { ...resume, views: newViews, contacts } })
    },

    async update(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }
      const body = ctx.request.body as Record<string, unknown>

      const existing = await strapi.documents('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!existing) return ctx.notFound('Resume not found')

      const status = existing.status as string
      if (!canEditResume(status)) {
        return ctx.badRequest(`Cannot edit resume with status "${status}".`)
      }

      const allowedFields = [
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
        'about',
        'skills',
        'languages',
        'contacts',
        'workExperience',
        'education',
      ]

      const updateData: Record<string, unknown> = {}
      for (const field of allowedFields) {
        if (field in body) updateData[field] = body[field]
      }

      if (Object.keys(updateData).length === 0) {
        return ctx.badRequest('No updatable fields provided.')
      }

      if (publishedTransitionsOnEditResume(status)) {
        updateData.status = 'draft'
      }

      const updated = await strapi.documents('api::resume.resume').update({
        documentId: id,
        data: updateData as any,
        fields: RESUME_FULL_FIELDS as any,
        populate: RESUME_POPULATE as any,
      })

      return ctx.send({ data: updated })
    },

    async archive(ctx: any) {
      const user = ctx.state.user as { id: number } | undefined
      if (!user) return ctx.unauthorized('Authentication required')

      const { id } = ctx.params as { id: string }

      const resume = await strapi.documents('api::resume.resume').findOne({
        documentId: id,
        fields: ['documentId', 'status'],
      })
      if (!resume) return ctx.notFound('Resume not found')

      if (!canArchiveResume(resume.status as string)) {
        return ctx.badRequest(`Cannot archive resume with status "${resume.status}".`)
      }

      const updated = await strapi.documents('api::resume.resume').update({
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

      const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
      if (status) filters.status = { $eq: status }

      const [resumes, total] = await Promise.all([
        strapi.documents('api::resume.resume').findMany({
          filters,
          fields: RESUME_CARD_FIELDS as any,
          populate: { avatar: true } as any,
          start: (pageNum - 1) * pageSizeNum,
          limit: pageSizeNum,
          sort: 'createdAt:desc' as any,
        }),
        strapi.documents('api::resume.resume').count({ filters }),
      ])

      return ctx.send({
        data: resumes,
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

- [ ] **Step 3: Verify TypeScript**

```bash
cd backend && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: No errors (warnings about `any` are acceptable)

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/resume/controllers/resume.ts
git commit -m "feat(backend): add Resume controller (create/publish/findPublic/findOne/update/archive/findMine)"
```

---

## Task 8: Resume Routes

**Files:**

- Create: `backend/src/api/resume/routes/resume.ts`

- [ ] **Step 1: Create routes directory**

```bash
mkdir -p backend/src/api/resume/routes
```

- [ ] **Step 2: Write resume routes**

`backend/src/api/resume/routes/resume.ts`:

```typescript
export default {
  routes: [
    // Public — requires Max plan policy
    {
      method: 'GET',
      path: '/resumes',
      handler: 'resume.findPublic',
      config: {
        policies: ['api::resume.requires-max-plan'],
      },
    },

    // Authenticated — no :id param — MUST come before /:id
    {
      method: 'GET',
      path: '/resumes/my',
      handler: 'resume.findMine',
      config: {},
    },
    {
      method: 'POST',
      path: '/resumes',
      handler: 'resume.create',
      config: {},
    },

    // Public by id (contacts masking in controller)
    {
      method: 'GET',
      path: '/resumes/:id',
      handler: 'resume.findOne',
      config: { auth: false },
    },

    // Owner-only actions via policy
    {
      method: 'POST',
      path: '/resumes/:id/publish',
      handler: 'resume.publish',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
    {
      method: 'PUT',
      path: '/resumes/:id',
      handler: 'resume.update',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
    {
      method: 'DELETE',
      path: '/resumes/:id',
      handler: 'resume.archive',
      config: {
        policies: ['api::resume.is-resume-owner'],
      },
    },
  ],
}
```

- [ ] **Step 3: Run all backend unit tests**

```bash
cd backend && pnpm test 2>&1 | tail -10
```

Expected: All existing tests + new resume tests pass

- [ ] **Step 4: Verify TypeScript**

```bash
cd backend && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/resume/routes/resume.ts
git commit -m "feat(backend): add Resume routes (GET/POST /resumes, GET/PUT/DELETE /resumes/:id, POST /resumes/:id/publish)"
```

---

## Task 9: Apply Credit Service + Tests (TDD)

**Files:**

- Create: `backend/src/api/application/services/apply-credit-service.ts`
- Create: `backend/tests/unit/apply-credit-service.test.ts`

- [ ] **Step 1: Create application service directory**

```bash
mkdir -p backend/src/api/application/services
```

- [ ] **Step 2: Write failing tests**

`backend/tests/unit/apply-credit-service.test.ts`:

```typescript
import {
  APPLY_PLAN_LIMITS,
  getApplyLimitForPlan,
  getAppliesUsedToday,
  incrementApplyCount,
} from '../../src/api/application/services/apply-credit-service'

describe('getApplyLimitForPlan', () => {
  it('returns 3 for free plan', () => {
    expect(getApplyLimitForPlan('free')).toBe(3)
  })

  it('returns 10 for pro plan', () => {
    expect(getApplyLimitForPlan('pro')).toBe(10)
  })

  it('returns 50 for max plan', () => {
    expect(getApplyLimitForPlan('max')).toBe(50)
  })

  it('returns 3 for unknown plan (defaults to free)', () => {
    expect(getApplyLimitForPlan('unknown')).toBe(3)
  })
})

describe('APPLY_PLAN_LIMITS', () => {
  it('has entries for free, pro, max', () => {
    expect(APPLY_PLAN_LIMITS).toHaveProperty('free')
    expect(APPLY_PLAN_LIMITS).toHaveProperty('pro')
    expect(APPLY_PLAN_LIMITS).toHaveProperty('max')
  })
})

describe('getAppliesUsedToday / incrementApplyCount', () => {
  it('returns 0 for user with no applies today', () => {
    expect(getAppliesUsedToday(9001)).toBe(0)
  })

  it('increments count after apply', () => {
    const userId = 9002
    expect(getAppliesUsedToday(userId)).toBe(0)
    incrementApplyCount(userId)
    expect(getAppliesUsedToday(userId)).toBe(1)
    incrementApplyCount(userId)
    expect(getAppliesUsedToday(userId)).toBe(2)
  })
})
```

- [ ] **Step 3: Run to verify failure**

```bash
cd backend && pnpm test tests/unit/apply-credit-service.test.ts 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 4: Implement apply-credit-service.ts**

`backend/src/api/application/services/apply-credit-service.ts`:

```typescript
import type { Core } from '@strapi/strapi'

export const APPLY_PLAN_LIMITS = {
  free: { applicationsPerDay: 3 },
  pro: { applicationsPerDay: 10 },
  max: { applicationsPerDay: 50 },
} as const

type PlanCode = keyof typeof APPLY_PLAN_LIMITS

export function getApplyLimitForPlan(plan: string): number {
  return (
    APPLY_PLAN_LIMITS[plan as PlanCode]?.applicationsPerDay ??
    APPLY_PLAN_LIMITS.free.applicationsPerDay
  )
}

// In-memory daily apply tracker (resets on restart — sufficient for MVP, replaced in Sprint 6)
const dailyApplies = new Map<number, { count: number; date: string }>()

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

export function getAppliesUsedToday(userId: number): number {
  const entry = dailyApplies.get(userId)
  if (!entry || entry.date !== todayUTC()) return 0
  return entry.count
}

export function incrementApplyCount(userId: number): void {
  const today = todayUTC()
  const entry = dailyApplies.get(userId)
  if (!entry || entry.date !== today) {
    dailyApplies.set(userId, { count: 1, date: today })
  } else {
    entry.count++
  }
}

type UserWithPlan = {
  subscriptionPlan: string
  applyCredits: number
}

export async function checkAndConsumeApplyCredit(
  strapi: Core.Strapi,
  userId: number
): Promise<void> {
  const user = (await strapi.documents('plugin::users-permissions.user').findOne({
    documentId: String(userId),
    fields: ['id', 'subscriptionPlan', 'applyCredits'],
  })) as unknown as UserWithPlan | null

  if (!user) throw new Error('User not found')

  // 1. Package credits take priority
  if (user.applyCredits > 0) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: userId },
      data: { applyCredits: user.applyCredits - 1 },
    })
    return
  }

  // 2. Check plan daily limit
  const limit = getApplyLimitForPlan(user.subscriptionPlan)
  const used = getAppliesUsedToday(userId)

  if (used >= limit) {
    const resetAt = `${todayUTC()}T23:59:59Z`
    throw Object.assign(new Error('LIMIT_REACHED'), {
      code: 'LIMIT_REACHED',
      details: { limit, used, resetAt },
    })
  }

  incrementApplyCount(userId)
}
```

- [ ] **Step 5: Run to verify pass**

```bash
cd backend && pnpm test tests/unit/apply-credit-service.test.ts 2>&1 | tail -5
```

Expected: PASS — 8 tests

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/application/services/apply-credit-service.ts backend/tests/unit/apply-credit-service.test.ts
git commit -m "feat(backend): add apply-credit-service with daily limit tracking and tests"
```

---

## Task 10: Application Status Transitions + Tests (TDD)

**Files:**

- Create: `backend/src/api/application/services/application-utils.ts`
- Create: `backend/tests/unit/application-utils.test.ts`

- [ ] **Step 1: Write failing tests**

`backend/tests/unit/application-utils.test.ts`:

```typescript
import {
  canTransitionTo,
  STATUS_TRANSITIONS,
} from '../../src/api/application/services/application-utils'

describe('STATUS_TRANSITIONS', () => {
  it('has entries for all application statuses', () => {
    const expectedStatuses = [
      'applied',
      'viewed',
      'in-review',
      'interview',
      'test-task',
      'offer',
      'hired',
      'rejected',
    ]
    for (const status of expectedStatuses) {
      expect(STATUS_TRANSITIONS).toHaveProperty(status)
    }
  })
})

describe('canTransitionTo', () => {
  it('allows applied → viewed', () => {
    expect(canTransitionTo('applied', 'viewed')).toBe(true)
  })

  it('blocks applied → in-review (must go through viewed first)', () => {
    expect(canTransitionTo('applied', 'in-review')).toBe(false)
  })

  it('allows viewed → in-review', () => {
    expect(canTransitionTo('viewed', 'in-review')).toBe(true)
  })

  it('blocks viewed → interview (must go through in-review first)', () => {
    expect(canTransitionTo('viewed', 'interview')).toBe(false)
  })

  it('allows in-review → interview', () => {
    expect(canTransitionTo('in-review', 'interview')).toBe(true)
  })

  it('allows in-review → test-task', () => {
    expect(canTransitionTo('in-review', 'test-task')).toBe(true)
  })

  it('allows in-review → offer', () => {
    expect(canTransitionTo('in-review', 'offer')).toBe(true)
  })

  it('allows in-review → rejected', () => {
    expect(canTransitionTo('in-review', 'rejected')).toBe(true)
  })

  it('allows interview → offer', () => {
    expect(canTransitionTo('interview', 'offer')).toBe(true)
  })

  it('allows interview → rejected', () => {
    expect(canTransitionTo('interview', 'rejected')).toBe(true)
  })

  it('blocks interview → hired (must go through offer)', () => {
    expect(canTransitionTo('interview', 'hired')).toBe(false)
  })

  it('allows test-task → offer', () => {
    expect(canTransitionTo('test-task', 'offer')).toBe(true)
  })

  it('allows test-task → rejected', () => {
    expect(canTransitionTo('test-task', 'rejected')).toBe(true)
  })

  it('allows offer → hired', () => {
    expect(canTransitionTo('offer', 'hired')).toBe(true)
  })

  it('allows offer → rejected', () => {
    expect(canTransitionTo('offer', 'rejected')).toBe(true)
  })

  it('blocks hired → anything', () => {
    expect(canTransitionTo('hired', 'rejected')).toBe(false)
    expect(canTransitionTo('hired', 'offer')).toBe(false)
  })

  it('blocks rejected → anything', () => {
    expect(canTransitionTo('rejected', 'applied')).toBe(false)
    expect(canTransitionTo('rejected', 'viewed')).toBe(false)
  })

  it('returns false for unknown status', () => {
    expect(canTransitionTo('unknown', 'viewed')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify failure**

```bash
cd backend && pnpm test tests/unit/application-utils.test.ts 2>&1 | tail -5
```

Expected: FAIL — `Cannot find module`

- [ ] **Step 3: Implement application-utils.ts**

`backend/src/api/application/services/application-utils.ts`:

```typescript
export const STATUS_TRANSITIONS: Record<string, readonly string[]> = {
  applied: ['viewed'],
  viewed: ['in-review'],
  'in-review': ['interview', 'test-task', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  'test-task': ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

export function canTransitionTo(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}
```

- [ ] **Step 4: Run to verify pass**

```bash
cd backend && pnpm test tests/unit/application-utils.test.ts 2>&1 | tail -5
```

Expected: PASS — 19 tests

- [ ] **Step 5: Commit**

```bash
git add backend/src/api/application/services/application-utils.ts backend/tests/unit/application-utils.test.ts
git commit -m "feat(backend): add application status transition validation with tests"
```

---

## Task 11: Application Content Type Schema + Lifecycle Hook

**Files:**

- Create: `backend/src/api/application/content-types/application/schema.json`
- Create: `backend/src/api/application/content-types/application/lifecycles.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p backend/src/api/application/content-types/application
```

- [ ] **Step 2: Write schema.json**

`backend/src/api/application/content-types/application/schema.json`:

```json
{
  "kind": "collectionType",
  "collectionName": "applications",
  "info": {
    "singularName": "application",
    "pluralName": "applications",
    "displayName": "Application",
    "description": "Job application from candidate"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {},
  "attributes": {
    "vacancy": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::vacancy.vacancy",
      "required": true
    },
    "resume": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "api::resume.resume",
      "required": true
    },
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user",
      "required": true
    },
    "status": {
      "type": "enumeration",
      "enum": [
        "applied",
        "viewed",
        "in-review",
        "interview",
        "test-task",
        "offer",
        "hired",
        "rejected"
      ],
      "default": "applied",
      "required": true
    },
    "coverLetter": {
      "type": "text"
    }
  }
}
```

- [ ] **Step 3: Write lifecycle hook**

`backend/src/api/application/content-types/application/lifecycles.ts`:

```typescript
type ApplicationAfterEvent = {
  result: {
    id?: number
    documentId?: string
    status?: string
    vacancy?: { id?: number; documentId?: string }
  }
  params: unknown
}

export default {
  async afterCreate(event: ApplicationAfterEvent) {
    const vacancyId = event.result.vacancy?.id
    if (!vacancyId) return

    const s = globalThis.strapi

    // Increment applicationsCount on the related vacancy
    try {
      await s.db.connection.raw(
        `UPDATE vacancies SET applications_count = applications_count + 1 WHERE id = ?`,
        [vacancyId]
      )
    } catch {
      s.log.warn(`[application] Failed to increment applicationsCount for vacancy id=${vacancyId}`)
    }

    s.log.info(
      `[application] New application ${event.result.documentId} for vacancy id=${vacancyId}`
    )
    // TODO Sprint 7: send NewApplication Telegram notification to vacancy.postedBy
  },

  async afterUpdate(event: ApplicationAfterEvent) {
    const s = globalThis.strapi
    s.log.info(
      `[application] Application ${event.result.documentId} status → ${event.result.status}`
    )
    // TODO Sprint 7: send status-change Telegram notification to application.user
  },
}
```

- [ ] **Step 4: Commit**

```bash
git add backend/src/api/application/content-types/
git commit -m "feat(backend): add Application content type schema with lifecycle hooks"
```

---

## Task 12: Application Controller + Routes

**Files:**

- Create: `backend/src/api/application/controllers/application.ts`
- Create: `backend/src/api/application/routes/application.ts`

- [ ] **Step 1: Create directories**

```bash
mkdir -p backend/src/api/application/controllers
mkdir -p backend/src/api/application/routes
```

- [ ] **Step 2: Write application controller**

`backend/src/api/application/controllers/application.ts`:

```typescript
import type { Core } from '@strapi/strapi'
import { canTransitionTo } from '../services/application-utils'
import { checkAndConsumeApplyCredit } from '../services/apply-credit-service'

const APPLICATION_POPULATE = {
  vacancy: {
    fields: ['documentId', 'title', 'status', 'sourceType'],
    populate: {
      company: { fields: ['documentId', 'name', 'slug'] },
      postedBy: { fields: ['id'] },
    },
  },
  resume: {
    fields: ['documentId', 'title', 'firstName', 'lastName', 'status'],
    populate: { user: { fields: ['id'] } },
  },
  user: { fields: ['id', 'firstName', 'lastName'] },
} as const

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async create(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const body = ctx.request.body as Record<string, unknown>
    const { vacancyId, resumeId, coverLetter } = body

    if (!vacancyId || !resumeId) {
      return ctx.badRequest('vacancyId and resumeId are required')
    }

    // Validate vacancy is published and internal
    const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
      documentId: vacancyId as string,
      fields: ['documentId', 'status', 'sourceType'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if ((vacancy as any).status !== 'published') {
      return ctx.badRequest('Vacancy is not published')
    }
    if ((vacancy as any).sourceType === 'external') {
      return ctx.badRequest('Cannot apply to external vacancies through this endpoint')
    }

    // Validate resume ownership and published status
    const resume = await strapi.documents('api::resume.resume').findOne({
      documentId: resumeId as string,
      fields: ['documentId', 'status'],
      populate: { user: { fields: ['id'] } },
    })
    if (!resume) return ctx.notFound('Resume not found')
    if ((resume as any).user?.id !== user.id) {
      return ctx.forbidden('You do not own this resume')
    }
    if ((resume as any).status !== 'published') {
      return ctx.badRequest('Resume must be published to apply')
    }

    // Enforce one application per vacancy per user
    const existing = await strapi.documents('api::application.application').findFirst({
      filters: {
        vacancy: { documentId: { $eq: vacancyId as string } },
        user: { id: { $eq: user.id } },
      },
    })
    if (existing) {
      ctx.status = 409
      return ctx.send({
        error: { code: 'ALREADY_APPLIED', message: 'You have already applied to this vacancy' },
      })
    }

    // Check and consume apply credit
    try {
      await checkAndConsumeApplyCredit(strapi, user.id)
    } catch (err: any) {
      if (err?.code === 'LIMIT_REACHED') {
        ctx.status = 403
        return ctx.send({
          error: {
            code: 'LIMIT_REACHED',
            message: 'Daily application limit reached',
            details: err.details,
          },
        })
      }
      throw err
    }

    const application = await strapi.documents('api::application.application').create({
      data: {
        vacancy: vacancyId as string,
        resume: resumeId as string,
        user: user.id,
        coverLetter: coverLetter as string | undefined,
        status: 'applied',
      },
      populate: APPLICATION_POPULATE as any,
    })

    ctx.status = 201
    return ctx.send({ data: application })
  },

  async findMine(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = { user: { id: { $eq: user.id } } }
    if (status) filters.status = { $eq: status }

    const [applications, total] = await Promise.all([
      strapi.documents('api::application.application').findMany({
        filters,
        populate: APPLICATION_POPULATE as any,
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc' as any,
      }),
      strapi.documents('api::application.application').count({ filters }),
    ])

    return ctx.send({
      data: applications,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async findByVacancy(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const { status, page = '1', pageSize = '20' } = ctx.query as Record<string, string>

    // Verify ownership of the vacancy
    const vacancy = await strapi.documents('api::vacancy.vacancy').findOne({
      documentId: id,
      fields: ['documentId'],
      populate: { postedBy: { fields: ['id'] } },
    })
    if (!vacancy) return ctx.notFound('Vacancy not found')
    if ((vacancy as any).postedBy?.id !== user.id) {
      return ctx.forbidden('You do not own this vacancy')
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1)
    const pageSizeNum = Math.min(100, Math.max(1, parseInt(pageSize, 10) || 20))

    const filters: Record<string, unknown> = {
      vacancy: { documentId: { $eq: id } },
    }
    if (status) filters.status = { $eq: status }

    const [applications, total] = await Promise.all([
      strapi.documents('api::application.application').findMany({
        filters,
        populate: APPLICATION_POPULATE as any,
        start: (pageNum - 1) * pageSizeNum,
        limit: pageSizeNum,
        sort: 'createdAt:desc' as any,
      }),
      strapi.documents('api::application.application').count({ filters }),
    ])

    return ctx.send({
      data: applications,
      meta: {
        total,
        page: pageNum,
        pageSize: pageSizeNum,
        pageCount: Math.ceil(total / pageSizeNum),
      },
    })
  },

  async updateStatus(ctx: any) {
    const user = ctx.state.user as { id: number } | undefined
    if (!user) return ctx.unauthorized('Authentication required')

    const { id } = ctx.params as { id: string }
    const body = ctx.request.body as { status?: string }

    if (!body.status) return ctx.badRequest('status is required')

    const application = await strapi.documents('api::application.application').findOne({
      documentId: id,
      populate: APPLICATION_POPULATE as any,
    })
    if (!application) return ctx.notFound('Application not found')

    // Only the vacancy owner (employer) may change status
    if ((application as any).vacancy?.postedBy?.id !== user.id) {
      return ctx.forbidden('Only the vacancy owner can update application status')
    }

    const currentStatus = application.status as string
    if (!canTransitionTo(currentStatus, body.status)) {
      return ctx.badRequest(
        `Cannot transition application status from "${currentStatus}" to "${body.status}"`
      )
    }

    const updated = await strapi.documents('api::application.application').update({
      documentId: id,
      data: { status: body.status as any },
      populate: APPLICATION_POPULATE as any,
    })

    return ctx.send({ data: updated })
  },
})
```

- [ ] **Step 3: Write application routes**

`backend/src/api/application/routes/application.ts`:

```typescript
export default {
  routes: [
    // Candidate: view own applications
    {
      method: 'GET',
      path: '/applications',
      handler: 'application.findMine',
      config: {},
    },

    // Candidate: submit application
    {
      method: 'POST',
      path: '/applications',
      handler: 'application.create',
      config: {},
    },

    // Employer: view applications for a specific vacancy
    // NOTE: path starts with /vacancies but handler lives in application controller
    {
      method: 'GET',
      path: '/vacancies/:id/applications',
      handler: 'application.findByVacancy',
      config: {},
    },

    // Employer: update application status
    {
      method: 'PATCH',
      path: '/applications/:id',
      handler: 'application.updateStatus',
      config: {},
    },
  ],
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd backend && pnpm tsc --noEmit 2>&1 | head -20
```

Expected: No errors

- [ ] **Step 5: Run all backend unit tests**

```bash
cd backend && pnpm test 2>&1 | tail -15
```

Expected: All tests pass (79 existing + ~46 new = ~125 total)

- [ ] **Step 6: Commit**

```bash
git add backend/src/api/application/controllers/application.ts backend/src/api/application/routes/application.ts
git commit -m "feat(backend): add Application controller (create/findMine/findByVacancy/updateStatus) and routes"
```

---

## Final Verification

- [ ] **Step 1: Run complete test suite**

```bash
cd backend && pnpm test 2>&1 | tail -20
```

Expected: All tests pass, 0 failures

- [ ] **Step 2: TypeScript strict check**

```bash
cd backend && pnpm tsc --noEmit 2>&1
```

Expected: No errors

- [ ] **Step 3: Final commit summary**

```bash
git log --oneline -12
```

Expected: 12 commits covering all Sprint 4 Backend tasks

---

## Implementation Notes

### Contact visibility rule (GET /resumes/:id)

Contacts (`resume.contacts`) are masked to `null` unless:

1. The requester **is the resume owner**, OR
2. The requester (employer) has at least one application from this candidate to any of their vacancies with status ∈ `['in-review', 'interview', 'test-task', 'offer', 'hired']`

### applicationsCount increment

The `afterCreate` lifecycle hook in Application runs a raw SQL UPDATE on the `vacancies` table (`applications_count = applications_count + 1`). This mirrors how Strapi stores camelCase field names as snake_case in PostgreSQL.

### Daily apply limit (in-memory)

`apply-credit-service.ts` uses the same in-memory pattern as `credit-service.ts` for boost tracking. This resets on server restart and is noted as an MVP limitation to be replaced in Sprint 6.

### GET /vacancies/:id/applications route

This route is defined in the **application** routes file even though the path starts with `/vacancies/`. Strapi custom routes can have any path regardless of which content type folder they live in.

### Strapi component reference

The `resume.work-experience` and `resume.education` components are referenced in the Resume schema as `"component": "resume.work-experience"` (category `resume`, name `work-experience`), matching the file paths `src/components/resume/work-experience.json`.
