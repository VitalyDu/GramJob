# UI/UX Redesign — Phase 4: Главная страница + «Кабинет» Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Современная главная страница (hero, статистика сервиса, свежие вакансии, CTA-блоки) и полноценная страница «Кабинет» на `/dashboard` — единая панель управления для кандидата и работодателя.

**Architecture:** Главная — server component с ISR (`revalidate: 300`): статистика и подборка вакансий запрашиваются на сервере напрямую с API (SEO + TTFB). `/dashboard` — клиентская страница (MobX): навигационные карточки-разделы, быстрые действия, счётчики из существующих сторов. Никакой новой бизнес-логики и новых endpoint-ов — только существующие публичные и owner-API.

**Tech Stack:** Next.js 15 (RSC + ISR), React 19, MobX, shadcn/ui, lucide-react, TailwindCSS 4.

**Зависимости:** Phase 1 (тема, логотипы, `bg-brand-gradient`, BottomNav ссылается на `/dashboard`), Phase 3 Task 1–2 (`PageHeader`, `EmptyState`, редизайн `VacancyCard`).

**Спека:** `docs/ui-ux-redesign.md` §6 (Кабинет), §11 (Главная), §12, §15.

**Проверенные факты (2026-07-03):**

- Публичный список: `GET /vacancies` → `{ data, meta: { total, page, pageSize, pageCount } }` (`backend/src/api/vacancy/controllers/vacancy.ts:339`); компании — `GET /companies` (аналогичная форма — сверить при реализации); отрасли — `GET /industries`.
- ENV для SSR-фетча: `NEXT_PUBLIC_API_URL` (default `http://localhost:1337/api`).
- `GET /resumes` закрыт Max-гейтом — статистику резюме на главной НЕ показываем.
- `VacancyCard` не использует хуки — безопасен в RSC.
- `/dashboard` сейчас 404; ссылки на него уже есть (WebHeader dropdown, BottomNav «Кабинет»).

**Конвенции проекта (обязательны):** коммиты без `Co-Authored-By`; conditional spread; тесты Vitest колокально, описания на русском; команды `pnpm -C frontend ...`.

---

### Task 1: Серверные лоадеры данных главной

**Files:**

- Create: `frontend/src/lib/home-data.ts`
- Test: `frontend/src/lib/home-data.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getHomeStats, getLatestVacancies } from './home-data'

const okJson = (body: unknown) => ({ ok: true, json: () => Promise.resolve(body) }) as Response

describe('home-data', () => {
  afterEach(() => vi.restoreAllMocks())

  it('getHomeStats собирает total вакансий, компаний и отраслей', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(okJson({ data: [], meta: { total: 120 } }))
        .mockResolvedValueOnce(okJson({ data: [], meta: { total: 45 } }))
        .mockResolvedValueOnce(okJson({ data: Array.from({ length: 12 }) }))
    )
    const stats = await getHomeStats()
    expect(stats).toEqual({ vacancies: 120, companies: 45, industries: 12 })
  })

  it('getHomeStats возвращает нули при ошибке сети', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    const stats = await getHomeStats()
    expect(stats).toEqual({ vacancies: 0, companies: 0, industries: 0 })
  })

  it('getLatestVacancies возвращает data и пустой массив при ошибке', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(okJson({ data: [{ documentId: 'v1' }], meta: { total: 1 } }))
    )
    expect(await getLatestVacancies(6)).toEqual([{ documentId: 'v1' }])

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('down')))
    expect(await getLatestVacancies(6)).toEqual([])
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm -C frontend test -- home-data`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализовать home-data.ts**

