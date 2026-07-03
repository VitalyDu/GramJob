# Sprint 4 Frontend — Applications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Application frontend: candidates apply to vacancies via ApplyDialog, track their applications in `/dashboard/applications`; employers review and advance applications in `/dashboard/vacancies/[id]/applications`.

**Architecture:** ApplicationStore mirrors VacancyStore — MobX with `applications[]` (candidate view) and `vacancyApplications[]` (employer view). `PATCH /applications/:id` is the only employer action. `POST /applications` handles LIMIT_REACHED (403) and ALREADY_APPLIED (409) error codes. ApplyDialog is a modal rendered inside VacancyDetailClient; it fetches the user's published resumes on open via a local API call (not through a store). Employer status transitions use the `STATUS_TRANSITIONS` map from application-utils.

**Tech Stack:** Next.js 15, MobX, TailwindCSS, Vitest.

---

## File Map

**Modify:**

- `frontend/src/types/api.ts` — add Application types
- `frontend/src/stores/RootStore.ts` — add `application: ApplicationStore`
- `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx` — add Apply button + ApplyDialog

**Create:**

- `frontend/src/stores/ApplicationStore.ts`
- `frontend/src/stores/ApplicationStore.test.ts`
- `frontend/src/components/application/ApplicationStatusBadge.tsx`
- `frontend/src/components/application/ApplicationCard.tsx`
- `frontend/src/components/application/ApplyDialog.tsx`
- `frontend/src/app/dashboard/applications/page.tsx`
- `frontend/src/app/dashboard/applications/MyApplicationsClient.tsx`
- `frontend/src/app/dashboard/vacancies/[id]/applications/page.tsx`
- `frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx`

---

## Task 1: Application types in api.ts

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Confirm baseline typecheck passes**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 2: Add Application types to the bottom of `frontend/src/types/api.ts`**

```typescript
// --- Application ---

export type ApplicationStatusEnum =
  | 'applied'
  | 'viewed'
  | 'in-review'
  | 'interview'
  | 'test-task'
  | 'offer'
  | 'hired'
  | 'rejected'

export interface ApplicationVacancyRef {
  documentId: string
  title: string
  status: VacancyStatusEnum
  sourceType: SourceTypeEnum
  company: {
    documentId: string
    name: string
    slug: string
  }
}

export interface ApplicationResumeRef {
  documentId: string
  title: string
  firstName: string
  lastName: string
  status: ResumeStatusEnum
}

export interface ApplicationUserRef {
  id: number
  firstName: string
  lastName: string
}

export interface Application {
  id: number
  documentId: string
  vacancy: ApplicationVacancyRef
  resume: ApplicationResumeRef
  user: ApplicationUserRef
  status: ApplicationStatusEnum
  coverLetter?: string | null
  createdAt: string
}

export interface ApplicationCreateInput {
  vacancyId: string
  resumeId: string
  coverLetter?: string
}
```

