# Sprint 7 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать центр уведомлений (NotificationStore, страница, badge) и аналитику вакансий/резюме с графиками.

**Architecture:** NotificationStore и AnalyticsStore добавляются в RootStore по тому же паттерну, что и все предыдущие store-ы (makeAutoObservable + runInAction). Страница `/dashboard/notifications` даёт список уведомлений с пометкой прочитанным. NotificationBadge встраивается в WebHeader. Аналитика отображается через recharts (AreaChart) на страницах `/dashboard/vacancies/[id]/analytics` и `/dashboard/resumes/[id]/analytics`. Все страницы используют паттерн server-page → \*Client.tsx observer-component.

**Tech Stack:** Next.js 15, MobX, TypeScript (strict + exactOptionalPropertyTypes), TailwindCSS 4, recharts, vitest.

> **Два независимых блока:** Tasks 1–5 (Notifications) и Tasks 6–8 (Analytics) могут выполняться параллельно при наличии двух исполнителей.

---

## File Map

**Создаются:**

- `frontend/src/stores/NotificationStore.ts`
- `frontend/src/stores/NotificationStore.test.ts`
- `frontend/src/stores/AnalyticsStore.ts`
- `frontend/src/stores/AnalyticsStore.test.ts`
- `frontend/src/components/notification/NotificationBadge.tsx`
- `frontend/src/app/dashboard/notifications/page.tsx`
- `frontend/src/app/dashboard/notifications/NotificationsClient.tsx`
- `frontend/src/app/dashboard/vacancies/[id]/analytics/page.tsx`
- `frontend/src/app/dashboard/vacancies/[id]/analytics/VacancyAnalyticsClient.tsx`
- `frontend/src/app/dashboard/resumes/[id]/analytics/page.tsx`
- `frontend/src/app/dashboard/resumes/[id]/analytics/ResumeAnalyticsClient.tsx`

**Изменяются:**

- `frontend/src/types/api.ts` — добавить Notification, Analytics типы
- `frontend/src/stores/RootStore.ts` — добавить `notification` + `analytics` store
- `frontend/src/components/layout/WebHeader.tsx` — добавить NotificationBadge
- `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx` — добавить ссылку «Аналитика»
- `frontend/src/app/dashboard/resumes/MyResumesClient.tsx` — добавить ссылку «Аналитика»
- `frontend/package.json` — добавить recharts

---

## Task 1: Notification + Analytics типы в types/api.ts

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить типы в конец файла `frontend/src/types/api.ts`**

```typescript
// --- Notifications ---

export type NotificationType =
  | 'new_application'
  | 'application_approved'
  | 'application_rejected'
  | 'interview_invitation'
  | 'test_task'
  | 'offer_received'
  | 'resume_viewed'
  | 'vacancy_viewed'
  | 'vacancy_expiring_soon'
  | 'vacancy_expired'
  | 'subscription_expiring'
  | 'subscription_expired'
  | 'limits_reached'
  | 'saved_search_match'
  | 'moderation_approved'
  | 'moderation_rejected'

export interface NotificationData {
  entityType?: string
  entityId?: string | number
}

export interface Notification {
  documentId: string
  type: NotificationType
  title: string
  body: string
  isRead: boolean
  data?: NotificationData | null
  createdAt: string
}

// --- Analytics ---

export interface VacancyAnalyticsDailyRecord {
  date: string
  views: number
  uniqueViews: number
  applications: number
  ctr: number
}

export interface VacancyAnalyticsTotal {
  views: number
  uniqueViews: number
  applications: number
  ctr: number
}

export interface VacancyAnalyticsResponse {
  total: VacancyAnalyticsTotal
  daily: VacancyAnalyticsDailyRecord[]
}

export interface ResumeAnalyticsDailyRecord {
  date: string
  views: number
  uniqueViews: number
  invitations: number
}

export interface ResumeAnalyticsTotal {
  views: number
  uniqueViews: number
  invitations: number
}

export interface ResumeAnalyticsResponse {
  total: ResumeAnalyticsTotal
  daily: ResumeAnalyticsDailyRecord[]
}
```

