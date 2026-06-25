# Sprint 3 Frontend — Vacancies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать полный фронтенд для вакансий: публичный поиск с фильтрами, карточка вакансии, дашборд работодателя (создание, редактирование, публикация, буст, архив) и обработка лимита подписки.

**Architecture:** Следуем паттернам Sprint 2 (Companies): MobX VacancyStore → `useStores()` в observer-компонентах → API через `api` из `@/services/api`. Каждая страница = серверный `page.tsx` (metadata) + клиентский `*Client.tsx` (observer). Форма = отдельный компонент `VacancyForm` с React Hook Form + Zod. Обработка `LIMIT_REACHED` через флаг `limitReached` в сторе → `UpsellModal` в дашборде.

**Tech Stack:** Next.js 15 App Router, MobX 6, React Hook Form + Zod, TailwindCSS 4, Vitest, `@/services/api`, `@/types/api`

---

## Карта файлов

**Создать:**

```
frontend/src/types/api.ts                                     -- добавить Vacancy-типы (модифицировать)
frontend/src/lib/vacancy-utils.ts                             -- labels + canPublish/Boost/Archive/Edit/Delete + formatSalary
frontend/src/stores/VacancyStore.ts                           -- MobX: fetchVacancies, fetchVacancyById, fetchMyVacancies, createVacancy, updateVacancy, publishVacancy, boostVacancy, archiveVacancy
frontend/src/stores/VacancyStore.test.ts                      -- 16 unit-тестов стора
frontend/src/stores/RootStore.ts                              -- добавить vacancy: VacancyStore (модифицировать)
frontend/src/components/vacancy/VacancyStatusBadge.tsx        -- бейдж статуса вакансии (6 статусов)
frontend/src/components/vacancy/VacancyStatusBadge.test.tsx   -- тесты
frontend/src/components/vacancy/VacancyCard.tsx               -- карточка вакансии (urgent/top/highlighted/external)
frontend/src/components/vacancy/VacancyCard.test.tsx          -- тесты
frontend/src/components/vacancy/LimitBar.tsx                  -- прогресс-бар кредитов N/M + сброс
frontend/src/components/vacancy/LimitBar.test.tsx             -- тесты
frontend/src/components/vacancy/UpsellModal.tsx               -- модал при LIMIT_REACHED
frontend/src/components/vacancy/VacancyFilters.tsx            -- панель всех фильтров (controlled)
frontend/src/components/vacancy/VacancyForm.tsx               -- форма создания/редактирования (все поля)
frontend/src/app/vacancies/page.tsx                           -- серверный: metadata
frontend/src/app/vacancies/VacanciesClient.tsx                -- клиентский: поиск + фильтры + список + пагинация
frontend/src/app/vacancies/VacanciesClient.test.tsx           -- тесты
frontend/src/app/vacancies/[id]/page.tsx                      -- серверный: metadata
frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx       -- клиентский: полная карточка + Apply / Apply on Source
frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx  -- тесты
frontend/src/app/dashboard/vacancies/page.tsx                 -- серверный
frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx    -- мои вакансии: список + publish/boost/archive + LimitBar + UpsellModal
frontend/src/app/dashboard/vacancies/MyVacanciesClient.test.tsx -- тесты
frontend/src/app/dashboard/vacancies/new/page.tsx             -- серверный
frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx -- форма создания → редирект на dashboard
frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.test.tsx
frontend/src/app/dashboard/vacancies/[id]/edit/page.tsx       -- серверный
frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx -- форма редактирования → редирект на dashboard
frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.test.tsx
```

---

## Task 1: Vacancy типы в `types/api.ts`

**Files:**

- Modify: `frontend/src/types/api.ts`

- [x] **Step 1: Добавить типы в конец файла `frontend/src/types/api.ts`**

```typescript
// --- Vacancy ---

export type VacancyStatusEnum =
  | 'draft'
  | 'moderation'
  | 'published'
  | 'rejected'
  | 'expired'
  | 'archived'

export type WorkFormatEnum = 'office' | 'remote' | 'hybrid'

export type EmploymentTypeEnum = 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance'

export type SeniorityEnum = 'intern' | 'junior' | 'middle' | 'senior' | 'lead' | 'principal'

export type SalaryCurrencyEnum = 'USD' | 'EUR' | 'RUB' | 'GBP'

export type SourceTypeEnum = 'internal' | 'external'

export interface IndustryRef {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface SpecializationRef {
  documentId: string
  slug: string
  name: { ru: string; en: string }
}

export interface VacancyCompanyRef {
  documentId: string
  name: string
  slug: string
  logo?: StrapiMedia | null
}

export interface Vacancy {
  id: number
  documentId: string
  title: string
  country: string
  city?: string | null
  workFormat: WorkFormatEnum
  employmentType: EmploymentTypeEnum
  seniority: SeniorityEnum
  salaryFrom?: number | null
  salaryTo?: number | null
  salaryCurrency?: SalaryCurrencyEnum | null
  description?: string
  responsibilities?: string
  requirements?: string
  conditions?: string | null
  skills?: string[] | null
  languages?: string[] | null
  experienceYears?: number | null
  sourceType: SourceTypeEnum
  sourceName?: string | null
  sourceUrl?: string | null
  highlighted: boolean
  urgent: boolean
  topPlacement: boolean
  views?: number
  uniqueViews?: number
  applicationsCount?: number
  status: VacancyStatusEnum
  expiresAt?: string | null
  createdAt: string
  industry: IndustryRef
  specialization: SpecializationRef
  company: VacancyCompanyRef
}

export interface VacancyListParams {
  search?: string
  industry?: string
  specialization?: string
  country?: string
  city?: string
  workFormat?: WorkFormatEnum
  employmentType?: EmploymentTypeEnum
  seniority?: SeniorityEnum
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  experienceYears?: number
  skills?: string
  languages?: string
  sourceType?: SourceTypeEnum
  urgent?: boolean
  topPlacement?: boolean
  sort?: 'newest' | 'salary_asc' | 'salary_desc' | 'relevance'
  page?: number
  pageSize?: number
  status?: VacancyStatusEnum
}

export interface VacancyCreateInput {
  title: string
  company: string
  industry: string
  specialization: string
  employmentType: EmploymentTypeEnum
  workFormat: WorkFormatEnum
  seniority: SeniorityEnum
  country: string
  city?: string
  salaryFrom?: number
  salaryTo?: number
  salaryCurrency?: SalaryCurrencyEnum
  description: string
  responsibilities: string
  requirements: string
  conditions?: string
  skills?: string[]
  languages?: string[]
  experienceYears?: number
  urgent?: boolean
}

export type VacancyUpdateInput = Partial<VacancyCreateInput>

export interface Industry {
  id: number
  documentId: string
  slug: string
  name: { ru: string; en: string }
  specializations: Specialization[]
}

export interface Specialization {
  id: number
  documentId: string
  slug: string
  name: { ru: string; en: string }
}
```

- [x] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаем: 0 ошибок.

- [x] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(frontend): add Vacancy types to api.ts"
```

---

## Task 2: `vacancy-utils.ts` — утилиты и labels

**Files:**

- Create: `frontend/src/lib/vacancy-utils.ts`

- [x] **Step 1: Создать файл `frontend/src/lib/vacancy-utils.ts`**

```typescript
import type {
  VacancyStatusEnum,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
  SalaryCurrencyEnum,
} from '@/types/api'

