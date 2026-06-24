# Sprint 2 Frontend: Companies — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Дать работодателям возможность создавать компании, управлять ими, отправлять на модерацию, а также показывать публичные списки и карточки компаний.

**Architecture:** MobX CompanyStore управляет всеми API-вызовами к бэкенду (Strapi 5, documentId-based IDs). Клиентские компоненты подписываются на store через `observer`. Страницы — client components (SSR-оптимизация в Sprint 10). Формы используют React Hook Form + Zod.

**Tech Stack:** Next.js 15 App Router, MobX 6, React Hook Form + Zod, Tailwind CSS, Vitest + jsdom, TypeScript strict

---

## Ключевые детали бэкенда

- Strapi 5 использует `documentId` (строка UUID) как публичный идентификатор, не числовой `id`
- `companySize` — enum с именами `size_1_10`, `size_11_50`, `size_51_200`, `size_201_500`, `size_500_plus`
- Все ответы обёрнуты в `{ data: ... }` или `{ data: [...], meta: { total, page, pageSize, pageCount } }`
- Медиафайлы (логотип) — объект `{ url, formats, ... }`, URL может быть относительным (для MinIO — абсолютным)
- Редактировать/удалять можно только компании со статусом `draft` или `rejected`

## File Structure

**Модификации:**

- `frontend/src/types/api.ts` — добавить Company, StrapiMedia, CompanySizeEnum, CompanyStatusEnum, CompanyCreateInput, CompanyUpdateInput
- `frontend/src/stores/RootStore.ts` — добавить `company: CompanyStore`

**Новые файлы:**

- `frontend/src/lib/media.ts` — хелпер `getMediaUrl` для Strapi media URL
- `frontend/src/lib/company-utils.ts` — константа `COMPANY_SIZE_LABELS`
- `frontend/src/stores/CompanyStore.ts` — MobX store для CRUD компаний
- `frontend/src/stores/CompanyStore.test.ts` — unit-тесты store
- `frontend/src/components/company/StatusBadge.tsx` — бейдж статуса компании
- `frontend/src/components/company/CompanyCard.tsx` — карточка для списков
- `frontend/src/components/company/CompanyForm.tsx` — форма создания/редактирования
- `frontend/src/app/companies/page.tsx` — публичный список компаний
- `frontend/src/app/companies/[id]/page.tsx` — публичная карточка компании
- `frontend/src/app/dashboard/companies/page.tsx` — мои компании (дашборд)
- `frontend/src/app/dashboard/companies/new/page.tsx` — создать компанию
- `frontend/src/app/dashboard/companies/[id]/edit/page.tsx` — редактировать компанию

---

## Task 1: Company API Types

**Files:**

- Modify: `frontend/src/types/api.ts`

- [x] **Step 1: Добавить типы Company в конец файла api.ts**

```typescript
// Добавить в конец frontend/src/types/api.ts

export type CompanySizeEnum =
  | 'size_1_10'
  | 'size_11_50'
  | 'size_51_200'
  | 'size_201_500'
  | 'size_500_plus'

export type CompanyStatusEnum = 'draft' | 'moderation' | 'published' | 'rejected'

export interface StrapiMedia {
  id: number
  documentId: string
  name: string
  url: string
  formats?: {
    thumbnail?: { url: string; width: number; height: number }
    small?: { url: string; width: number; height: number }
  }
  width?: number
  height?: number
}

export interface CompanyOwner {
  id: number
  firstName: string
  lastName: string
}

export interface Company {
  id: number
  documentId: string
  name: string
  slug: string
  description?: string
  website?: string
  telegram?: string
  linkedin?: string
  country: string
  city?: string
  companySize: CompanySizeEnum
  status: CompanyStatusEnum
  logo?: StrapiMedia | null
  cover?: StrapiMedia | null
  owner?: CompanyOwner | null
  createdAt: string
}

export interface CompanyListParams {
  search?: string
  country?: string
  companySize?: CompanySizeEnum
  page?: number
  pageSize?: number
}

export interface CompanyCreateInput {
  name: string
  description: string
  country: string
  companySize: CompanySizeEnum
  city?: string
  website?: string
  telegram?: string
  linkedin?: string
}

export type CompanyUpdateInput = Partial<CompanyCreateInput>
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(frontend): add Company API types"
```

---

## Task 2: Utility Functions

**Files:**

- Create: `frontend/src/lib/media.ts`
- Create: `frontend/src/lib/company-utils.ts`