- [ ] **Step 2: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(sprint7): add Notification and Analytics types"
```

---

## Task 2: NotificationStore + тесты

**Files:**

- Create: `frontend/src/stores/NotificationStore.ts`
- Test: `frontend/src/stores/NotificationStore.test.ts`

- [ ] **Step 1: Написать тесты**

Создать `frontend/src/stores/NotificationStore.test.ts`:

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
      patch: vi.fn(),
      post: vi.fn(),
    },
    ApiClientError,
  }
})

import { api } from '@/services/api'
import { NotificationStore } from './NotificationStore'

const mockNotification = {
  documentId: 'notif123',
  type: 'new_application' as const,
  title: 'Новый отклик',
  body: 'Новый отклик на Backend Dev от Иван Иванов',
  isRead: false,
  data: { entityType: 'vacancy', entityId: 'vac456' },
  createdAt: '2026-07-01T10:00:00Z',
}

const mockReadNotification = { ...mockNotification, documentId: 'notif789', isRead: true }

const mockListResponse = {
  data: [mockNotification],
  meta: { total: 1, page: 1, pageSize: 20, pageCount: 1 },
}

describe('NotificationStore', () => {
  let store: NotificationStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new NotificationStore()
  })

  it('начальное состояние', () => {
    expect(store.notifications).toEqual([])
    expect(store.unreadCount).toBe(0)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
    expect(store.total).toBe(0)
    expect(store.page).toBe(1)
  })

  it('pageCount вычисляется из total и pageSize', () => {
    store['total'] = 45
    store['pageSize'] = 20
    expect(store.pageCount).toBe(3)
  })

  it('fetchNotifications — успех, заполняет список', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockListResponse)
    await store.fetchNotifications()
    expect(store.notifications).toHaveLength(1)
    expect(store.notifications[0]?.documentId).toBe('notif123')
    expect(store.total).toBe(1)
    expect(store.isLoading).toBe(false)
  })

  it('fetchNotifications — с фильтром isRead=false', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockListResponse)
    await store.fetchNotifications(false, 1)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=false')
  })

  it('fetchNotifications — с фильтром isRead=true', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ ...mockListResponse, data: [mockReadNotification] })
    await store.fetchNotifications(true)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=true')
  })

  it('fetchNotifications — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Network error'))
    await store.fetchNotifications()
    expect(store.error).toBe('Network error')
    expect(store.notifications).toHaveLength(0)
  })

  it('fetchUnreadCount — устанавливает unreadCount', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [],
      meta: { total: 7, page: 1, pageSize: 1, pageCount: 7 },
    })
    await store.fetchUnreadCount()
    expect(store.unreadCount).toBe(7)
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('isRead=false')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('pageSize=1')
  })

  it('fetchUnreadCount — 0 если нет непрочитанных', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, pageSize: 1, pageCount: 0 },
    })
    await store.fetchUnreadCount()
    expect(store.unreadCount).toBe(0)
  })

  it('markRead — отправляет PATCH и обновляет isRead локально', async () => {
    store['notifications'] = [mockNotification]
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { documentId: 'notif123', isRead: true } })
    await store.markRead('notif123')
    expect(vi.mocked(api.patch).mock.calls[0]?.[0]).toContain('notif123/read')
    expect(store.notifications[0]?.isRead).toBe(true)
  })

  it('markRead — уменьшает unreadCount', async () => {
    store['notifications'] = [mockNotification]
    store['unreadCount'] = 3
    vi.mocked(api.patch).mockResolvedValueOnce({ data: { documentId: 'notif123', isRead: true } })
    await store.markRead('notif123')
    expect(store.unreadCount).toBe(2)
  })

  it('markAllRead — отправляет POST и обновляет все локально', async () => {
    store['notifications'] = [mockNotification, { ...mockNotification, documentId: 'notif2' }]
    store['unreadCount'] = 2
    vi.mocked(api.post).mockResolvedValueOnce({ ok: true })
    await store.markAllRead()
    expect(vi.mocked(api.post).mock.calls[0]?.[0]).toContain('read-all')
    expect(store.notifications.every((n) => n.isRead)).toBe(true)
    expect(store.unreadCount).toBe(0)
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test NotificationStore.test 2>&1 | tail -10
```