export const WORK_FORMAT_LABELS: Record<WorkFormatEnum, string> = {
  office: 'Офис',
  remote: 'Удалённо',
  hybrid: 'Гибрид',
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentTypeEnum, string> = {
  'full-time': 'Полная занятость',
  'part-time': 'Частичная занятость',
  contract: 'Контракт',
  internship: 'Стажировка',
  freelance: 'Фриланс',
}

export const SENIORITY_LABELS: Record<SeniorityEnum, string> = {
  intern: 'Intern',
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
  lead: 'Lead',
  principal: 'Principal',
}

export const SALARY_CURRENCY_SYMBOLS: Record<SalaryCurrencyEnum, string> = {
  USD: '$',
  EUR: '€',
  RUB: '₽',
  GBP: '£',
}

export function canPublishVacancy(status: VacancyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected' || status === 'expired'
}

export function canBoostVacancy(status: VacancyStatusEnum): boolean {
  return status === 'published'
}

export function canArchiveVacancy(status: VacancyStatusEnum): boolean {
  return status !== 'archived' && status !== 'moderation'
}

export function canEditVacancy(status: VacancyStatusEnum): boolean {
  return status !== 'archived'
}

export function canDeleteVacancy(status: VacancyStatusEnum): boolean {
  return status === 'draft' || status === 'rejected'
}

export function formatSalary(
  from?: number | null,
  to?: number | null,
  currency?: SalaryCurrencyEnum | null
): string {
  if (!from && !to) return ''
  const sym = currency ? (SALARY_CURRENCY_SYMBOLS[currency] ?? '') : ''
  if (from && to) return `${sym}${from.toLocaleString('ru')} — ${sym}${to.toLocaleString('ru')}`
  if (from) return `от ${sym}${from.toLocaleString('ru')}`
  return `до ${sym}${to!.toLocaleString('ru')}`
}
```

- [x] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаем: 0 ошибок.

- [x] **Step 3: Commit**

```bash
git add frontend/src/lib/vacancy-utils.ts
git commit -m "feat(frontend): add vacancy-utils (labels, guards, formatSalary)"
```

---

## Task 3: VacancyStore (TDD)

**Files:**

- Create: `frontend/src/stores/VacancyStore.ts`
- Create: `frontend/src/stores/VacancyStore.test.ts`

- [x] **Step 1: Написать тесты `frontend/src/stores/VacancyStore.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      public data: unknown,
      message: string
    ) {
      super(message)
      this.name = 'ApiClientError'
    }
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api, ApiClientError } from '@/services/api'
import { VacancyStore } from './VacancyStore'

const mockVacancy = {
  id: 1,
  documentId: 'vac123',
  title: 'Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote' as const,
  employmentType: 'full-time' as const,
  seniority: 'middle' as const,
  salaryFrom: 150000,
  salaryTo: 200000,
  salaryCurrency: 'RUB' as const,
  sourceType: 'internal' as const,
  highlighted: false,
  urgent: false,
  topPlacement: false,
  status: 'draft' as const,
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'ind1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: { documentId: 'sp1', slug: 'frontend', name: { ru: 'Frontend', en: 'Frontend' } },
  company: { documentId: 'comp1', name: 'Acme', slug: 'acme', logo: null },
}

const mockListResponse = {
  data: [mockVacancy],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('VacancyStore', () => {
  let store: VacancyStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new VacancyStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.vacancies).toEqual([])
    expect(store.myVacancies).toEqual([])
    expect(store.currentVacancy).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.limitReached).toBe(false)
    expect(store.boostsRemaining).toBeNull()
  })

  describe('fetchVacancies', () => {
    it('заполняет vacancies и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchVacancies()
      expect(store.vacancies).toEqual([mockVacancy])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('передаёт параметры search и country в URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchVacancies({ search: 'React', country: 'RU' })
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('search=React')
      expect(url).toContain('country=RU')
    })

    it('устанавливает error при сетевой ошибке', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchVacancies()
      expect(store.error).toBe('Network error')
      expect(store.vacancies).toEqual([])
    })
  })

  describe('fetchMyVacancies', () => {
    it('заполняет myVacancies из /vacancies/my', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchMyVacancies()
      expect(store.myVacancies).toEqual([mockVacancy])
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('/vacancies/my')
    })

    it('передаёт status-фильтр если указан', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchMyVacancies({ status: 'published' })
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('status=published')
    })
  })

  describe('fetchVacancyById', () => {
    it('устанавливает currentVacancy из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockVacancy })
      await store.fetchVacancyById('vac123')
      expect(store.currentVacancy).toEqual(mockVacancy)
    })

    it('сбрасывает currentVacancy перед запросом', async () => {
      store.currentVacancy = mockVacancy
      vi.mocked(api.get).mockResolvedValue({ data: mockVacancy })
      const p = store.fetchVacancyById('vac123')
      expect(store.currentVacancy).toBeNull()
      await p
    })
  })

  describe('createVacancy', () => {
    it('добавляет вакансию в начало myVacancies и возвращает её', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockVacancy })
      const result = await store.createVacancy({
        title: 'Frontend Developer',
        company: 'comp1',
        industry: 'ind1',
        specialization: 'sp1',
        employmentType: 'full-time',
        workFormat: 'remote',
        seniority: 'middle',
        country: 'RU',
        description: 'desc',
        responsibilities: 'resp',
        requirements: 'req',
      })
      expect(store.myVacancies[0]).toEqual(mockVacancy)
      expect(result).toEqual(mockVacancy)
    })

    it('выбрасывает ошибку при неудаче', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Validation error'))
      await expect(
        store.createVacancy({
          title: '',
          company: '',
          industry: '',
          specialization: '',
          employmentType: 'full-time',
          workFormat: 'remote',
          seniority: 'middle',
          country: '',
          description: '',
          responsibilities: '',
          requirements: '',
        })
      ).rejects.toThrow('Validation error')
      expect(store.error).toBe('Validation error')
    })
  })

  describe('updateVacancy', () => {
    it('обновляет вакансию в myVacancies по documentId', async () => {
      store.myVacancies = [mockVacancy]
      const updated = { ...mockVacancy, title: 'Updated Title' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })
      await store.updateVacancy('vac123', { title: 'Updated Title' })
      expect(store.myVacancies[0]?.title).toBe('Updated Title')
    })
  })

  describe('publishVacancy', () => {
    it('вызывает POST /vacancies/:id/publish', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { ...mockVacancy, status: 'moderation' } })
      await store.publishVacancy('vac123')
      expect(api.post).toHaveBeenCalledWith('/vacancies/vac123/publish', {})
    })

    it('устанавливает limitReached при 403 LIMIT_REACHED', async () => {
      const err = new ApiClientError(403, { error: { code: 'LIMIT_REACHED' } }, 'Limit reached')
      vi.mocked(api.post).mockRejectedValue(err)
      await store.publishVacancy('vac123')
      expect(store.limitReached).toBe(true)
      expect(store.error).toBeNull()
    })

    it('пробрасывает прочие ошибки', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.publishVacancy('vac123')).rejects.toThrow('Server error')
    })
  })

  describe('boostVacancy', () => {
    it('обновляет boostsRemaining', async () => {
      vi.mocked(api.post).mockResolvedValue({ success: true, boostsRemaining: 4 })
      await store.boostVacancy('vac123')
      expect(store.boostsRemaining).toBe(4)
    })
  })

  describe('archiveVacancy', () => {
    it('убирает вакансию из myVacancies', async () => {
      store.myVacancies = [mockVacancy]
      vi.mocked(api.post).mockResolvedValue({})
      await store.archiveVacancy('vac123')
      expect(store.myVacancies).toEqual([])
    })
  })

  describe('clearLimitReached', () => {
    it('сбрасывает limitReached в false', () => {
      store.limitReached = true
      store.clearLimitReached()
      expect(store.limitReached).toBe(false)
    })
  })

  it('pageCount вычисляется как ceil(total / pageSize)', () => {
    store.total = 45
    store.pageSize = 20
    expect(store.pageCount).toBe(3)
  })
})
```

- [x] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test VacancyStore
```

Ожидаем: FAIL — `VacancyStore` не существует.

- [x] **Step 3: Создать `frontend/src/stores/VacancyStore.ts`**

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import { api, ApiClientError } from '@/services/api'
import type {
  Vacancy,
  VacancyListParams,
  VacancyCreateInput,
  VacancyUpdateInput,
  VacancyStatusEnum,
} from '@/types/api'

type ListMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class VacancyStore {
  vacancies: Vacancy[] = []
  myVacancies: Vacancy[] = []
  currentVacancy: Vacancy | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  limitReached = false
  boostsRemaining: number | null = null

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchVacancies(params: VacancyListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const q = new URLSearchParams()
      const entries = Object.entries(params) as [string, string | number | boolean | undefined][]
      for (const [k, v] of entries) {
        if (v !== undefined && v !== '') q.set(k, String(v))
      }
      const qs = q.toString()
      const res = await api.get<{ data: Vacancy[]; meta: ListMeta }>(
        `/vacancies${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.vacancies = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyVacancies(
    params: { page?: number; status?: VacancyStatusEnum } = {}
  ): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const q = new URLSearchParams()
      q.set('page', String(params.page ?? 1))
      q.set('pageSize', String(this.pageSize))
      if (params.status) q.set('status', params.status)
      const res = await api.get<{ data: Vacancy[]; meta: ListMeta }>(
        `/vacancies/my?${q.toString()}`
      )
      runInAction(() => {
        this.myVacancies = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my vacancies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentVacancy = null
    })
    try {
      const res = await api.get<{ data: Vacancy }>(`/vacancies/${id}`)
      runInAction(() => {
        this.currentVacancy = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createVacancy(data: VacancyCreateInput): Promise<Vacancy> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>('/vacancies', data)
      runInAction(() => {
        this.myVacancies.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateVacancy(id: string, data: VacancyUpdateInput): Promise<Vacancy> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Vacancy }>(`/vacancies/${id}`, data)
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
        if (this.currentVacancy?.documentId === id) this.currentVacancy = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async publishVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Vacancy }>(`/vacancies/${id}/publish`, {})
      runInAction(() => {
        const idx = this.myVacancies.findIndex((v) => v.documentId === id)
        if (idx !== -1) this.myVacancies[idx] = res.data
      })
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } }
        if (body?.error?.code === 'LIMIT_REACHED') {
          runInAction(() => {
            this.limitReached = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to publish vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async boostVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ success: boolean; boostsRemaining: number }>(
        `/vacancies/${id}/boost`,
        {}
      )
      runInAction(() => {
        this.boostsRemaining = res.boostsRemaining
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to boost vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async archiveVacancy(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.post(`/vacancies/${id}/archive`, {})
      runInAction(() => {
        this.myVacancies = this.myVacancies.filter((v) => v.documentId !== id)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to archive vacancy'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearLimitReached(): void {
    this.limitReached = false
  }
}
```

- [x] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd frontend && pnpm test VacancyStore
```

Ожидаем: все 16 тестов PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/stores/VacancyStore.ts frontend/src/stores/VacancyStore.test.ts
git commit -m "feat(frontend): add VacancyStore with 16 passing tests"
```

---

## Task 4: Добавить VacancyStore в RootStore

**Files:**

- Modify: `frontend/src/stores/RootStore.ts`

- [x] **Step 1: Обновить `frontend/src/stores/RootStore.ts`**

```typescript
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
  }
}

export const rootStore = new RootStore()
```

- [x] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаем: 0 ошибок.

- [x] **Step 3: Commit**

```bash
git add frontend/src/stores/RootStore.ts
git commit -m "feat(frontend): add VacancyStore to RootStore"
```

---

## Task 5: VacancyStatusBadge

**Files:**

- Create: `frontend/src/components/vacancy/VacancyStatusBadge.tsx`
- Create: `frontend/src/components/vacancy/VacancyStatusBadge.test.tsx`

- [x] **Step 1: Написать тест `frontend/src/components/vacancy/VacancyStatusBadge.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacancyStatusBadge } from './VacancyStatusBadge'

describe('VacancyStatusBadge', () => {
  it('отображает "Черновик" для draft', () => {
    render(<VacancyStatusBadge status="draft" />)
    expect(screen.getByText('Черновик')).toBeTruthy()
  })

  it('отображает "На модерации" для moderation', () => {
    render(<VacancyStatusBadge status="moderation" />)
    expect(screen.getByText('На модерации')).toBeTruthy()
  })

  it('отображает "Опубликована" для published', () => {
    render(<VacancyStatusBadge status="published" />)
    expect(screen.getByText('Опубликована')).toBeTruthy()
  })

  it('отображает "Отклонена" для rejected', () => {
    render(<VacancyStatusBadge status="rejected" />)
    expect(screen.getByText('Отклонена')).toBeTruthy()
  })

  it('отображает "Истекла" для expired', () => {
    render(<VacancyStatusBadge status="expired" />)
    expect(screen.getByText('Истекла')).toBeTruthy()
  })

  it('отображает "В архиве" для archived', () => {
    render(<VacancyStatusBadge status="archived" />)
    expect(screen.getByText('В архиве')).toBeTruthy()
  })
})
```

- [x] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test VacancyStatusBadge
```

- [x] **Step 3: Создать `frontend/src/components/vacancy/VacancyStatusBadge.tsx`**

```typescript
import type { VacancyStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<VacancyStatusEnum, { label: string; className: string }> = {
  draft:      { label: 'Черновик',      className: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published:  { label: 'Опубликована', className: 'bg-green-100 text-green-700' },
  rejected:   { label: 'Отклонена',   className: 'bg-red-100 text-red-700' },
  expired:    { label: 'Истекла',     className: 'bg-orange-100 text-orange-700' },
  archived:   { label: 'В архиве',    className: 'bg-gray-100 text-gray-500' },
}

interface Props {
  status: VacancyStatusEnum
}

export function VacancyStatusBadge({ status }: Props) {
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

- [x] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test VacancyStatusBadge
```

Ожидаем: 6 тестов PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/vacancy/VacancyStatusBadge.tsx frontend/src/components/vacancy/VacancyStatusBadge.test.tsx
git commit -m "feat(frontend): add VacancyStatusBadge component"
```

---

## Task 6: VacancyCard

**Files:**

- Create: `frontend/src/components/vacancy/VacancyCard.tsx`
- Create: `frontend/src/components/vacancy/VacancyCard.test.tsx`

- [x] **Step 1: Написать тест `frontend/src/components/vacancy/VacancyCard.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacancyCard } from './VacancyCard'
import type { Vacancy } from '@/types/api'

const base: Vacancy = {
  id: 1,
  documentId: 'vac1',
  title: 'Frontend Developer',
  country: 'RU',
  city: 'Москва',
  workFormat: 'remote',
  employmentType: 'full-time',
  seniority: 'middle',
  salaryFrom: 150000,
  salaryTo: 200000,
  salaryCurrency: 'RUB',
  sourceType: 'internal',
  highlighted: false,
  urgent: false,
  topPlacement: false,
  status: 'published',
  expiresAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'i1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: { documentId: 's1', slug: 'frontend', name: { ru: 'Frontend', en: 'Frontend' } },
  company: { documentId: 'c1', name: 'Acme Corp', slug: 'acme', logo: null },
}

describe('VacancyCard', () => {
  it('отображает заголовок и компанию', () => {
    render(<VacancyCard vacancy={base} />)
    expect(screen.getByText('Frontend Developer')).toBeTruthy()
    expect(screen.getByText('Acme Corp')).toBeTruthy()
  })

  it('показывает зарплату', () => {
    render(<VacancyCard vacancy={base} />)
    expect(screen.getByText(/150/)).toBeTruthy()
  })

  it('показывает бейдж 🔥 для urgent', () => {
    render(<VacancyCard vacancy={{ ...base, urgent: true }} />)
    expect(screen.getByText(/Срочно/)).toBeTruthy()
  })

  it('показывает бейдж ⭐ для topPlacement', () => {
    render(<VacancyCard vacancy={{ ...base, topPlacement: true }} />)
    expect(screen.getByText(/TOP/)).toBeTruthy()
  })

  it('для external показывает "Внешняя"', () => {
    render(<VacancyCard vacancy={{ ...base, sourceType: 'external' }} />)
    expect(screen.getByText(/Внешняя/)).toBeTruthy()
  })

  it('ссылка ведёт на /vacancies/:documentId', () => {
    const { container } = render(<VacancyCard vacancy={base} />)
    const link = container.querySelector('a')
    expect(link?.getAttribute('href')).toBe('/vacancies/vac1')
  })
})
```

- [x] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test VacancyCard
```

- [x] **Step 3: Создать `frontend/src/components/vacancy/VacancyCard.tsx`**

```typescript
import Link from 'next/link'
import Image from 'next/image'
import type { Vacancy } from '@/types/api'
import { getMediaUrl } from '@/lib/media'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
  formatSalary,
} from '@/lib/vacancy-utils'

interface Props {
  vacancy: Vacancy
}

export function VacancyCard({ vacancy }: Props) {
  const logoUrl = getMediaUrl(vacancy.company.logo?.url)
  const salary = formatSalary(vacancy.salaryFrom, vacancy.salaryTo, vacancy.salaryCurrency)

  const highlightClass = vacancy.highlighted
    ? 'border-blue-300 bg-blue-50'
    : 'border-gray-200 bg-white'

  return (
    <Link href={`/vacancies/${vacancy.documentId}`} className="block">
      <div
        className={`rounded-xl border p-4 transition hover:border-gray-300 hover:shadow-sm ${highlightClass}`}
      >
        {/* Badges row */}
        <div className="mb-2 flex flex-wrap gap-1">
          {vacancy.topPlacement && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700">
              ⭐ TOP
            </span>
          )}
          {vacancy.urgent && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
              🔥 Срочно
            </span>
          )}
          {vacancy.sourceType === 'external' && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              Внешняя
            </span>
          )}
        </div>

        {/* Company + logo */}
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
            {logoUrl ? (
              <Image src={logoUrl} alt={vacancy.company.name} width={32} height={32} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-gray-400">
                {vacancy.company.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <span className="text-sm text-gray-500">{vacancy.company.name}</span>
        </div>

        {/* Title */}
        <p className="font-semibold text-gray-900">{vacancy.title}</p>

        {/* Tags */}
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-500">
          <span>{vacancy.industry.name.ru}</span>
          <span>{SENIORITY_LABELS[vacancy.seniority]}</span>
          <span>{WORK_FORMAT_LABELS[vacancy.workFormat]}</span>
          <span>{EMPLOYMENT_TYPE_LABELS[vacancy.employmentType]}</span>
          {vacancy.country && <span>{vacancy.country}{vacancy.city ? `, ${vacancy.city}` : ''}</span>}
        </div>

        {/* Salary */}
        {salary && (
          <p className="mt-2 text-sm font-medium text-gray-700">{salary}</p>
        )}
      </div>
    </Link>
  )
}
```

- [x] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test VacancyCard
```

Ожидаем: 6 тестов PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/vacancy/VacancyCard.tsx frontend/src/components/vacancy/VacancyCard.test.tsx
git commit -m "feat(frontend): add VacancyCard component"
```

---

## Task 7: LimitBar

**Files:**

- Create: `frontend/src/components/vacancy/LimitBar.tsx`
- Create: `frontend/src/components/vacancy/LimitBar.test.tsx`

- [x] **Step 1: Написать тест `frontend/src/components/vacancy/LimitBar.test.tsx`**

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LimitBar } from './LimitBar'

describe('LimitBar', () => {
  it('отображает N/M из использованных', () => {
    render(<LimitBar used={2} limit={3} />)
    expect(screen.getByText(/2.*3/)).toBeTruthy()
  })

  it('прогресс 100% при used === limit', () => {
    const { container } = render(<LimitBar used={3} limit={3} />)
    const bar = container.querySelector('[data-progress]')
    expect(bar?.getAttribute('data-progress')).toBe('100')
  })

  it('отображает дату сброса если передана', () => {
    render(<LimitBar used={1} limit={3} resetAt="2026-07-01T00:00:00Z" />)
    expect(screen.getByText(/сбросится/i)).toBeTruthy()
  })

  it('не отображает дату сброса если не передана', () => {
    render(<LimitBar used={1} limit={3} />)
    expect(screen.queryByText(/сбросится/i)).toBeNull()
  })
})
```

- [x] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test LimitBar
```

- [x] **Step 3: Создать `frontend/src/components/vacancy/LimitBar.tsx`**

```typescript
interface Props {
  used: number
  limit: number
  resetAt?: string
}

export function LimitBar({ used, limit, resetAt }: Props) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0
  const isFull = used >= limit

  const resetDate = resetAt
    ? new Date(resetAt).toLocaleDateString('ru', { day: 'numeric', month: 'long' })
    : null

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={isFull ? 'font-medium text-red-600' : 'text-gray-600'}>
          Вакансий: {used} / {limit}
        </span>
        {resetDate && (
          <span className="text-xs text-gray-400">сбросится {resetDate}</span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          data-progress={pct}
          className={`h-full rounded-full transition-all ${isFull ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [x] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test LimitBar
```

Ожидаем: 4 теста PASS.

- [x] **Step 5: Commit**

```bash
git add frontend/src/components/vacancy/LimitBar.tsx frontend/src/components/vacancy/LimitBar.test.tsx
git commit -m "feat(frontend): add LimitBar component"
```

---

## Task 8: UpsellModal

**Files:**

- Create: `frontend/src/components/vacancy/UpsellModal.tsx`

- [x] **Step 1: Создать `frontend/src/components/vacancy/UpsellModal.tsx`**

```typescript
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface Props {
  onClose: () => void
}

export function UpsellModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900">Лимит исчерпан</h2>
        <p className="mt-2 text-sm text-gray-600">
          Вы достигли месячного лимита публикации вакансий. Обновите план, чтобы публиковать больше.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/subscription" onClick={onClose}>
            <Button className="w-full">Обновить план</Button>
          </Link>
          <Button variant="outline" className="w-full" onClick={onClose}>
            Закрыть
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/vacancy/UpsellModal.tsx
git commit -m "feat(frontend): add UpsellModal component"
```

---

## Task 9: VacancyFilters

**Files:**

- Create: `frontend/src/components/vacancy/VacancyFilters.tsx`

- [x] **Step 1: Создать `frontend/src/components/vacancy/VacancyFilters.tsx`**

Это controlled-компонент: родитель управляет состоянием через `value` / `onChange`.

```typescript
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
} from '@/lib/vacancy-utils'
import type {
  VacancyListParams,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
} from '@/types/api'

interface Props {
  value: VacancyListParams
  onChange: (params: VacancyListParams) => void
  onSearch: () => void
}

export function VacancyFilters({ value, onChange, onSearch }: Props) {
  const set = (patch: Partial<VacancyListParams>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-4">
      {/* Полнотекстовый поиск */}
      <div>
        <Label htmlFor="vf-search">Поиск</Label>
        <Input
          id="vf-search"
          value={value.search ?? ''}
          onChange={(e) => set({ search: e.target.value })}
          placeholder="Должность, навыки..."
          className="mt-1"
        />
      </div>

      {/* Страна / Город */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="vf-country">Страна</Label>
          <Input
            id="vf-country"
            value={value.country ?? ''}
            onChange={(e) => set({ country: e.target.value })}
            placeholder="RU"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-city">Город</Label>
          <Input
            id="vf-city"
            value={value.city ?? ''}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Москва"
            className="mt-1"
          />
        </div>
      </div>

      {/* Формат работы */}
      <div>
        <Label htmlFor="vf-format">Формат</Label>
        <select
          id="vf-format"
          value={value.workFormat ?? ''}
          onChange={(e) => set({ workFormat: (e.target.value as WorkFormatEnum) || undefined })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Любой</option>
          {(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Тип занятости */}
      <div>
        <Label htmlFor="vf-employment">Тип занятости</Label>
        <select
          id="vf-employment"
          value={value.employmentType ?? ''}
          onChange={(e) => set({ employmentType: (e.target.value as EmploymentTypeEnum) || undefined })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Любой</option>
          {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Уровень */}
      <div>
        <Label htmlFor="vf-seniority">Уровень</Label>
        <select
          id="vf-seniority"
          value={value.seniority ?? ''}
          onChange={(e) => set({ seniority: (e.target.value as SeniorityEnum) || undefined })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Любой</option>
          {(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Зарплата */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label htmlFor="vf-salary-from">Зарплата от</Label>
          <Input
            id="vf-salary-from"
            type="number"
            value={value.salaryFrom ?? ''}
            onChange={(e) => set({ salaryFrom: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="100000"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="vf-salary-to">До</Label>
          <Input
            id="vf-salary-to"
            type="number"
            value={value.salaryTo ?? ''}
            onChange={(e) => set({ salaryTo: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="200000"
            className="mt-1"
          />
        </div>
      </div>

      {/* Сортировка */}
      <div>
        <Label htmlFor="vf-sort">Сортировка</Label>
        <select
          id="vf-sort"
          value={value.sort ?? 'relevance'}
          onChange={(e) => set({ sort: e.target.value as VacancyListParams['sort'] })}
          className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="relevance">По релевантности</option>
          <option value="newest">Сначала новые</option>
          <option value="salary_desc">Зарплата ↓</option>
          <option value="salary_asc">Зарплата ↑</option>
        </select>
      </div>

      <Button className="w-full" onClick={onSearch}>
        Найти
      </Button>
    </div>
  )
}
```

- [x] **Step 2: Commit**

```bash
git add frontend/src/components/vacancy/VacancyFilters.tsx
git commit -m "feat(frontend): add VacancyFilters controlled component"
```

---

## Task 10: Публичный список вакансий `/vacancies`

**Files:**

- Create: `frontend/src/app/vacancies/page.tsx`
- Create: `frontend/src/app/vacancies/VacanciesClient.tsx`
- Create: `frontend/src/app/vacancies/VacanciesClient.test.tsx`

- [x] **Step 1: Написать тест `frontend/src/app/vacancies/VacanciesClient.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacanciesClient } from './VacanciesClient'

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: {
      vacancies: [],
      isLoading: false,
      error: null,
      total: 0,
      page: 1,
      pageSize: 20,
      pageCount: 0,
      fetchVacancies: vi.fn(),
    },
  }),
}))

describe('VacanciesClient', () => {
  it('показывает сообщение если список пуст', () => {
    render(<VacanciesClient />)
    expect(screen.getByText(/не найдено/i)).toBeTruthy()
  })

  it('показывает спиннер при загрузке', () => {
    vi.mocked(require('@/stores/StoreProvider').useStores).mockReturnValue({
      vacancy: {
        vacancies: [], isLoading: true, error: null,
        total: 0, page: 1, pageSize: 20, pageCount: 0,
        fetchVacancies: vi.fn(),
      },
    })
    render(<VacanciesClient />)
    expect(screen.getByText(/загрузка/i)).toBeTruthy()
  })
})
```

- [x] **Step 2: Создать `frontend/src/app/vacancies/VacanciesClient.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { VacancyFilters } from '@/components/vacancy/VacancyFilters'
import { Button } from '@/components/ui/button'
import type { VacancyListParams } from '@/types/api'

export const VacanciesClient = observer(function VacanciesClient() {
  const { vacancy: store } = useStores()
  const [filters, setFilters] = useState<VacancyListParams>({ sort: 'relevance' })

  useEffect(() => {
    void store.fetchVacancies({ page: 1 })
  }, [store])

  const handleSearch = () => {
    void store.fetchVacancies({ ...filters, page: 1 })
  }

  const handlePage = (page: number) => {
    void store.fetchVacancies({ ...filters, page })
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      {/* Filters sidebar */}
      <aside className="w-full lg:w-64 shrink-0">
        <VacancyFilters value={filters} onChange={setFilters} onSearch={handleSearch} />
      </aside>

      {/* Results */}
      <div className="flex-1 space-y-4">
        {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

        {store.error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {store.error}
          </p>
        )}

        {!store.isLoading && store.vacancies.length === 0 && !store.error && (
          <p className="text-sm text-muted-foreground">Вакансии не найдены.</p>
        )}

        <div className="space-y-3">
          {store.vacancies.map((v) => (
            <VacancyCard key={v.documentId} vacancy={v} />
          ))}
        </div>

        {store.pageCount > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={store.page <= 1} onClick={() => handlePage(store.page - 1)}>
              ← Назад
            </Button>
            <span className="text-sm text-muted-foreground">{store.page} / {store.pageCount}</span>
            <Button variant="outline" size="sm" disabled={store.page >= store.pageCount} onClick={() => handlePage(store.page + 1)}>
              Вперёд →
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})
```

- [x] **Step 3: Создать `frontend/src/app/vacancies/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { VacanciesClient } from './VacanciesClient'

export const metadata: Metadata = {
  title: 'Вакансии | GramJob',
  description: 'Поиск вакансий на платформе GramJob',
}

export default function VacanciesPage() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Вакансии</h1>
      <VacanciesClient />
    </div>
  )
}
```

- [x] **Step 4: Запустить тесты**

```bash
cd frontend && pnpm test VacanciesClient && pnpm typecheck
```

- [x] **Step 5: Commit**

```bash
git add frontend/src/app/vacancies/
git commit -m "feat(frontend): add public vacancies list page with filters"
```

---

## Task 11: Карточка вакансии `/vacancies/[id]`

**Files:**

- Create: `frontend/src/app/vacancies/[id]/page.tsx`
- Create: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`
- Create: `frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx`

- [x] **Step 1: Написать тест `frontend/src/app/vacancies/[id]/VacancyDetailClient.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VacancyDetailClient } from './VacancyDetailClient'

const mockVacancy = {
  id: 1, documentId: 'vac1', title: 'Backend Developer',
  country: 'RU', city: null, workFormat: 'remote' as const,
  employmentType: 'full-time' as const, seniority: 'senior' as const,
  salaryFrom: null, salaryTo: null, salaryCurrency: null,
  description: '<p>Описание вакансии</p>',
  responsibilities: '<p>Обязанности</p>',
  requirements: '<p>Требования</p>',
  conditions: null, skills: ['Go', 'PostgreSQL'], languages: null,
  experienceYears: 3, sourceType: 'internal' as const,
  sourceName: null, sourceUrl: null,
  highlighted: false, urgent: false, topPlacement: false,
  views: 42, uniqueViews: 30, applicationsCount: 5,
  status: 'published' as const, expiresAt: null,
  createdAt: '2026-01-01T00:00:00Z',
  industry: { documentId: 'i1', slug: 'it', name: { ru: 'IT', en: 'IT' } },
  specialization: { documentId: 's1', slug: 'backend', name: { ru: 'Backend', en: 'Backend' } },
  company: { documentId: 'c1', name: 'Acme', slug: 'acme', logo: null },
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: {
      currentVacancy: mockVacancy,
      isLoading: false,
      error: null,
      fetchVacancyById: vi.fn(),
    },
  }),
}))

describe('VacancyDetailClient', () => {
  it('отображает заголовок вакансии', () => {
    render(<VacancyDetailClient id="vac1" />)
    expect(screen.getByText('Backend Developer')).toBeTruthy()
  })

  it('отображает название компании', () => {
    render(<VacancyDetailClient id="vac1" />)
    expect(screen.getByText('Acme')).toBeTruthy()
  })

  it('показывает кнопку "Откликнуться" для internal', () => {
    render(<VacancyDetailClient id="vac1" />)
    expect(screen.getByText(/Откликнуться/)).toBeTruthy()
  })

  it('показывает "Откликнуться на сайте" для external с sourceUrl', () => {
    vi.mocked(require('@/stores/StoreProvider').useStores).mockReturnValue({
      vacancy: {
        currentVacancy: { ...mockVacancy, sourceType: 'external', sourceUrl: 'https://example.com' },
        isLoading: false, error: null, fetchVacancyById: vi.fn(),
      },
    })
    render(<VacancyDetailClient id="vac1" />)
    expect(screen.getByText(/Откликнуться на сайте/)).toBeTruthy()
  })
})
```

- [x] **Step 2: Создать `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { Button } from '@/components/ui/button'
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
  const { vacancy: store } = useStores()

  useEffect(() => {
    void store.fetchVacancyById(id)
  }, [store, id])

  if (store.isLoading) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  if (store.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {store.error}
      </p>
    )
  }

  const v = store.currentVacancy
  if (!v) return null

  const salary = formatSalary(v.salaryFrom, v.salaryTo, v.salaryCurrency)

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">{v.company.name}</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900">{v.title}</h1>
          </div>
          <VacancyStatusBadge status={v.status} />
        </div>

        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
          <span>{v.industry.name.ru} · {v.specialization.name.ru}</span>
          <span>{SENIORITY_LABELS[v.seniority]}</span>
          <span>{WORK_FORMAT_LABELS[v.workFormat]}</span>
          <span>{EMPLOYMENT_TYPE_LABELS[v.employmentType]}</span>
          <span>{v.country}{v.city ? `, ${v.city}` : ''}</span>
          {v.experienceYears && <span>Опыт {v.experienceYears}+ лет</span>}
        </div>

        {salary && <p className="mt-3 text-lg font-semibold text-gray-800">{salary}</p>}

        <div className="mt-4 flex gap-2 text-xs text-gray-400">
          <span>{v.views ?? 0} просмотров</span>
          <span>·</span>
          <span>{v.applicationsCount ?? 0} откликов</span>
        </div>

        {/* CTA */}
        <div className="mt-6">
          {v.sourceType === 'external' && v.sourceUrl ? (
            <a href={v.sourceUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full sm:w-auto">Откликнуться на сайте →</Button>
            </a>
          ) : (
            <Button className="w-full sm:w-auto" disabled>
              Откликнуться <span className="ml-1 text-xs opacity-60">(Sprint 4)</span>
            </Button>
          )}
        </div>
      </div>

      {/* Skills */}
      {v.skills && v.skills.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Навыки</h2>
          <div className="flex flex-wrap gap-2">
            {v.skills.map((s) => (
              <span key={s} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {v.description && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Описание</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: v.description }}
          />
        </section>
      )}

      {/* Responsibilities */}
      {v.responsibilities && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Обязанности</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: v.responsibilities }}
          />
        </section>
      )}

      {/* Requirements */}
      {v.requirements && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Требования</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: v.requirements }}
          />
        </section>
      )}

      {/* Conditions */}
      {v.conditions && (
        <section className="rounded-xl border border-gray-200 bg-white p-6">
          <h2 className="mb-3 font-semibold">Условия</h2>
          <div
            className="prose prose-sm max-w-none text-gray-700"
            dangerouslySetInnerHTML={{ __html: v.conditions }}
          />
        </section>
      )}

      <div className="text-center">
        <Link href="/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Все вакансии
        </Link>
      </div>
    </div>
  )
})
```

- [x] **Step 3: Создать `frontend/src/app/vacancies/[id]/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { VacancyDetailClient } from './VacancyDetailClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Вакансия | GramJob',
}

