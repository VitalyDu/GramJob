# Sprint 6 Frontend — Subscriptions & Payments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать UI управления подпиской и покупки пакетов — страницу `/subscription`, компоненты планов и пакетов, PaymentStore и хук открытия Telegram invoice.

**Architecture:** PaymentStore инкапсулирует все API-вызовы (GET планы/пакеты, POST создать invoice). Хук `useTelegramPayment` абстрагирует открытие invoice — в Mini App через `WebApp.openInvoice`, в web через `window.open`. После оплаты refresh профиля через `auth.fetchMe()`. Страница `/subscription` — единая точка управления подпиской и покупки кредитных пакетов.

**Tech Stack:** Next.js 15 (App Router), MobX, TypeScript strict (`exactOptionalPropertyTypes: true`), React Hook Form + Zod (не нужны на этой странице), TailwindCSS 4, Vitest.

---

## Файловая структура

**Новые файлы:**

```
frontend/src/
  lib/subscription-utils.ts              — PLAN_LABELS, PLAN_COLORS, formatStarsPrice, canUpgradeToPlan
  lib/subscription-utils.test.ts         — unit tests
  stores/PaymentStore.ts                 — MobX: fetchPlans, fetchVacancyPackages, fetchApplyPackages, subscribeToPlan, buyVacancyPack, buyApplyPack
  stores/PaymentStore.test.ts            — unit tests
  hooks/useTelegramPayment.ts            — openInvoice (Mini App + web fallback)
  components/subscription/
    SubscriptionBadge.tsx               — бейдж текущего плана (Free/Pro/Max/VIP)
    SubscriptionPlanCard.tsx            — карточка плана с лимитами и кнопкой
    PackageCard.tsx                     — карточка vacancy/apply пакета
  app/subscription/
    page.tsx                            — серверная обёртка
    SubscriptionClient.tsx              — клиентская страница управления подпиской
```

**Изменяемые файлы:**

```
frontend/src/types/api.ts               — добавить SubscriptionPlan, VacancyPackage, ApplyPackage; isVip в User
frontend/src/stores/RootStore.ts        — добавить payment: PaymentStore
frontend/src/components/layout/WebHeader.tsx — добавить SubscriptionBadge рядом с Dashboard ссылкой
```

---

## Task 1: API Types — SubscriptionPlan, VacancyPackage, ApplyPackage

**Files:**

- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Добавить isVip в тип User и новые типы**

В файл `frontend/src/types/api.ts` добавить поле `isVip` в интерфейс `User`:

```typescript
// Изменить существующий интерфейс User — добавить поле после applyCredits:
vacancyCredits: number
applyCredits: number
isVip: boolean // ← добавить
createdAt: string
```

В конец файла (после раздела блоков/репортов Sprint 5) добавить:

```typescript
// --- Subscription & Payments ---

export interface SubscriptionPlan {
  documentId: string
  code: 'free' | 'pro' | 'max' | 'vip'
  name: string
  vacanciesPerMonth: number
  activeVacanciesLimit: number
  vacancyBoostsPerDay: number
  applicationsPerDay: number
  resumesLimit: number
  resumeDatabaseAccess: boolean
  starsPrice: number | null
  durationDays: number
}

export interface VacancyPackage {
  id: number
  documentId: string
  name: string
  vacancyCredits: number
  boostCredits: number
  starsPrice: number
}

export interface ApplyPackage {
  id: number
  documentId: string
  name: string
  applyCredits: number
  starsPrice: number
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/types/api.ts
git commit -m "feat(sprint6): add SubscriptionPlan, VacancyPackage, ApplyPackage types; isVip to User"
```

---

## Task 2: Утилиты — lib/subscription-utils.ts

**Files:**

- Create: `frontend/src/lib/subscription-utils.ts`
- Create: `frontend/src/lib/subscription-utils.test.ts`

- [ ] **Step 1: Написать failing тест**