```ts
import type { Vacancy } from '@/types/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:1337/api'
const REVALIDATE = { next: { revalidate: 300 } } as const

export interface HomeStats {
  vacancies: number
  companies: number
  industries: number
}

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, REVALIDATE)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

type ListResponse = { data: unknown[]; meta?: { total?: number } }

export async function getHomeStats(): Promise<HomeStats> {
  const [vacancies, companies, industries] = await Promise.all([
    fetchJson<ListResponse>('/vacancies?page=1&pageSize=1'),
    fetchJson<ListResponse>('/companies?page=1&pageSize=1'),
    fetchJson<{ data: unknown[] }>('/industries'),
  ])
  return {
    vacancies: vacancies?.meta?.total ?? 0,
    companies: companies?.meta?.total ?? 0,
    industries: industries?.data?.length ?? 0,
  }
}

export async function getLatestVacancies(limit: number): Promise<Vacancy[]> {
  const res = await fetchJson<{ data: Vacancy[] }>(
    `/vacancies?page=1&pageSize=${limit}&sort=newest`
  )
  return res?.data ?? []
}
```

⚠️ Перед коммитом сверить параметры querystring с фактическими именами в `findPublished` (`backend/src/api/vacancy/controllers/vacancy.ts:230` — `page`, `pageSize`, `sort=newest`) и форму ответа `GET /companies`.

- [ ] **Step 4: Запустить тесты**

Run: `pnpm -C frontend test -- home-data && pnpm -C frontend typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/home-data.ts frontend/src/lib/home-data.test.ts
git commit -m "feat(frontend): server-side data loaders for home page (stats, latest vacancies)"
```

---

### Task 2: Анимации появления (CSS)

**Files:**

- Modify: `frontend/src/app/globals.css`

- [ ] **Step 1: Добавить в конец globals.css**

```css
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@utility animate-fade-in-up {
  animation: fade-in-up 0.5s ease-out both;
}

@utility animation-delay-100 {
  animation-delay: 100ms;
}

@utility animation-delay-200 {
  animation-delay: 200ms;
}

@utility animation-delay-300 {
  animation-delay: 300ms;
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/globals.css
git commit -m "feat(frontend): fade-in-up animation utilities"
```

---

### Task 3: Главная страница

**Files:**

- Rewrite: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/layout.tsx` (metadata)

- [ ] **Step 1: Переписать page.tsx**

```tsx
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, Briefcase, Building2, FileText, Layers, Search, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { VacancyCard } from '@/components/vacancy/VacancyCard'
import { getHomeStats, getLatestVacancies } from '@/lib/home-data'

export const revalidate = 300