export default async function VacancyDetailPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto px-4 py-8">
      <VacancyDetailClient id={id} />
    </div>
  )
}
```

- [x] **Step 4: Запустить тесты**

```bash
cd frontend && pnpm test VacancyDetailClient && pnpm typecheck
```

- [x] **Step 5: Commit**

```bash
git add frontend/src/app/vacancies/[id]/
git commit -m "feat(frontend): add vacancy detail page"
```

---

## Task 12: VacancyForm

**Files:**

- Create: `frontend/src/components/vacancy/VacancyForm.tsx`

Форма создания/редактирования вакансии. Загружает отрасли (industries) через прямой API-вызов, компании берёт из `CompanyStore.myCompanies`.

- [x] **Step 1: Создать `frontend/src/components/vacancy/VacancyForm.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  WORK_FORMAT_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  SENIORITY_LABELS,
} from '@/lib/vacancy-utils'
import type {
  VacancyCreateInput,
  Industry,
  Specialization,
  Company,
  WorkFormatEnum,
  EmploymentTypeEnum,
  SeniorityEnum,
  SalaryCurrencyEnum,
} from '@/types/api'
import { api } from '@/services/api'

const schema = z.object({
  title: z.string().min(1, 'Название обязательно'),
  company: z.string().min(1, 'Компания обязательна'),
  industry: z.string().min(1, 'Отрасль обязательна'),
  specialization: z.string().min(1, 'Специализация обязательна'),
  workFormat: z.enum(['office', 'remote', 'hybrid']),
  employmentType: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']),
  seniority: z.enum(['intern', 'junior', 'middle', 'senior', 'lead', 'principal']),
  country: z.string().min(1, 'Страна обязательна'),
  city: z.string().optional().default(''),
  salaryFrom: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  salaryTo: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().positive().optional()
  ),
  salaryCurrency: z.enum(['USD', 'EUR', 'RUB', 'GBP']).optional(),
  description: z.string().min(1, 'Описание обязательно'),
  responsibilities: z.string().min(1, 'Обязанности обязательны'),
  requirements: z.string().min(1, 'Требования обязательны'),
  conditions: z.string().optional().default(''),
  skills: z.string().optional().default(''),
  languages: z.string().optional().default(''),
  experienceYears: z.preprocess(
    (v) => (v === '' || v === undefined ? undefined : Number(v)),
    z.number().int().nonnegative().optional()
  ),
  urgent: z.boolean().default(false),
})