Expected: FAIL (модуль не существует)

- [ ] **Step 3: Создать NotificationStore.ts**

Создать `frontend/src/stores/NotificationStore.ts`:

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { Notification } from '@/types/api'
import { api } from '@/services/api'

export class NotificationStore {
  notifications: Notification[] = []
  unreadCount = 0
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

  async fetchNotifications(isRead?: boolean, page = 1): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(this.pageSize),
      })
      if (isRead === true) params.set('isRead', 'true')
      if (isRead === false) params.set('isRead', 'false')

      const res = await api.get<{
        data: Notification[]
        meta: { total: number; page: number; pageSize: number; pageCount: number }
      }>(`/notifications?${params.toString()}`)

      runInAction(() => {
        this.notifications = res.data
        this.total = res.meta.total
        this.page = page
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch notifications'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchUnreadCount(): Promise<void> {
    try {
      const res = await api.get<{
        data: Notification[]
        meta: { total: number; page: number; pageSize: number; pageCount: number }
      }>('/notifications?isRead=false&pageSize=1')
      runInAction(() => {
        this.unreadCount = res.meta.total
      })
    } catch {
      // badge failure is non-critical — silently ignore
    }
  }

  async markRead(documentId: string): Promise<void> {
    try {
      await api.patch<{ data: { documentId: string; isRead: boolean } }>(
        `/notifications/${documentId}/read`,
        {}
      )
      runInAction(() => {
        const n = this.notifications.find((x) => x.documentId === documentId)
        if (n && !n.isRead) {
          n.isRead = true
          this.unreadCount = Math.max(0, this.unreadCount - 1)
        }
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to mark as read'
      })
    }
  }

  async markAllRead(): Promise<void> {
    try {
      await api.post<{ ok: boolean }>('/notifications/read-all', {})
      runInAction(() => {
        this.notifications.forEach((n) => {
          n.isRead = true
        })
        this.unreadCount = 0
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to mark all as read'
      })
    }
  }
}
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd frontend && pnpm test NotificationStore.test 2>&1 | tail -15
```

Expected: PASS, 12 tests

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/NotificationStore.ts frontend/src/stores/NotificationStore.test.ts
git commit -m "feat(sprint7): add NotificationStore with fetchNotifications, markRead, markAllRead"
```

---

## Task 3: AnalyticsStore + тесты

**Files:**

- Create: `frontend/src/stores/AnalyticsStore.ts`
- Test: `frontend/src/stores/AnalyticsStore.test.ts`

- [ ] **Step 1: Написать тесты**