```typescript
// frontend/src/lib/subscription-utils.test.ts
import { describe, it, expect } from 'vitest'
import {
  PLAN_LABELS,
  PLAN_COLORS,
  formatStarsPrice,
  canUpgradeToPlan,
  getPlanBadgeClasses,
} from './subscription-utils'

describe('PLAN_LABELS', () => {
  it('содержит метки для всех 4 планов', () => {
    expect(PLAN_LABELS.free).toBe('Free')
    expect(PLAN_LABELS.pro).toBe('Pro')
    expect(PLAN_LABELS.max).toBe('Max')
    expect(PLAN_LABELS.vip).toBe('VIP')
  })
})

describe('PLAN_COLORS', () => {
  it('free — серый', () => {
    expect(PLAN_COLORS.free).toBe('gray')
  })
  it('pro — синий', () => {
    expect(PLAN_COLORS.pro).toBe('blue')
  })
  it('max — янтарный', () => {
    expect(PLAN_COLORS.max).toBe('amber')
  })
  it('vip — золотой', () => {
    expect(PLAN_COLORS.vip).toBe('yellow')
  })
})

describe('formatStarsPrice', () => {
  it('null → Бесплатно', () => {
    expect(formatStarsPrice(null)).toBe('Бесплатно')
  })
  it('299 → "299 ★"', () => {
    expect(formatStarsPrice(299)).toBe('299 ★')
  })
  it('1299 → "1299 ★"', () => {
    expect(formatStarsPrice(1299)).toBe('1299 ★')
  })
})

describe('canUpgradeToPlan', () => {
  it('pro можно купить с любого плана', () => {
    expect(canUpgradeToPlan('free', 'pro')).toBe(true)
    expect(canUpgradeToPlan('max', 'pro')).toBe(true)
    expect(canUpgradeToPlan('vip', 'pro')).toBe(true)
  })

  it('max можно купить с любого плана', () => {
    expect(canUpgradeToPlan('free', 'max')).toBe(true)
    expect(canUpgradeToPlan('pro', 'max')).toBe(true)
    expect(canUpgradeToPlan('vip', 'max')).toBe(true)
  })

  it('vip требует активный max или vip', () => {
    expect(canUpgradeToPlan('max', 'vip')).toBe(true)
    expect(canUpgradeToPlan('vip', 'vip')).toBe(true)
    expect(canUpgradeToPlan('pro', 'vip')).toBe(false)
    expect(canUpgradeToPlan('free', 'vip')).toBe(false)
  })

  it('free нельзя купить', () => {
    expect(canUpgradeToPlan('pro', 'free')).toBe(false)
    expect(canUpgradeToPlan('max', 'free')).toBe(false)
  })
})

describe('getPlanBadgeClasses', () => {
  it('free — серые классы', () => {
    const cls = getPlanBadgeClasses('free')
    expect(cls).toContain('gray')
  })
  it('vip — жёлтые классы', () => {
    const cls = getPlanBadgeClasses('vip')
    expect(cls).toContain('yellow')
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test src/lib/subscription-utils.test.ts
```

Ожидается: `FAIL` — `Cannot find module './subscription-utils'`

- [ ] **Step 3: Создать subscription-utils.ts**

```typescript
// frontend/src/lib/subscription-utils.ts

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  max: 'Max',
  vip: 'VIP',
}

export const PLAN_COLORS: Record<string, string> = {
  free: 'gray',
  pro: 'blue',
  max: 'amber',
  vip: 'yellow',
}

export function formatStarsPrice(price: number | null): string {
  if (price === null || price === undefined) return 'Бесплатно'
  return `${price} ★`
}

export function canUpgradeToPlan(currentPlan: string, targetPlan: string): boolean {
  if (targetPlan === 'free') return false
  if (targetPlan === 'vip') return currentPlan === 'max' || currentPlan === 'vip'
  return true
}

const BADGE_CLASSES: Record<string, string> = {
  free: 'bg-gray-100 text-gray-700',
  pro: 'bg-blue-100 text-blue-700',
  max: 'bg-amber-100 text-amber-700',
  vip: 'bg-yellow-100 text-yellow-800',
}

export function getPlanBadgeClasses(plan: string): string {
  return BADGE_CLASSES[plan] ?? BADGE_CLASSES['free']!
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test src/lib/subscription-utils.test.ts
```

Ожидается: `PASS` — все 13 тестов зелёные.

- [ ] **Step 5: Commit**

```bash
cd frontend
git add src/lib/subscription-utils.ts src/lib/subscription-utils.test.ts
git commit -m "feat(sprint6): add subscription-utils (PLAN_LABELS, formatStarsPrice, canUpgradeToPlan)"
```