Note: `ResumeStatusEnum` and `SourceTypeEnum` are already defined from Part 1 / existing api.ts.

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(frontend): add Application types to api.ts"
```

---

## Task 2: ApplicationStore

**Files:**

- Create: `frontend/src/stores/ApplicationStore.ts`
- Create: `frontend/src/stores/ApplicationStore.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/stores/ApplicationStore.test.ts`:

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
      patch: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { ApplicationStore } from './ApplicationStore'

const mockVacancyRef = {
  documentId: 'vac123',
  title: 'Senior Developer',
  status: 'published' as const,
  sourceType: 'internal' as const,
  company: { documentId: 'comp1', name: 'Test Co', slug: 'test-co' },
}

const mockResumeRef = {
  documentId: 'res123',
  title: 'My Resume',
  firstName: 'Иван',
  lastName: 'Иванов',
  status: 'published' as const,
}

const mockUserRef = { id: 1, firstName: 'Иван', lastName: 'Иванов' }

const mockApplication = {
  id: 1,
  documentId: 'app123',
  vacancy: mockVacancyRef,
  resume: mockResumeRef,
  user: mockUserRef,
  status: 'applied' as const,
  coverLetter: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockApplication],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('ApplicationStore', () => {
  let store: ApplicationStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new ApplicationStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.applications).toEqual([])
    expect(store.vacancyApplications).toEqual([])
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.limitReached).toBe(false)
    expect(store.alreadyApplied).toBe(false)
  })

  describe('createApplication', () => {
    it('добавляет отклик в начало applications', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockApplication })
      const result = await store.createApplication({
        vacancyId: 'vac123',
        resumeId: 'res123',
        coverLetter: 'Привет!',
      })
      expect(result).toEqual(mockApplication)
      expect(store.applications[0]).toEqual(mockApplication)
    })

    it('устанавливает limitReached при 403 LIMIT_REACHED', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(403, { error: { code: 'LIMIT_REACHED' } }, 'Limit reached')
      )
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.limitReached).toBe(true)
      expect(store.alreadyApplied).toBe(false)
    })

    it('устанавливает alreadyApplied при 409 ALREADY_APPLIED', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_APPLIED' } }, 'Already applied')
      )
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.alreadyApplied).toBe(true)
      expect(store.limitReached).toBe(false)
    })

    it('устанавливает error при других ошибках', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Network error'))
      await expect(
        store.createApplication({ vacancyId: 'vac123', resumeId: 'res123' })
      ).rejects.toThrow()
      expect(store.error).toBe('Network error')
    })
  })

  describe('fetchMyApplications', () => {
    it('заполняет applications из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchMyApplications()
      expect(store.applications).toEqual([mockApplication])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchMyApplications()
      expect(store.error).toBe('fail')
    })
  })

  describe('fetchVacancyApplications', () => {
    it('заполняет vacancyApplications из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchVacancyApplications('vac123')
      expect(store.vacancyApplications).toEqual([mockApplication])
      expect(store.total).toBe(1)
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('fail'))
      await store.fetchVacancyApplications('vac123')
      expect(store.error).toBe('fail')
    })
  })

  describe('updateApplicationStatus', () => {
    it('обновляет статус в vacancyApplications', async () => {
      const updated = { ...mockApplication, status: 'viewed' as const }
      store.vacancyApplications = [mockApplication]
      vi.mocked(api.patch).mockResolvedValue({ data: updated })
      await store.updateApplicationStatus('app123', 'viewed')
      expect(store.vacancyApplications[0]?.status).toBe('viewed')
    })

    it('обновляет статус в applications (кандидат)', async () => {
      const updated = { ...mockApplication, status: 'viewed' as const }
      store.applications = [mockApplication]
      vi.mocked(api.patch).mockResolvedValue({ data: updated })
      await store.updateApplicationStatus('app123', 'viewed')
      expect(store.applications[0]?.status).toBe('viewed')
    })

    it('выбрасывает и устанавливает error при сбое', async () => {
      vi.mocked(api.patch).mockRejectedValue(new Error('Forbidden'))
      await expect(store.updateApplicationStatus('app123', 'viewed')).rejects.toThrow()
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('clearFlags', () => {
    it('сбрасывает limitReached и alreadyApplied', () => {
      store.limitReached = true
      store.alreadyApplied = true
      store.clearFlags()
      expect(store.limitReached).toBe(false)
      expect(store.alreadyApplied).toBe(false)
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

Run: `pnpm --filter frontend test src/stores/ApplicationStore.test.ts`
Expected: FAIL — "Cannot find module './ApplicationStore'"

- [ ] **Step 3: Create `frontend/src/stores/ApplicationStore.ts`**

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { Application, ApplicationCreateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type AppMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class ApplicationStore {
  applications: Application[] = []
  vacancyApplications: Application[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  limitReached = false
  alreadyApplied = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async createApplication(data: ApplicationCreateInput): Promise<Application> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.limitReached = false
      this.alreadyApplied = false
    })
    try {
      const res = await api.post<{ data: Application }>('/applications', data)
      runInAction(() => {
        this.applications.unshift(res.data)
      })
      return res.data
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'LIMIT_REACHED') {
          runInAction(() => {
            this.limitReached = true
          })
          throw e
        }
        if (body?.error?.code === 'ALREADY_APPLIED') {
          runInAction(() => {
            this.alreadyApplied = true
          })
          throw e
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create application'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyApplications(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Application[]; meta: AppMeta }>(
        `/applications?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.applications = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch applications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyApplications(vacancyId: string, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Application[]; meta: AppMeta }>(
        `/vacancies/${vacancyId}/applications?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.vacancyApplications = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy applications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateApplicationStatus(id: string, status: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.patch<{ data: Application }>(`/applications/${id}`, { status })
      runInAction(() => {
        const vIdx = this.vacancyApplications.findIndex((a) => a.documentId === id)
        if (vIdx !== -1) this.vacancyApplications[vIdx] = res.data
        const mIdx = this.applications.findIndex((a) => a.documentId === id)
        if (mIdx !== -1) this.applications[mIdx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update status'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.limitReached = false
    this.alreadyApplied = false
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test src/stores/ApplicationStore.test.ts`
Expected: PASS — 14 tests

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/ApplicationStore.ts frontend/src/stores/ApplicationStore.test.ts
git commit -m "feat(frontend): add ApplicationStore with tests"
```

---

## Task 3: Update RootStore

**Files:**

- Modify: `frontend/src/stores/RootStore.ts`

- [ ] **Step 1: Update `frontend/src/stores/RootStore.ts`**

```typescript
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
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
git commit -m "feat(frontend): add ApplicationStore to RootStore"
```

---

## Task 4: ApplicationStatusBadge component

**Files:**

- Create: `frontend/src/components/application/ApplicationStatusBadge.tsx`

- [ ] **Step 1: Create `frontend/src/components/application/ApplicationStatusBadge.tsx`**

```typescript
import type { ApplicationStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<ApplicationStatusEnum, { label: string; className: string }> = {
  applied: { label: 'Отправлен', className: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Просмотрен', className: 'bg-gray-100 text-gray-600' },
  'in-review': { label: 'На рассмотрении', className: 'bg-yellow-100 text-yellow-700' },
  interview: { label: 'Собеседование', className: 'bg-indigo-100 text-indigo-700' },
  'test-task': { label: 'Тестовое', className: 'bg-purple-100 text-purple-700' },
  offer: { label: 'Оффер', className: 'bg-emerald-100 text-emerald-700' },
  hired: { label: 'Принят', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонён', className: 'bg-red-100 text-red-700' },
}

interface Props {
  status: ApplicationStatusEnum
}

export function ApplicationStatusBadge({ status }: Props) {
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
git add frontend/src/components/application/ApplicationStatusBadge.tsx
git commit -m "feat(frontend): add ApplicationStatusBadge component"
```

---

## Task 5: ApplicationCard component

**Files:**

- Create: `frontend/src/components/application/ApplicationCard.tsx`

- [ ] **Step 1: Create `frontend/src/components/application/ApplicationCard.tsx`**

```typescript
import Link from 'next/link'
import type { Application, ApplicationStatusEnum } from '@/types/api'
import { ApplicationStatusBadge } from './ApplicationStatusBadge'

const STATUS_TRANSITIONS: Record<ApplicationStatusEnum, ApplicationStatusEnum[]> = {
  applied: ['viewed'],
  viewed: ['in-review'],
  'in-review': ['interview', 'test-task', 'offer', 'rejected'],
  interview: ['offer', 'rejected'],
  'test-task': ['offer', 'rejected'],
  offer: ['hired', 'rejected'],
  hired: [],
  rejected: [],
}

const NEXT_STATUS_LABELS: Partial<Record<ApplicationStatusEnum, string>> = {
  viewed: 'Просмотрен',
  'in-review': 'На рассмотрение',
  interview: 'Собеседование',
  'test-task': 'Тест. задание',
  offer: 'Оффер',
  hired: 'Принят',
  rejected: 'Отклонить',
}

interface Props {
  application: Application
  /** Employer mode: show status-change buttons and link to resume */
  employerMode?: boolean
  onStatusChange?: (id: string, status: ApplicationStatusEnum) => void
  isLoading?: boolean
}

export function ApplicationCard({
  application: app,
  employerMode = false,
  onStatusChange,
  isLoading,
}: Props) {
  const nextStatuses = STATUS_TRANSITIONS[app.status] ?? []

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {employerMode ? (
            <>
              <Link
                href={`/resumes/${app.resume.documentId}`}
                className="truncate font-semibold text-gray-900 hover:underline"
              >
                {app.resume.firstName} {app.resume.lastName}
              </Link>
              <p className="mt-0.5 text-sm text-gray-500">{app.resume.title}</p>
            </>
          ) : (
            <>
              <Link
                href={`/vacancies/${app.vacancy.documentId}`}
                className="truncate font-semibold text-gray-900 hover:underline"
              >
                {app.vacancy.title}
              </Link>
              <p className="mt-0.5 text-sm text-gray-500">{app.vacancy.company.name}</p>
            </>
          )}

          <div className="mt-2 flex items-center gap-2">
            <ApplicationStatusBadge status={app.status} />
            <span className="text-xs text-gray-400">
              {new Date(app.createdAt).toLocaleDateString('ru', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>

          {app.coverLetter && !employerMode && (
            <p className="mt-2 line-clamp-2 text-xs text-gray-500">{app.coverLetter}</p>
          )}
        </div>

        {employerMode && onStatusChange && nextStatuses.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {nextStatuses.map((next) => (
              <button
                key={next}
                onClick={() => onStatusChange(app.documentId, next)}
                disabled={isLoading}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  next === 'rejected'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                    : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                } disabled:opacity-50`}
              >
                {NEXT_STATUS_LABELS[next] ?? next}
              </button>
            ))}
          </div>
        )}
      </div>

      {employerMode && app.coverLetter && (
        <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2">
          <p className="text-xs font-medium text-gray-500">Сопроводительное письмо</p>
          <p className="mt-1 text-sm text-gray-700">{app.coverLetter}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/application/ApplicationCard.tsx
git commit -m "feat(frontend): add ApplicationCard component"
```

---

## Task 6: ApplyDialog component

**Files:**

- Create: `frontend/src/components/application/ApplyDialog.tsx`

- [ ] **Step 1: Create `frontend/src/components/application/ApplyDialog.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { api } from '@/services/api'
import type { Resume } from '@/types/api'

interface Props {
  isOpen: boolean
  vacancyId: string
  vacancyTitle: string
  onClose: () => void
  onSubmit: (resumeId: string, coverLetter: string) => Promise<void>
  isLoading?: boolean
  limitReached?: boolean
  alreadyApplied?: boolean
}

export function ApplyDialog({
  isOpen,
  vacancyId: _vacancyId,
  vacancyTitle,
  onClose,
  onSubmit,
  isLoading,
  limitReached,
  alreadyApplied,
}: Props) {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [resumeId, setResumeId] = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return
    setFetchError(null)
    api
      .get<{ data: Resume[] }>('/resumes/my?pageSize=100')
      .then((res) => {
        const published = res.data.filter((r) => r.status === 'published')
        setResumes(published)
        if (published[0]) setResumeId(published[0].documentId)
      })
      .catch(() => setFetchError('Не удалось загрузить резюме'))
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resumeId) return
    await onSubmit(resumeId, coverLetter)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Откликнуться</h2>
        <p className="mt-1 text-sm text-gray-500">{vacancyTitle}</p>

        {alreadyApplied && (
          <div className="mt-4 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            Вы уже откликались на эту вакансию.
          </div>
        )}

        {limitReached && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">
            Дневной лимит откликов исчерпан. Обновите план для большего количества откликов.
          </div>
        )}

        {fetchError && (
          <p className="mt-4 text-sm text-destructive">{fetchError}</p>
        )}

        {!alreadyApplied && !limitReached && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {resumes.length === 0 && !fetchError ? (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
                У вас нет опубликованных резюме.{' '}
                <a href="/dashboard/resumes" className="text-primary hover:underline">
                  Создать резюме →
                </a>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="resumeId">Резюме</Label>
                  <select
                    id="resumeId"
                    value={resumeId}
                    onChange={(e) => setResumeId(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  >
                    {resumes.map((r) => (
                      <option key={r.documentId} value={r.documentId}>
                        {r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label htmlFor="coverLetter">Сопроводительное письмо (необязательно)</Label>
                  <textarea
                    id="coverLetter"
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    placeholder="Расскажите, почему вы подходите на эту позицию..."
                  />
                </div>

                <div className="flex gap-3">
                  <Button type="submit" disabled={isLoading || !resumeId} className="flex-1">
                    {isLoading ? 'Отправка...' : 'Откликнуться'}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    Отмена
                  </Button>
                </div>
              </>
            )}
          </form>
        )}

        {(alreadyApplied || limitReached) && (
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={onClose}>Закрыть</Button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/application/ApplyDialog.tsx
git commit -m "feat(frontend): add ApplyDialog component"
```

---

## Task 7: Add Apply button to VacancyDetailClient

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`

- [ ] **Step 1: Update `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`**

Replace the full file content:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { ApplyDialog } from '@/components/application/ApplyDialog'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'

interface Props {
  id: string
}

export const VacancyDetailClient = observer(function VacancyDetailClient({ id }: Props) {
  const { vacancy: store, application: appStore, auth } = useStores()
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    void store.fetchVacancyById(id)
  }, [store, id])

  const handleApplyClose = () => {
    setApplyOpen(false)
    appStore.clearFlags()
  }

  const handleApplySubmit = async (resumeId: string, coverLetter: string) => {
    try {
      await appStore.createApplication({ vacancyId: id, resumeId, coverLetter })
      setApplyOpen(false)
    } catch {
      // errors reflected in appStore.limitReached / appStore.alreadyApplied
    }
  }

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (!store.currentVacancy) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-medium text-gray-900">Вакансия не найдена</p>
        {store.error && <p className="mt-1 text-sm text-muted-foreground">{store.error}</p>}
        <Link href="/vacancies" className="mt-4 inline-block text-sm text-primary hover:underline">
          ← Все вакансии
        </Link>
      </div>
    )
  }

  const v = store.currentVacancy
  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.salaryCurrency)
  const isInternal = v.sourceType === 'internal'
  const isPublished = v.status === 'published'

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{v.title}</h1>
          <VacancyStatusBadge status={v.status} />
        </div>

        <Link
          href={`/companies/${v.company.documentId}`}
          className="mt-1 text-sm font-medium text-primary hover:underline"
        >
          {v.company.name}
        </Link>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-gray-500">
          <span>
            {v.country}
            {v.city ? `, ${v.city}` : ''}
          </span>
          <span>{WORK_FORMAT_LABELS[v.workFormat]}</span>
          <span>{EMPLOYMENT_TYPE_LABELS[v.employmentType]}</span>
          <span>{SENIORITY_LABELS[v.seniority]}</span>
        </div>

        {salary && <p className="mt-3 text-lg font-semibold text-gray-900">{salary}</p>}

        {v.urgent && (
          <span className="mt-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
            🔥 Urgent
          </span>
        )}
      </div>

      {v.description && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Описание</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.description}</p>
        </div>
      )}

      {v.responsibilities && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Обязанности</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.responsibilities}</p>
        </div>
      )}

      {v.requirements && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Требования</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.requirements}</p>
        </div>
      )}

      {v.conditions && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Условия</h2>
          <p className="whitespace-pre-wrap text-sm text-gray-700">{v.conditions}</p>
        </div>
      )}

      {v.skills && v.skills.length > 0 && (
        <div>
          <h2 className="mb-2 text-base font-semibold text-gray-900">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {v.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Apply actions */}
      {isPublished && isInternal && auth.user && (
        <button
          onClick={() => setApplyOpen(true)}
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Откликнуться
        </button>
      )}

      {isPublished && isInternal && !auth.user && (
        <Link
          href="/login"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Войдите, чтобы откликнуться
        </Link>
      )}

      {v.sourceType === 'external' && v.sourceUrl && (
        <a
          href={v.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Apply on Source →
        </a>
      )}

      <div className="border-t pt-4">
        <Link href="/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все вакансии
        </Link>
      </div>

      <ApplyDialog
        isOpen={applyOpen}
        vacancyId={id}
        vacancyTitle={v.title}
        onClose={handleApplyClose}
        onSubmit={handleApplySubmit}
        isLoading={appStore.isLoading}
        limitReached={appStore.limitReached}
        alreadyApplied={appStore.alreadyApplied}
      />
    </div>
  )
})
```

- [ ] **Step 2: Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx
git commit -m "feat(frontend): add Apply button and ApplyDialog to vacancy detail page"
```

---

## Task 8: /dashboard/applications page (candidate view)

**Files:**

- Create: `frontend/src/app/dashboard/applications/page.tsx`
- Create: `frontend/src/app/dashboard/applications/MyApplicationsClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/dashboard/applications/page.tsx`**

```typescript
import { MyApplicationsClient } from './MyApplicationsClient'

export default function MyApplicationsPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MyApplicationsClient />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/dashboard/applications/MyApplicationsClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { Button } from '@/components/ui/button'

export const MyApplicationsClient = observer(function MyApplicationsClient() {
  const { application: store } = useStores()

  useEffect(() => {
    void store.fetchMyApplications()
  }, [store])

  const handlePageChange = (page: number) => {
    void store.fetchMyApplications(page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои отклики</h1>
        {store.total > 0 && (
          <p className="text-sm text-muted-foreground">{store.total} откликов</p>
        )}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.applications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Вы ещё не откликались на вакансии.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.applications.map((app) => (
          <ApplicationCard key={app.documentId} application={app} employerMode={false} />
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
git add frontend/src/app/dashboard/applications/page.tsx frontend/src/app/dashboard/applications/MyApplicationsClient.tsx
git commit -m "feat(frontend): add /dashboard/applications candidate applications page"
```

---

## Task 9: /dashboard/vacancies/[id]/applications page (employer view)

**Files:**

- Create: `frontend/src/app/dashboard/vacancies/[id]/applications/page.tsx`
- Create: `frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx`

- [ ] **Step 1: Create `frontend/src/app/dashboard/vacancies/[id]/applications/page.tsx`**

```typescript
import { VacancyApplicationsClient } from './VacancyApplicationsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyApplicationsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <VacancyApplicationsClient vacancyId={id} />
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { ApplicationCard } from '@/components/application/ApplicationCard'
import { Button } from '@/components/ui/button'
import type { ApplicationStatusEnum } from '@/types/api'

interface Props {
  vacancyId: string
}

export const VacancyApplicationsClient = observer(function VacancyApplicationsClient({ vacancyId }: Props) {
  const { application: store } = useStores()

  useEffect(() => {
    void store.fetchVacancyApplications(vacancyId)
  }, [store, vacancyId])

  const handleStatusChange = (appId: string, status: ApplicationStatusEnum) => {
    void store.updateApplicationStatus(appId, status)
  }

  const handlePageChange = (page: number) => {
    void store.fetchVacancyApplications(vacancyId, page)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Отклики на вакансию</h1>
      </div>

      {store.total > 0 && (
        <p className="text-sm text-muted-foreground">{store.total} откликов</p>
      )}

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.vacancyApplications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Откликов пока нет.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.vacancyApplications.map((app) => (
          <ApplicationCard
            key={app.documentId}
            application={app}
            employerMode
            onStatusChange={handleStatusChange}
            isLoading={store.isLoading}
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

- [ ] **Step 3: Run all tests and typecheck**

Run: `pnpm --filter frontend test && pnpm --filter frontend typecheck`
Expected: All tests PASS, 0 typecheck errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/[id]/applications/page.tsx frontend/src/app/dashboard/vacancies/[id]/applications/VacancyApplicationsClient.tsx
git commit -m "feat(frontend): add /dashboard/vacancies/[id]/applications employer applications page"
```

---

## Final verification

- [ ] **Run all frontend tests**

Run: `pnpm --filter frontend test`
Expected: All tests pass (prior ~192 + new 14 ApplicationStore = ~206)

- [ ] **Run typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: 0 errors

- [ ] **Run lint**

Run: `pnpm --filter frontend lint`
Expected: 0 errors