function StatCard({
  icon: Icon,
  value,
  label,
  delay,
}: {
  icon: typeof Briefcase
  value: number
  label: string
  delay: string
}) {
  return (
    <Card className={`animate-fade-in-up ${delay}`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value.toLocaleString('ru-RU')}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default async function HomePage() {
  const [stats, latest] = await Promise.all([getHomeStats(), getLatestVacancies(6)])

  return (
    <div className="space-y-16 pb-8">
      {/* Hero */}
      <section className="bg-brand-gradient -mx-4 -mt-6 px-4 py-16 text-white sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <Image
            src="/logo-vertical.png"
            alt="GramJob"
            width={140}
            height={160}
            priority
            className="animate-fade-in-up mb-6 h-auto w-28 rounded-2xl bg-white/95 p-3 sm:w-32"
          />
          <h1 className="animate-fade-in-up animation-delay-100 text-3xl font-bold tracking-tight sm:text-5xl">
            Работа мечты — прямо в Telegram
          </h1>
          <p className="animate-fade-in-up animation-delay-200 mt-4 max-w-xl text-base text-white/85 sm:text-lg">
            Международная биржа вакансий и резюме. Находите возможности, стройте будущее.
          </p>
          <div className="animate-fade-in-up animation-delay-300 mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="secondary" className="font-semibold">
              <Link href="/vacancies">
                <Search className="mr-2 h-4 w-4" />
                Найти работу
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <Link href="/dashboard/vacancies/new">
                Разместить вакансию
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Статистика */}
      <section aria-label="Статистика сервиса" className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Briefcase}
          value={stats.vacancies}
          label="Вакансий"
          delay="animation-delay-100"
        />
        <StatCard
          icon={Building2}
          value={stats.companies}
          label="Компаний"
          delay="animation-delay-200"
        />
        <StatCard
          icon={Layers}
          value={stats.industries}
          label="Отраслей"
          delay="animation-delay-300"
        />
      </section>

      {/* Свежие вакансии */}
      {latest.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Свежие вакансии</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/vacancies">
                Все вакансии
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            {latest.map((v) => (
              <VacancyCard key={v.documentId} vacancy={v} />
            ))}
          </div>
        </section>
      )}

      {/* Как это работает */}
      <section>
        <h2 className="mb-6 text-center text-xl font-bold tracking-tight sm:text-2xl">
          Как это работает
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: FileText,
              title: 'Создайте профиль',
              text: 'Резюме для кандидата или компания для работодателя — за пару минут.',
            },
            {
              icon: Search,
              title: 'Найдите друг друга',
              text: 'Умный поиск по отраслям, форматам работы и уровню.',
            },
            {
              icon: Send,
              title: 'Откликайтесь в один клик',
              text: 'Уведомления и статусы откликов — прямо в Telegram.',
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="flex flex-col items-center text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <p className="font-semibold">{`${i + 1}. ${title}`}</p>
              <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="grid gap-4 md:grid-cols-2">
        <Card className="bg-accent/60">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-lg font-bold">Ищете работу?</h3>
            <p className="text-sm text-muted-foreground">
              Создайте резюме и получайте приглашения от работодателей.
            </p>
            <Button asChild>
              <Link href="/dashboard/resumes/new">Создать резюме</Link>
            </Button>
          </CardContent>
        </Card>
        <Card className="bg-brand-orange/10">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-lg font-bold">Ищете сотрудников?</h3>
            <p className="text-sm text-muted-foreground">
              Разместите вакансию — модерация занимает считанные часы.
            </p>
            <Button asChild variant="outline">
              <Link href="/dashboard/vacancies/new">Разместить вакансию</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
```

(Отрицательные отступы hero компенсируют паддинги контейнера AppShell — фон уходит в край экрана; ширина ограничена `max-w-6xl` родителя, поэтому на Large Desktop hero остаётся в контейнере — принято как норма SaaS-лендингов.)

- [ ] **Step 2: Обновить metadata в layout.tsx**

В `frontend/src/app/layout.tsx` заменить объект `metadata`:

```tsx
export const metadata: Metadata = {
  title: 'GramJob — работа и вакансии в Telegram',
  description:
    'Международная биржа вакансий и резюме в экосистеме Telegram. Find opportunities. Build futures.',
  icons: { icon: '/logo-vertical.png' },
}
```

(Если в текущем `metadata` есть другие поля — сохранить их, добавив новые значения.)

- [ ] **Step 3: Проверить**

Run: `pnpm -C frontend typecheck && pnpm -C frontend test && pnpm -C frontend build`
Смоук: главная на 390px/820px/1440px — hero, статистика, подборка, CTA; без горизонтального скролла; при выключенном backend главная рендерится (нули и без подборки).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/layout.tsx
git commit -m "feat(frontend): redesign home page — hero, service stats, latest vacancies, CTA blocks"
```

---

### Task 4: Страница «Кабинет» (/dashboard)

Единая панель для кандидата и работодателя: приветствие + план подписки, быстрые действия, сетка разделов со счётчиками там, где они дёшевы (уведомления — `NotificationStore.unreadCount`).

**Files:**

- Create: `frontend/src/app/dashboard/page.tsx`
- Create: `frontend/src/app/dashboard/DashboardClient.tsx`
- Test: `frontend/src/app/dashboard/DashboardClient.test.tsx`

- [ ] **Step 1: Написать падающий тест**

Перед написанием открыть существующий тест страницы (например `frontend/src/app/dashboard/publications/*.test.tsx`, если есть, или `ProfileClient`-паттерн) и повторить принятый способ мока `useStores`. Скелет:

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DashboardClient } from './DashboardClient'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))

