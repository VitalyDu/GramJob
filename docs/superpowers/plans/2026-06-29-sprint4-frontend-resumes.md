# Sprint 4 Frontend — Resumes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Resume frontend: candidates can create/edit/publish/archive resumes; employers with Max plan can browse the resume database.

**Architecture:** Follows the exact Vacancy pattern — MobX ResumeStore, lib/resume-utils.ts for labels/guards, page.tsx (server shell) + \*Client.tsx (observer client), React Hook Form + Zod for forms. ResumeForm adds dynamic `useFieldArray` sections for workExperience and education. Public `/resumes` list requires Max subscription; the store sets `accessDenied = true` on 403 and the page shows an upgrade prompt.

**Tech Stack:** Next.js 15, MobX, React Hook Form, Zod, TailwindCSS, Vitest.

---

## File Map

**Modify:**

- `frontend/src/types/api.ts` — add Resume types
- `frontend/src/stores/RootStore.ts` — add `resume: ResumeStore`

**Create:**

- `frontend/src/lib/resume-utils.ts`
- `frontend/src/stores/ResumeStore.ts`
- `frontend/src/stores/ResumeStore.test.ts`
- `frontend/src/components/resume/ResumeStatusBadge.tsx`
- `frontend/src/components/resume/ResumeCard.tsx`
- `frontend/src/components/resume/ResumeForm.tsx`
- `frontend/src/app/resumes/page.tsx`
- `frontend/src/app/resumes/ResumesClient.tsx`
- `frontend/src/app/resumes/[id]/page.tsx`
- `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`
- `frontend/src/app/dashboard/resumes/page.tsx`
- `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`
- `frontend/src/app/dashboard/resumes/new/page.tsx`
- `frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx`
- `frontend/src/app/dashboard/resumes/[id]/edit/page.tsx`
- `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`

---

## Task 1: Resume types in api.ts

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Write the failing typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS (baseline before any changes)

- [ ] **Step 2: Add Resume types to the bottom of `frontend/src/types/api.ts`**

```typescript
// --- Resume ---

export type ResumeStatusEnum = 'draft' | 'moderation' | 'published' | 'rejected' | 'archived'

export type ResumeWorkFormatEnum = 'office' | 'remote' | 'hybrid' | 'any'

export type ResumeCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'

export interface WorkExperience {
  company: string
  position: string
  startDate: string
  endDate?: string | null
  current?: boolean
  description?: string | null
}

export interface Education {
  institution: string
  degree: string
  field: string
  startDate: string
  endDate?: string | null
  current?: boolean
}

export interface ResumeUserRef {
  id: number
  firstName: string
  lastName: string
}

export interface Resume {
  id: number
  documentId: string
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string | null
  desiredSalary?: number | null
  currency?: ResumeCurrencyEnum | null
  workFormat: ResumeWorkFormatEnum
  employmentType: EmploymentTypeEnum
  experienceYears?: number | null
  about?: string | null
  skills?: string[] | null
  languages?: Array<{ lang: string; level: string }> | null
  contacts?: { telegram?: string; email?: string; phone?: string } | null
  workExperience?: WorkExperience[]
  education?: Education[]
  views?: number
  invitations?: number
  status: ResumeStatusEnum
  user?: ResumeUserRef | null
  avatar?: StrapiMedia | null
  createdAt: string
}

export interface ResumeListParams {
  search?: string
  country?: string
  city?: string
  workFormat?: ResumeWorkFormatEnum
  employmentType?: EmploymentTypeEnum
  experienceYears?: number
  page?: number
  pageSize?: number
}

export interface ResumeCreateInput {
  title: string
  firstName: string
  lastName: string
  country: string
  city?: string
  desiredSalary?: number
  currency?: ResumeCurrencyEnum
  workFormat: ResumeWorkFormatEnum
  employmentType: EmploymentTypeEnum
  experienceYears?: number
  about?: string
  skills?: string[]
  languages?: Array<{ lang: string; level: string }>
  contacts?: { telegram?: string; email?: string; phone?: string }
  workExperience?: WorkExperience[]
  education?: Education[]
}

export type ResumeUpdateInput = Partial<ResumeCreateInput>
```

- [ ] **Step 3: Run typecheck to verify no errors**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(frontend): add Resume types to api.ts"
```

---

## Task 2: lib/resume-utils.ts

**Files:**

- Create: `frontend/src/lib/resume-utils.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/lib/resume-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  RESUME_WORK_FORMAT_LABELS,
  RESUME_EMPLOYMENT_TYPE_LABELS,
  canPublishResume,
  canEditResume,
  canArchiveResume,
  APPLY_PLAN_LIMITS,
} from './resume-utils'

describe('RESUME_WORK_FORMAT_LABELS', () => {
  it('содержит метку для any', () => {
    expect(RESUME_WORK_FORMAT_LABELS['any']).toBe('Любой')
  })
  it('содержит метки для всех форматов', () => {
    expect(RESUME_WORK_FORMAT_LABELS['office']).toBe('Офис')
    expect(RESUME_WORK_FORMAT_LABELS['remote']).toBe('Удалённо')
    expect(RESUME_WORK_FORMAT_LABELS['hybrid']).toBe('Гибрид')
  })
})