Создать `frontend/src/stores/AnalyticsStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/services/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

import { api } from '@/services/api'
import { AnalyticsStore } from './AnalyticsStore'

const mockVacancyAnalytics = {
  total: { views: 120, uniqueViews: 80, applications: 5, ctr: 6.2 },
  daily: [
    { date: '2026-06-30', views: 50, uniqueViews: 30, applications: 2, ctr: 6.7 },
    { date: '2026-07-01', views: 70, uniqueViews: 50, applications: 3, ctr: 6.0 },
  ],
}

const mockResumeAnalytics = {
  total: { views: 40, uniqueViews: 30, invitations: 2 },
  daily: [
    { date: '2026-06-30', views: 15, uniqueViews: 10, invitations: 1 },
    { date: '2026-07-01', views: 25, uniqueViews: 20, invitations: 1 },
  ],
}

describe('AnalyticsStore', () => {
  let store: AnalyticsStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new AnalyticsStore()
  })

  it('начальное состояние', () => {
    expect(store.vacancyAnalytics).toBeNull()
    expect(store.resumeAnalytics).toBeNull()
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchVacancyAnalytics — успех, заполняет данные', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123')
    expect(store.vacancyAnalytics).toEqual(mockVacancyAnalytics)
    expect(store.isLoading).toBe(false)
    expect(store.error).toBeNull()
  })

  it('fetchVacancyAnalytics — строит URL с documentId', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('/analytics/vacancies/doc123')
  })

  it('fetchVacancyAnalytics — добавляет from/to в URL', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockVacancyAnalytics)
    await store.fetchVacancyAnalytics('doc123', '2026-06-01', '2026-06-30')
    const url = vi.mocked(api.get).mock.calls[0]?.[0] as string
    expect(url).toContain('from=2026-06-01')
    expect(url).toContain('to=2026-06-30')
  })

  it('fetchVacancyAnalytics — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Forbidden'))
    await store.fetchVacancyAnalytics('doc999')
    expect(store.error).toBe('Forbidden')
    expect(store.vacancyAnalytics).toBeNull()
  })

  it('fetchResumeAnalytics — успех, заполняет данные', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResumeAnalytics)
    await store.fetchResumeAnalytics('res456')
    expect(store.resumeAnalytics).toEqual(mockResumeAnalytics)
    expect(store.isLoading).toBe(false)
  })

  it('fetchResumeAnalytics — строит URL с documentId', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockResumeAnalytics)
    await store.fetchResumeAnalytics('res456')
    expect(vi.mocked(api.get).mock.calls[0]?.[0]).toContain('/analytics/resumes/res456')
  })

  it('fetchResumeAnalytics — ошибка, устанавливает error', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Not found'))
    await store.fetchResumeAnalytics('res999')
    expect(store.error).toBe('Not found')
    expect(store.resumeAnalytics).toBeNull()
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test AnalyticsStore.test 2>&1 | tail -10
```

Expected: FAIL

- [ ] **Step 3: Создать AnalyticsStore.ts**

Создать `frontend/src/stores/AnalyticsStore.ts`:

```typescript
import { makeAutoObservable, runInAction } from 'mobx'
import type { VacancyAnalyticsResponse, ResumeAnalyticsResponse } from '@/types/api'
import { api } from '@/services/api'

export class AnalyticsStore {
  vacancyAnalytics: VacancyAnalyticsResponse | null = null
  resumeAnalytics: ResumeAnalyticsResponse | null = null
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchVacancyAnalytics(documentId: string, from?: string, to?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.vacancyAnalytics = null
    })
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()

      const res = await api.get<VacancyAnalyticsResponse>(
        `/analytics/vacancies/${documentId}${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.vacancyAnalytics = res
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy analytics'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchResumeAnalytics(documentId: string, from?: string, to?: string): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
      this.resumeAnalytics = null
    })
    try {
      const params = new URLSearchParams()
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const qs = params.toString()

      const res = await api.get<ResumeAnalyticsResponse>(
        `/analytics/resumes/${documentId}${qs ? `?${qs}` : ''}`
      )
      runInAction(() => {
        this.resumeAnalytics = res
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch resume analytics'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }
}
```

- [ ] **Step 4: Запустить тесты — убедиться что проходят**

```bash
cd frontend && pnpm test AnalyticsStore.test 2>&1 | tail -15
```

Expected: PASS, 8 tests

- [ ] **Step 5: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/stores/AnalyticsStore.ts frontend/src/stores/AnalyticsStore.test.ts
git commit -m "feat(sprint7): add AnalyticsStore with fetchVacancyAnalytics, fetchResumeAnalytics"
```

---

## Task 4: RootStore + recharts

**Files:**

- Modify: `frontend/src/stores/RootStore.ts`
- Modify: `frontend/package.json` (через pnpm add)

- [ ] **Step 1: Установить recharts**

```bash
cd frontend && pnpm add recharts 2>&1 | tail -5
```

Expected: packages installed, no errors

- [ ] **Step 2: Обновить RootStore.ts**

Заменить содержимое `frontend/src/stores/RootStore.ts`:

```typescript
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'
import { FavoriteStore } from './FavoriteStore'
import { SavedSearchStore } from './SavedSearchStore'
import { BlockStore } from './BlockStore'
import { PaymentStore } from './PaymentStore'
import { NotificationStore } from './NotificationStore'
import { AnalyticsStore } from './AnalyticsStore'

export class RootStore {
  auth: AuthStore
  company: CompanyStore
  vacancy: VacancyStore
  resume: ResumeStore
  application: ApplicationStore
  favorite: FavoriteStore
  savedSearch: SavedSearchStore
  block: BlockStore
  payment: PaymentStore
  notification: NotificationStore
  analytics: AnalyticsStore

  constructor() {
    this.auth = new AuthStore()
    this.company = new CompanyStore()
    this.vacancy = new VacancyStore()
    this.resume = new ResumeStore()
    this.application = new ApplicationStore()
    this.favorite = new FavoriteStore()
    this.savedSearch = new SavedSearchStore()
    this.block = new BlockStore()
    this.payment = new PaymentStore()
    this.notification = new NotificationStore()
    this.analytics = new AnalyticsStore()
  }
}

export const rootStore = new RootStore()
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Прогнать все тесты**

```bash
cd frontend && pnpm test 2>&1 | tail -10
```

Expected: все тесты PASS (≥ 269 тестов + 20 новых = ≥ 289)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/stores/RootStore.ts frontend/package.json frontend/pnpm-lock.yaml
git commit -m "feat(sprint7): add NotificationStore + AnalyticsStore to RootStore, install recharts"
```

---

## Task 5: NotificationBadge + WebHeader

**Files:**

- Create: `frontend/src/components/notification/NotificationBadge.tsx`
- Modify: `frontend/src/components/layout/WebHeader.tsx`

- [ ] **Step 1: Создать NotificationBadge.tsx**

Создать `frontend/src/components/notification/NotificationBadge.tsx`:

```typescript
'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'

export const NotificationBadge = observer(function NotificationBadge() {
  const { notification } = useStores()

  useEffect(() => {
    void notification.fetchUnreadCount()
  }, [notification])

  return (
    <Link
      href="/dashboard/notifications"
      className="relative flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      aria-label="Уведомления"
    >
      <span className="text-lg">🔔</span>
      {notification.unreadCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white leading-none">
          {notification.unreadCount > 99 ? '99+' : notification.unreadCount}
        </span>
      )}
    </Link>
  )
})
```

- [ ] **Step 2: Обновить WebHeader.tsx**

В `frontend/src/components/layout/WebHeader.tsx` добавить импорт и вставить `<NotificationBadge />` в блок авторизованного пользователя:

```typescript
// Добавить импорт в начало файла (после SubscriptionBadge):
import { NotificationBadge } from '@/components/notification/NotificationBadge'
```

В JSX — заменить блок `{auth.isAuthenticated && auth.user ? (...)` на:

```typescript
{auth.isAuthenticated && auth.user ? (
  <div className="flex items-center gap-2">
    <Link
      href="/subscription"
      className="flex items-center"
      aria-label="Управление подпиской"
    >
      <SubscriptionBadge plan={auth.user.subscriptionPlan} />
    </Link>
    <NotificationBadge />
    <Link
      href="/dashboard"
      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      {t('nav.dashboard')}
    </Link>
    <Button variant="ghost" size="sm" onClick={() => auth.logout()}>
      {t('auth.logout')}
    </Button>
  </div>
) : (
  <Button asChild size="sm">
    <Link href="/login">{t('nav.login')}</Link>
  </Button>
)}
```

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/notification/NotificationBadge.tsx frontend/src/components/layout/WebHeader.tsx
git commit -m "feat(sprint7): add NotificationBadge to WebHeader with unread count"
```

---

## Task 6: Dashboard Notifications Page

**Files:**

- Create: `frontend/src/app/dashboard/notifications/page.tsx`
- Create: `frontend/src/app/dashboard/notifications/NotificationsClient.tsx`

- [ ] **Step 1: Создать page.tsx**

Создать `frontend/src/app/dashboard/notifications/page.tsx`:

```typescript
import { NotificationsClient } from './NotificationsClient'

export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <NotificationsClient />
    </div>
  )
}
```

- [ ] **Step 2: Создать NotificationsClient.tsx**

Создать `frontend/src/app/dashboard/notifications/NotificationsClient.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import type { NotificationType } from '@/types/api'

