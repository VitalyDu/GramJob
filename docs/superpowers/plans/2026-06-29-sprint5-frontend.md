# Sprint 5 Frontend (Favorites, Saved Searches, Blocks, Reports) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend for Favorites, Saved Searches, Blocks, and Reports features implemented in Sprint 5 Backend.

**Architecture:** New MobX stores (FavoriteStore, SavedSearchStore, BlockStore) follow the exact same pattern as ApplicationStore/ResumeStore — `makeAutoObservable`, `runInAction`, `api.get/post/delete` calls. New dashboard pages follow the `page.tsx` + `XxxClient.tsx` (observer) pattern. Action buttons (FavoriteButton, BlockButton, ReportDialog) are small client components integrated into existing detail pages.

**Tech Stack:** Next.js 15, MobX 6, Vitest, React 19, TypeScript strict + `noUncheckedIndexedAccess`, TailwindCSS 4

---

## File Structure

**Create:**

- `frontend/src/types/api.ts` — append Sprint 5 types (Favorite, SavedSearch, Block, Report)
- `frontend/src/stores/FavoriteStore.ts` + `FavoriteStore.test.ts`
- `frontend/src/stores/SavedSearchStore.ts` + `SavedSearchStore.test.ts`
- `frontend/src/stores/BlockStore.ts` + `BlockStore.test.ts`
- `frontend/src/components/favorite/FavoriteButton.tsx`
- `frontend/src/components/saved-search/SaveSearchButton.tsx`
- `frontend/src/components/report/ReportDialog.tsx`
- `frontend/src/components/block/BlockButton.tsx`
- `frontend/src/app/dashboard/favorites/page.tsx` + `MyFavoritesClient.tsx`
- `frontend/src/app/dashboard/saved-searches/page.tsx` + `MySavedSearchesClient.tsx`
- `frontend/src/app/dashboard/blocks/page.tsx` + `MyBlocksClient.tsx`

**Modify:**

- `frontend/src/stores/RootStore.ts` — add favorite, savedSearch, block stores
- `frontend/src/app/vacancies/VacanciesClient.tsx` — add SaveSearchButton
- `frontend/src/app/resumes/ResumesClient.tsx` — add SaveSearchButton
- `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx` — add FavoriteButton + ReportDialog + BlockButton
- `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx` — add FavoriteButton + ReportDialog + BlockButton
- `frontend/src/app/companies/[id]/CompanyDetailClient.tsx` — add FavoriteButton + ReportDialog

---

## Key Patterns

**Test runner:** `cd frontend && pnpm test -- --run`  
**TypeScript check:** `cd frontend && pnpm tsc --noEmit`

**Store pattern:**

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import { api, ApiClientError } from '@/services/api'