type FormData = z.infer<typeof schema>

interface Props {
  myCompanies: Company[]
  defaultValues?: Partial<VacancyCreateInput>
  isLoading?: boolean
  onSubmit: (data: VacancyCreateInput) => void | Promise<void>
}

export function VacancyForm({ myCompanies, defaultValues, isLoading, onSubmit }: Props) {
  const [industries, setIndustries] = useState<Industry[]>([])
  const [specializations, setSpecializations] = useState<Specialization[]>([])

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: defaultValues?.title ?? '',
      company: defaultValues?.company ?? (myCompanies[0]?.documentId ?? ''),
      industry: defaultValues?.industry ?? '',
      specialization: defaultValues?.specialization ?? '',
      workFormat: (defaultValues?.workFormat as WorkFormatEnum) ?? 'remote',
      employmentType: (defaultValues?.employmentType as EmploymentTypeEnum) ?? 'full-time',
      seniority: (defaultValues?.seniority as SeniorityEnum) ?? 'middle',
      country: defaultValues?.country ?? 'RU',
      city: defaultValues?.city ?? '',
      salaryFrom: defaultValues?.salaryFrom,
      salaryTo: defaultValues?.salaryTo,
      salaryCurrency: (defaultValues?.salaryCurrency as SalaryCurrencyEnum) ?? 'RUB',
      description: defaultValues?.description ?? '',
      responsibilities: defaultValues?.responsibilities ?? '',
      requirements: defaultValues?.requirements ?? '',
      conditions: defaultValues?.conditions ?? '',
      skills: defaultValues?.skills?.join(', ') ?? '',
      languages: defaultValues?.languages?.join(', ') ?? '',
      experienceYears: defaultValues?.experienceYears,
      urgent: defaultValues?.urgent ?? false,
    },
  })

  const selectedIndustry = watch('industry')

  useEffect(() => {
    void api
      .get<{ data: Industry[] }>('/industries')
      .then((res) => setIndustries(res.data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const ind = industries.find((i) => i.documentId === selectedIndustry)
    setSpecializations(ind?.specializations ?? [])
  }, [selectedIndustry, industries])

  const handleFormSubmit = (data: FormData) => {
    const input: VacancyCreateInput = {
      title: data.title,
      company: data.company,
      industry: data.industry,
      specialization: data.specialization,
      workFormat: data.workFormat,
      employmentType: data.employmentType,
      seniority: data.seniority,
      country: data.country,
      city: data.city || undefined,
      salaryFrom: data.salaryFrom,
      salaryTo: data.salaryTo,
      salaryCurrency: data.salaryCurrency,
      description: data.description,
      responsibilities: data.responsibilities,
      requirements: data.requirements,
      conditions: data.conditions || undefined,
      skills: data.skills ? data.skills.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      languages: data.languages ? data.languages.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      experienceYears: data.experienceYears,
      urgent: data.urgent,
    }
    void onSubmit(input)
  }

  const textareaClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring'

  const selectClass =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Название */}
      <div className="space-y-1">
        <Label htmlFor="title">Название вакансии *</Label>
        <Input id="title" {...register('title')} placeholder="Frontend Developer" />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Компания */}
      <div className="space-y-1">
        <Label htmlFor="company">Компания *</Label>
        <select id="company" {...register('company')} className={selectClass}>
          <option value="">Выберите компанию</option>
          {myCompanies
            .filter((c) => c.status === 'published')
            .map((c) => (
              <option key={c.documentId} value={c.documentId}>{c.name}</option>
            ))}
        </select>
        {errors.company && <p className="text-xs text-destructive">{errors.company.message}</p>}
      </div>

      {/* Отрасль */}
      <div className="space-y-1">
        <Label htmlFor="industry">Отрасль *</Label>
        <select id="industry" {...register('industry')} className={selectClass}>
          <option value="">Выберите отрасль</option>
          {industries.map((i) => (
            <option key={i.documentId} value={i.documentId}>{i.name.ru}</option>
          ))}
        </select>
        {errors.industry && <p className="text-xs text-destructive">{errors.industry.message}</p>}
      </div>

      {/* Специализация */}
      <div className="space-y-1">
        <Label htmlFor="specialization">Специализация *</Label>
        <select id="specialization" {...register('specialization')} className={selectClass} disabled={!selectedIndustry}>
          <option value="">Выберите специализацию</option>
          {specializations.map((s) => (
            <option key={s.documentId} value={s.documentId}>{s.name.ru}</option>
          ))}
        </select>
        {errors.specialization && <p className="text-xs text-destructive">{errors.specialization.message}</p>}
      </div>

      {/* Формат / Занятость / Уровень */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="workFormat">Формат *</Label>
          <select id="workFormat" {...register('workFormat')} className={selectClass}>
            {(Object.entries(WORK_FORMAT_LABELS) as [WorkFormatEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="employmentType">Занятость *</Label>
          <select id="employmentType" {...register('employmentType')} className={selectClass}>
            {(Object.entries(EMPLOYMENT_TYPE_LABELS) as [EmploymentTypeEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="seniority">Уровень *</Label>
          <select id="seniority" {...register('seniority')} className={selectClass}>
            {(Object.entries(SENIORITY_LABELS) as [SeniorityEnum, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Страна / Город */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="country">Страна *</Label>
          <Input id="country" {...register('country')} placeholder="RU" />
          {errors.country && <p className="text-xs text-destructive">{errors.country.message}</p>}
        </div>
        <div className="space-y-1">
          <Label htmlFor="city">Город</Label>
          <Input id="city" {...register('city')} placeholder="Москва" />
        </div>
      </div>

      {/* Зарплата */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="salaryFrom">Зарплата от</Label>
          <Input id="salaryFrom" type="number" {...register('salaryFrom')} placeholder="100000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="salaryTo">До</Label>
          <Input id="salaryTo" type="number" {...register('salaryTo')} placeholder="200000" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="salaryCurrency">Валюта</Label>
          <select id="salaryCurrency" {...register('salaryCurrency')} className={selectClass}>
            <option value="RUB">₽ RUB</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
      </div>

      {/* Описание */}
      <div className="space-y-1">
        <Label htmlFor="description">Описание *</Label>
        <textarea id="description" {...register('description')} className={textareaClass} rows={4} placeholder="Чем занимается компания, над чем предстоит работать..." />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      {/* Обязанности */}
      <div className="space-y-1">
        <Label htmlFor="responsibilities">Обязанности *</Label>
        <textarea id="responsibilities" {...register('responsibilities')} className={textareaClass} rows={4} placeholder="- Разработка..." />
        {errors.responsibilities && <p className="text-xs text-destructive">{errors.responsibilities.message}</p>}
      </div>

      {/* Требования */}
      <div className="space-y-1">
        <Label htmlFor="requirements">Требования *</Label>
        <textarea id="requirements" {...register('requirements')} className={textareaClass} rows={4} placeholder="- Опыт от 3 лет..." />
        {errors.requirements && <p className="text-xs text-destructive">{errors.requirements.message}</p>}
      </div>

      {/* Условия */}
      <div className="space-y-1">
        <Label htmlFor="conditions">Условия</Label>
        <textarea id="conditions" {...register('conditions')} className={textareaClass} rows={3} placeholder="- ДМС, удалёнка..." />
      </div>

      {/* Навыки */}
      <div className="space-y-1">
        <Label htmlFor="skills">Навыки (через запятую)</Label>
        <Input id="skills" {...register('skills')} placeholder="React, TypeScript, Node.js" />
      </div>

      {/* Языки */}
      <div className="space-y-1">
        <Label htmlFor="languages">Языки (через запятую)</Label>
        <Input id="languages" {...register('languages')} placeholder="Русский, English" />
      </div>

      {/* Опыт / Срочно */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="experienceYears">Опыт (лет)</Label>
          <Input id="experienceYears" type="number" {...register('experienceYears')} placeholder="3" />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" {...register('urgent')} className="h-4 w-4" />
            <span className="text-sm text-gray-700">🔥 Срочная вакансия</span>
          </label>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
```

- [x] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидаем: 0 ошибок.

- [x] **Step 3: Commit**

```bash
git add frontend/src/components/vacancy/VacancyForm.tsx
git commit -m "feat(frontend): add VacancyForm with all fields"
```

---

## Task 13: Дашборд — мои вакансии `/dashboard/vacancies`

**Files:**

- Create: `frontend/src/app/dashboard/vacancies/page.tsx`
- Create: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`
- Create: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.test.tsx`

- [ ] **Step 1: Написать тест `frontend/src/app/dashboard/vacancies/MyVacanciesClient.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MyVacanciesClient } from './MyVacanciesClient'

const mockStore = {
  vacancy: {
    myVacancies: [],
    isLoading: false,
    error: null,
    total: 0,
    page: 1,
    pageSize: 20,
    pageCount: 0,
    limitReached: false,
    boostsRemaining: null,
    fetchMyVacancies: vi.fn(),
    publishVacancy: vi.fn(),
    boostVacancy: vi.fn(),
    archiveVacancy: vi.fn(),
    clearLimitReached: vi.fn(),
  },
  auth: { user: { subscriptionPlan: 'free', vacancyCredits: 0 } },
}

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => mockStore,
}))

describe('MyVacanciesClient', () => {
  it('показывает пустое состояние без вакансий', () => {
    render(<MyVacanciesClient />)
    expect(screen.getByText(/нет вакансий/i)).toBeTruthy()
  })

  it('показывает ссылку "Создать вакансию"', () => {
    render(<MyVacanciesClient />)
    expect(screen.getByText(/Создать вакансию/)).toBeTruthy()
  })

  it('показывает UpsellModal при limitReached = true', () => {
    mockStore.vacancy.limitReached = true
    render(<MyVacanciesClient />)
    expect(screen.getByText(/Лимит исчерпан/i)).toBeTruthy()
    mockStore.vacancy.limitReached = false
  })
})
```

- [ ] **Step 2: Создать `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyStatusBadge } from '@/components/vacancy/VacancyStatusBadge'
import { LimitBar } from '@/components/vacancy/LimitBar'
import { UpsellModal } from '@/components/vacancy/UpsellModal'
import { Button } from '@/components/ui/button'
import {
  canPublishVacancy,
  canBoostVacancy,
  canArchiveVacancy,
  canEditVacancy,
  WORK_FORMAT_LABELS,
  SENIORITY_LABELS,
} from '@/lib/vacancy-utils'
import { PLAN_LIMITS } from './plan-limits'

export const MyVacanciesClient = observer(function MyVacanciesClient() {
  const { vacancy: store, auth } = useStores()

  useEffect(() => {
    void store.fetchMyVacancies()
  }, [store])

  const plan = auth.user?.subscriptionPlan ?? 'free'
  const limit = PLAN_LIMITS[plan] ?? 3
  const used = auth.user?.vacancyCredits !== undefined ? limit - auth.user.vacancyCredits : 0

  const handlePublish = (id: string) => {
    void store.publishVacancy(id)
  }

  const handleBoost = (id: string) => {
    void store.boostVacancy(id)
  }

  const handleArchive = (id: string) => {
    if (!window.confirm('Архивировать вакансию?')) return
    void store.archiveVacancy(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchMyVacancies({ page })
  }

  return (
    <div className="space-y-6">
      {store.limitReached && <UpsellModal onClose={() => store.clearLimitReached()} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои вакансии</h1>
        <Link
          href="/dashboard/vacancies/new"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Создать вакансию
        </Link>
      </div>

      <LimitBar used={used} limit={limit} />

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.myVacancies.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">У вас пока нет вакансий.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.myVacancies.map((v) => (
          <div key={v.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold text-gray-900">{v.title}</p>
                  <VacancyStatusBadge status={v.status} />
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {v.company.name} · {SENIORITY_LABELS[v.seniority]} · {WORK_FORMAT_LABELS[v.workFormat]}
                </p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-2">
                {canEditVacancy(v.status) && (
                  <Link
                    href={`/dashboard/vacancies/${v.documentId}/edit`}
                    className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                  >
                    Редактировать
                  </Link>
                )}
                {canPublishVacancy(v.status) && (
                  <Button size="sm" variant="outline" onClick={() => handlePublish(v.documentId)} disabled={store.isLoading}>
                    На модерацию
                  </Button>
                )}
                {canBoostVacancy(v.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleBoost(v.documentId)} disabled={store.isLoading}>
                    ↑ Поднять
                    {store.boostsRemaining !== null && (
                      <span className="ml-1 text-xs opacity-70">({store.boostsRemaining})</span>
                    )}
                  </Button>
                )}
                {canArchiveVacancy(v.status) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleArchive(v.documentId)}
                    disabled={store.isLoading}
                  >
                    В архив
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-2 flex gap-4 text-xs text-gray-400">
              <span>{v.views ?? 0} просмотров</span>
              <span>{v.applicationsCount ?? 0} откликов</span>
              {v.expiresAt && (
                <span>
                  Истекает {new Date(v.expiresAt).toLocaleDateString('ru', { day: 'numeric', month: 'short' })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {store.pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={store.page <= 1} onClick={() => handlePageChange(store.page - 1)}>
            ← Назад
          </Button>
          <span className="text-sm text-muted-foreground">{store.page} / {store.pageCount}</span>
          <Button variant="outline" size="sm" disabled={store.page >= store.pageCount} onClick={() => handlePageChange(store.page + 1)}>
            Вперёд →
          </Button>
        </div>
      )}
    </div>
  )
})
```

- [ ] **Step 3: Создать `frontend/src/app/dashboard/vacancies/plan-limits.ts`**

```typescript
export const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  pro: 10,
  max: 50,
  vip: 50,
}
```

- [ ] **Step 4: Создать `frontend/src/app/dashboard/vacancies/page.tsx`**

```typescript
import { MyVacanciesClient } from './MyVacanciesClient'

export default function MyVacanciesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MyVacanciesClient />
    </div>
  )
}
```

- [ ] **Step 5: Запустить тесты**

```bash
cd frontend && pnpm test MyVacanciesClient && pnpm typecheck
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/
git commit -m "feat(frontend): add my vacancies dashboard with publish/boost/archive"
```

---

## Task 14: Создание вакансии `/dashboard/vacancies/new`

**Files:**

- Create: `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx`
- Create: `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.test.tsx`
- Create: `frontend/src/app/dashboard/vacancies/new/page.tsx`

- [ ] **Step 1: Написать тест `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CreateVacancyClient } from './CreateVacancyClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: { isLoading: false, error: null, createVacancy: vi.fn() },
    company: { myCompanies: [], isLoading: false, fetchMyCompanies: vi.fn() },
  }),
}))

describe('CreateVacancyClient', () => {
  it('отображает форму создания вакансии', () => {
    render(<CreateVacancyClient />)
    expect(screen.getByText(/Новая вакансия/)).toBeTruthy()
  })

  it('содержит кнопку сохранения', () => {
    render(<CreateVacancyClient />)
    expect(screen.getByText('Сохранить')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Создать `frontend/src/app/dashboard/vacancies/new/CreateVacancyClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyForm } from '@/components/vacancy/VacancyForm'
import type { VacancyCreateInput } from '@/types/api'

export const CreateVacancyClient = observer(function CreateVacancyClient() {
  const { vacancy: vStore, company: cStore } = useStores()
  const router = useRouter()

  useEffect(() => {
    void cStore.fetchMyCompanies(1)
  }, [cStore])

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      await vStore.createVacancy(data)
      router.push('/dashboard/vacancies')
    } catch {
      // error сохранён в vStore.error
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Новая вакансия</h1>
      </div>

      {vStore.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {vStore.error}
        </p>
      )}

      <VacancyForm
        myCompanies={cStore.myCompanies}
        isLoading={vStore.isLoading}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
```

- [ ] **Step 3: Создать `frontend/src/app/dashboard/vacancies/new/page.tsx`**

```typescript
import { CreateVacancyClient } from './CreateVacancyClient'

export default function CreateVacancyPage() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <CreateVacancyClient />
    </div>
  )
}
```

- [ ] **Step 4: Запустить тесты**

```bash
cd frontend && pnpm test CreateVacancyClient && pnpm typecheck
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/new/
git commit -m "feat(frontend): add create vacancy page"
```

---

## Task 15: Редактирование вакансии `/dashboard/vacancies/[id]/edit`

**Files:**

- Create: `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx`
- Create: `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.test.tsx`
- Create: `frontend/src/app/dashboard/vacancies/[id]/edit/page.tsx`

- [ ] **Step 1: Написать тест `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.test.tsx`**

```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EditVacancyClient } from './EditVacancyClient'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    vacancy: {
      currentVacancy: null,
      isLoading: true,
      error: null,
      fetchVacancyById: vi.fn(),
      updateVacancy: vi.fn(),
    },
    company: { myCompanies: [], fetchMyCompanies: vi.fn() },
  }),
}))

describe('EditVacancyClient', () => {
  it('показывает загрузку пока нет currentVacancy', () => {
    render(<EditVacancyClient id="vac1" />)
    expect(screen.getByText(/Загрузка/i)).toBeTruthy()
  })
})
```

- [ ] **Step 2: Создать `frontend/src/app/dashboard/vacancies/[id]/edit/EditVacancyClient.tsx`**

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { VacancyForm } from '@/components/vacancy/VacancyForm'
import type { VacancyCreateInput } from '@/types/api'

interface Props {
  id: string
}

export const EditVacancyClient = observer(function EditVacancyClient({ id }: Props) {
  const { vacancy: vStore, company: cStore } = useStores()
  const router = useRouter()

  useEffect(() => {
    void vStore.fetchVacancyById(id)
    void cStore.fetchMyCompanies(1)
  }, [vStore, cStore, id])

  if (vStore.isLoading || !vStore.currentVacancy) {
    return <p className="text-sm text-muted-foreground">Загрузка...</p>
  }

  const v = vStore.currentVacancy

  const handleSubmit = async (data: VacancyCreateInput) => {
    try {
      await vStore.updateVacancy(id, data)
      router.push('/dashboard/vacancies')
    } catch {
      // error в vStore.error
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/vacancies" className="text-sm text-muted-foreground hover:text-foreground">
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Редактировать вакансию</h1>
      </div>

      {vStore.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {vStore.error}
        </p>
      )}

      <VacancyForm
        myCompanies={cStore.myCompanies}
        isLoading={vStore.isLoading}
        defaultValues={{
          title: v.title,
          company: v.company.documentId,
          industry: v.industry.documentId,
          specialization: v.specialization.documentId,
          workFormat: v.workFormat,
          employmentType: v.employmentType,
          seniority: v.seniority,
          country: v.country,
          city: v.city ?? undefined,
          salaryFrom: v.salaryFrom ?? undefined,
          salaryTo: v.salaryTo ?? undefined,
          salaryCurrency: v.salaryCurrency ?? undefined,
          description: v.description ?? '',
          responsibilities: v.responsibilities ?? '',
          requirements: v.requirements ?? '',
          conditions: v.conditions ?? undefined,
          skills: v.skills ?? undefined,
          languages: v.languages ?? undefined,
          experienceYears: v.experienceYears ?? undefined,
          urgent: v.urgent,
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
})
```

- [ ] **Step 3: Создать `frontend/src/app/dashboard/vacancies/[id]/edit/page.tsx`**

```typescript
import type { Metadata } from 'next'
import { EditVacancyClient } from './EditVacancyClient'

interface Props {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Редактировать вакансию | GramJob',
}

export default async function EditVacancyPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <EditVacancyClient id={id} />
    </div>
  )
}
```

- [ ] **Step 4: Запустить все тесты и typecheck**

```bash
cd frontend && pnpm test && pnpm typecheck
```

Ожидаем: все тесты PASS, 0 ошибок TypeScript.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/[id]/
git commit -m "feat(frontend): add edit vacancy page"
```

---

## Финальная проверка

- [ ] **Запустить полный suite**

```bash
cd frontend && pnpm test
```

Ожидаем: ≥ 40 тестов PASS, 0 FAIL.

- [ ] **Проверить типы**

```bash
cd frontend && pnpm typecheck
```

Ожидаем: 0 ошибок.

- [ ] **Финальный commit**

```bash
git add -A
git commit -m "feat(frontend): Sprint 3 — complete vacancy frontend (store, pages, forms, dashboard)"
```

---

## Self-Review

**Покрытие спецификации (Sprint 3 Frontend чеклист):**

| Задача                                                                     | Task           |
| -------------------------------------------------------------------------- | -------------- |
| ✅ VacancyStore: список/фильтры, текущая, CRUD                             | Task 3         |
| ✅ Страница `/vacancies` — поиск + фильтры + пагинация                     | Task 10        |
| ✅ Компонент VacancyCard (highlighted, urgent, top, external)              | Task 6         |
| ✅ Компонент VacancyFilters (все фильтры из api-spec)                      | Task 9         |
| ✅ Страница `/vacancies/:id` — полная карточка (Apply / Apply on Source)   | Task 11        |
| ✅ Страница `/dashboard/vacancies` — мои вакансии + буст + архив           | Task 13        |
| ✅ Форма: создать/редактировать вакансию (все поля, skills/languages теги) | Task 12        |
| ✅ Компонент LimitBar — N/M вакансий использовано                          | Task 7         |
| ✅ Обработка LIMIT_REACHED → UpsellModal                                   | Tasks 3, 8, 13 |

**Проверка плейсхолдеров:** Нет TBD, TODO или ссылок «аналогично Task N» без кода.

**Согласованность типов:**

- `VacancyCreateInput.company/industry/specialization` — строки documentId — везде одинаково
- `VacancyStore.publishVacancy` принимает `id: string` — используется в Task 13 как `v.documentId`
- `LimitBar.used/limit` — числа — в MyVacanciesClient вычисляются из `auth.user`
- `VacancyForm.defaultValues` — тип `Partial<VacancyCreateInput>` — в EditVacancyClient передаются корректные поля