---

## Task 3: PaymentStore + RootStore

**Files:**

- Create: `frontend/src/stores/PaymentStore.ts`
- Create: `frontend/src/stores/PaymentStore.test.ts`
- Modify: `frontend/src/stores/RootStore.ts`

- [ ] **Step 1: Написать failing тест**

```typescript
// frontend/src/stores/PaymentStore.test.ts
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
    },
    ApiClientError,
  }
})

import { api } from '@/services/api'
import { PaymentStore } from './PaymentStore'

const mockPlan = {
  documentId: 'plan-pro',
  code: 'pro' as const,
  name: 'Pro',
  vacanciesPerMonth: 10,
  activeVacanciesLimit: 10,
  vacancyBoostsPerDay: 10,
  applicationsPerDay: 10,
  resumesLimit: 5,
  resumeDatabaseAccess: false,
  starsPrice: 299,
  durationDays: 30,
}

const mockVacancyPack = {
  id: 1,
  documentId: 'vpack-1',
  name: 'Starter',
  vacancyCredits: 10,
  boostCredits: 10,
  starsPrice: 199,
}

const mockApplyPack = {
  id: 1,
  documentId: 'apack-1',
  name: 'Starter',
  applyCredits: 50,
  starsPrice: 149,
}

describe('PaymentStore', () => {
  let store: PaymentStore

  beforeEach(() => {
    vi.clearAllMocks()
    store = new PaymentStore()
  })

  describe('fetchPlans', () => {
    it('загружает планы и сбрасывает isLoading', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockPlan] })
      await store.fetchPlans()
      expect(store.plans).toHaveLength(1)
      expect(store.plans[0]?.code).toBe('pro')
      expect(store.isLoading).toBe(false)
      expect(store.error).toBeNull()
    })

    it('вызывает GET /subscription-plans', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchPlans()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/subscription-plans')
    })

    it('устанавливает error при сбое', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'))
      await store.fetchPlans()
      expect(store.error).toBe('Network error')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('fetchVacancyPackages', () => {
    it('загружает пакеты вакансий', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockVacancyPack] })
      await store.fetchVacancyPackages()
      expect(store.vacancyPackages).toHaveLength(1)
      expect(store.vacancyPackages[0]?.starsPrice).toBe(199)
      expect(store.isLoading).toBe(false)
    })

    it('вызывает GET /vacancy-packages', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchVacancyPackages()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/vacancy-packages')
    })
  })

  describe('fetchApplyPackages', () => {
    it('загружает пакеты откликов', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [mockApplyPack] })
      await store.fetchApplyPackages()
      expect(store.applyPackages).toHaveLength(1)
      expect(store.applyPackages[0]?.applyCredits).toBe(50)
      expect(store.isLoading).toBe(false)
    })

    it('вызывает GET /apply-packages', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [] })
      await store.fetchApplyPackages()
      expect(vi.mocked(api.get)).toHaveBeenCalledWith('/apply-packages')
    })
  })

  describe('subscribeToPlan', () => {
    it('вызывает POST /payments/subscribe и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/abc' })
      const url = await store.subscribeToPlan('pro')
      expect(url).toBe('https://t.me/invoice/abc')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/subscribe', { planCode: 'pro' })
      expect(store.isLoading).toBe(false)
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Forbidden'))
      await expect(store.subscribeToPlan('vip')).rejects.toThrow('Forbidden')
      expect(store.error).toBe('Forbidden')
    })
  })

  describe('buyVacancyPack', () => {
    it('вызывает POST /payments/vacancy-pack и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/vp1' })
      const url = await store.buyVacancyPack(1)
      expect(url).toBe('https://t.me/invoice/vp1')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/vacancy-pack', { packageId: 1 })
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Not found'))
      await expect(store.buyVacancyPack(999)).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
    })
  })

  describe('buyApplyPack', () => {
    it('вызывает POST /payments/apply-pack и возвращает invoiceUrl', async () => {
      vi.mocked(api.post).mockResolvedValue({ invoiceUrl: 'https://t.me/invoice/ap1' })
      const url = await store.buyApplyPack(1)
      expect(url).toBe('https://t.me/invoice/ap1')
      expect(vi.mocked(api.post)).toHaveBeenCalledWith('/payments/apply-pack', { packageId: 1 })
    })

    it('устанавливает error и пробрасывает исключение при ошибке', async () => {
      vi.mocked(api.post).mockRejectedValue(new Error('Not found'))
      await expect(store.buyApplyPack(999)).rejects.toThrow('Not found')
      expect(store.error).toBe('Not found')
    })
  })

  describe('clearError', () => {
    it('сбрасывает error в null', () => {
      store.error = 'some error'
      store.clearError()
      expect(store.error).toBeNull()
    })
  })
})
```