- [x] **Step 1: Создать media.ts**

```typescript
// frontend/src/lib/media.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api').replace(
  /\/api$/,
  ''
)

export function getMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${API_BASE}${url}`
}
```

- [x] **Step 2: Создать company-utils.ts**

```typescript
// frontend/src/lib/company-utils.ts
import type { CompanySizeEnum } from '@/types/api'

export const COMPANY_SIZE_LABELS: Record<CompanySizeEnum, string> = {
  size_1_10: '1–10',
  size_11_50: '11–50',
  size_51_200: '51–200',
  size_201_500: '201–500',
  size_500_plus: '500+',
}
```

- [x] **Step 3: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 4: Commit**

```bash
git add frontend/src/lib/media.ts frontend/src/lib/company-utils.ts
git commit -m "feat(frontend): add media URL helper and company size labels"
```

---

## Task 3: CompanyStore (TDD)

**Files:**

- Create: `frontend/src/stores/CompanyStore.ts`
- Create: `frontend/src/stores/CompanyStore.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`

- [x] **Step 1: Написать тесты (файл пока не имеет реализации)**

```typescript
// frontend/src/stores/CompanyStore.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { CompanyStore } from './CompanyStore'

const mockCompany = {
  id: 1,
  documentId: 'abc123',
  name: 'Test Company',
  slug: 'test-company',
  country: 'RU',
  city: 'Москва',
  companySize: 'size_1_10' as const,
  status: 'draft' as const,
  logo: null,
  cover: null,
  owner: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockCompany],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('CompanyStore', () => {
  let store: CompanyStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new CompanyStore()
  })

  it('начинает с пустым состоянием', () => {
    expect(store.companies).toEqual([])
    expect(store.myCompanies).toEqual([])
    expect(store.currentCompany).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
  })

  describe('fetchCompanies', () => {
    it('заполняет companies и meta из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchCompanies()

      expect(store.companies).toEqual([mockCompany])
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('передаёт параметры search и country в URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })

      await store.fetchCompanies({ search: 'tech', country: 'RU' })

      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('search=tech')
      expect(url).toContain('country=RU')
    })

    it('устанавливает error при сетевой ошибке', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

      await store.fetchCompanies()

      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
      expect(store.companies).toEqual([])
    })
  })

  describe('fetchMyCompanies', () => {
    it('заполняет myCompanies из /companies/my', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)

      await store.fetchMyCompanies()

      expect(store.myCompanies).toEqual([mockCompany])
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('/companies/my')
    })
  })

  describe('fetchCompanyById', () => {
    it('устанавливает currentCompany из ответа API', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: mockCompany })

      await store.fetchCompanyById('abc123')

      expect(store.currentCompany).toEqual(mockCompany)
      expect(store.isLoading).toBe(false)
    })

    it('сбрасывает currentCompany перед запросом', async () => {
      store.currentCompany = mockCompany
      vi.mocked(api.get).mockResolvedValue({ data: mockCompany })

      const fetchPromise = store.fetchCompanyById('abc123')
      expect(store.currentCompany).toBeNull()
      await fetchPromise
    })
  })

  describe('createCompany', () => {
    it('добавляет компанию в начало myCompanies и возвращает её', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockCompany })

      const result = await store.createCompany({
        name: 'Test Company',
        description: 'A test company',
        country: 'RU',
        companySize: 'size_1_10',
      })

      expect(store.myCompanies[0]).toEqual(mockCompany)
      expect(result).toEqual(mockCompany)
    })

    it('выбрасывает ошибку и устанавливает error', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Validation error'))

      await expect(
        store.createCompany({ name: '', description: '', country: 'RU', companySize: 'size_1_10' })
      ).rejects.toThrow('Validation error')

      expect(store.error).toBe('Validation error')
    })
  })

  describe('updateCompany', () => {
    it('обновляет компанию в myCompanies по documentId', async () => {
      store.myCompanies = [mockCompany]
      const updated = { ...mockCompany, name: 'Updated Name' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateCompany('abc123', { name: 'Updated Name' })

      expect(store.myCompanies[0]?.name).toBe('Updated Name')
    })

    it('обновляет currentCompany если его documentId совпадает', async () => {
      store.currentCompany = mockCompany
      const updated = { ...mockCompany, name: 'Updated' }
      vi.mocked(api.put).mockResolvedValue({ data: updated })

      await store.updateCompany('abc123', { name: 'Updated' })

      expect(store.currentCompany?.name).toBe('Updated')
    })
  })

  describe('deleteCompany', () => {
    it('удаляет компанию из myCompanies по documentId', async () => {
      store.myCompanies = [mockCompany]
      vi.mocked(api.delete).mockResolvedValue(undefined)

      await store.deleteCompany('abc123')

      expect(store.myCompanies).toEqual([])
    })

    it('выбрасывает ошибку при неудаче', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Cannot delete'))

      await expect(store.deleteCompany('abc123')).rejects.toThrow('Cannot delete')
      expect(store.error).toBe('Cannot delete')
    })
  })

  describe('submitCompany', () => {
    it('обновляет статус компании в myCompanies на moderation', async () => {
      store.myCompanies = [mockCompany]
      const submitted = { ...mockCompany, status: 'moderation' as const }
      vi.mocked(api.post).mockResolvedValue({ data: submitted })

      await store.submitCompany('abc123')

      expect(store.myCompanies[0]?.status).toBe('moderation')
    })

    it('вызывает POST /companies/abc123/submit', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockCompany })

      await store.submitCompany('abc123')

      expect(api.post).toHaveBeenCalledWith('/companies/abc123/submit', {})
    })
  })

  it('pageCount вычисляется как ceil(total / pageSize)', () => {
    store.total = 45
    store.pageSize = 20

    expect(store.pageCount).toBe(3)
  })
})
```

- [x] **Step 2: Запустить тесты и убедиться, что они падают**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: ошибки `Cannot find module './CompanyStore'`

- [x] **Step 3: Реализовать CompanyStore**

```typescript
// frontend/src/stores/CompanyStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import type {
  Company,
  CompanyListParams,
  CompanyCreateInput,
  CompanyUpdateInput,
} from '@/types/api'
import { api } from '@/services/api'