describe('canPublishResume', () => {
  it('разрешает из draft и rejected', () => {
    expect(canPublishResume('draft')).toBe(true)
    expect(canPublishResume('rejected')).toBe(true)
  })
  it('запрещает из moderation, published, archived', () => {
    expect(canPublishResume('moderation')).toBe(false)
    expect(canPublishResume('published')).toBe(false)
    expect(canPublishResume('archived')).toBe(false)
  })
})

describe('canEditResume', () => {
  it('разрешает из draft, rejected, published', () => {
    expect(canEditResume('draft')).toBe(true)
    expect(canEditResume('rejected')).toBe(true)
    expect(canEditResume('published')).toBe(true)
  })
  it('запрещает из moderation и archived', () => {
    expect(canEditResume('moderation')).toBe(false)
    expect(canEditResume('archived')).toBe(false)
  })
})

describe('canArchiveResume', () => {
  it('разрешает из published, draft, rejected', () => {
    expect(canArchiveResume('published')).toBe(true)
    expect(canArchiveResume('draft')).toBe(true)
    expect(canArchiveResume('rejected')).toBe(true)
  })
  it('запрещает из moderation и archived', () => {
    expect(canArchiveResume('moderation')).toBe(false)
    expect(canArchiveResume('archived')).toBe(false)
  })
})