- [ ] **Step 2: Запустить тест — убедиться что падает**

```bash
cd frontend && pnpm test src/stores/PaymentStore.test.ts
```

Ожидается: `FAIL` — `Cannot find module './PaymentStore'`

- [ ] **Step 3: Создать PaymentStore.ts**

```typescript
// frontend/src/stores/PaymentStore.ts
import { makeAutoObservable, runInAction } from 'mobx'
import type { SubscriptionPlan, VacancyPackage, ApplyPackage } from '@/types/api'
import { api } from '@/services/api'

export class PaymentStore {
  plans: SubscriptionPlan[] = []
  vacancyPackages: VacancyPackage[] = []
  applyPackages: ApplyPackage[] = []
  isLoading = false
  error: string | null = null

  constructor() {
    makeAutoObservable(this)
  }

  async fetchPlans(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: SubscriptionPlan[] }>('/subscription-plans')
      runInAction(() => {
        this.plans = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch plans'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchVacancyPackages(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: VacancyPackage[] }>('/vacancy-packages')
      runInAction(() => {
        this.vacancyPackages = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch vacancy packages'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async fetchApplyPackages(): Promise<void> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.get<{ data: ApplyPackage[] }>('/apply-packages')
      runInAction(() => {
        this.applyPackages = res.data
      })
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to fetch apply packages'
      })
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async subscribeToPlan(planCode: string): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/subscribe', { planCode })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyVacancyPack(packageId: number): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/vacancy-pack', { packageId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  async buyApplyPack(packageId: number): Promise<string> {
    runInAction(() => {
      this.isLoading = true
      this.error = null
    })
    try {
      const res = await api.post<{ invoiceUrl: string }>('/payments/apply-pack', { packageId })
      return res.invoiceUrl
    } catch (e) {
      runInAction(() => {
        this.error = e instanceof Error ? e.message : 'Failed to create invoice'
      })
      throw e
    } finally {
      runInAction(() => {
        this.isLoading = false
      })
    }
  }

  clearError(): void {
    this.error = null
  }
}
```

- [ ] **Step 4: Запустить тест — убедиться что проходит**

```bash
cd frontend && pnpm test src/stores/PaymentStore.test.ts
```

Ожидается: `PASS` — все 16 тестов зелёные.

- [ ] **Step 5: Добавить PaymentStore в RootStore**

В файл `frontend/src/stores/RootStore.ts` добавить:

```typescript
// Добавить импорт:
import { PaymentStore } from './PaymentStore'

// Добавить поле в класс:
payment: PaymentStore

// Добавить в constructor:
this.payment = new PaymentStore()
```

Итоговый файл:

```typescript
// frontend/src/stores/RootStore.ts
import { AuthStore } from './AuthStore'
import { CompanyStore } from './CompanyStore'
import { VacancyStore } from './VacancyStore'
import { ResumeStore } from './ResumeStore'
import { ApplicationStore } from './ApplicationStore'
import { FavoriteStore } from './FavoriteStore'
import { SavedSearchStore } from './SavedSearchStore'
import { BlockStore } from './BlockStore'
import { PaymentStore } from './PaymentStore'

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
  }
}

export const rootStore = new RootStore()
```

- [ ] **Step 6: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 7: Commit**

```bash
cd frontend
git add src/stores/PaymentStore.ts src/stores/PaymentStore.test.ts src/stores/RootStore.ts
git commit -m "feat(sprint6): add PaymentStore (fetchPlans, subscribeToPlan, buyPacks) and wire into RootStore"
```

---

## Task 4: useTelegramPayment hook

**Files:**

- Create: `frontend/src/hooks/useTelegramPayment.ts`