type CompanyListMeta = {
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export class CompanyStore {
  companies: Company[] = []
  myCompanies: Company[] = []
  currentCompany: Company | null = null
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return Math.ceil(this.total / this.pageSize)
  }

  async fetchCompanies(params: CompanyListParams = {}): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const query = new URLSearchParams()
      if (params.search) query.set('search', params.search)
      if (params.country) query.set('country', params.country)
      if (params.companySize) query.set('companySize', params.companySize)
      if (params.page) query.set('page', String(params.page))
      if (params.pageSize) query.set('pageSize', String(params.pageSize))

      const qs = query.toString()
      const res = await api.get<{ data: Company[]; meta: CompanyListMeta }>(
        `/companies${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.companies = res.data
        this.total = res.meta.total
        this.page = res.meta.page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch companies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchMyCompanies(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Company[]; meta: CompanyListMeta }>(
        `/companies/my?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.myCompanies = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch my companies'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchCompanyById(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.currentCompany = null
    })
    try {
      const res = await api.get<{ data: Company }>(`/companies/${id}`)
      runInAction(() => {
        this.currentCompany = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch company'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createCompany(data: CompanyCreateInput): Promise<Company> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Company }>('/companies', data)
      runInAction(() => {
        this.myCompanies.unshift(res.data)
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async updateCompany(id: string, data: CompanyUpdateInput): Promise<Company> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.put<{ data: Company }>(`/companies/${id}`, data)
      runInAction(() => {
        const idx = this.myCompanies.findIndex((c) => c.documentId === id)
        if (idx !== -1) this.myCompanies[idx] = res.data
        if (this.currentCompany?.documentId === id) this.currentCompany = res.data
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to update company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async deleteCompany(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/companies/${id}`)
      runInAction(() => {
        this.myCompanies = this.myCompanies.filter((c) => c.documentId !== id)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to delete company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async submitCompany(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: Company }>(`/companies/${id}/submit`, {})
      runInAction(() => {
        const idx = this.myCompanies.findIndex((c) => c.documentId === id)
        if (idx !== -1) this.myCompanies[idx] = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to submit company'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
```

- [x] **Step 4: Запустить тесты и убедиться, что они проходят**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: все тесты в `CompanyStore.test.ts` — PASS

- [x] **Step 5: Добавить CompanyStore в RootStore**

```typescript
// frontend/src/stores/RootStore.ts — полная замена файла
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
  }
}

export const rootStore = new RootStore()
```

- [x] **Step 6: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 7: Запустить все тесты**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: все тесты — PASS

- [x] **Step 8: Commit**

```bash
git add frontend/src/stores/CompanyStore.ts frontend/src/stores/CompanyStore.test.ts frontend/src/stores/RootStore.ts
git commit -m "feat(frontend): add CompanyStore with full CRUD"
```

---

## Task 4: StatusBadge Component

**Files:**

- Create: `frontend/src/components/company/StatusBadge.tsx`

- [x] **Step 1: Создать компонент**

```tsx
// frontend/src/components/company/StatusBadge.tsx
import type { CompanyStatusEnum } from '@/types/api'

const STATUS_CONFIG: Record<CompanyStatusEnum, { label: string; className: string }> = {
  draft: { label: 'Черновик', className: 'bg-gray-100 text-gray-600' },
  moderation: { label: 'На модерации', className: 'bg-yellow-100 text-yellow-700' },
  published: { label: 'Опубликована', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Отклонена', className: 'bg-red-100 text-red-700' },
}

interface Props {
  status: CompanyStatusEnum
}

export function StatusBadge({ status }: Props) {
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

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/components/company/StatusBadge.tsx
git commit -m "feat(frontend): add StatusBadge component for company statuses"
```

---

## Task 5: CompanyCard Component

**Files:**

- Create: `frontend/src/components/company/CompanyCard.tsx`

- [x] **Step 1: Создать компонент**

```tsx
// frontend/src/components/company/CompanyCard.tsx
import Link from 'next/link'
import Image from 'next/image'
import type { Company } from '@/types/api'
import { StatusBadge } from './StatusBadge'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { getMediaUrl } from '@/lib/media'

interface Props {
  company: Company
  showStatus?: boolean
}

export function CompanyCard({ company, showStatus = false }: Props) {
  const logoUrl = getMediaUrl(company.logo?.url)

  return (
    <Link
      href={`/companies/${company.documentId}`}
      className="block rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors"
    >
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-muted">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={company.name}
              width={48}
              height={48}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-bold text-muted-foreground">
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold text-foreground">{company.name}</h3>
            {showStatus && <StatusBadge status={company.status} />}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[company.city, company.country].filter(Boolean).join(', ')}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {COMPANY_SIZE_LABELS[company.companySize]} сотрудников
          </p>
        </div>
      </div>
    </Link>
  )
}
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/components/company/CompanyCard.tsx
git commit -m "feat(frontend): add CompanyCard component"
```

---

## Task 6: CompanyForm Component

**Files:**

- Create: `frontend/src/components/company/CompanyForm.tsx`

Форма используется и для создания, и для редактирования. Принимает `defaultValues` для режима редактирования и `onSubmit` колбэк.

- [x] **Step 1: Создать форму**

```tsx
// frontend/src/components/company/CompanyForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CompanyCreateInput, CompanySizeEnum } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const COMPANY_SIZES: { value: CompanySizeEnum; label: string }[] = [
  { value: 'size_1_10', label: '1–10 сотрудников' },
  { value: 'size_11_50', label: '11–50 сотрудников' },
  { value: 'size_51_200', label: '51–200 сотрудников' },
  { value: 'size_201_500', label: '201–500 сотрудников' },
  { value: 'size_500_plus', label: '500+ сотрудников' },
]

const schema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(10, 'Описание обязательно (мин. 10 символов)'),
  country: z.string().min(1, 'Страна обязательна'),
  city: z.string().optional(),
  companySize: z.enum(
    ['size_1_10', 'size_11_50', 'size_51_200', 'size_201_500', 'size_500_plus'] as const,
    { errorMap: () => ({ message: 'Выберите размер компании' }) }
  ),
  website: z.string().url('Введите корректный URL').or(z.literal('')).optional(),
  telegram: z.string().optional(),
  linkedin: z.string().url('Введите корректный URL').or(z.literal('')).optional(),
})

export type CompanyFormData = z.infer<typeof schema>

interface Props {
  defaultValues?: Partial<CompanyFormData>
  onSubmit: (data: CompanyCreateInput) => Promise<void>
  isLoading?: boolean
  error?: string | null
}

export function CompanyForm({ defaultValues, onSubmit, isLoading, error }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const handleFormSubmit = async (data: CompanyFormData) => {
    const input: CompanyCreateInput = {
      name: data.name,
      description: data.description,
      country: data.country,
      companySize: data.companySize,
      ...(data.city ? { city: data.city } : {}),
      ...(data.website ? { website: data.website } : {}),
      ...(data.telegram ? { telegram: data.telegram } : {}),
      ...(data.linkedin ? { linkedin: data.linkedin } : {}),
    }
    await onSubmit(input)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="name">Название компании *</Label>
        <Input id="name" {...register('name')} placeholder="Название компании" />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-1">
        <Label htmlFor="description">Описание *</Label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          placeholder="Расскажите о вашей компании"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {errors.description && (
          <p className="text-xs text-destructive">{errors.description.message}</p>
        )}
      </div>

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

      <div className="space-y-1">
        <Label htmlFor="companySize">Размер компании *</Label>
        <select
          id="companySize"
          {...register('companySize')}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Выберите размер</option>
          {COMPANY_SIZES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        {errors.companySize && (
          <p className="text-xs text-destructive">{errors.companySize.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="website">Сайт</Label>
        <Input id="website" {...register('website')} placeholder="https://example.com" type="url" />
        {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="telegram">Telegram</Label>
          <Input id="telegram" {...register('telegram')} placeholder="@company" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="linkedin">LinkedIn</Label>
          <Input
            id="linkedin"
            {...register('linkedin')}
            placeholder="https://linkedin.com/company/..."
            type="url"
          />
          {errors.linkedin && <p className="text-xs text-destructive">{errors.linkedin.message}</p>}
        </div>
      </div>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? 'Сохранение...' : 'Сохранить'}
      </Button>
    </form>
  )
}
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/components/company/CompanyForm.tsx
git commit -m "feat(frontend): add CompanyForm with validation"
```

---

## Task 7: Public /companies Page

**Files:**

- Create: `frontend/src/app/companies/page.tsx`

- [x] **Step 1: Создать страницу публичного списка**

```tsx
// frontend/src/app/companies/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { CompanyCard } from '@/components/company/CompanyCard'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default observer(function CompaniesPage() {
  const { company } = useStores()
  const [search, setSearch] = useState('')
  const [country, setCountry] = useState('')

  useEffect(() => {
    company.fetchCompanies()
  }, [company])

  const handleSearch = () => {
    company.fetchCompanies({
      search: search || undefined,
      country: country || undefined,
      page: 1,
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Компании</h1>

      <div className="flex gap-3 mb-6">
        <Input
          placeholder="Поиск по названию..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Input
          placeholder="Страна (RU, US...)"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-36"
        />
        <Button onClick={handleSearch}>Найти</Button>
      </div>

      {company.isLoading && <p className="text-muted-foreground">Загрузка...</p>}

      {company.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          {company.error}
        </p>
      )}

      {!company.isLoading && company.companies.length === 0 && !company.error && (
        <p className="text-muted-foreground text-center py-12">Компании не найдены</p>
      )}

      <div className="grid gap-4">
        {company.companies.map((c) => (
          <CompanyCard key={c.documentId} company={c} />
        ))}
      </div>

      {company.pageCount > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: company.pageCount }, (_, i) => i + 1).map((p) => (
            <Button
              key={p}
              variant={p === company.page ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                company.fetchCompanies({
                  search: search || undefined,
                  country: country || undefined,
                  page: p,
                })
              }
            >
              {p}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
})
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/app/companies/page.tsx
git commit -m "feat(frontend): add public companies list page"
```

---

## Task 8: Public /companies/[id] Page

**Files:**

- Create: `frontend/src/app/companies/[id]/page.tsx`

- [x] **Step 1: Создать публичную карточку компании**

```tsx
// frontend/src/app/companies/[id]/page.tsx
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useStores } from '@/stores/StoreProvider'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { getMediaUrl } from '@/lib/media'
import { Button } from '@/components/ui/button'

export default observer(function CompanyPage() {
  const { id } = useParams<{ id: string }>()
  const { company, auth } = useStores()

  useEffect(() => {
    if (id) company.fetchCompanyById(id)
  }, [id, company])

  if (company.isLoading) {
    return <p className="text-muted-foreground text-center py-12">Загрузка...</p>
  }

  if (company.error) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {company.error}
      </p>
    )
  }

  const c = company.currentCompany
  if (!c) return null

  const logoUrl = getMediaUrl(c.logo?.url)
  const coverUrl = getMediaUrl(c.cover?.url)
  const isOwner = auth.user?.id === c.owner?.id

  return (
    <div className="max-w-4xl mx-auto">
      {coverUrl && (
        <div className="relative h-48 w-full overflow-hidden rounded-lg bg-muted mb-6">
          <Image src={coverUrl} alt={`${c.name} обложка`} fill className="object-cover" />
        </div>
      )}

      <div className="flex items-start gap-6 mb-6">
        <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={c.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
              {c.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-muted-foreground mt-1">
            {[c.city, c.country].filter(Boolean).join(', ')} · {COMPANY_SIZE_LABELS[c.companySize]}{' '}
            сотрудников
          </p>
        </div>
        {isOwner && (
          <Link href={`/dashboard/companies/${id}/edit`}>
            <Button variant="outline">Редактировать</Button>
          </Link>
        )}
      </div>

      {c.description && (
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">О компании</h2>
          <p className="text-muted-foreground whitespace-pre-wrap">{c.description}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 text-sm">
        {c.website && (
          <a
            href={c.website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {c.website}
          </a>
        )}
        {c.telegram && (
          <a
            href={`https://t.me/${c.telegram.replace('@', '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {c.telegram}
          </a>
        )}
        {c.linkedin && (
          <a
            href={c.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            LinkedIn
          </a>
        )}
      </div>
    </div>
  )
})
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/app/companies/[id]/page.tsx
git commit -m "feat(frontend): add public company profile page"
```

---

## Task 9: Dashboard /dashboard/companies Page

**Files:**

- Create: `frontend/src/app/dashboard/companies/page.tsx`

- [x] **Step 1: Создать страницу "Мои компании"**

```tsx
// frontend/src/app/dashboard/companies/page.tsx
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'
import { StatusBadge } from '@/components/company/StatusBadge'
import { Button } from '@/components/ui/button'

export default observer(function DashboardCompaniesPage() {
  const { company, auth } = useStores()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated === false) {
      router.push('/login')
      return
    }
    if (auth.isAuthenticated) {
      company.fetchMyCompanies()
    }
  }, [auth.isAuthenticated, company, router])

  if (!auth.isAuthenticated) return null

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Мои компании</h1>
        <Link href="/dashboard/companies/new">
          <Button>Создать компанию</Button>
        </Link>
      </div>

      {company.isLoading && <p className="text-muted-foreground">Загрузка...</p>}

      {company.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive mb-4">
          {company.error}
        </p>
      )}

      {!company.isLoading && company.myCompanies.length === 0 && !company.error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">У вас пока нет компаний</p>
          <Link href="/dashboard/companies/new">
            <Button>Создать первую компанию</Button>
          </Link>
        </div>
      )}

      <div className="grid gap-4">
        {company.myCompanies.map((c) => (
          <div key={c.documentId} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {[c.city, c.country].filter(Boolean).join(', ')}
                </p>
                {c.status === 'rejected' && (
                  <p className="text-xs text-destructive mt-1">
                    Исправьте замечания и повторно отправьте на модерацию
                  </p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {(c.status === 'draft' || c.status === 'rejected') && (
                  <Link href={`/dashboard/companies/${c.documentId}/edit`}>
                    <Button variant="outline" size="sm">
                      Редактировать
                    </Button>
                  </Link>
                )}
                {c.status === 'draft' && (
                  <Button
                    size="sm"
                    onClick={() => company.submitCompany(c.documentId)}
                    disabled={company.isLoading}
                  >
                    На модерацию
                  </Button>
                )}
                {(c.status === 'draft' || c.status === 'rejected') && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => company.deleteCompany(c.documentId)}
                    disabled={company.isLoading}
                  >
                    Удалить
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
})
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/companies/page.tsx
git commit -m "feat(frontend): add dashboard my companies page"
```

---

## Task 10: Create Company Page

**Files:**

- Create: `frontend/src/app/dashboard/companies/new/page.tsx`

- [x] **Step 1: Создать страницу создания компании**

```tsx
// frontend/src/app/dashboard/companies/new/page.tsx
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'
import { CompanyForm } from '@/components/company/CompanyForm'
import type { CompanyCreateInput } from '@/types/api'

export default observer(function NewCompanyPage() {
  const { company, auth } = useStores()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated === false) router.push('/login')
  }, [auth.isAuthenticated, router])

  if (!auth.isAuthenticated) return null

  const handleSubmit = async (data: CompanyCreateInput) => {
    await company.createCompany(data)
    router.push('/dashboard/companies')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Создать компанию</h1>
      <CompanyForm onSubmit={handleSubmit} isLoading={company.isLoading} error={company.error} />
    </div>
  )
})
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/companies/new/page.tsx
git commit -m "feat(frontend): add create company page"
```

---

## Task 11: Edit Company Page

**Files:**

- Create: `frontend/src/app/dashboard/companies/[id]/edit/page.tsx`

- [x] **Step 1: Создать страницу редактирования компании**

```tsx
// frontend/src/app/dashboard/companies/[id]/edit/page.tsx
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useParams, useRouter } from 'next/navigation'
import { useStores } from '@/stores/StoreProvider'
import { CompanyForm } from '@/components/company/CompanyForm'
import type { CompanyCreateInput } from '@/types/api'
import type { CompanyFormData } from '@/components/company/CompanyForm'