const TYPE_ICONS: Partial<Record<NotificationType, string>> = {
  new_application: '📩',
  application_approved: '✅',
  application_rejected: '❌',
  interview_invitation: '📅',
  test_task: '📝',
  offer_received: '🎉',
  resume_viewed: '👁',
  vacancy_viewed: '👁',
  vacancy_expiring_soon: '⏰',
  vacancy_expired: '🔴',
  subscription_expiring: '⚠️',
  subscription_expired: '🔴',
  limits_reached: '🚫',
  saved_search_match: '🔔',
  moderation_approved: '✅',
  moderation_rejected: '❌',
}

const FILTER_TABS = [
  { label: 'Все', value: undefined },
  { label: 'Непрочитанные', value: false },
  { label: 'Прочитанные', value: true },
] as const

export const NotificationsClient = observer(function NotificationsClient() {
  const { notification: store } = useStores()
  const [isReadFilter, setIsReadFilter] = useState<boolean | undefined>(undefined)

  useEffect(() => {
    void store.fetchNotifications(isReadFilter)
  }, [store, isReadFilter])

  const handleMarkRead = (documentId: string) => {
    void store.markRead(documentId)
  }

  const handleMarkAllRead = () => {
    void store.markAllRead()
  }

  const handlePageChange = (page: number) => {
    void store.fetchNotifications(isReadFilter, page)
  }

  const handleFilterChange = (value: boolean | undefined) => {
    setIsReadFilter(value)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Уведомления</h1>
        {store.unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            Прочитать все ({store.unreadCount})
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => handleFilterChange(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              isReadFilter === tab.value
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

      {!store.isLoading && store.notifications.length === 0 && !store.error && (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-muted-foreground">Нет уведомлений.</p>
        </div>
      )}

      <div className="space-y-2">
        {store.notifications.map((n) => (
          <div
            key={n.documentId}
            className={`relative rounded-xl border p-4 transition ${
              n.isRead
                ? 'border-gray-200 bg-white'
                : 'border-indigo-200 bg-indigo-50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 text-xl" aria-hidden>
                {TYPE_ICONS[n.type] ?? '📢'}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900">{n.title}</p>
                <p className="mt-0.5 text-sm text-gray-600">{n.body}</p>
                <p className="mt-1 text-xs text-gray-400">
                  {new Date(n.createdAt).toLocaleString('ru-RU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
              {!n.isRead && (
                <button
                  onClick={() => handleMarkRead(n.documentId)}
                  className="shrink-0 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Прочитано
                </button>
              )}
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

- [ ] **Step 3: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/notifications/
git commit -m "feat(sprint7): add /dashboard/notifications page with read/mark-all-read"
```

---

## Task 7: VacancyAnalyticsClient + ссылка из MyVacanciesClient

**Files:**

- Create: `frontend/src/app/dashboard/vacancies/[id]/analytics/page.tsx`
- Create: `frontend/src/app/dashboard/vacancies/[id]/analytics/VacancyAnalyticsClient.tsx`
- Modify: `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx`

- [ ] **Step 1: Создать page.tsx**

Создать `frontend/src/app/dashboard/vacancies/[id]/analytics/page.tsx`:

```typescript
import { VacancyAnalyticsClient } from './VacancyAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VacancyAnalyticsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <VacancyAnalyticsClient vacancyId={id} />
    </div>
  )
}
```

- [ ] **Step 2: Создать VacancyAnalyticsClient.tsx**

Создать `frontend/src/app/dashboard/vacancies/[id]/analytics/VacancyAnalyticsClient.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useStores } from '@/stores/StoreProvider'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  vacancyId: string
}

export const VacancyAnalyticsClient = observer(function VacancyAnalyticsClient({ vacancyId }: Props) {
  const { analytics: store } = useStores()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  useEffect(() => {
    void store.fetchVacancyAnalytics(vacancyId, from, to)
  }, [store, vacancyId, from, to])

  const data = store.vacancyAnalytics
  const total = data?.total
  const daily = data?.daily ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/vacancies"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои вакансии
        </Link>
        <h1 className="text-2xl font-bold">Аналитика вакансии</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">С</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">По</label>
          <input
            type="date"
            value={to}
            min={from}
            max={defaultTo()}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {total && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { label: 'Просмотры', value: total.views },
              { label: 'Уник. просмотры', value: total.uniqueViews },
              { label: 'Отклики', value: total.applications },
              { label: 'CTR', value: `${total.ctr}%` },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {daily.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-4 text-sm font-semibold text-gray-700">Просмотры по дням</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="viewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="appsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v: string) =>
                  new Date(v).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="views"
                name="Просмотры"
                stroke="#6366f1"
                fill="url(#viewsGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="applications"
                name="Отклики"
                stroke="#10b981"
                fill="url(#appsGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !store.isLoading && !store.error && (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-muted-foreground">Нет данных за выбранный период.</p>
          </div>
        )
      )}
    </div>
  )
})
```

- [ ] **Step 3: Добавить ссылку «Аналитика» в MyVacanciesClient**

В файле `frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx` найти место где рендерятся кнопки действий для каждой вакансии (publish/boost/archive) и добавить кнопку аналитики.

Добавить импорт в начало файла (если нет):

```typescript
import Link from 'next/link'
```

В блоке карточки вакансии (после существующих кнопок Публиковать/Редактировать) добавить:

```typescript
<Link
  href={`/dashboard/vacancies/${vacancy.documentId}/analytics`}
  className="text-sm text-indigo-600 hover:underline"
>
  Аналитика
</Link>
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/dashboard/vacancies/[id]/analytics/ frontend/src/app/dashboard/vacancies/MyVacanciesClient.tsx
git commit -m "feat(sprint7): add /dashboard/vacancies/[id]/analytics page with recharts"
```

---

## Task 8: ResumeAnalyticsClient + ссылка из MyResumesClient

**Files:**

- Create: `frontend/src/app/dashboard/resumes/[id]/analytics/page.tsx`
- Create: `frontend/src/app/dashboard/resumes/[id]/analytics/ResumeAnalyticsClient.tsx`
- Modify: `frontend/src/app/dashboard/resumes/MyResumesClient.tsx`

- [ ] **Step 1: Создать page.tsx**

Создать `frontend/src/app/dashboard/resumes/[id]/analytics/page.tsx`:

```typescript
import { ResumeAnalyticsClient } from './ResumeAnalyticsClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ResumeAnalyticsPage({ params }: Props) {
  const { id } = await params
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <ResumeAnalyticsClient resumeId={id} />
    </div>
  )
}
```

- [ ] **Step 2: Создать ResumeAnalyticsClient.tsx**

Создать `frontend/src/app/dashboard/resumes/[id]/analytics/ResumeAnalyticsClient.tsx`:

```typescript
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import Link from 'next/link'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useStores } from '@/stores/StoreProvider'

function defaultFrom(): string {
  const d = new Date()
  d.setDate(d.getDate() - 29)
  return d.toISOString().slice(0, 10)
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 10)
}

interface Props {
  resumeId: string
}

export const ResumeAnalyticsClient = observer(function ResumeAnalyticsClient({ resumeId }: Props) {
  const { analytics: store } = useStores()
  const [from, setFrom] = useState(defaultFrom())
  const [to, setTo] = useState(defaultTo())

  useEffect(() => {
    void store.fetchResumeAnalytics(resumeId, from, to)
  }, [store, resumeId, from, to])

  const data = store.resumeAnalytics
  const total = data?.total
  const daily = data?.daily ?? []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/resumes"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Мои резюме
        </Link>
        <h1 className="text-2xl font-bold">Аналитика резюме</h1>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">С</label>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">По</label>
          <input
            type="date"
            value={to}
            min={from}
            max={defaultTo()}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          />
        </div>
      </div>

      {store.isLoading && <p className="text-sm text-muted-foreground">Загрузка...</p>}

      {store.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {store.error}
        </p>
      )}

      {total && (
        <div className="grid grid-cols-3 gap-4">
          {(
            [
              { label: 'Просмотры', value: total.views },
              { label: 'Уник. просмотры', value: total.uniqueViews },
              { label: 'Приглашения', value: total.invitations },
            ] as const
          ).map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="mt-1 text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      )}

      {daily.length > 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="mb-4 text-sm font-semibold text-gray-700">Просмотры по дням</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={daily} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="resumeViewsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="invitationsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) =>
                  new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
                }
              />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                labelFormatter={(v: string) =>
                  new Date(v).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })
                }
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="views"
                name="Просмотры"
                stroke="#6366f1"
                fill="url(#resumeViewsGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="invitations"
                name="Приглашения"
                stroke="#f59e0b"
                fill="url(#invitationsGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !store.isLoading && !store.error && (
          <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
            <p className="text-sm text-muted-foreground">Нет данных за выбранный период.</p>
          </div>
        )
      )}
    </div>
  )
})
```

- [ ] **Step 3: Добавить ссылку «Аналитика» в MyResumesClient**

В файле `frontend/src/app/dashboard/resumes/MyResumesClient.tsx` в блоке карточки резюме (рядом с кнопками Редактировать/Архивировать) добавить:

```typescript
<Link
  href={`/dashboard/resumes/${resume.documentId}/analytics`}
  className="text-sm text-indigo-600 hover:underline"
>
  Аналитика
</Link>
```

- [ ] **Step 4: TypeScript check**

```bash
cd frontend && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 5: Полный прогон тестов**

```bash
cd frontend && pnpm test 2>&1 | tail -10
```

Expected: все тесты PASS (≥ 289 тестов)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/resumes/[id]/analytics/ frontend/src/app/dashboard/resumes/MyResumesClient.tsx
git commit -m "feat(sprint7): add /dashboard/resumes/[id]/analytics page with recharts"
```

---

## Self-Review

### Spec Coverage

| Требование из sprint-plan.md                  | Task   |
| --------------------------------------------- | ------ |
| NotificationStore                             | Task 2 |
| Страница `/dashboard/notifications`           | Task 6 |
| Компонент NotificationBadge в навигации       | Task 5 |
| Страница `/dashboard/vacancies/:id/analytics` | Task 7 |
| Страница `/dashboard/resumes/:id/analytics`   | Task 8 |
| Типы Notification + Analytics                 | Task 1 |
| recharts установлен                           | Task 4 |
| RootStore обновлён                            | Task 4 |

### Placeholder Scan

Нет TBD / TODO / "fill in details" в коде.

### Type Consistency

- `NotificationType` определён в `types/api.ts` (Task 1), используется в `NotificationStore.ts` (Task 2) и `NotificationsClient.tsx` (Task 6) — консистентно.
- `VacancyAnalyticsResponse` определён в `types/api.ts` (Task 1), возвращается `AnalyticsStore.vacancyAnalytics` (Task 3), используется в `VacancyAnalyticsClient.tsx` (Task 7) — консистентно.
- `ResumeAnalyticsResponse` аналогично.
- `store.fetchVacancyAnalytics(vacancyId, from, to)` — сигнатура одинакова в тестах (Task 3) и клиенте (Task 7).
- `store.fetchResumeAnalytics(resumeId, from, to)` — аналогично.
- `NotificationStore.markRead(documentId)` — сигнатура одинакова в тестах и клиенте.
- `NotificationStore.unreadCount` — читается в `NotificationBadge` (Task 5) и `NotificationsClient` (Task 6).