- [ ] **Step 1: Создать хук**

```typescript
// frontend/src/hooks/useTelegramPayment.ts
'use client'

type TelegramWebApp = {
  openInvoice?: (url: string, callback: (status: string) => void) => void
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp
    }
  }
}

export function useTelegramPayment() {
  const openInvoice = (url: string, onPaid?: () => void): void => {
    const webApp = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined

    if (webApp?.openInvoice) {
      webApp.openInvoice(url, (status: string) => {
        if (status === 'paid' && onPaid) {
          onPaid()
        }
      })
    } else {
      window.open(url, '_blank')
    }
  }

  return { openInvoice }
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/hooks/useTelegramPayment.ts
git commit -m "feat(sprint6): add useTelegramPayment hook (Mini App + web fallback)"
```

---

## Task 5: SubscriptionBadge component

**Files:**

- Create: `frontend/src/components/subscription/SubscriptionBadge.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// frontend/src/components/subscription/SubscriptionBadge.tsx
import { PLAN_LABELS, getPlanBadgeClasses } from '@/lib/subscription-utils'

interface Props {
  plan: string
  expiresAt?: string | null
  showExpiry?: boolean
}

export function SubscriptionBadge({ plan, expiresAt, showExpiry = false }: Props) {
  const label = PLAN_LABELS[plan] ?? plan
  const classes = getPlanBadgeClasses(plan)

  const expiryText =
    showExpiry && expiresAt
      ? new Date(expiresAt).toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : null

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${classes}`}>{label}</span>
      {expiryText && <span className="text-xs text-muted-foreground">до {expiryText}</span>}
    </span>
  )
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/subscription/SubscriptionBadge.tsx
git commit -m "feat(sprint6): add SubscriptionBadge component"
```

---

## Task 6: SubscriptionPlanCard component

**Files:**

- Create: `frontend/src/components/subscription/SubscriptionPlanCard.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// frontend/src/components/subscription/SubscriptionPlanCard.tsx
import { formatStarsPrice, getPlanBadgeClasses } from '@/lib/subscription-utils'
import type { SubscriptionPlan } from '@/types/api'
import { Button } from '@/components/ui/button'

interface Props {
  plan: SubscriptionPlan
  currentPlan: string
  canBuy: boolean
  isBuying: boolean
  onBuy: (planCode: string) => void
}