export default observer(function EditCompanyPage() {
  const { id } = useParams<{ id: string }>()
  const { company, auth } = useStores()
  const router = useRouter()

  useEffect(() => {
    if (auth.isAuthenticated === false) {
      router.push('/login')
      return
    }
    if (auth.isAuthenticated && id) {
      company.fetchCompanyById(id)
    }
  }, [auth.isAuthenticated, id, company, router])

  if (!auth.isAuthenticated) return null

  if (company.isLoading && !company.currentCompany) {
    return <p className="text-muted-foreground text-center py-12">Загрузка...</p>
  }

  if (!company.currentCompany && !company.isLoading) {
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        Компания не найдена
      </p>
    )
  }

  const c = company.currentCompany
  if (!c) return null

  const defaultValues: Partial<CompanyFormData> = {
    name: c.name,
    description: c.description ?? '',
    country: c.country,
    city: c.city ?? '',
    companySize: c.companySize,
    website: c.website ?? '',
    telegram: c.telegram ?? '',
    linkedin: c.linkedin ?? '',
  }

  const handleSubmit = async (data: CompanyCreateInput) => {
    await company.updateCompany(id, data)
    router.push('/dashboard/companies')
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Редактировать компанию</h1>
      <CompanyForm
        defaultValues={defaultValues}
        onSubmit={handleSubmit}
        isLoading={company.isLoading}
        error={company.error}
      />
    </div>
  )
})
```

- [x] **Step 2: Проверить TypeScript**

```bash
cd frontend && pnpm typecheck
```

Ожидаемый результат: `0 errors`

- [x] **Step 3: Запустить все тесты**

```bash
cd frontend && pnpm test
```

Ожидаемый результат: все тесты — PASS

- [x] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/companies/[id]/edit/page.tsx
git commit -m "feat(frontend): add edit company page"
```