vi.mock('@/stores/StoreProvider', () => ({
  useStores: () => ({
    auth: {
      isAuthenticated: true,
      user: { id: 1, firstName: 'Иван', email: 'ivan@test.io', subscriptionPlan: 'free' },
    },
    notification: { unreadCount: 3, fetchUnreadCount: vi.fn() },
  }),
}))

describe('DashboardClient', () => {
  it('показывает приветствие с именем пользователя', () => {
    render(<DashboardClient />)
    expect(screen.getByText(/Иван/)).toBeInTheDocument()
  })

  it('показывает разделы кабинета', () => {
    render(<DashboardClient />)
    for (const label of [
      'Мои вакансии',
      'Мои резюме',
      'Мои компании',
      'Отклики',
      'Избранное',
      'Уведомления',
      'Подписка',
      'Профиль',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('показывает счётчик непрочитанных уведомлений', () => {
    render(<DashboardClient />)
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('показывает быстрые действия', () => {
    render(<DashboardClient />)
    expect(screen.getByRole('link', { name: /создать вакансию/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /создать резюме/i })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `pnpm -C frontend test -- DashboardClient`
Expected: FAIL — модуль не существует.

- [ ] **Step 3: Реализовать DashboardClient.tsx**

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { observer } from 'mobx-react-lite'
import {
  Bell,
  Briefcase,
  Building2,
  FileText,
  Heart,
  ListChecks,
  MessageSquare,
  Plus,
  Search,
  Shield,
  Star,
  User,
} from 'lucide-react'
import { useStores } from '@/stores/StoreProvider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SubscriptionBadge } from '@/components/subscription/SubscriptionBadge'

const SECTIONS = [
  {
    href: '/dashboard/vacancies',
    icon: Briefcase,
    label: 'Мои вакансии',
    desc: 'Публикации, бусты, аналитика',
  },
  { href: '/dashboard/resumes', icon: FileText, label: 'Мои резюме', desc: 'Резюме и их статусы' },
  {
    href: '/dashboard/companies',
    icon: Building2,
    label: 'Мои компании',
    desc: 'Профили компаний',
  },
  {
    href: '/dashboard/applications',
    icon: MessageSquare,
    label: 'Отклики',
    desc: 'Ваши отклики и их статусы',
  },
  {
    href: '/dashboard/publications',
    icon: ListChecks,
    label: 'Мои публикации',
    desc: 'Всё на модерации в одном месте',
  },
  {
    href: '/dashboard/favorites',
    icon: Heart,
    label: 'Избранное',
    desc: 'Сохранённые вакансии и резюме',
  },
  {
    href: '/dashboard/saved-searches',
    icon: Search,
    label: 'Сохранённые поиски',
    desc: 'Быстрый доступ к фильтрам',
  },
  {
    href: '/dashboard/notifications',
    icon: Bell,
    label: 'Уведомления',
    desc: 'События и модерация',
    badge: 'unread',
  },
  {
    href: '/dashboard/blocks',
    icon: Shield,
    label: 'Блокировки',
    desc: 'Скрытые работодатели и кандидаты',
  },
  { href: '/subscription', icon: Star, label: 'Подписка', desc: 'План, лимиты и пакеты' },
  { href: '/dashboard/profile', icon: User, label: 'Профиль', desc: 'Личные данные и выход' },
] as const

export const DashboardClient = observer(function DashboardClient() {
  const router = useRouter()
  const { auth, notification } = useStores()

  useEffect(() => {
    if (!auth.isAuthenticated) router.replace('/login')
  }, [auth.isAuthenticated, router])

  useEffect(() => {
    if (auth.isAuthenticated) void notification.fetchUnreadCount()
  }, [auth.isAuthenticated, notification])

  if (!auth.isAuthenticated || !auth.user) return null

  const name = auth.user.firstName ?? auth.user.email

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Привет, {name}!</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Управляйте вакансиями, резюме и откликами из одного места
          </p>
        </div>
        <Link href="/subscription" aria-label="Управление подпиской">
          <SubscriptionBadge plan={auth.user.subscriptionPlan} />
        </Link>
      </div>

      <section aria-label="Быстрые действия" className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/dashboard/vacancies/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Создать вакансию
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/resumes/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Создать резюме
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dashboard/companies/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Добавить компанию
          </Link>
        </Button>
      </section>

      <section aria-label="Разделы кабинета" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, label, desc, ...rest }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold group-hover:text-primary">
                    {label}
                    {'badge' in rest && notification.unreadCount > 0 && (
                      <Badge className="h-5 min-w-5 justify-center px-1">
                        {notification.unreadCount}
                      </Badge>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  )
})
```

⚠️ Сверить с реальными сторами: имя поля `notification.unreadCount` и метода `fetchUnreadCount` — открыть `frontend/src/stores/NotificationStore.ts`; auth-guard паттерн — открыть `ProfileClient.tsx` и повторить принятый там способ (если отличается — использовать его).

- [ ] **Step 4: Создать page.tsx**

```tsx
import type { Metadata } from 'next'
import { DashboardClient } from './DashboardClient'

export const metadata: Metadata = { title: 'Кабинет — GramJob' }

export default function DashboardPage() {
  return <DashboardClient />
}
```

- [ ] **Step 5: Запустить тесты**

Run: `pnpm -C frontend test -- DashboardClient && pnpm -C frontend typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx frontend/src/app/dashboard/DashboardClient.tsx frontend/src/app/dashboard/DashboardClient.test.tsx
git commit -m "feat(frontend): add dashboard cabinet page with sections grid and quick actions"
```

---

### Task 5: Финальная верификация Phase 4 (и всего редизайна)

- [ ] **Step 1:** `pnpm -C frontend typecheck && pnpm -C frontend test && pnpm -C frontend build` — 0 ошибок.
- [ ] **Step 2:** Ручной чеклист:

- [ ] Главная (1440/820/390px): hero с логотипом, статистика с реальными числами, свежие вакансии, CTA; ISR — страница отдаётся без клиентского ожидания
- [ ] Главная при выключенном backend — рендерится без падения
- [ ] `/dashboard` — все карточки-разделы ведут на существующие страницы, бейдж непрочитанных виден
- [ ] `/dashboard` неавторизованным — редирект на /login
- [ ] BottomNav «Кабинет» и dropdown в header ведут на новую страницу, активный пункт подсвечен
- [ ] Mini App: «Кабинет» открывается, тёмная тема не сломана

- [ ] **Step 3: Сверка с критериями приёмки спеки (§16)** — пройтись по всем 14 пунктам `docs/ui-ux-redesign.md` §16 и отметить выполнение; несоответствия зафиксировать и устранить до завершения.

---

## Self-Review

- Спека §11: hero ✅, CTA-блоки ✅, статистика ✅, подборка вакансий ✅, анимации (Task 2) ✅, типографика/структура ✅. Подборка компаний — заменена статистикой + CTA (публичный список компаний есть, но карточки компаний менее ценны на главной; допустимо по §15 «Claude принимает решения самостоятельно»). При желании легко добавить секцию по образцу «Свежих вакансий».
- Спека §6: кабинет — единая точка входа для обеих ролей (кандидат: резюме/отклики/избранное; работодатель: вакансии/компании/отклики на вакансии через «Мои вакансии») ✅, быстрые действия ✅, современная панель ✅.
- Типы: `getLatestVacancies` возвращает `Vacancy[]` — согласовано с пропсами `VacancyCard`; `SECTIONS` использует `as const` + `'badge' in rest` — без ошибок `exactOptionalPropertyTypes`.
- SSR-фетчи обёрнуты в try/catch — деградация без падения.