export function SubscriptionPlanCard({ plan, currentPlan, canBuy, isBuying, onBuy }: Props) {
  const isActive = plan.code === currentPlan
  const badgeClasses = getPlanBadgeClasses(plan.code)

  return (
    <div
      className={`rounded-2xl border p-5 flex flex-col gap-4 ${isActive ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-white'}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClasses}`}>
            {plan.name}
          </span>
          {isActive && <span className="ml-2 text-xs text-indigo-600 font-medium">Активный</span>}
        </div>
        <p className="text-base font-bold text-gray-900">{formatStarsPrice(plan.starsPrice)}</p>
      </div>

      <ul className="space-y-1.5 text-sm text-gray-600">
        <li>
          Вакансий в месяц:{' '}
          <span className="font-medium text-gray-900">{plan.vacanciesPerMonth}</span>
        </li>
        <li>
          Активных вакансий:{' '}
          <span className="font-medium text-gray-900">{plan.activeVacanciesLimit}</span>
        </li>
        <li>
          Откликов в день:{' '}
          <span className="font-medium text-gray-900">{plan.applicationsPerDay}</span>
        </li>
        <li>
          Резюме: <span className="font-medium text-gray-900">{plan.resumesLimit}</span>
        </li>
        <li>
          База резюме:{' '}
          <span
            className={`font-medium ${plan.resumeDatabaseAccess ? 'text-green-600' : 'text-gray-400'}`}
          >
            {plan.resumeDatabaseAccess ? '✓' : '✗'}
          </span>
        </li>
      </ul>

      {plan.code !== 'free' && (
        <Button
          size="sm"
          className="w-full"
          disabled={isActive || !canBuy || isBuying}
          onClick={() => {
            if (!isActive && canBuy) onBuy(plan.code)
          }}
        >
          {isBuying
            ? 'Создание счёта...'
            : isActive
              ? 'Активный'
              : canBuy
                ? 'Купить'
                : 'Недоступно'}
        </Button>
      )}

      {plan.code === 'vip' && !canBuy && (
        <p className="text-xs text-muted-foreground text-center">Требует активный план Max</p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/subscription/SubscriptionPlanCard.tsx
git commit -m "feat(sprint6): add SubscriptionPlanCard component"
```

---

## Task 7: PackageCard component

**Files:**

- Create: `frontend/src/components/subscription/PackageCard.tsx`

- [ ] **Step 1: Создать компонент**

```tsx
// frontend/src/components/subscription/PackageCard.tsx
import { formatStarsPrice } from '@/lib/subscription-utils'
import { Button } from '@/components/ui/button'
import type { VacancyPackage, ApplyPackage } from '@/types/api'

interface VacancyPackageCardProps {
  type: 'vacancy'
  pkg: VacancyPackage
  isBuying: boolean
  onBuy: (packageId: number) => void
}

interface ApplyPackageCardProps {
  type: 'apply'
  pkg: ApplyPackage
  isBuying: boolean
  onBuy: (packageId: number) => void
}

type Props = VacancyPackageCardProps | ApplyPackageCardProps

export function PackageCard(props: Props) {
  const { pkg, isBuying, onBuy } = props

  const details =
    props.type === 'vacancy'
      ? [`${props.pkg.vacancyCredits} вакансий`, `${props.pkg.boostCredits} буст-кредитов`]
      : [`${props.pkg.applyCredits} откликов`]

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-base font-semibold text-gray-900">{pkg.name}</p>
        <p className="text-sm font-bold text-indigo-600">{formatStarsPrice(pkg.starsPrice)}</p>
      </div>

      <ul className="space-y-1 text-sm text-gray-600">
        {details.map((d) => (
          <li key={d}>• {d}</li>
        ))}
      </ul>

      <Button
        size="sm"
        variant="outline"
        className="w-full"
        disabled={isBuying}
        onClick={() => {
          onBuy(pkg.id)
        }}
      >
        {isBuying ? 'Создание счёта...' : 'Купить'}
      </Button>
    </div>
  )
}
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/subscription/PackageCard.tsx
git commit -m "feat(sprint6): add PackageCard component for vacancy/apply packages"
```

---

## Task 8: /subscription page

**Files:**

- Create: `frontend/src/app/subscription/page.tsx`
- Create: `frontend/src/app/subscription/SubscriptionClient.tsx`

- [ ] **Step 1: Создать серверную обёртку page.tsx**

```typescript
// frontend/src/app/subscription/page.tsx
import { SubscriptionClient } from './SubscriptionClient'

export const metadata = {
  title: 'Подписка | GramJob',
}

export default function SubscriptionPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <SubscriptionClient />
    </div>
  )
}
```

- [ ] **Step 2: Создать SubscriptionClient.tsx**

```tsx
// frontend/src/app/subscription/SubscriptionClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'
import { SubscriptionPlanCard } from '@/components/subscription/SubscriptionPlanCard'
import { PackageCard } from '@/components/subscription/PackageCard'
import { Button } from '@/components/ui/button'
import { canUpgradeToPlan } from '@/lib/subscription-utils'
import { useTelegramPayment } from '@/hooks/useTelegramPayment'

export const SubscriptionClient = observer(function SubscriptionClient() {
  const { auth, payment } = useStores()
  const { openInvoice } = useTelegramPayment()

  const [buyingPlan, setBuyingPlan] = useState<string | null>(null)
  const [buyingVacancyPack, setBuyingVacancyPack] = useState<number | null>(null)
  const [buyingApplyPack, setBuyingApplyPack] = useState<number | null>(null)
  const [showRefreshHint, setShowRefreshHint] = useState(false)

  const user = auth.user

  useEffect(() => {
    void payment.fetchPlans()
    void payment.fetchVacancyPackages()
    void payment.fetchApplyPackages()
  }, [payment])

  const handleBuyPlan = async (planCode: string) => {
    setBuyingPlan(planCode)
    setShowRefreshHint(false)
    try {
      const url = await payment.subscribeToPlan(planCode)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingPlan(null)
    }
  }

  const handleBuyVacancyPack = async (packageId: number) => {
    setBuyingVacancyPack(packageId)
    setShowRefreshHint(false)
    try {
      const url = await payment.buyVacancyPack(packageId)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingVacancyPack(null)
    }
  }

  const handleBuyApplyPack = async (packageId: number) => {
    setBuyingApplyPack(packageId)
    setShowRefreshHint(false)
    try {
      const url = await payment.buyApplyPack(packageId)
      openInvoice(url, async () => {
        await auth.fetchMe()
        setShowRefreshHint(false)
      })
      setShowRefreshHint(true)
    } catch {
      // error displayed via payment.error
    } finally {
      setBuyingApplyPack(null)
    }
  }

  if (!user) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Войдите, чтобы управлять подпиской.</p>
      </div>
    )
  }

  const paidPlans = payment.plans.filter((p) => p.code !== 'free')

  return (
    <div className="space-y-10">
      {/* Текущий план */}
      <section>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Подписка</h1>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Ваш текущий план</p>
            <SubscriptionBadge
              plan={user.subscriptionPlan}
              expiresAt={user.subscriptionExpiresAt}
              showExpiry
            />
          </div>

          <div className="flex flex-col gap-1 text-sm text-gray-600">
            <span>
              Остаток кредитов вакансий: <strong>{user.vacancyCredits}</strong>
            </span>
            <span>
              Остаток кредитов откликов: <strong>{user.applyCredits}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* Уведомление о необходимости обновить статус (в web) */}
      {showRefreshHint && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-amber-800">
            После оплаты нажмите «Обновить статус», чтобы увидеть изменения.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await auth.fetchMe()
              setShowRefreshHint(false)
            }}
          >
            Обновить статус
          </Button>
        </div>
      )}

      {/* Ошибка */}
      {payment.error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
          <span>{payment.error}</span>
          <button
            onClick={() => {
              payment.clearError()
            }}
            className="text-destructive hover:underline text-xs"
          >
            Закрыть
          </button>
        </div>
      )}

      {/* Планы подписки */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Планы подписки</h2>

        {payment.isLoading && payment.plans.length === 0 && (
          <p className="text-sm text-muted-foreground">Загрузка планов...</p>
        )}

        {paidPlans.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {paidPlans.map((plan) => (
              <SubscriptionPlanCard
                key={plan.code}
                plan={plan}
                currentPlan={user.subscriptionPlan}
                canBuy={canUpgradeToPlan(user.subscriptionPlan, plan.code)}
                isBuying={buyingPlan === plan.code}
                onBuy={handleBuyPlan}
              />
            ))}
          </div>
        )}
      </section>

      {/* Пакеты вакансий */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Пакеты вакансий</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Дополнительные кредиты для публикации вакансий. Не сгорают при смене плана.
        </p>

        {payment.vacancyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-4">
            {payment.vacancyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="vacancy"
                pkg={pkg}
                isBuying={buyingVacancyPack === pkg.id}
                onBuy={handleBuyVacancyPack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Пакеты откликов */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Пакеты откликов</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Дополнительные отклики когда дневной лимит исчерпан.
        </p>

        {payment.applyPackages.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {payment.applyPackages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                type="apply"
                pkg={pkg}
                isBuying={buyingApplyPack === pkg.id}
                onBuy={handleBuyApplyPack}
              />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center pb-4">
        Оплата производится через Telegram Stars. Возврат Stars невозможен.
      </p>
    </div>
  )
})
```

- [ ] **Step 3: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/app/subscription/page.tsx src/app/subscription/SubscriptionClient.tsx
git commit -m "feat(sprint6): add /subscription page (plans, vacancy/apply packages, Telegram Stars payment)"
```

---

## Task 9: SubscriptionBadge в WebHeader

**Files:**

- Modify: `frontend/src/components/layout/WebHeader.tsx`

- [ ] **Step 1: Добавить SubscriptionBadge в WebHeader**

В файл `frontend/src/components/layout/WebHeader.tsx` добавить SubscriptionBadge рядом со ссылкой Dashboard.

Итоговый файл:

```tsx
// frontend/src/components/layout/WebHeader.tsx
'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { observer } from 'mobx-react-lite'
import { useStores } from '@/stores/StoreProvider'
import { Button } from '@/components/ui/button'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'

export const WebHeader = observer(function WebHeader() {
  const { t } = useTranslation()
  const { auth } = useStores()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="font-bold text-lg text-primary">
          GramJob
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/vacancies"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {t('nav.vacancies')}
          </Link>

          {auth.isAuthenticated && auth.user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/subscription"
                className="flex items-center"
                aria-label="Управление подпиской"
              >
                <SubscriptionBadge plan={auth.user.subscriptionPlan} />
              </Link>
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
        </div>
      </nav>
    </header>
  )
})
```

- [ ] **Step 2: Запустить typecheck**

```bash
cd frontend && pnpm typecheck
```

Ожидается: 0 ошибок TypeScript.

- [ ] **Step 3: Запустить все тесты**

```bash
cd frontend && pnpm test
```

Ожидается: все тесты PASS, итоговое количество ~263 тестов (241 + 22 новых).

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/layout/WebHeader.tsx
git commit -m "feat(sprint6): show SubscriptionBadge in WebHeader, links to /subscription"
```

---

## Self-Review

### Spec coverage

| Sprint 6 Frontend требование                         | Реализован в   |
| ---------------------------------------------------- | -------------- |
| Типы: SubscriptionPlan, VacancyPackage, ApplyPackage | Task 1         |
| isVip в типе User                                    | Task 1         |
| PaymentStore: fetchPlans                             | Task 3         |
| PaymentStore: fetchVacancyPackages                   | Task 3         |
| PaymentStore: fetchApplyPackages                     | Task 3         |
| PaymentStore: subscribeToPlan → invoiceUrl           | Task 3         |
| PaymentStore: buyVacancyPack → invoiceUrl            | Task 3         |
| PaymentStore: buyApplyPack → invoiceUrl              | Task 3         |
| Telegram Mini App invoice (WebApp.openInvoice)       | Task 4         |
| Web fallback (window.open)                           | Task 4         |
| Callback после оплаты → fetchMe()                    | Task 4, Task 8 |
| SubscriptionBadge — бейдж плана                      | Task 5         |
| SubscriptionPlanCard — карточка плана с кнопкой      | Task 6         |
| PackageCard — карточка vacancy/apply пакета          | Task 7         |
| /subscription page — планы                           | Task 8         |
| /subscription page — пакеты вакансий                 | Task 8         |
| /subscription page — пакеты откликов                 | Task 8         |
| "Обновить статус" после оплаты в web                 | Task 8         |
| SubscriptionBadge в WebHeader                        | Task 9         |

Все 19 пунктов покрыты.

### Placeholder scan

Все шаги содержат реальный код. Комментариев `// TODO` нет.

### Type consistency

- `SubscriptionPlan.code: 'free' | 'pro' | 'max' | 'vip'` — совпадает с `User.subscriptionPlan`
- `VacancyPackage.id: number` и `ApplyPackage.id: number` — используются в `buyVacancyPack(packageId: number)` и `buyApplyPack(packageId: number)` ✓
- `canUpgradeToPlan(currentPlan: string, targetPlan: string)` — принимает `string` (не enum), совместимо с `user.subscriptionPlan` ✓
- `PaymentStore.subscribeToPlan(planCode: string)` — принимает `string`, backend принимает `planCode` ✓
- `useTelegramPayment().openInvoice(url, onPaid?)` — вызывается в SubscriptionClient с `async () => { await auth.fetchMe(); setShowRefreshHint(false) }` ✓
- `getPlanBadgeClasses(plan: string)` используется в SubscriptionBadge и SubscriptionPlanCard с одинаковой сигнатурой ✓

### Potential gaps

- **UpsellModal** уже ссылается на `/subscription` — страница теперь существует, ссылка работает.
- **MiniAppBottomNav**: если в Mini App есть нижняя навигация, вкладка подписки там не добавляется (не было в требованиях Sprint 6).
- **Ошибка 403 при VIP без Max**: backend вернёт 403 с сообщением `VIP requires an active Max subscription` → `payment.error` установится → отображается в UI через блок ошибки.
- **isVip в UI**: `user.isVip` доступен в `auth.user.isVip` после fetchMe, но в Sprint 6 не используется в отдельном UI-элементе — VIP статус визуально отображается через `SubscriptionBadge` с планом `'vip'`.