describe('APPLY_PLAN_LIMITS', () => {
  it('free имеет лимит 3', () => {
    expect(APPLY_PLAN_LIMITS['free']).toBe(3)
  })
  it('max и vip имеют лимит 50', () => {
    expect(APPLY_PLAN_LIMITS['max']).toBe(50)
    expect(APPLY_PLAN_LIMITS['vip']).toBe(50)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/lib/resume-utils.test.ts`
Expected: FAIL — "Cannot find module './resume-utils'"

- [ ] **Step 3: Create `frontend/src/lib/resume-utils.ts`**

```typescript
import type { ResumeStatusEnum, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

export const RESUME_WORK_FORMAT_LABELS: Record<ResumeWorkFormatEnum, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
  any: 'Любой',
}

export const RESUME_EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeEnum, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const APPLY_PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
  max: 50,
  vip: 50,
}

export function canPublishResume(status: ResumeStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}

export function canEditResume(status: ResumeStatusEnum): boolean {
  return status === 'draft' || status === 'rejected' || status === 'published'
}

export function canArchiveResume(status: ResumeStatusEnum): boolean {
  return status === 'published' || status === 'draft' || status === 'rejected'
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/lib/resume-utils.test.ts`
Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/resume-utils.ts frontend/src/lib/resume-utils.test.ts
git commit -m "feat(frontend): add resume-utils with status guards and labels"
```

---

## Task 3: ResumeStore

**Files:**

- Create: `frontend/src/stores/ResumeStore.ts`
- Create: `frontend/src/stores/ResumeStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/stores/ResumeStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => {
  class ApiClientError extends Error {
    constructor(
      public status: number,
      public data: unknown,
      message: string
    ) {
      super(message)
      this.name = 'ApiClientError'
    }
  }
  return {
    api: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { ResumeStore } from './ResumeStore'

const mockResume = {
  id: 1,
  documentId: 'res123',
  title: 'Senior Frontend Developer',
  firstName: 'Иван',
  lastName: 'Иванов',
  country: 'RU',
  workFormat: 'remote' as const,
  employmentType: 'full-time' as const,
  status: 'draft' as const,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockResume],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('ResumeStore', () => {
  let store: ResumeStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ResumeStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.resumes).toEqual([])
    expect(store.myResumes).toEqual([])
    expect(store.currentResume).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.accessDenied).toBe(false)
  })

  describe('fetchResumes', () => {
    it('заполняет resumes и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchResumes()
      expect(store.resumes).toEqual([mockResume])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('устанавливает accessDenied при 403', async () => {
      vi.mocked(api.get).mockRejectedValue(new ApiClientError(403, {}, 'Forbidden'))
      await store.fetchResumes()
      expect(store.accessDenied).toBe(true)
      expect(store.error).toBeNull()
    })

    it('устанавливает error при других ошибках', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchResumes()
      expect(store.error).toBe('Network error')
      expect(store.accessDenied).toBe(false)
    })

    it('передаёт query-параметры в URL', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchResumes({ country: 'RU', page: 2 })
      expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('country=RU')
      expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('page=2')
    })
  })

  describe('fetchMyResumes', () => {
    it('заполняет myResumes', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchMyResumes()
      expect(store.myResumes).toEqual([mockResume])
      expect(store.page).toBe(1)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchMyResumes()
      expect(store.error).toBe('fail')
    })
  })

  describe('fetchResumeById', () => {
    it('заполняет currentResume', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockResume })
      await store.fetchResumeById('res123')
      expect(store.currentResume).toEqual(mockResume)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('not found'))
      await store.fetchResumeById('res123')
      expect(store.error).toBe('not found')
      expect(store.currentResume).toBeNull()
    })
  })

  describe('createResume', () => {
    it('добавляет новое резюме в начало myResumes', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockResume })
      const result = await store.createResume({
        title: 'Senior Frontend Developer',
        firstName: 'Иван',
        lastName: 'Иванов',
        country: 'RU',
        workFormat: 'remote',
        employmentType: 'full-time',
      })
      expect(result).toEqual(mockResume)
      expect(store.myResumes[0]).toEqual(mockResume)
    })

    it('выбрасывает и устанавливает error при сбое', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Bad request'))
      await expect(
        store.createResume({
          title: 'Test',
          firstName: 'А',
          lastName: 'Б',
          country: 'RU',
          workFormat: 'remote',
          employmentType: 'full-time',
        })
      ).rejects.toThrow('Bad request')
      expect(store.error).toBe('Bad request')
    })
  })

  describe('updateResume', () => {
    it('обновляет резюме в myResumes и currentResume', async () => {
      const updated = { ...mockResume, title: 'Updated Title' }
      store.myResumes = [mockResume]
      store.currentResume = mockResume
      vi.mocked(api.put).mockResolvedValue({ data: updated })
      await store.updateResume('res123', { title: 'Updated Title' })
      expect(store.myResumes[0]?.title).toBe('Updated Title')
      expect(store.currentResume?.title).toBe('Updated Title')
    })
  })

  describe('publishResume', () => {
    it('обновляет резюме в myResumes после публикации', async () => {
      const published = { ...mockResume, status: 'moderation' as const }
      store.myResumes = [mockResume]
      vi.mocked(api.post).mockResolvedValue({ data: published })
      await store.publishResume('res123')
      expect(store.myResumes[0]?.status).toBe('moderation')
    })
  })

  describe('archiveResume', () => {
    it('обновляет резюме в myResumes после архивации', async () => {
      const archived = { ...mockResume, status: 'archived' as const }
      store.myResumes = [mockResume]
      vi.mocked(api.delete).mockResolvedValue({ data: archived })
      await store.archiveResume('res123')
      expect(store.myResumes[0]?.status).toBe('archived')
    })
  })

  describe('clearAccessDenied', () => {
    it('сбрасывает accessDenied', () => {
      store.accessDenied = true
      store.clearAccessDenied()
      expect(store.accessDenied).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('вычисляет pageCount из total и pageSize', () => {
      store.total = 45
      store.pageSize = 20
      expect(store.pageCount).toBe(3)
    })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test src/stores/ResumeStore.test.ts`
Expected: FAIL — "Cannot find module './ResumeStore'"

- [ ] **Step 3: Create `frontend/src/stores/ResumeStore.ts`**

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { Resume, ResumeListParams, ResumeCreateInput, ResumeUpdateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type ResumeMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class ResumeStore {
  resumes: Resume[] = []
  myResumes: Resume[] = []
  currentResume: Resume | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  accessDenied = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchResumes(params: ResumeListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.accessDenied = false
    })
    try {
      const query = new URLSearchParams()
      const entries = Object.entries(params) as [string, string | number | undefined][]
      for (const [key, value] of entries) {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value))
        }
      }
      const qs = query.toString()
      const res = await api.get<{ data: Resume[]; meta: ResumeMeta }>(
        `/resumes${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.resumes = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      if (e instanceof ApiClientError && e.status === 403) {
        runInAction(() => {
          this.accessDenied = true
        })
        return
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resumes'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyResumes(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Resume[]; meta: ResumeMeta }>(
        `/resumes/my?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.myResumes = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my resumes'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchResumeById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentResume = null
    })
    try {
      const res = await api.get<{ data: Resume }>(`/resumes/${id}`)
      runInAction(() => {
        this.currentResume = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resume'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createResume(data: ResumeCreateInput): Promise<Resume> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Resume }>('/resumes', data)
      runInAction(() => {
        this.myResumes.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateResume(id: string, data: ResumeUpdateInput): Promise<Resume> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Resume }>(`/resumes/${id}`, data)
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
        if (this.currentResume?.documentId === id) this.currentResume = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async publishResume(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Resume }>(`/resumes/${id}/publish`, {})
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to publish resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async archiveResume(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.delete<{ data: Resume }>(`/resumes/${id}`)
      runInAction(() => {
        const idx = this.myResumes.findIndex((r) => r.documentId === id)
        if (idx !== -1) this.myResumes[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to archive resume'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearAccessDenied(): void {
    this.accessDenied = false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/stores/ResumeStore.test.ts`
Expected: PASS — 16 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/ResumeStore.ts frontend/src/stores/ResumeStore.test.ts
git commit -m "feat(frontend): add ResumeStore with tests"
```

---

## Task 4: Update RootStore

**Files:**

- Modify: `frontend/src/stores/RootStore.ts`

- [ ] **Step 1: Update `frontend/src/stores/RootStore.ts`**

```typescript
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
  }
}

export const rootStore = new RootStore()
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/stores/RootStore.ts
git commit -m "feat(frontend): add ResumeStore to RootStore"
```

---

## Task 5: ResumeStatusBadge component

**Files:**

- Create: `frontend/src/components/resume/ResumeStatusBadge.tsx`

- [ ] **Step 1: Create `frontend/src/components/resume/ResumeStatusBadge.tsx`**

```typescript
import type { ResumeStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<ResumeStatusEnum, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Опубликовано', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонено', className: 'bg-red-100 text-red-700' },
  archived: { label: 'В архиве', className: 'bg-slate-100 text-slate-600' },
}

interface Props {
  status: ResumeStatusEnum
}

export function ResumeStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/resume/ResumeStatusBadge.tsx
git commit -m "feat(frontend): add ResumeStatusBadge component"
```

---

## Task 6: ResumeCard component

**Files:**

- Create: `frontend/src/components/resume/ResumeCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/resume/ResumeCard.tsx`**

```typescript
import Link from 'next/link'
import type { Resume } from '@/types/api'
import { ResumeStatusBadge } from './ResumeStatusBadge'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'

interface Props {
  resume: Resume
  showStatus?: boolean
  href?: string
}

export function ResumeCard({ resume, showStatus = false, href }: Props) {
  const name = `${resume.firstName} ${resume.lastName}`
  const content = (
    <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 transition hover:border-gray-300 hover:shadow-sm">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-indigo-100">
        <span className="text-lg font-bold text-indigo-600">
          {resume.firstName.charAt(0).toUpperCase()}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-gray-900">{resume.title}</p>
          {showStatus && <ResumeStatusBadge status={resume.status} />}
        </div>

        <p className="mt-0.5 text-sm text-gray-500">{name}</p>

        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
          <span>{resume.country}</span>
          {resume.city && <span>{resume.city}</span>}
          <span>{RESUME_WORK_FORMAT_LABELS[resume.workFormat]}</span>
          <span>{RESUME_EMPLOYMENT_TYPE_LABELS[resume.employmentType]}</span>
          {resume.experienceYears !== null && resume.experienceYears !== undefined && (
            <span>{resume.experienceYears} лет опыта</span>
          )}
        </div>

        {resume.skills && resume.skills.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {resume.skills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
              >
                {skill}
              </span>
            ))}
            {resume.skills.length > 5 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-400">
                +{resume.skills.length - 5}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/resume/ResumeCard.tsx
git commit -m "feat(frontend): add ResumeCard component"
```

---

## Task 7: ResumeForm component

**Files:**

- Create: `frontend/src/components/resume/ResumeForm.tsx`

- [ ] **Step 1: Create `frontend/src/components/resume/ResumeForm.tsx`**

```typescript
'use client'

import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import type { ResumeCreateInput, ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

const workExperienceSchema = z.object({
  company: z.string().min(1, 'Компания обязательна'),
  position: z.string().min(1, 'Должность обязательна'),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
  description: z.string().optional().default(''),
})

const educationSchema = z.object({
  institution: z.string().min(1, 'Учебное заведение обязательно'),
  degree: z.string().min(1, 'Степень обязательна'),
  field: z.string().min(1, 'Специальность обязательна'),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().optional().default(''),
  current: z.boolean().default(false),
})

const schema = z.object({
  title: z.string().min(1, 'Заголовок обязателен'),
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  country: z.string().min(1, 'Страна обязательна'),
  city: z.string().optional().default(''),
  desiredSalary: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  currency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
  workFormat: z.enum(['office', 'remote', 'hybrid', 'any']),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
  about: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  contactTelegram: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  workExperience: z.array(workExperienceSchema).default([]),
  education: z.array(educationSchema).default([]),
})

type FormData = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<ResumeCreateInput>
  isLoading?: boolean
  onSubmit: (data: ResumeCreateInput) => void | Promise<void>
}

export function ResumeForm({ defaultValues, isLoading, onSubmit }: Props) {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      firstName: defaultValues?.firstName ?? '',
      lastName: defaultValues?.lastName ?? '',
      country: defaultValues?.country ?? '',
      city: defaultValues?.city ?? '',
      desiredSalary: defaultValues?.desiredSalary,
      currency: defaultValues?.currency ?? 'USD',
      workFormat: (defaultValues?.workFormat as ResumeWorkFormatEnum) ?? 'remote',
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum) ?? 'full-time',
      experienceYears: defaultValues?.experienceYears,
      about: defaultValues?.about ?? '',
      skills: defaultValues?.skills?.join(', ') ?? '',
      contactTelegram: defaultValues?.contacts?.telegram ?? '',
      contactEmail: defaultValues?.contacts?.email ?? '',
      contactPhone: defaultValues?.contacts?.phone ?? '',
      workExperience: (defaultValues?.workExperience ?? []).map((w) => ({
        company: w.company,
        position: w.position,
        startDate: w.startDate,
        endDate: w.endDate ?? '',
        current: w.current ?? false,
        description: w.description ?? '',
      })),
      education: (defaultValues?.education ?? []).map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startDate,
        endDate: e.endDate ?? '',
        current: e.current ?? false,
      })),
    },
  })

  const {
    fields: workFields,
    append: appendWork,
    remove: removeWork,
  } = useFieldArray({ control, name: 'workExperience' })

  const {
    fields: eduFields,
    append: appendEdu,
    remove: removeEdu,
  } = useFieldArray({ control, name: 'education' })

  const handleFormSubmit = (data: FormData) => {
    const payload: ResumeCreateInput = {
      title: data.title,
      firstName: data.firstName,
      lastName: data.lastName,
      country: data.country,
      city: data.city || undefined,
      desiredSalary: data.desiredSalary,
      currency: data.currency,
      workFormat: data.workFormat,
      employmentType: data.employmentType,
      experienceYears: data.experienceYears,
      about: data.about || undefined,
      skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      contacts: {
        telegram: data.contactTelegram || undefined,
        email: data.contactEmail || undefined,
        phone: data.contactPhone || undefined,
      },
      workExperience: data.workExperience.map((w) => ({
        company: w.company,
        position: w.position,
        startDate: w.startDate,
        endDate: w.endDate || undefined,
        current: w.current,
        description: w.description || undefined,
      })),
      education: data.education.map((e) => ({
        institution: e.institution,
        degree: e.degree,
        field: e.field,
        startDate: e.startDate,
        endDate: e.endDate || undefined,
        current: e.current,
      })),
    }
    void onSubmit(payload)
  }

  const watchWorkExperience = watch('workExperience')

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-8">
      {/* Basic Info */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Основная информация</h2>

        <div>
          <Label htmlFor="title">Заголовок резюме *</Label>
          <Input id="title" {...register('title')} placeholder="Senior Frontend Developer" className="mt-1" />
          {errors.title && <p className="mt-1 text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">Имя *</Label>
            <Input id="firstName" {...register('firstName')} className="mt-1" />
            {errors.firstName && <p className="mt-1 text-xs text-destructive">{errors.firstName.message}</p>}
          </div>
          <div>
            <Label htmlFor="lastName">Фамилия *</Label>
            <Input id="lastName" {...register('lastName')} className="mt-1" />
            {errors.lastName && <p className="mt-1 text-xs text-destructive">{errors.lastName.message}</p>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="country">Страна *</Label>
            <Input id="country" {...register('country')} placeholder="RU" className="mt-1" />
            {errors.country && <p className="mt-1 text-xs text-destructive">{errors.country.message}</p>}
          </div>
          <div>
            <Label htmlFor="city">Город</Label>
            <Input id="city" {...register('city')} placeholder="Москва" className="mt-1" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="workFormat">Формат работы *</Label>
            <select id="workFormat" {...register('workFormat')} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {(Object.keys(RESUME_WORK_FORMAT_LABELS) as ResumeWorkFormatEnum[]).map((fmt) => (
                <option key={fmt} value={fmt}>{RESUME_WORK_FORMAT_LABELS[fmt]}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="employmentType">Тип занятости *</Label>
            <select id="employmentType" {...register('employmentType')} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {(Object.keys(RESUME_EMPLOYMENT_TYPE_LABELS) as EmploymentTypeEnum[]).map((t) => (
                <option key={t} value={t}>{RESUME_EMPLOYMENT_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="desiredSalary">Желаемая зарплата</Label>
            <Input id="desiredSalary" type="number" {...register('desiredSalary')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="currency">Валюта</Label>
            <select id="currency" {...register('currency')} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              {['USD', 'EUR', 'RUB', 'GBP'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="experienceYears">Опыт (лет)</Label>
            <Input id="experienceYears" type="number" {...register('experienceYears')} className="mt-1" />
          </div>
        </div>

        <div>
          <Label htmlFor="about">О себе</Label>
          <textarea
            id="about"
            {...register('about')}
            rows={4}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Кратко о себе, ключевые навыки и достижения..."
          />
        </div>

        <div>
          <Label htmlFor="skills">Навыки (через запятую)</Label>
          <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" className="mt-1" />
        </div>
      </section>

      {/* Contacts */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Контакты</h2>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label htmlFor="contactTelegram">Telegram</Label>
            <Input id="contactTelegram" {...register('contactTelegram')} placeholder="@username" className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" type="email" {...register('contactEmail')} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Телефон</Label>
            <Input id="contactPhone" {...register('contactPhone')} placeholder="+7..." className="mt-1" />
          </div>
        </div>
      </section>

      {/* Work Experience */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Опыт работы</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendWork({ company: '', position: '', startDate: '', endDate: '', current: false, description: '' })}
          >
            + Добавить
          </Button>
        </div>

        {workFields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Место работы {index + 1}</p>
              <button type="button" onClick={() => removeWork(index)} className="text-xs text-red-500 hover:text-red-700">
                Удалить
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Компания *</Label>
                <Input {...register(`workExperience.${index}.company`)} className="mt-1" />
                {errors.workExperience?.[index]?.company && (
                  <p className="mt-1 text-xs text-destructive">{errors.workExperience[index].company?.message}</p>
                )}
              </div>
              <div>
                <Label>Должность *</Label>
                <Input {...register(`workExperience.${index}.position`)} className="mt-1" />
                {errors.workExperience?.[index]?.position && (
                  <p className="mt-1 text-xs text-destructive">{errors.workExperience[index].position?.message}</p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало *</Label>
                <Input type="date" {...register(`workExperience.${index}.startDate`)} className="mt-1" />
              </div>
              <div>
                <Label>Конец</Label>
                <Input
                  type="date"
                  {...register(`workExperience.${index}.endDate`)}
                  className="mt-1"
                  disabled={watchWorkExperience[index]?.current}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`current-work-${index}`} {...register(`workExperience.${index}.current`)} className="rounded" />
              <Label htmlFor={`current-work-${index}`}>Работаю сейчас</Label>
            </div>
            <div>
              <Label>Описание</Label>
              <textarea
                {...register(`workExperience.${index}.description`)}
                rows={2}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Образование</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendEdu({ institution: '', degree: '', field: '', startDate: '', endDate: '', current: false })}
          >
            + Добавить
          </Button>
        </div>

        {eduFields.map((field, index) => (
          <div key={field.id} className="rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">Образование {index + 1}</p>
              <button type="button" onClick={() => removeEdu(index)} className="text-xs text-red-500 hover:text-red-700">
                Удалить
              </button>
            </div>
            <div>
              <Label>Учебное заведение *</Label>
              <Input {...register(`education.${index}.institution`)} className="mt-1" />
              {errors.education?.[index]?.institution && (
                <p className="mt-1 text-xs text-destructive">{errors.education[index].institution?.message}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Степень *</Label>
                <Input {...register(`education.${index}.degree`)} placeholder="Бакалавр" className="mt-1" />
              </div>
              <div>
                <Label>Специальность *</Label>
                <Input {...register(`education.${index}.field`)} placeholder="Информатика" className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Начало *</Label>
                <Input type="date" {...register(`education.${index}.startDate`)} className="mt-1" />
              </div>
              <div>
                <Label>Конец</Label>
                <Input type="date" {...register(`education.${index}.endDate`)} className="mt-1" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id={`current-edu-${index}`} {...register(`education.${index}.current`)} className="rounded" />
              <Label htmlFor={`current-edu-${index}`}>Учусь сейчас</Label>
            </div>
          </div>
        ))}
      </section>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/resume/ResumeForm.tsx
git commit -m "feat(frontend): add ResumeForm with dynamic WorkExperience and Education sections"
```

---

## Task 8: /resumes page (public resume database)

**Files:**

- Create: `frontend/src/app/resumes/page.tsx`
- Create: `frontend/src/app/resumes/ResumesClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/resumes/page.tsx`**

```typescript
import { ResumesClient } from './ResumesClient'

export const metadata = {
  title: 'База резюме | GramJob',
  description: 'Найдите лучших специалистов в базе резюме GramJob',
}

export default function ResumesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <ResumesClient />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/resumes/ResumesClient.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeCard } from '@/components/resume/ResumeCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'
import type { ResumeWorkFormatEnum, EmploymentTypeEnum } from '@/types/api'

export const ResumesClient = observer(function ResumesClient() {
  const { resume: store, auth } = useStores()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')
  const [workFormat, setWorkFormat] = useState<ResumeWorkFormatEnum | ''>('')
  const [employmentType, setEmploymentType] = useState<EmploymentTypeEnum | ''>('')

  useEffect(() => {
    void store.fetchResumes({ search, country, workFormat: workFormat || undefined, employmentType: employmentType || undefined })
  }, [store, search, country, workFormat, employmentType])

  const handlePageChange = (page: number) => {
    void store.fetchResumes({ search, country, workFormat: workFormat || undefined, employmentType: employmentType || undefined, page })
  }

  if (store.accessDenied) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-semibold text-gray-900">База резюме доступна на плане Max</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Оформите подписку Max или VIP, чтобы искать кандидатов и просматривать их резюме.
        </p>
        <Link
          href="/subscription"
          className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Перейти к подпискам →
        </Link>
      </div>
    )
  }

  if (!auth.user) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Войдите, чтобы просматривать базу резюме</p>
        <Link href="/login" className="mt-4 inline-block text-sm text-primary hover:underline">
          Войти
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">База резюме</h1>
        {store.total > 0 && (
          <p className="text-sm text-muted-foreground">{store.total} резюме</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Input
          placeholder="Страна (RU, US...)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <select
          value={workFormat}
          onChange={(e) => setWorkFormat(e.target.value as ResumeWorkFormatEnum | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Все форматы</option>
          {(Object.entries(RESUME_WORK_FORMAT_LABELS) as [ResumeWorkFormatEnum, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select
          value={employmentType}
          onChange={(e) => setEmploymentType(e.target.value as EmploymentTypeEnum | '')}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Все типы занятости</option>
          {(Object.entries(RESUME_EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.resumes.length === 0 && !store.error && !store.accessDenied && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Резюме не найдены.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.resumes.map((r) => (
          <ResumeCard
            key={r.documentId}
            resume={r}
            href={`/resumes/${r.documentId}`}
          />
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/resumes/page.tsx frontend/src/app/resumes/ResumesClient.tsx
git commit -m "feat(frontend): add /resumes public database page with Max-plan gate"
```

---

## Task 9: /resumes/[id] page (resume detail)

**Files:**

- Create: `frontend/src/app/resumes/[id]/page.tsx`
- Create: `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/resumes/[id]/page.tsx`**

```typescript
import { ResumeDetailClient } from './ResumeDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <ResumeDetailClient id={id} />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import {
  RESUME_WORK_FORMAT_LABELS,
  RESUME_EMPLOYMENT_TYPE_LABELS,
} from '@/lib/resume-utils'
import { SALARY_CURRENCY_SYMBOLS } from '@/lib/vacancy-utils'
import type { SalaryCurrencyEnum } from '@/types/api'

interface Props {
  id: string
}

export const ResumeDetailClient = observer(function ResumeDetailClient({ id }: Props) {
  const { resume: store } = useStores()

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (!store.currentResume) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Резюме не найдено</p>
        {store.error && <p className="mt-1 text-sm text-muted-foreground">{store.error}</p>}
        <Link href="/resumes" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Все резюме
        </Link>
      </div>
    )
  }

  const r = store.currentResume
  const name = `${r.firstName} ${r.lastName}`
  const salarySymbol = r.currency ? (SALARY_CURRENCY_SYMBOLS[r.currency as SalaryCurrencyEnum] ?? '') : ''

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{r.title}</h1>
          <ResumeStatusBadge status={r.status} />
        </div>
        <p className="mt-1 text-base font-medium text-gray-700">{name}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
          <span>{r.country}{r.city ? `, ${r.city}` : ''}</span>
          <span>{RESUME_WORK_FORMAT_LABELS[r.workFormat]}</span>
          <span>{RESUME_EMPLOYMENT_TYPE_LABELS[r.employmentType]}</span>
          {r.experienceYears !== null && r.experienceYears !== undefined && (
            <span>{r.experienceYears} лет опыта</span>
          )}
        </div>

        {r.desiredSalary && (
          <p className="mt-3 text-lg font-semibold text-gray-900">
            от {salarySymbol}{r.desiredSalary.toLocaleString('ru')}
          </p>
        )}
      </div>

      {r.about && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">О себе</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{r.about}</p>
        </div>
      )}

      {r.skills && r.skills.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {r.skills.map((skill) => (
              <span key={skill} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {r.workExperience && r.workExperience.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Опыт работы</h2>
          <div className="space-y-4">
            {r.workExperience.map((w, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">{w.position}</p>
                <p className="text-sm text-gray-600">{w.company}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {w.startDate} — {w.current ? 'по настоящее время' : (w.endDate ?? '')}
                </p>
                {w.description && <p className="mt-2 text-sm text-gray-700">{w.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {r.education && r.education.length > 0 && (
        <div>
          <h2 className="mb-3 text-base font-semibold text-gray-900">Образование</h2>
          <div className="space-y-4">
            {r.education.map((e, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-900">{e.degree} — {e.field}</p>
                <p className="text-sm text-gray-600">{e.institution}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {e.startDate} — {e.current ? 'по настоящее время' : (e.endDate ?? '')}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {r.contacts && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Контакты</h2>
          <div className="space-y-1 text-sm text-gray-700">
            {r.contacts.telegram && <p>Telegram: <a href={`https://t.me/${r.contacts.telegram.replace('@', '')}`} className="text-primary hover:underline">{r.contacts.telegram}</a></p>}
            {r.contacts.email && <p>Email: <a href={`mailto:${r.contacts.email}`} className="text-primary hover:underline">{r.contacts.email}</a></p>}
            {r.contacts.phone && <p>Телефон: {r.contacts.phone}</p>}
          </div>
        </div>
      )}

      <div className="border-t pt-4">
        <Link href="/resumes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все резюме
        </Link>
      </div>
    </div>
  )
})
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/resumes/[id]/page.tsx frontend/src/app/resumes/[id]/ResumeDetailClient.tsx
git commit -m "feat(frontend): add /resumes/[id] resume detail page"
```

---

## Task 10: /dashboard/resumes page (my resumes)

**Files:**

- Create: `frontend/src/app/dashboard/resumes/page.tsx`
- Create: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/dashboard/resumes/page.tsx`**

```typescript
import { MyResumesClient } from './MyResumesClient'

export default function MyResumesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MyResumesClient />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeStatusBadge } from '@/components/resume/ResumeStatusBadge'
import { Button } from '@/components/ui/button'
import { canPublishResume, canEditResume, canArchiveResume, APPLY_PLAN_LIMITS } from '@/lib/resume-utils'
import { RESUME_WORK_FORMAT_LABELS, RESUME_EMPLOYMENT_TYPE_LABELS } from '@/lib/resume-utils'

export const MyResumesClient = observer(function MyResumesClient() {
  const { resume: store, auth } = useStores()

  useEffect(() => {
    void store.fetchMyResumes()
  }, [store])

  const plan = auth.user?.subscriptionPlan ?? 'free'
  const applyLimit = APPLY_PLAN_LIMITS[plan] ?? 3

  const handlePublish = (id: string) => {
    void store.publishResume(id)
  }

  const handleArchive = (id: string) => {
    if (!window.confirm('Архивировать резюме?')) return
    void store.archiveResume(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyResumes(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои резюме</h1>
        <Link
          href="/dashboard/resumes/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Создать резюме
        </Link>
      </div>

      <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
        Лимит откликов в день (план {plan}): {applyLimit}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.myResumes.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет резюме.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.myResumes.map((r) => (
          <div key={r.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">{r.title}</p>
                  <ResumeStatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {r.firstName} {r.lastName} · {RESUME_WORK_FORMAT_LABELS[r.workFormat]} · {RESUME_EMPLOYMENT_TYPE_LABELS[r.employmentType]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canEditResume(r.status) && (
                  <Link
                    href={`/dashboard/resumes/${r.documentId}/edit`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Редактировать
                  </Link>
                )}
                {canPublishResume(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublish(r.documentId)}
                    disabled={store.isLoading}
                  >
                    На модерацию
                  </Button>
                )}
                {canArchiveResume(r.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleArchive(r.documentId)}
                    disabled={store.isLoading}
                  >
                    В архив
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              <span>{r.views ?? 0} просмотров</span>
              {r.country && <span>{r.country}{r.city ? `, ${r.city}` : ''}</span>}
            </div>
          </div>
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={store.page <= 1}
            onClick={() => handlePageChange(store.page - 1)}
          >
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">
            {store.page} / {store.pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={store.page >= store.pageCount}
            onClick={() => handlePageChange(store.page + 1)}
          >
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/resumes/page.tsx frontend/src/app/dashboard/resumes/MyResumesClient.tsx
git commit -m "feat(frontend): add /dashboard/resumes my resumes page"
```

---

## Task 11: /dashboard/resumes/new page

**Files:**

- Create: `frontend/src/app/dashboard/resumes/new/page.tsx`
- Create: `frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/dashboard/resumes/new/page.tsx`**

```typescript
import { CreateResumeClient } from './CreateResumeClient'

export default function CreateResumePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <CreateResumeClient />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx`**

```typescript
'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeForm } from '@/components/resume/ResumeForm'
import type { ResumeCreateInput } from '@/types/api'

export const CreateResumeClient = observer(function CreateResumeClient() {
  const { resume: store } = useStores()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const handleSubmit = async (data: ResumeCreateInput) => {
    setSubmitError(null)
    try {
      await store.createResume(data)
      router.push('/dashboard/resumes')
    } catch {
      setSubmitError(store.error ?? 'Не удалось создать резюме')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/resumes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold">Новое резюме</h1>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <ResumeForm isLoading={store.isLoading} onSubmit={handleSubmit} />
    </div>
  )
})
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/resumes/new/page.tsx frontend/src/app/dashboard/resumes/new/CreateResumeClient.tsx
git commit -m "feat(frontend): add /dashboard/resumes/new create resume page"
```

---

## Task 12: /dashboard/resumes/[id]/edit page

**Files:**

- Create: `frontend/src/app/dashboard/resumes/[id]/edit/page.tsx`
- Create: `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/dashboard/resumes/[id]/edit/page.tsx`**

```typescript
import { EditResumeClient } from './EditResumeClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditResumePage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <EditResumeClient id={id} />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ResumeForm } from '@/components/resume/ResumeForm'
import type { ResumeCreateInput } from '@/types/api'

interface Props {
  id: string
}

export const EditResumeClient = observer(function EditResumeClient({ id }: Props) {
  const { resume: store } = useStores()
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    void store.fetchResumeById(id)
  }, [store, id])

  const handleSubmit = async (data: ResumeCreateInput) => {
    setSubmitError(null)
    try {
      await store.updateResume(id, data)
      router.push('/dashboard/resumes')
    } catch {
      setSubmitError(store.error ?? 'Не удалось обновить резюме')
    }
  }

  if (store.isLoading && !store.currentResume) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (!store.currentResume) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Резюме не найдено</p>
        <Link href="/dashboard/resumes" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Мои резюме
        </Link>
      </div>
    )
  }

  const r = store.currentResume

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/resumes" className="text-sm text-muted-foreground hover:text-foreground">
          ← Назад
        </Link>
        <h1 className="text-2xl font-bold">Редактировать резюме</h1>
      </div>

      {submitError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <ResumeForm
        defaultValues={{
          title: r.title,
          firstName: r.firstName,
          lastName: r.lastName,
          country: r.country,
          city: r.city ?? undefined,
          desiredSalary: r.desiredSalary ?? undefined,
          currency: r.currency ?? undefined,
          workFormat: r.workFormat,
          employmentType: r.employmentType,
          experienceYears: r.experienceYears ?? undefined,
          about: r.about ?? undefined,
          skills: r.skills ?? undefined,
          contacts: r.contacts ?? undefined,
          workExperience: r.workExperience ?? undefined,
          education: r.education ?? undefined,
        }}
        isLoading={store.isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
```

- [ ] **Step 3: Run all tests and typecheck**

Run: `pnpm --filter frontend test && pnpm --filter frontend typecheck`
Expected: All tests PASS, 0 typecheck errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/resumes/[id]/edit/page.tsx frontend/src/app/dashboard/resumes/[id]/edit/EditResumeClient.tsx
git commit -m "feat(frontend): add /dashboard/resumes/[id]/edit edit resume page"
```

---

## Final verification

- [ ] **Run all frontend tests**

Run: `pnpm --filter frontend test`
Expected: All tests pass (existing 169 + new ~23 = ~192)

- [ ] **Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: 0 errors

- [ ] **Run lint**

Run: `pnpm --filter frontend lint`
Expected: 0 errors