export class XxxStore {
  items: Item[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchItems(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Item[]; meta: Meta }>('/endpoint')
      runInAction(() => {
        this.items = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Error'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
```

**Test pattern:**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
vi.mock('@/services/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}))
import { api } from '@/services/api'
import { XxxStore } from './XxxStore'
```

**exactOptionalPropertyTypes:** Use conditional spread for optional fields:

```typescript
// CORRECT
{ ...(name ? { name } : {}) }
// WRONG — rejected by TS strict
{ name: name || undefined }
```

**API endpoints (Sprint 5 backend):**

- `GET /favorites?type=vacancy&page=1&pageSize=20` → `{ data: Favorite[], meta }`
- `POST /favorites { type, targetId }` → 201 or 409 ALREADY_FAVORITED
- `DELETE /favorites/:targetType/:targetId` → 204
- `GET /saved-searches?page=1&pageSize=20` → `{ data: SavedSearch[], meta }`
- `POST /saved-searches { type, filters, name? }` → 201
- `DELETE /saved-searches/:id` → 204
- `GET /blocks?page=1&pageSize=20` → `{ data: Block[], meta }`
- `POST /blocks { targetType, targetId }` → 201 or 409 ALREADY_BLOCKED
- `DELETE /blocks/:id` → 204
- `POST /reports { type, targetId, reason, comment? }` → 201

---

## Task 1: API Types for Sprint 5 Entities

**Files:**

- Modify: `frontend/src/types/api.ts` (append at end + add `postedBy` to Vacancy)

- [ ] **Step 1: Add `postedBy` field to the Vacancy interface**

Find the Vacancy interface (around line 164) and add one field before the closing brace:

```typescript
  // existing last line before closing brace:
  company: VacancyCompanyRef
  // ADD:
  postedBy?: { id: number; firstName: string; lastName: string } | null
}
```

The full Vacancy interface tail becomes:

```typescript
  company: VacancyCompanyRef
  postedBy?: { id: number; firstName: string; lastName: string } | null
}
```

- [ ] **Step 2: Append Sprint 5 types at the end of `frontend/src/types/api.ts`**

```typescript
// --- Favorite ---

export type FavoriteType = 'vacancy' | 'resume' | 'company'

export interface FavoriteVacancyCard {
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
  urgent: boolean
  topPlacement: boolean
  highlighted: boolean
  sourceType: SourceTypeEnum
  status: VacancyStatusEnum
  expiresAt?: string | null
  createdAt: string
  industry?: IndustryRef | null
  specialization?: SpecializationRef | null
  company: VacancyCompanyRef
}

export interface FavoriteResumeCard {
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
  skills?: string[] | null
  views?: number
  status: ResumeStatusEnum
  createdAt: string
}

export interface FavoriteCompanyCard {
  documentId: string
  name: string
  slug: string
  country: string
  city?: string | null
  companySize: CompanySizeEnum
  status: CompanyStatusEnum
  createdAt: string
  logo?: StrapiMedia | null
}

export type FavoriteEntity = FavoriteVacancyCard | FavoriteResumeCard | FavoriteCompanyCard | null

export interface Favorite {
  documentId: string
  type: FavoriteType
  targetId: string
  entity: FavoriteEntity
  createdAt: string
}

export interface FavoriteCreateInput {
  type: FavoriteType
  targetId: string
}

// --- Saved Search ---

export type SavedSearchType = 'vacancy' | 'resume'

export type SavedSearchFilters = Record<string, string | number | boolean | undefined>

export interface SavedSearch {
  documentId: string
  name?: string | null
  type: SavedSearchType
  filters: SavedSearchFilters
  lastNotifiedAt?: string | null
  createdAt: string
}

export interface SavedSearchCreateInput {
  type: SavedSearchType
  filters: SavedSearchFilters
  name?: string
}

// --- Block ---

export type BlockTargetType = 'employer' | 'candidate'

export interface Block {
  documentId: string
  targetType: BlockTargetType
  targetId: number
  createdAt: string
}

export interface BlockCreateInput {
  targetType: BlockTargetType
  targetId: number
}

// --- Report ---

export type ReportType = 'vacancy' | 'resume' | 'company' | 'user'

export type ReportReason = 'spam' | 'fraud' | 'inappropriate' | 'other'

export interface ReportCreateInput {
  type: ReportType
  targetId: string
  reason: ReportReason
  comment?: string
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd frontend && pnpm tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(sprint5): add API types for Favorites, SavedSearches, Blocks, Reports"
```

---

## Task 2: FavoriteStore + Tests

**Files:**

- Create: `frontend/src/stores/FavoriteStore.ts`
- Create: `frontend/src/stores/FavoriteStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/stores/FavoriteStore.test.ts`:

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
      delete: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { FavoriteStore } from './FavoriteStore'

const mockVacancyEntity = {
  documentId: 'vac456',
  title: 'Senior Developer',
  country: 'RU',
  workFormat: 'remote' as const,
  employmentType: 'full-time' as const,
  seniority: 'senior' as const,
  urgent: false,
  topPlacement: false,
  highlighted: false,
  sourceType: 'internal' as const,
  status: 'published' as const,
  createdAt: '2026-01-01T00:00:00Z',
  company: { documentId: 'comp1', name: 'Test Co', slug: 'test-co' },
}

const mockFavorite = {
  documentId: 'fav123',
  type: 'vacancy' as const,
  targetId: 'vac456',
  entity: mockVacancyEntity,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockFavorite],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('FavoriteStore', () => {
  let store: FavoriteStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new FavoriteStore()
  })

  describe('fetchFavorites', () => {
    it('fetches favorites and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchFavorites()
      expect(store.favorites).toHaveLength(1)
      expect(store.favorites[0]?.documentId).toBe('fav123')
      expect(store.total).toBe(1)
      expect(store.page).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes type filter to API URL', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchFavorites('vacancy')
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('type=vacancy')
    })

    it('does not include type in URL when not provided', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, pageSize: 20, pageCount: 0 },
      })
      await store.fetchFavorites()
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).not.toContain('type=')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchFavorites()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('addFavorite', () => {
    it('calls POST /favorites successfully', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockFavorite })
      await store.addFavorite({ type: 'vacancy', targetId: 'vac456' })
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/favorites', {
        type: 'vacancy',
        targetId: 'vac456',
      })
      expect(store.alreadyFavorited).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('sets alreadyFavorited on ALREADY_FAVORITED code', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_FAVORITED' } }, 'Already favorited')
      )
      await store.addFavorite({ type: 'vacancy', targetId: 'vac456' })
      expect(store.alreadyFavorited).toBe(true)
      expect(store.error).toBeNull()
    })

    it('sets error and rethrows on other failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.addFavorite({ type: 'vacancy', targetId: 'vac456' })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeFavorite', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchFavorites()
    })

    it('calls DELETE and removes from list', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeFavorite('vacancy', 'vac456')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/favorites/vacancy/vac456')
      expect(store.favorites).toHaveLength(0)
    })

    it('sets error and rethrows on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeFavorite('vacancy', 'vac456')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.favorites).toHaveLength(1)
    })
  })

  describe('clearFlags', () => {
    it('resets alreadyFavorited to false', () => {
      store.alreadyFavorited = true
      store.clearFlags()
      expect(store.alreadyFavorited).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 45, page: 1, pageSize: 20, pageCount: 3 },
      })
      await store.fetchFavorites()
      expect(store.pageCount).toBe(3)
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd frontend && pnpm test -- --run FavoriteStore`  
Expected: FAIL with "Cannot find module './FavoriteStore'"

- [ ] **Step 3: Implement FavoriteStore**

Create `frontend/src/stores/FavoriteStore.ts`:

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { Favorite, FavoriteCreateInput, FavoriteType } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type FavMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class FavoriteStore {
  favorites: Favorite[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  alreadyFavorited = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchFavorites(type?: FavoriteType, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(this.pageSize) })
      if (type) params.set('type', type)
      const res = await api.get<{ data: Favorite[]; meta: FavMeta }>(`/favorites?${params}`)
      runInAction(() => {
        this.favorites = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch favorites'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async addFavorite(input: FavoriteCreateInput): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.alreadyFavorited = false
    })
    try {
      await api.post<{ data: Favorite }>('/favorites', input)
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'ALREADY_FAVORITED') {
          runInAction(() => {
            this.alreadyFavorited = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to add favorite'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeFavorite(type: FavoriteType, targetId: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/favorites/${type}/${targetId}`)
      runInAction(() => {
        this.favorites = this.favorites.filter((f) => !(f.type === type && f.targetId === targetId))
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove favorite'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.alreadyFavorited = false
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd frontend && pnpm test -- --run FavoriteStore`  
Expected: 11 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/FavoriteStore.ts frontend/src/stores/FavoriteStore.test.ts
git commit -m "feat(sprint5): add FavoriteStore with tests"
```

---

## Task 3: SavedSearchStore + Tests

**Files:**

- Create: `frontend/src/stores/SavedSearchStore.ts`
- Create: `frontend/src/stores/SavedSearchStore.test.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/stores/SavedSearchStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { SavedSearchStore } from './SavedSearchStore'

const mockSearch = {
  documentId: 'ss123',
  name: 'Remote TypeScript jobs',
  type: 'vacancy' as const,
  filters: { workFormat: 'remote', employmentType: 'full-time' },
  lastNotifiedAt: null,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockSearch],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('SavedSearchStore', () => {
  let store: SavedSearchStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new SavedSearchStore()
  })

  describe('fetchSavedSearches', () => {
    it('fetches and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()
      expect(store.searches).toHaveLength(1)
      expect(store.searches[0]?.documentId).toBe('ss123')
      expect(store.total).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes page param to API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches(2)
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('page=2')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchSavedSearches()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createSavedSearch', () => {
    it('creates search, prepends to list, increments total', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()

      const newSearch = { ...mockSearch, documentId: 'ss999', name: 'New search' }
      vi.mocked(api.post).mockResolvedValue({ data: newSearch })

      const result = await store.createSavedSearch({
        type: 'vacancy',
        filters: { workFormat: 'remote' },
      })
      expect(result.documentId).toBe('ss999')
      expect(store.searches[0]?.documentId).toBe('ss999')
      expect(store.total).toBe(2)
      expect(store.isLoading).toBe(false)
    })

    it('throws and sets error on failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.createSavedSearch({ type: 'vacancy', filters: {} })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeSavedSearch', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchSavedSearches()
    })

    it('removes search from list and decrements total', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeSavedSearch('ss123')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/saved-searches/ss123')
      expect(store.searches).toHaveLength(0)
      expect(store.total).toBe(0)
    })

    it('throws and sets error on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeSavedSearch('ss123')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.searches).toHaveLength(1)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 40, page: 1, pageSize: 20, pageCount: 2 },
      })
      await store.fetchSavedSearches()
      expect(store.pageCount).toBe(2)
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd frontend && pnpm test -- --run SavedSearchStore`  
Expected: FAIL with "Cannot find module './SavedSearchStore'"

- [ ] **Step 3: Implement SavedSearchStore**

Create `frontend/src/stores/SavedSearchStore.ts`:

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { SavedSearch, SavedSearchCreateInput } from '@/types/api'
import { api } from '@/services/api'

type SearchMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class SavedSearchStore {
  searches: SavedSearch[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchSavedSearches(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: SavedSearch[]; meta: SearchMeta }>(
        `/saved-searches?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.searches = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch saved searches'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createSavedSearch(input: SavedSearchCreateInput): Promise<SavedSearch> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ data: SavedSearch }>('/saved-searches', input)
      runInAction(() => {
        this.searches.unshift(res.data)
        this.total += 1
      })
      return res.data
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to save search'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeSavedSearch(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/saved-searches/${id}`)
      runInAction(() => {
        this.searches = this.searches.filter((s) => s.documentId !== id)
        this.total = Math.max(0, this.total - 1)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove saved search'
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

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd frontend && pnpm test -- --run SavedSearchStore`  
Expected: 10 tests passing

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/SavedSearchStore.ts frontend/src/stores/SavedSearchStore.test.ts
git commit -m "feat(sprint5): add SavedSearchStore with tests"
```

---

## Task 4: BlockStore + Tests + RootStore Update

**Files:**

- Create: `frontend/src/stores/BlockStore.ts`
- Create: `frontend/src/stores/BlockStore.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`

- [ ] **Step 1: Write failing test**

Create `frontend/src/stores/BlockStore.test.ts`:

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
      delete: vi.fn(),
    },
    ApiClientError,
  }
})

import { api, ApiClientError } from '@/services/api'
import { BlockStore } from './BlockStore'

const mockBlock = {
  documentId: 'blk123',
  targetType: 'employer' as const,
  targetId: 42,
  createdAt: '2026-01-01T00:00:00Z',
}

const mockListResponse = {
  data: [mockBlock],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('BlockStore', () => {
  let store: BlockStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new BlockStore()
  })

  describe('fetchBlocks', () => {
    it('fetches blocks and updates state', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks()
      expect(store.blocks).toHaveLength(1)
      expect(store.blocks[0]?.documentId).toBe('blk123')
      expect(store.total).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('passes page param to API', async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks(3)
      const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
      expect(url).toContain('page=3')
    })

    it('sets error on failure', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchBlocks()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('createBlock', () => {
    it('calls POST /blocks successfully', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: mockBlock })
      await store.createBlock({ targetType: 'employer', targetId: 42 })
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/blocks', {
        targetType: 'employer',
        targetId: 42,
      })
      expect(store.alreadyBlocked).toBe(false)
      expect(store.isLoading).toBe(false)
    })

    it('sets alreadyBlocked on ALREADY_BLOCKED code', async () => {
      vi.mocked(api.post).mockRejectedValue(
        new ApiClientError(409, { error: { code: 'ALREADY_BLOCKED' } }, 'Already blocked')
      )
      await store.createBlock({ targetType: 'employer', targetId: 42 })
      expect(store.alreadyBlocked).toBe(true)
      expect(store.error).toBeNull()
    })

    it('sets error and rethrows on other failure', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Server error'))
      await expect(store.createBlock({ targetType: 'employer', targetId: 42 })).rejects.toThrow(
        'Server error'
      )
      expect(store.error).toBe('Server error')
    })
  })

  describe('removeBlock', () => {
    beforeEach(async () => {
      vi.mocked(api.get).mockResolvedValue(mockListResponse)
      await store.fetchBlocks()
    })

    it('removes block from list and decrements total', async () => {
      vi.mocked(api.delete).mockResolvedValue(undefined)
      await store.removeBlock('blk123')
      expect(vi.mocked(api.delete)).toHaveBeenCalledWith('/blocks/blk123')
      expect(store.blocks).toHaveLength(0)
      expect(store.total).toBe(0)
    })

    it('sets error and rethrows on failure', async () => {
      vi.mocked(api.delete).mockRejectedValue(new Error('Not found'))
      await expect(store.removeBlock('blk123')).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
      expect(store.blocks).toHaveLength(1)
    })
  })

  describe('clearFlags', () => {
    it('resets alreadyBlocked to false', () => {
      store.alreadyBlocked = true
      store.clearFlags()
      expect(store.alreadyBlocked).toBe(false)
    })
  })

  describe('pageCount', () => {
    it('computes pageCount from total and pageSize', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [],
        meta: { total: 60, page: 1, pageSize: 20, pageCount: 3 },
      })
      await store.fetchBlocks()
      expect(store.pageCount).toBe(3)
    })
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