---

## Финальная проверка

- [x] **Step 1: Полный typecheck и тесты**

```bash
cd frontend && pnpm typecheck && pnpm test
```

Ожидаемый результат: `0 errors`, все тесты — PASS

- [x] **Step 2: Запустить dev-сервер и проверить страницы вручную**

```bash
cd frontend && pnpm dev
```

Проверить:

- `http://localhost:3000/companies` — публичный список загружается (или показывает "не найдено")
- `http://localhost:3000/dashboard/companies` — редирект на `/login` если не авторизован
- `http://localhost:3000/dashboard/companies/new` — форма создания компании рендерится
- TypeScript не жалуется ни на один из файлов

---

## Self-Review: Покрытие Sprint 2 Frontend

| Задача из sprint-plan.md                                          | Задача в плане   |
| ----------------------------------------------------------------- | ---------------- |
| CompanyStore: список, текущая компания, CRUD-методы               | Task 3           |
| Страница `/companies` — список с поиском и фильтром по стране     | Task 7           |
| Компонент: CompanyCard (лого, название, статус, размер, страна)   | Task 5           |
| Страница `/companies/:id` — полная карточка компании              | Task 8           |
| Страница `/dashboard/companies` — мои компании (список + статусы) | Task 9           |
| Форма: создать/редактировать компанию (все поля)                  | Task 6           |
| Статус-badge: draft / на модерации / опубликована / отклонена     | Task 4           |
| Страницы create/edit компании                                     | Task 10, Task 11 |

**Примечание по логотипу:** Загрузка файла логотипа не включена — бэкенд (контроллер `create`/`update`) не принимает медиафайлы в текущей реализации Sprint 2. Поле `logo` будет добавлено в Sprint 3 вместе с поддержкой загрузки файлов на бэкенде.