Run: `cd frontend && pnpm test -- --run BlockStore`  
Expected: FAIL with "Cannot find module './BlockStore'"

- [ ] **Step 3: Implement BlockStore**

Create `frontend/src/stores/BlockStore.ts`:

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { Block, BlockCreateInput } from '@/types/api'
import { api, ApiClientError } from '@/services/api'

type BlockMeta = { total: number; page: number; pageSize: number; pageCount: number }

export class BlockStore {
  blocks: Block[] = []
  isLoading = false
  error: string | null = null
  total = 0
  page = 1
  pageSize = 20
  alreadyBlocked = false

  constructor() {
    makeAutoObservable(this)
  }

  get pageCount(): number {
    return this.pageSize > 0 ? Math.ceil(this.total / this.pageSize) : 0
  }

  async fetchBlocks(page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: Block[]; meta: BlockMeta }>(
        `/blocks?page=${page}&pageSize=${this.pageSize}`
      )
      runInAction(() => {
        this.blocks = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch blocks'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async createBlock(input: BlockCreateInput): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.alreadyBlocked = false
    })
    try {
      await api.post<{ data: Block }>('/blocks', input)
    } catch (e) {
      if (e instanceof ApiClientError) {
        const body = e.data as { error?: { code?: string } } | null
        if (body?.error?.code === 'ALREADY_BLOCKED') {
          runInAction(() => {
            this.alreadyBlocked = true
          })
          return
        }
      }
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to block user'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async removeBlock(id: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      await api.delete(`/blocks/${id}`)
      runInAction(() => {
        this.blocks = this.blocks.filter((b) => b.documentId !== id)
        this.total = Math.max(0, this.total - 1)
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to remove block'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearFlags(): void {
    this.alreadyBlocked = false
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

Run: `cd frontend && pnpm test -- --run BlockStore`  
Expected: 11 tests passing

- [ ] **Step 5: Update RootStore**

Modify `frontend/src/stores/RootStore.ts` — full file replacement:

```typescript
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'
import { FavoriteStore } from './FavoriteStore'
import { SavedSearchStore } from './SavedSearchStore'
import { BlockStore } from './BlockStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore
  favorite: FavoriteStore
  savedSearch: SavedSearchStore
  block: BlockStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
    this.favorite = new FavoriteStore()
    this.savedSearch = new SavedSearchStore()
    this.block = new BlockStore()
  }
}

export const rootStore = new RootStore()
```

- [ ] **Step 6: Run all tests and typecheck**

Run: `cd frontend && pnpm tsc --noEmit && pnpm test -- --run`  
Expected: 0 TypeScript errors, all tests passing (previous 209 + ~32 new = ~241)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/stores/BlockStore.ts frontend/src/stores/BlockStore.test.ts frontend/src/stores/RootStore.ts
git commit -m "feat(sprint5): add BlockStore with tests and update RootStore"
```

---

## Task 5: FavoriteButton Component + My Favorites Dashboard Page

**Files:**

- Create: `frontend/src/components/favorite/FavoriteButton.tsx`
- Create: `frontend/src/app/dashboard/favorites/page.tsx`
- Create: `frontend/src/app/dashboard/favorites/MyFavoritesClient.tsx`

- [ ] **Step 1: Create FavoriteButton component**

Create `frontend/src/components/favorite/FavoriteButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { FavoriteType } from '@/types/api'

interface Props {
  type: FavoriteType
  targetId: string
  initialIsFavorited?: boolean
}

export const FavoriteButton = observer(function FavoriteButton({
  type,
  targetId,
  initialIsFavorited = false,
}: Props) {
  const { favorite: store, auth } = useStores()
  const [isFavorited, setIsFavorited] = useState(initialIsFavorited)

  if (!auth.user) return null

  const handleToggle = async () => {
    if (isFavorited) {
      try {
        await store.removeFavorite(type, targetId)
        setIsFavorited(false)
      } catch {
        // error shown via store.error
      }
    } else {
      await store.addFavorite({ type, targetId })
      if (!store.error) {
        setIsFavorited(true)
        store.clearFlags()
      }
    }
  }

  return (
    <button
      onClick={() => void handleToggle()}
      disabled={store.isLoading}
      title={isFavorited ? 'Убрать из избранного' : 'Добавить в избранное'}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${
        isFavorited
          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
      }`}
    >
      {isFavorited ? '★ В избранном' : '☆ В избранное'}
    </button>
  )
})
```

- [ ] **Step 2: Create the page wrapper**

Create `frontend/src/app/dashboard/favorites/page.tsx`:

```typescript
import { MyFavoritesClient } from './MyFavoritesClient'

export default function MyFavoritesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MyFavoritesClient />
    </div>
  )
}
```

- [ ] **Step 3: Create MyFavoritesClient**

Create `frontend/src/app/dashboard/favorites/MyFavoritesClient.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import type { FavoriteType, FavoriteVacancyCard, FavoriteResumeCard, FavoriteCompanyCard } from '@/types/api'
import { formatSalary, WORK_FORMAT_LABELS } from '@/lib/vacancy-utils'
import { COMPANY_SIZE_LABELS } from '@/lib/company-utils'
import { RESUME_WORK_FORMAT_LABELS } from '@/lib/resume-utils'

const TABS: { label: string; value: FavoriteType | undefined }[] = [
  { label: 'Все', value: undefined },
  { label: 'Вакансии', value: 'vacancy' },
  { label: 'Резюме', value: 'resume' },
  { label: 'Компании', value: 'company' },
]

export const MyFavoritesClient = observer(function MyFavoritesClient() {
  const { favorite: store } = useStores()
  const [activeType, setActiveType] = useState<FavoriteType | undefined>(undefined)

  useEffect(() => {
    void store.fetchFavorites(activeType)
  }, [store, activeType])

  const handleTabChange = (type: FavoriteType | undefined) => {
    setActiveType(type)
  }

  const handleRemove = (type: FavoriteType, targetId: string) => {
    void store.removeFavorite(type, targetId)
  }

  const handlePageChange = (page: number) => {
    void store.fetchFavorites(activeType, page)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Избранное</h1>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleTabChange(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              activeType === tab.value
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.favorites.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">В избранном пусто.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.favorites.map((fav) => (
          <div key={fav.documentId} className="relative rounded-xl border border-gray-200 bg-white p-4">
            <button
              onClick={() => handleRemove(fav.type, fav.targetId)}
              disabled={store.isLoading}
              title="Убрать из избранного"
              className="absolute right-3 top-3 text-sm text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              ✕
            </button>

            {fav.type === 'vacancy' && fav.entity ? (
              <Link href={`/vacancies/${fav.targetId}`} className="block pr-8">
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteVacancyCard).title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {(fav.entity as FavoriteVacancyCard).company?.name}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {WORK_FORMAT_LABELS[(fav.entity as FavoriteVacancyCard).workFormat]} ·{' '}
                  {(fav.entity as FavoriteVacancyCard).country}
                  {(() => {
                    const e = fav.entity as FavoriteVacancyCard
                    const salary = formatSalary(e.salaryFrom, e.salaryTo, e.salaryCurrency)
                    return salary ? ` · ${salary}` : ''
                  })()}
                </p>
              </Link>
            ) : fav.type === 'resume' && fav.entity ? (
              <Link href={`/resumes/${fav.targetId}`} className="block pr-8">
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteResumeCard).title}
                </p>
                <p className="mt-0.5 text-sm text-gray-500">
                  {(fav.entity as FavoriteResumeCard).firstName}{' '}
                  {(fav.entity as FavoriteResumeCard).lastName}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {RESUME_WORK_FORMAT_LABELS[(fav.entity as FavoriteResumeCard).workFormat]} ·{' '}
                  {(fav.entity as FavoriteResumeCard).country}
                </p>
              </Link>
            ) : fav.type === 'company' && fav.entity ? (
              <Link href={`/companies/${fav.targetId}`} className="block pr-8">
                <p className="font-semibold text-gray-900">
                  {(fav.entity as FavoriteCompanyCard).name}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {COMPANY_SIZE_LABELS[(fav.entity as FavoriteCompanyCard).companySize]} ·{' '}
                  {(fav.entity as FavoriteCompanyCard).country}
                </p>
              </Link>
            ) : (
              <p className="pr-8 text-sm text-gray-400">Элемент удалён или недоступен</p>
            )}
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

- [ ] **Step 4: Verify TypeScript**

Run: `cd frontend && pnpm tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/favorite/FavoriteButton.tsx \
        frontend/src/app/dashboard/favorites/page.tsx \
        frontend/src/app/dashboard/favorites/MyFavoritesClient.tsx
git commit -m "feat(sprint5): add FavoriteButton and My Favorites dashboard page"
```

---

## Task 6: My Saved Searches Page + SaveSearchButton Integration

**Files:**

- Create: `frontend/src/components/saved-search/SaveSearchButton.tsx`
- Create: `frontend/src/app/dashboard/saved-searches/page.tsx`
- Create: `frontend/src/app/dashboard/saved-searches/MySavedSearchesClient.tsx`
- Modify: `frontend/src/app/vacancies/VacanciesClient.tsx`
- Modify: `frontend/src/app/resumes/ResumesClient.tsx`

- [ ] **Step 1: Create SaveSearchButton**

Create `frontend/src/components/saved-search/SaveSearchButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { SavedSearchType, SavedSearchFilters } from '@/types/api'

interface Props {
  searchType: SavedSearchType
  filters: SavedSearchFilters
}

export const SaveSearchButton = observer(function SaveSearchButton({ searchType, filters }: Props) {
  const { savedSearch: store, auth } = useStores()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  if (!auth.user) return null

  const handleSave = async () => {
    await store.createSavedSearch({
      type: searchType,
      filters,
      ...(name.trim() ? { name: name.trim() } : {}),
    })
    setSaved(true)
    setShowForm(false)
    setName('')
  }

  if (saved) {
    return <span className="text-sm text-green-600">Поиск сохранён ✓</span>
  }

  if (showForm) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название (необязательно)"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={() => void handleSave()}
          disabled={store.isLoading}
          className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {store.isLoading ? '...' : 'Сохранить'}
        </button>
        <button
          onClick={() => {
            setShowForm(false)
            setName('')
          }}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Отмена
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setShowForm(true)}
      className="rounded-md border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
    >
      Сохранить поиск
    </button>
  )
})
```

- [ ] **Step 2: Create page wrapper**

Create `frontend/src/app/dashboard/saved-searches/page.tsx`:

```typescript
import { MySavedSearchesClient } from './MySavedSearchesClient'

export default function MySavedSearchesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MySavedSearchesClient />
    </div>
  )
}
```

- [ ] **Step 3: Create MySavedSearchesClient**

Create `frontend/src/app/dashboard/saved-searches/MySavedSearchesClient.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

const TYPE_LABELS = { vacancy: 'Вакансии', resume: 'Резюме' }

function filtersToQueryString(filters: Record<string, string | number | boolean | undefined>): string {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value))
    }
  }
  return params.toString()
}

export const MySavedSearchesClient = observer(function MySavedSearchesClient() {
  const { savedSearch: store } = useStores()

  useEffect(() => {
    void store.fetchSavedSearches()
  }, [store])

  const handleRemove = (id: string) => {
    if (!window.confirm('Удалить сохранённый поиск?')) return
    void store.removeSavedSearch(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchSavedSearches(page)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Сохранённые поиски</h1>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.searches.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет сохранённых поисков.</p>
          <p className="mt-2 text-xs text-gray-400">
            Используйте кнопку «Сохранить поиск» на странице вакансий или резюме.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {store.searches.map((s) => {
          const basePath = s.type === 'vacancy' ? '/vacancies' : '/resumes'
          const qs = filtersToQueryString(s.filters)
          const href = qs ? `${basePath}?${qs}` : basePath

          return (
            <div key={s.documentId} className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {TYPE_LABELS[s.type]}
                    </span>
                    <p className="truncate font-medium text-gray-900">
                      {s.name ?? 'Без названия'}
                    </p>
                  </div>

                  <p className="mt-1 text-xs text-gray-400">
                    Создан {new Date(s.createdAt).toLocaleDateString('ru')}
                    {s.lastNotifiedAt &&
                      ` · последнее уведомление ${new Date(s.lastNotifiedAt).toLocaleDateString('ru')}`}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={href}
                    className="rounded-md border border-indigo-200 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50"
                  >
                    Открыть
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemove(s.documentId)}
                    disabled={store.isLoading}
                  >
                    Удалить
                  </Button>
                </div>
              </div>
            </div>
          )
        })}
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

- [ ] **Step 4: Add SaveSearchButton to VacanciesClient**

Modify `frontend/src/app/vacancies/VacanciesClient.tsx`:

Add import at top of imports block:

```typescript
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
```

In the JSX, find the line with `<VacancyFilters .../>` and add SaveSearchButton after it:

```typescript
<VacancyFilters params={params} onChange={handleFiltersChange} />
<div className="flex items-center justify-end">
  <SaveSearchButton
    searchType="vacancy"
    filters={params as Record<string, string | number | boolean | undefined>}
  />
</div>
```

- [ ] **Step 5: Add SaveSearchButton to ResumesClient**

Modify `frontend/src/app/resumes/ResumesClient.tsx`:

Add import at top:

```typescript
import { SaveSearchButton } from '@/components/saved-search/SaveSearchButton'
```

Before the resume list (near the existing filter section), add the button. Find the filter section and add after it:

```typescript
<div className="flex items-center justify-end">
  <SaveSearchButton
    searchType="resume"
    filters={{
      ...(search ? { search } : {}),
      ...(country ? { country } : {}),
      ...(workFormat ? { workFormat } : {}),
      ...(employmentType ? { employmentType } : {}),
    }}
  />
</div>
```

- [ ] **Step 6: Verify TypeScript and tests**

Run: `cd frontend && pnpm tsc --noEmit && pnpm test -- --run`  
Expected: 0 TypeScript errors, all tests still passing

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/saved-search/SaveSearchButton.tsx \
        frontend/src/app/dashboard/saved-searches/page.tsx \
        frontend/src/app/dashboard/saved-searches/MySavedSearchesClient.tsx \
        frontend/src/app/vacancies/VacanciesClient.tsx \
        frontend/src/app/resumes/ResumesClient.tsx
git commit -m "feat(sprint5): add SaveSearchButton and My Saved Searches dashboard page"
```

---

## Task 7: ReportDialog + BlockButton + My Blocks Dashboard Page

**Files:**

- Create: `frontend/src/components/report/ReportDialog.tsx`
- Create: `frontend/src/components/block/BlockButton.tsx`
- Create: `frontend/src/app/dashboard/blocks/page.tsx`
- Create: `frontend/src/app/dashboard/blocks/MyBlocksClient.tsx`

- [ ] **Step 1: Create ReportDialog**

Create `frontend/src/components/report/ReportDialog.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useStores } from '@/stores/StoreProvider'
import { api } from '@/services/api'
import type { ReportType, ReportReason } from '@/types/api'
import { Button } from '@/components/ui/button'

const REASON_LABELS: Record<ReportReason, string> = {
  spam: 'Спам',
  fraud: 'Мошенничество',
  inappropriate: 'Неприемлемый контент',
  other: 'Другое',
}

interface Props {
  type: ReportType
  targetId: string
  isOpen: boolean
  onClose: () => void
}

export function ReportDialog({ type, targetId, isOpen, onClose }: Props) {
  const { auth } = useStores()
  const [reason, setReason] = useState<ReportReason>('spam')
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isOpen) return null
  if (!auth.user) return null

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await api.post('/reports', {
        type,
        targetId,
        reason,
        ...(comment.trim() ? { comment: comment.trim() } : {}),
      })
      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setSent(false)
    setComment('')
    setReason('spam')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {sent ? (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Жалоба отправлена</h2>
            <p className="mt-2 text-sm text-gray-600">
              Спасибо, мы рассмотрим жалобу в ближайшее время.
            </p>
            <Button className="mt-4" onClick={handleClose}>
              Закрыть
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-semibold text-gray-900">Пожаловаться</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Причина</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(Object.keys(REASON_LABELS) as ReportReason[]).map((r) => (
                    <option key={r} value={r}>
                      {REASON_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Комментарий (необязательно)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Опишите проблему подробнее..."
                />
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Button onClick={() => void handleSubmit()} disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Отправить'}
              </Button>
              <Button variant="outline" onClick={handleClose}>
                Отмена
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create BlockButton**

Create `frontend/src/components/block/BlockButton.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import type { BlockTargetType } from '@/types/api'

interface Props {
  targetType: BlockTargetType
  targetId: number
  initialIsBlocked?: boolean
}

export const BlockButton = observer(function BlockButton({
  targetType,
  targetId,
  initialIsBlocked = false,
}: Props) {
  const { block: store, auth } = useStores()
  const [isBlocked, setIsBlocked] = useState(initialIsBlocked)

  if (!auth.user) return null
  if (auth.user.id === targetId) return null

  const handleBlock = async () => {
    if (isBlocked) return
    if (
      !window.confirm(
        'Заблокировать этого пользователя? Его контент больше не будет отображаться в результатах поиска.'
      )
    )
      return
    await store.createBlock({ targetType, targetId })
    if (!store.error && !store.alreadyBlocked) {
      setIsBlocked(true)
    } else if (store.alreadyBlocked) {
      setIsBlocked(true)
      store.clearFlags()
    }
  }

  return (
    <button
      onClick={() => void handleBlock()}
      disabled={store.isLoading || isBlocked}
      className={`text-sm transition ${
        isBlocked ? 'cursor-default text-gray-400' : 'text-gray-500 hover:text-red-500'
      }`}
    >
      {isBlocked ? 'Заблокирован' : 'Заблокировать'}
    </button>
  )
})
```

- [ ] **Step 3: Create page wrapper**

Create `frontend/src/app/dashboard/blocks/page.tsx`:

```typescript
import { MyBlocksClient } from './MyBlocksClient'

export default function MyBlocksPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <MyBlocksClient />
    </div>
  )
}
```

- [ ] **Step 4: Create MyBlocksClient**

Create `frontend/src/app/dashboard/blocks/MyBlocksClient.tsx`:

```typescript
'use client'

import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'

const TARGET_TYPE_LABELS = { employer: 'Работодатель', candidate: 'Кандидат' }

export const MyBlocksClient = observer(function MyBlocksClient() {
  const { block: store } = useStores()

  useEffect(() => {
    void store.fetchBlocks()
  }, [store])

  const handleUnblock = (id: string) => {
    if (!window.confirm('Разблокировать этого пользователя?')) return
    void store.removeBlock(id)
  }

  const handlePageChange = (page: number) => {
    void store.fetchBlocks(page)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Заблокированные пользователи</h1>
        <p className="mt-1 text-sm text-gray-500">
          Контент заблокированных пользователей не отображается в результатах поиска.
        </p>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {!store.isLoading && store.blocks.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет заблокированных пользователей.</p>
        </div>
      )}

      <div className="space-y-3">
        {store.blocks.map((b) => (
          <div key={b.documentId} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4">
            <div>
              <p className="font-medium text-gray-900">
                {TARGET_TYPE_LABELS[b.targetType]} #{b.targetId}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                Заблокирован {new Date(b.createdAt).toLocaleDateString('ru')}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleUnblock(b.documentId)}
              disabled={store.isLoading}
            >
              Разблокировать
            </Button>
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

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && pnpm tsc --noEmit`  
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/report/ReportDialog.tsx \
        frontend/src/components/block/BlockButton.tsx \
        frontend/src/app/dashboard/blocks/page.tsx \
        frontend/src/app/dashboard/blocks/MyBlocksClient.tsx
git commit -m "feat(sprint5): add ReportDialog, BlockButton, and My Blocks dashboard page"
```

---

## Task 8: Integrate FavoriteButton + ReportDialog + BlockButton into Detail Pages

**Files:**

- Modify: `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`
- Modify: `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`
- Modify: `frontend/src/app/companies/[id]/CompanyDetailClient.tsx`

---

### 8a: VacancyDetailClient

- [ ] **Step 1: Add imports to VacancyDetailClient**

At the top of `frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx`, add three imports after the existing imports:

```typescript
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
```

- [ ] **Step 2: Add state for report dialog**

Inside the component function, after the existing `const [applyOpen, setApplyOpen] = useState(false)` line, add:

```typescript
const [reportOpen, setReportOpen] = useState(false)
```

- [ ] **Step 3: Add action buttons to the vacancy header area**

Find the `<div className="flex items-start justify-between gap-3">` block (contains `<h1>` and `<VacancyStatusBadge>`). After the closing `</div>` of this flex container, add the action row:

```typescript
{auth.user && (
  <div className="mt-3 flex flex-wrap items-center gap-3">
    <FavoriteButton type="vacancy" targetId={id} />
    <button
      onClick={() => setReportOpen(true)}
      className="text-sm text-gray-500 hover:text-red-500"
    >
      Пожаловаться
    </button>
    {v.postedBy && (
      <BlockButton targetType="employer" targetId={v.postedBy.id} />
    )}
  </div>
)}
```

- [ ] **Step 4: Add ReportDialog before the closing tag**

Just before the closing `</div>` of the root element (after the `<ApplyDialog ... />` block), add:

```typescript
<ReportDialog
  type="vacancy"
  targetId={id}
  isOpen={reportOpen}
  onClose={() => setReportOpen(false)}
/>
```

- [ ] **Step 5: Verify TypeScript**

Run: `cd frontend && pnpm tsc --noEmit`  
Expected: 0 errors

---

### 8b: ResumeDetailClient

- [ ] **Step 6: Read the current state of ResumeDetailClient to find the structure**

Run: `cat frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`  
Identify: where the resume name/title is shown, and where the closing `</div>` is.

- [ ] **Step 7: Add imports to ResumeDetailClient**

At the top of `frontend/src/app/resumes/[id]/ResumeDetailClient.tsx`, add after existing imports:

```typescript
import { useState } from 'react'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
import { BlockButton } from '@/components/block/BlockButton'
```

Note: If `useState` is already imported, add only the component imports.

- [ ] **Step 8: Add state and actions to ResumeDetailClient**

Inside the component function, add state:

```typescript
const { auth } = useStores()
const [reportOpen, setReportOpen] = useState(false)
```

Note: `useStores` is already imported and used. Just add `auth` to the destructured value and the `reportOpen` state.

After the heading section (resume title + name), add action buttons:

```typescript
{auth.user && (
  <div className="mt-3 flex flex-wrap items-center gap-3">
    <FavoriteButton type="resume" targetId={id} />
    <button
      onClick={() => setReportOpen(true)}
      className="text-sm text-gray-500 hover:text-red-500"
    >
      Пожаловаться
    </button>
    {r.user && (
      <BlockButton targetType="candidate" targetId={r.user.id} />
    )}
  </div>
)}
```

Just before the closing `</div>` of the root, add:

```typescript
<ReportDialog
  type="resume"
  targetId={id}
  isOpen={reportOpen}
  onClose={() => setReportOpen(false)}
/>
```

---

### 8c: CompanyDetailClient

- [ ] **Step 9: Add imports to CompanyDetailClient**

At the top of `frontend/src/app/companies/[id]/CompanyDetailClient.tsx`, add after existing imports:

```typescript
import { useState } from 'react'
import { FavoriteButton } from '@/components/favorite/FavoriteButton'
import { ReportDialog } from '@/components/report/ReportDialog'
```

Note: If `useState` is already imported, add only the component imports.

- [ ] **Step 10: Add state and buttons to CompanyDetailClient**

Inside the component function:

```typescript
const { auth } = useStores()
const [reportOpen, setReportOpen] = useState(false)
```

After the company name heading, add:

```typescript
{auth.user && (
  <div className="mt-3 flex flex-wrap items-center gap-3">
    <FavoriteButton type="company" targetId={id} />
    <button
      onClick={() => setReportOpen(true)}
      className="text-sm text-gray-500 hover:text-red-500"
    >
      Пожаловаться
    </button>
  </div>
)}
```

Before the closing `</div>` of root, add:

```typescript
<ReportDialog
  type="company"
  targetId={id}
  isOpen={reportOpen}
  onClose={() => setReportOpen(false)}
/>
```

- [ ] **Step 11: Run full verification**

Run: `cd frontend && pnpm tsc --noEmit && pnpm test -- --run`  
Expected: 0 TypeScript errors, all tests passing (~240+)

- [ ] **Step 12: Commit**

```bash
git add frontend/src/app/vacancies/[id]/VacancyDetailClient.tsx \
        frontend/src/app/resumes/[id]/ResumeDetailClient.tsx \
        frontend/src/app/companies/[id]/CompanyDetailClient.tsx
git commit -m "feat(sprint5): integrate FavoriteButton, ReportDialog, BlockButton into detail pages"
```

---

## Final Verification

- [ ] **Run full typecheck**

```bash
cd frontend && pnpm tsc --noEmit
```

Expected: 0 errors

- [ ] **Run all tests**

```bash
cd frontend && pnpm test -- --run
```

Expected: all tests passing (~240+ tests)

- [ ] **Verify new pages are accessible** (if dev server is running)

- `http://localhost:3000/dashboard/favorites` — My Favorites page loads
- `http://localhost:3000/dashboard/saved-searches` — My Saved Searches page loads
- `http://localhost:3000/dashboard/blocks` — My Blocks page loads
- `http://localhost:3000/vacancies` — "Сохранить поиск" button visible when logged in
- `http://localhost:3000/vacancies/[id]` — FavoriteButton and "Пожаловаться" visible when logged in

- [ ] **Mark plan complete**

```bash
git add docs/superpowers/plans/2026-06-29-sprint5-frontend.md
git commit -m "docs: mark Sprint 5 Frontend as complete"
```
